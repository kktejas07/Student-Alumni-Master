"""
services.skills.taxonomy — canonical skill vocabulary.

Sources, in order of preference:
1. Lightcast Open Skills API when LIGHTCAST_CLIENT_ID + LIGHTCAST_SECRET are
   set. The full list is cached in Mongo ``skill_taxonomy`` and refreshed
   weekly (stale cache falls back to CSV until the next refresh succeeds).
2. Shipped ESCO subset (``backend/data/esco_skills_min.csv``) — always
   available, so matching works out of the box with no external keys.

Public API (call ``await load_taxonomy()`` once at startup; the sync
functions below fall back to the CSV in-memory index if that never ran):
    normalize(term) -> {"id", "name", "category"} | None
    extract(text, limit=25) -> [{"id","name","confidence","evidence"}, ...]
    suggest(query, limit=10) -> [{"id","name","category"}, ...]
"""
from __future__ import annotations

import asyncio
import csv
import logging
import os
import re
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger("skills.taxonomy")

_DATA_FILE = Path(__file__).resolve().parent.parent.parent / "data" / "esco_skills_min.csv"
_CACHE_TTL_S = 7 * 24 * 3600  # weekly Mongo cache for Lightcast
_LIGHTCAST_TOKEN_URL = "https://api.lightcast.com/auth/token"
_LIGHTCAST_SKILLS_URL = "https://api.lightcast.com/v1/skills"

FUZZY_THRESHOLD = 90  # rapidfuzz score floor — below this we don't claim a match
_MIN_CONFIDENCE = 0.55

# Words that would only ever match by rapidfuzz partial credit — excluded from
# the fuzzy pass (exact-alias matches still work via _single_word_map).
_STOPWORDS = frozenset("""
a an and are as at be been by can do does for had has have in is it of on or
per re so than that the their then they this to via was were will you your
""".split())

# ─── in-memory index ───────────────────────────────────────────────────────
_entries: Dict[str, Dict[str, Any]] = {}        # id -> entry
_single_word_map: Dict[str, List[str]] = {}      # lowercased word -> [ids]
_multi_word_patterns: List[Any] = []             # (compiled regex, id, surface)
_entry_list: List[Dict[str, Any]] = []          # positional, matches _entry_list in _index
_process_cache = {"loaded_at": 0.0}


def _load_csv() -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    with open(_DATA_FILE, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            sid = (r.get("id") or "").strip()
            name = (r.get("skill") or r.get("name") or "").strip()
            if not sid or not name:
                continue
            rows.append({
                "id": sid,
                "name": name,
                "category": (r.get("category") or "").strip(),
                "aliases": (r.get("aliases") or "").strip(),
            })
    return rows


def _surface_forms(entry: Dict[str, Any]) -> List[str]:
    """All lowercased surface forms for an entry: name, id, alias tokens."""
    forms = {entry["name"].lower(), entry["id"].lower()}
    for a in str(entry.get("aliases") or "").split(";"):
        a = a.strip().lower()
        if a:
            forms.add(a)
    return sorted(forms)


def _index(entries: List[Dict[str, Any]]) -> None:
    global _entries, _single_word_map, _multi_word_patterns, _entry_list
    _entries = {e["id"]: dict(e) for e in entries}
    _entry_list = list(_entries.values())
    _single_word_map = {}
    _multi_word_patterns = []
    for e in _entries.values():
        for form in _surface_forms(e):
            if " " not in form:
                _single_word_map.setdefault(form, []).append(e["id"])
            else:
                _multi_word_patterns.append(
                    (re.compile(r"(?<!\w)" + re.escape(form) + r"(?!\w)"), e["id"], form)
                )


def _ensure_sync_loaded() -> bool:
    if _entries:
        return True
    try:
        _index(_load_csv())
        _process_cache["loaded_at"] = time.time()
        logger.info(f"[skills.taxonomy] synchronous CSV fallback loaded {len(_entries)} skills")
        return True
    except Exception as e:
        logger.error(f"[skills.taxonomy] CSV load failed: {e}")
        return False


async def _fetch_lightcast() -> List[Dict[str, Any]]:
    client_id = os.environ.get("LIGHTCAST_CLIENT_ID", "")
    secret = os.environ.get("LIGHTCAST_SECRET", "")
    if not client_id or not secret:
        raise RuntimeError("Lightcast credentials not configured")
    import httpx
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(
            _LIGHTCAST_TOKEN_URL,
            json={"grant_type": "client_credentials", "client_id": client_id, "client_secret": secret},
        )
        r.raise_for_status()
        token = r.json().get("access_token") or ""
        if not token:
            raise RuntimeError("Lightcast token response missing access_token")
        r2 = await client.get(
            _LIGHTCAST_SKILLS_URL,
            headers={"Authorization": f"Bearer {token}"},
        )
        r2.raise_for_status()
        data = r2.json()
    skills = data.get("skills") or data.get("data") or []
    entries: List[Dict[str, Any]] = []
    for s in skills:
        sid = str(s.get("skill_id") or s.get("id") or s.get("code") or "").strip()
        name = str(s.get("name") or s.get("skill") or "").strip()
        if not sid or not name:
            continue
        aliases = [name.lower(), sid.lower()] + [str(a).lower() for a in (s.get("aliases") or [])]
        entries.append({
            "id": sid,
            "name": name,
            "category": str(s.get("family") or s.get("category") or "general"),
            "aliases": ";".join(a for a in aliases if a),
        })
    if not entries:
        raise RuntimeError("Lightcast response contained no skills")
    return entries


async def _mongo_cache() -> Optional[List[Dict[str, Any]]]:
    """Return cached Lightcast entries if fresh; None when stale/absent."""
    from core.db import db
    doc = await db.skill_taxonomy.find_one({"kind": "lightcast"})
    if not doc or not doc.get("entries"):
        return None
    fetched_at = doc.get("fetched_at")
    if not fetched_at or not hasattr(fetched_at, "timestamp"):
        return None
    if time.time() - fetched_at.timestamp() < _CACHE_TTL_S:
        return doc["entries"]
    return None


async def _save_mongo_cache(entries: List[Dict[str, Any]]) -> None:
    from core.db import db
    from datetime import datetime, timezone
    await db.skill_taxonomy.update_one(
        {"kind": "lightcast"},
        {"$set": {
            "kind": "lightcast",
            "entries": entries,
            "count": len(entries),
            "fetched_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )


async def load_taxonomy(force_refresh: bool = False) -> List[Dict[str, Any]]:
    """Return the active skill list: Mongo cache, Lightcast, then CSV."""
    if not force_refresh and _entries and (time.time() - _process_cache["loaded_at"]) < 60:
        return [dict(e) for e in _entries.values()]

    cached = await _mongo_cache()
    if cached and not force_refresh:
        _index(cached)
        _process_cache["loaded_at"] = time.time()
        return [dict(e) for e in _entries.values()]

    if os.environ.get("LIGHTCAST_CLIENT_ID") and os.environ.get("LIGHTCAST_SECRET"):
        try:
            entries = await asyncio.wait_for(_fetch_lightcast(), timeout=40.0)
            _index(entries)
            await _save_mongo_cache(entries)
            _process_cache["loaded_at"] = time.time()
            logger.info(f"[skills.taxonomy] loaded {len(entries)} skills from Lightcast")
            return [dict(e) for e in _entries.values()]
        except Exception as e:
            logger.warning(f"[skills.taxonomy] Lightcast fetch failed, using ESCO CSV: {e}")

    entries = _load_csv()
    _index(entries)
    _process_cache["loaded_at"] = time.time()
    return [dict(e) for e in _entries.values()]


def refresh_task() -> None:
    """Fire-and-forget weekly Lightcast refresh for the scheduler to call."""
    asyncio.ensure_future(load_taxonomy(force_refresh=True))


def snapshot() -> List[Dict[str, Any]]:
    """In-memory taxonomy (empty until load_taxonomy ran or a sync fallback)."""
    return [dict(e) for e in _entries.values()]


# ─── normalization & extraction ────────────────────────────────────────────
def _confidence_from_fuzz(score: float) -> float:
    if score >= 100:
        return 0.95
    if score >= 90:
        return 0.85
    return _MIN_CONFIDENCE


def _clean_term(term: str) -> str:
    t = re.sub(r"[^a-z0-9+.#/\- ]", "", str(term or "").strip().lower())
    return re.sub(r"\s+", " ", t).strip()


def normalize(term: str) -> Optional[Dict[str, Any]]:
    """Map a free-text term onto the canonical taxonomy, or None."""
    if not _ensure_sync_loaded():
        return None
    t = _clean_term(term)
    if not t:
        return None

    # exact alias (single or multi-word)
    if " " not in t and t in _single_word_map:
        sid = _single_word_map[t][0]
        e = _entries[sid]
        return {"id": e["id"], "name": e["name"], "category": e.get("category", "")}
    for pattern, sid, _form in _multi_word_patterns:
        if pattern.search(t):
            e = _entries[sid]
            return {"id": e["id"], "name": e["name"], "category": e.get("category", "")}

    # fuzzy against canonical names
    try:
        from rapidfuzz import process, fuzz

        names = [e["name"] for e in _entry_list]
        result = process.extractOne(t, names, scorer=fuzz.WRatio, score_cutoff=FUZZY_THRESHOLD)
        if result:
            match, _score, idx = result
            e = _entry_list[idx]
            return {"id": e["id"], "name": e["name"], "category": e.get("category", "")}
    except Exception as ex:
        logger.debug(f"[skills.taxonomy] fuzzy normalize failed: {ex}")
    return None


def extract(text: str, limit: int = 25, min_confidence: float = _MIN_CONFIDENCE) -> List[Dict[str, Any]]:
    """Extract canonical skills from resume/job text.

    Pass 1: exact alias hits (word forms via set lookup, phrases via regex)
    at confidence 0.99. Pass 2: rapidfuzz over distinct text words against
    single-word skill names at score >= 90. Deduped by id, confidence-desc.
    """
    if not _ensure_sync_loaded():
        return []

    lower = re.sub(r"\s+", " ", str(text or "")).lower()
    found: Dict[str, Dict[str, Any]] = {}

    def _mark(sid: str, confidence: float, evidence: str) -> None:
        if sid in found and found[sid]["confidence"] >= confidence:
            return
        e = _entries[sid]
        found[sid] = {
            "id": sid,
            "name": e["name"],
            "confidence": round(confidence, 2),
            "evidence": evidence,
            "category": e.get("category", ""),
        }

    # Pass 1a — single-word alias hits
    words = set(re.findall(r"[a-z0-9+.#/\-]{2,}", lower))
    for word in words:
        for sid in _single_word_map.get(word, ()):
            _mark(sid, 0.99, word)

    # Pass 1b — multi-word alias phrases
    for pattern, sid, form in _multi_word_patterns:
        if pattern.search(lower):
            _mark(sid, 0.99, form)

    # Pass 2 — fuzzy: unmatched, non-stopword words vs single-word canonical names
    try:
        from rapidfuzz import process, fuzz

        single_names = [e["name"] for e in _entry_list if " " not in e["name"].lower()]
        names_to_ids = {e["name"]: e["id"] for e in _entry_list if " " not in e["name"].lower()}
        for word in sorted(words):
            if word in _STOPWORDS or len(word) < 3:
                continue
            results = process.extract(
                word, single_names, scorer=fuzz.WRatio, limit=3, score_cutoff=FUZZY_THRESHOLD
            )
            for match, score, _idx in results:
                sid = names_to_ids.get(match)
                if sid and sid not in found:
                    _mark(sid, _confidence_from_fuzz(float(score)), word)
    except Exception as ex:
        logger.debug(f"[skills.taxonomy] fuzzy extract failed: {ex}")

    out = [f for f in found.values() if f["confidence"] >= min_confidence]
    out.sort(key=lambda x: (-x["confidence"], x["name"]))
    return out[:limit]


def suggest(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Autocomplete over canonical skill names.

    Prefix/substring hits win (ranked prefix-first); fuzzy (WRatio >= 60)
    fills the remainder.
    """
    if not _ensure_sync_loaded():
        return []
    q = _clean_term(query)
    if not q:
        return []
    names = [e["name"] for e in _entry_list]
    name_low = [n.lower() for n in names]

    prefix, substr, rest = [], [], []
    for i, e in enumerate(_entry_list):
        nl = name_low[i]
        if nl.startswith(q):
            prefix.append(i)
        elif q in nl:
            substr.append(i)
        else:
            rest.append(i)

    out: List[Dict[str, Any]] = []
    for i in prefix + substr:
        out.append({"id": _entry_list[i]["id"], "name": _entry_list[i]["name"],
                    "category": _entry_list[i].get("category", "")})
        if len(out) >= limit:
            return out

    if len(q) >= 4 and rest:
        try:
            from rapidfuzz import process, fuzz

            rest_names = [name_low[i] for i in rest]
            for match, _score, idx in process.extract(q, rest_names, scorer=fuzz.WRatio,
                                                       limit=limit - len(out), score_cutoff=60):
                entry = _entry_list[rest[idx]]
                out.append({"id": entry["id"], "name": entry["name"],
                            "category": entry.get("category", "")})
                if len(out) >= limit:
                    break
        except Exception:
            for i in rest:
                out.append({"id": _entry_list[i]["id"], "name": _entry_list[i]["name"],
                            "category": _entry_list[i].get("category", "")})
                if len(out) >= limit:
                    break
    return out[:limit]


__all__ = ["normalize", "extract", "suggest", "load_taxonomy", "refresh_task", "snapshot"]
