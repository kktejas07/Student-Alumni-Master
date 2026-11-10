"""
talent_match_engine.py — TP18: semantic candidate↔job matching for the Talent Pool.

Hybrid explainable scoring (weights sum to 1):
    semantic cosine      0.60  — local embeddings, no external API
    skill overlap        0.25  — canonicalized sets, full credit for exact
                                 canonical matches, 0.5 partial credit when a
                                 required skill is a substring of a held one
                                 (or vice-versa), 0 otherwise
    experience fit       0.15  — 1.0 inside [min_exp, max_exp]; linear decay
                                 to 0 at E=0 when below min, linear decay to 0
                                 5 years above max; unknown exp or no bounds
                                 → 0.5 neutral

Embedding backends (in order):
    1. `fastembed` (declared in requirements.txt) → TextEmbedding() default
       ONNX MiniLM model. First run may download the ONNX model (~80 MB) to
       the local fastembed cache; after that it is fully offline. Run is
       ~50 ms/batch on CPU.
    2. Fallback: pure-numpy hashed bag-of-words — tokens sha1-hashed into
       512 buckets, L2-normalized (numpy is a hard house dep). No network,
       no model download; weaker but deterministic.

Cache: `db.candidate_embeddings` {candidate_id, model_tag: "fastembed"|"hashbow",
dim, vector: [floats], text, updated_at}. A cached vector is reused only when
model_tag matches the *currently active* backend AND is < 30 days old — a
model switch or expiry forces recompute, so a hashbow→fastembed upgrade
silently re-embeds on next use.

Performance guard: when the active candidate pool exceeds 5,000 profiles,
the 0.15 experience-fit component is pre-scored for every active profile and
only the top 2,500 by that pre-score are scored in full (embedding + cosine).
Profiles cut by the pre-filter keep their experience fit high enough that
only candidates far outside the band are ever dropped.

Top-K of every `match_candidates` run is persisted to
`db.talent_pool_match_scores` for audit; every run appends a row to
`scheduler_logs` via agent_run_log and one W3C activity event.
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
import re
import time
from datetime import timedelta
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from bson import ObjectId

from services.agents.talent_common import (
    agent_run_log,
    import_optional,
    log_activity,
    now_utc,
)
from services.agents.talent_skill_taxonomy import (
    canonicalize_skills,
    ensure_taxonomy,
    normalize_skill,
)

logger = logging.getLogger("talent_match_engine")

_AGENT = "tp18_matcher"
_HASH_DIM = 512
_STALE_AFTER_DAYS = 30
_POOL_PREFILTER_THRESHOLD = 5000
_POOL_PREFILTER_KEEP = 2500
_FASTEMBED_UNAVAIL = object()

_WEIGHTS = {"semantic": 0.60, "skill_overlap": 0.25, "exp_fit": 0.15}
_LEVEL_RANGES: Dict[str, Tuple[Optional[float], Optional[float]]] = {
    "ENTRY": (0.0, 2.0),
    "MID": (2.0, 5.0),
    "SENIOR": (5.0, 10.0),
    "LEAD": (8.0, 15.0),
    "ANY": (None, None),
}

# fastembed model instance (lazy; None = not tried, sentinel = unavailable)
_FASTEMBED_MODEL: Any = None
_TAXONOMY_SEEDED = False

_TOKEN_RE = re.compile(r"[a-z0-9+#./-]+")


# ── embedding backends ───────────────────────────────────────────────

def _hashbow(text: str) -> np.ndarray:
    """Pure-numpy hashed bag-of-words (512 buckets, L2-normalized)."""
    vec = np.zeros(_HASH_DIM, dtype="float32")
    for tok in _TOKEN_RE.findall((text or "").lower()):
        h = int(hashlib.sha1(tok.encode("utf-8")).hexdigest()[:12], 16)
        vec[h % _HASH_DIM] += 1.0
    n = float(np.linalg.norm(vec))
    if n > 0:
        vec /= n
    return vec


def _try_init_fastembed() -> Optional[Any]:
    """Lazily instantiate fastembed.TextEmbedding(). Blocking — call via to_thread."""
    global _FASTEMBED_MODEL
    mod = import_optional("fastembed")
    if mod is None:
        return None
    if _FASTEMBED_MODEL is _FASTEMBED_UNAVAIL:
        return None
    if _FASTEMBED_MODEL is not None:
        return _FASTEMBED_MODEL
    try:
        _FASTEMBED_MODEL = mod.TextEmbedding()  # may download ONNX weights once
        return _FASTEMBED_MODEL
    except Exception as e:
        logger.warning("fastembed init failed (%s) — using hash-BOW fallback", e)
        _FASTEMBED_MODEL = _FASTEMBED_UNAVAIL
        return None


# module-level binding used by _try_init_fastembed
_FASTEMBED_MODEL: Any = None


async def _active_tag() -> str:
    """Which embedding backend is usable right now."""
    if await asyncio.to_thread(_try_init_fastembed) is not None:
        return "fastembed"
    return "hashbow"


async def _embed_text_batch(texts: List[str]) -> Tuple[np.ndarray, str]:
    """Embed `texts` with the best available backend; (vectors, model_tag)."""
    tag = "hashbow"
    model = await asyncio.to_thread(_try_init_fastembed)
    if model is not None:
        try:
            arr = await asyncio.to_thread(model, list(texts))
            return np.asarray(arr, dtype="float32"), "fastembed"
        except Exception as e:
            logger.warning("fastembed inference failed (%s) — hash-BOW fallback", e)
    return np.stack([_hashbow(t) for t in texts]), tag


def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    na = float(np.linalg.norm(a))
    nb = float(np.linalg.norm(b))
    if na == 0.0 or nb == 0.0:
        return 0.0
    return max(0.0, float(np.dot(a, b) / (na * nb)))


def _embedding_fresh(doc: Optional[Dict[str, Any]]) -> bool:
    ts = doc.get("updated_at") if doc else None
    if ts is None:
        return False
    if ts.tzinfo is None:
        from datetime import timezone
        ts = ts.replace(tzinfo=timezone.utc)
    return ts >= now_utc() - timedelta(days=_STALE_AFTER_DAYS)


# ── text / factor builders (pure, unit-testable) ─────────────────────

def _candidate_text(p: Dict[str, Any]) -> str:
    parts: List[str] = [p.get("headline"), p.get("bio"), p.get("education"), p.get("current_role")]
    skills = p.get("skills")
    if isinstance(skills, list):
        parts.extend(str(s) for s in skills)
    elif isinstance(skills, str):
        parts.append(skills)
    return " ".join(x for x in parts if x)


def _opening_text(o: Dict[str, Any]) -> str:
    parts: List[str] = [o.get("title"), o.get("company_name"), o.get("description")]
    skills = o.get("skills")
    if isinstance(skills, list):
        parts.append(" ".join(str(s) for s in skills))
    elif isinstance(skills, str):
        parts.append(skills)
    reqs = o.get("requirements")
    if isinstance(reqs, list):
        parts.append(" ".join(str(r) for r in reqs))
    return " ".join(x for x in parts if x)


def _exp_range(opening: Dict[str, Any]) -> Tuple[Optional[float], Optional[float]]:
    mn = opening.get("min_experience")
    mx = opening.get("max_experience")
    if mn is None and mx is None:
        mn, mx = _LEVEL_RANGES.get(str(opening.get("experience_level") or "ANY").upper(), (None, None))
    return (float(mn) if mn is not None else None, float(mx) if mx is not None else None)


def _candidate_exp_years(p: Dict[str, Any]) -> Optional[float]:
    v = p.get("experience_years")
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _exp_fit(exp_years: Optional[float], mn: Optional[float], mx: Optional[float]) -> float:
    """1.0 inside [mn, mx]; linear decay to 0 at E=0 below mn; linear decay to
    0 five years above mx; 0.5 neutral when exp unknown or no bounds set."""
    if exp_years is None or (mn is None and mx is None):
        return 0.5
    lo = mn if mn is not None else 0.0
    if exp_years < lo:
        return max(0.0, exp_years / lo) if lo > 0 else 1.0
    if mx is not None and exp_years > mx:
        return max(0.0, 1.0 - (exp_years - mx) / 5.0)
    return 1.0


def _normalize_skill_list(skills: Optional[List[str]]) -> List[str]:
    """Canonicalize via the house taxonomy alias maps (sync, hot-path safe)."""
    out: List[str] = []
    seen = set()
    for s in skills or []:
        canon, _method = normalize_skill(s)
        if not canon:
            continue
        k = canon.lower()
        if k not in seen:
            seen.add(k)
            out.append(canon)
    return out


def _skill_overlap(cand_skills: List[str], req_skills: List[str]) -> Tuple[float, List[str], List[str]]:
    """(factor 0..1, matched required skills, missing required skills).

    Full credit (1.0) for an exact canonical match; partial (0.5) when the
    required skill is a substring of a held skill or vice-versa; else 0.
    No required skills → 0.5 neutral (the factor contributes nothing
    decisive either way).
    """
    if not req_skills:
        return 0.5, [], []
    held = [s.lower() for s in cand_skills]
    total = 0.0
    matched: List[str] = []
    missing: List[str] = []
    for r in req_skills:
        rl = r.lower()
        if rl in held:
            credit = 1.0
        else:
            credit = 0.0
            for c in held:
                if c != rl and (rl in c or c in rl):
                    credit = 0.5
                    break
        total += credit
        (matched if credit > 0 else missing).append(r)
    return min(1.0, total / len(req_skills)), matched, missing


def _factors_total(semantic: float, skill: float, exp: float) -> float:
    return _WEIGHTS["semantic"] * semantic + _WEIGHTS["skill_overlap"] * skill + _WEIGHTS["exp_fit"] * exp


def _badge(pct: int) -> str:
    if pct >= 80:
        return "strong match"
    if pct >= 50:
        return "partial"
    return "weak"


# ── db helpers ───────────────────────────────────────────────────────

async def _ensure_taxonomy_seeded(db) -> None:
    global _TAXONOMY_SEEDED
    if _TAXONOMY_SEEDED:
        return
    try:
        await ensure_taxonomy(db)
        _TAXONOMY_SEEDED = True
    except Exception as e:
        logger.warning("ensure_taxonomy failed (%s) — continuing with alias maps", e)


async def _load_candidate(db, candidate_id: str) -> Optional[Dict[str, Any]]:
    cid = str(candidate_id)
    p = await db.talent_pool.find_one({"id": cid})
    if p:
        return p
    if ObjectId.is_valid(cid):
        p = await db.talent_pool.find_one({"_id": ObjectId(cid)})
        return p
    return None


async def _resolve_opening(db, opening: Any) -> Dict[str, Any]:
    """Accept a career_opening id (str/ObjectId) or a dict
    {title, skills, description, min_experience, max_experience, career_opening_id}."""
    if isinstance(opening, dict):
        return opening
    ref = opening if isinstance(opening, str) else str(opening)
    doc = await db.career_openings.find_one({"id": ref})
    if doc is None and ObjectId.is_valid(ref):
        doc = await db.career_openings.find_one({"_id": ObjectId(ref)})
    if doc is None:
        raise ValueError(f"career opening not found: {ref!r}")
    return doc


def _opening_ref(opening: Dict[str, Any], raw: Any) -> str:
    for key in ("career_opening_id", "id"):
        if opening.get(key):
            return str(opening[key])
    if not isinstance(opening, dict):
        return str(raw)
    return "adhoc-opening"


async def _fetch_candidate_vectors(
    db, candidates: List[Dict[str, Any]], current_tag: str
) -> Dict[str, np.ndarray]:
    """Load cached embeddings in one query, recompute stale/missing, bulk-persist."""
    vectors: Dict[str, np.ndarray] = {}
    cids = [str(p.get("id") or p.get("_id")) for p in candidates]
    todo = list(candidates)
    if cids:
        cached = await db.candidate_embeddings.find(
            {"candidate_id": {"$in": cids}},
            {"candidate_id": 1, "model_tag": 1, "vector": 1, "updated_at": 1},
        ).to_list(500000)
        for doc in cached:
            if (
                doc.get("model_tag") == current_tag
                and doc.get("vector")
                and _embedding_fresh(doc)
            ):
                vectors[doc["candidate_id"]] = np.asarray(doc["vector"], dtype="float32")
        todo = [p for p in candidates if str(p.get("id") or p.get("_id")) not in vectors]
    if todo:
        texts = [_candidate_text(p) for p in todo]
        vecs, tag = await _embed_text_batch(texts)
        for p, v in zip(todo, vecs):
            vectors[str(p.get("id") or p.get("_id"))] = v
        bulk = db.candidate_embeddings.create_bulk_operation()
        for p, v in zip(todo, vecs):
            bulk.replace_one(
                {"candidate_id": str(p.get("id") or p.get("_id"))},
                {
                    "candidate_id": str(p.get("id") or p.get("_id")),
                    "model_tag": tag,
                    "dim": int(len(v)),
                    "vector": [float(x) for x in v],
                    "text": _candidate_text(p)[:4000],
                    "updated_at": now_utc(),
                },
                upsert=True,
            )
        await bulk.commit()
    return vectors


# ── public API ───────────────────────────────────────────────────────

async def embed_candidate(db, candidate_id: str) -> Dict[str, Any]:
    """Ensure a fresh embedding for one candidate; report backend + cache hit."""
    p = await _load_candidate(db, candidate_id)
    if p is None:
        return {"candidate_id": str(candidate_id), "model_tag": "none", "dim": 0,
                "cached": False, "error": "candidate not found"}
    cid = str(p.get("id") or p.get("_id"))
    current_tag = await _active_tag()
    doc = await db.candidate_embeddings.find_one({"candidate_id": cid})
    cached = bool(
        doc
        and doc.get("model_tag") == current_tag
        and doc.get("vector")
        and _embedding_fresh(doc)
    )
    tag = current_tag
    dim = 0
    if not cached:
        vecs, tag = await _embed_text_batch([_candidate_text(p)])
        v = vecs[0]
        dim = int(len(v))
        await db.candidate_embeddings.update_one(
            {"candidate_id": cid},
            {"$set": {
                "model_tag": tag,
                "dim": dim,
                "vector": [float(x) for x in v],
                "text": _candidate_text(p)[:4000],
                "updated_at": now_utc(),
            }},
            upsert=True,
        )
    else:
        dim = int(doc.get("dim") or 0)
    return {"candidate_id": cid, "model_tag": tag, "dim": dim, "cached": cached}


async def match_candidates(db, opening: Any, k: int = 10) -> Dict[str, Any]:
    """Score the active pool against one opening; return the top-K breakdown.

    `opening` is a career_openings id or a dict {title, skills, description,
    min_experience, max_experience}. Result keys:
        opening {id, title}
        results [{candidate_id, full_name, total_score,
                  factors {semantic, skill_overlap, exp_fit},
                  matched_skills, missing_skills}]
        model_tag, candidate_pool_size, pre_filtered
    Top-K is persisted to talent_pool_match_scores; run row → scheduler_logs.
    """
    t0 = time.monotonic()
    await _ensure_taxonomy_seeded(db)
    o = await _resolve_opening(db, opening)
    ref = _opening_ref(o, opening)
    mn, mx = _exp_range(o)
    req_skills = [s for s in await canonicalize_skills(db, o.get("skills") or [], source=_AGENT) if s]
    opening_vecs, tag = await _embed_text_batch([_opening_text(o)])
    opening_vec = opening_vecs[0]

    active = await db.talent_pool.find(
        {"is_active": True},
        {"full_name": 1, "skills": 1, "experience_years": 1, "headline": 1, "bio": 1,
         "education": 1, "current_role": 1, "id": 1, "_id": 1},
    ).to_list(100000)
    pool_size = len(active)
    pre_filtered = False
    if pool_size > _POOL_PREFILTER_THRESHOLD:
        ranked = sorted(
            ((p, _exp_fit(_candidate_exp_years(p), mn, mx)) for p in active),
            key=lambda t: t[1],
            reverse=True,
        )
        active = [p for p, _f in ranked[:_POOL_PREFILTER_KEEP]]
        pre_filtered = True

    vectors = await _fetch_candidate_vectors(db, active, tag)

    scored: List[Dict[str, Any]] = []
    for p in active:
        cid = str(p.get("id") or p.get("_id"))
        cand_vec = vectors.get(cid)
        if cand_vec is None:
            continue
        sem = _cosine(cand_vec, opening_vec)
        cand_skills = _normalize_skill_list(p.get("skills"))
        skill_f, matched, missing = _skill_overlap(cand_skills, req_skills)
        exp = _candidate_exp_years(p)
        efit = _exp_fit(exp, mn, mx)
        total = _factors_total(sem, skill_f, efit)
        scored.append({
            "candidate_id": cid,
            "full_name": p.get("full_name") or "—",
            "total_score": round(total, 4),
            "factors": {"semantic": round(sem, 4), "skill_overlap": round(skill_f, 4),
                        "exp_fit": round(efit, 4)},
            "matched_skills": matched,
            "missing_skills": missing,
        })
    scored.sort(key=lambda r: r["total_score"], reverse=True)
    top = scored[: max(1, int(k))]

    # audit: persist top-K (upsert so re-runs refresh, not duplicate)
    if top:
        bulk = db.talent_pool_match_scores.create_bulk_operation()
        computed_at = now_utc()
        for r in top:
            bulk.replace_one(
                {"candidate_id": r["candidate_id"], "opening_ref": ref},
                {
                    "candidate_id": r["candidate_id"],
                    "full_name": r["full_name"],
                    "opening_ref": ref,
                    "score": r["total_score"],
                    "factors": r["factors"],
                    "matched_skills": r["matched_skills"],
                    "missing_skills": r["missing_skills"],
                    "model_tag": tag,
                    "computed_at": computed_at,
                },
                upsert=True,
            )
        await bulk.commit()

    await log_activity(
        db, _AGENT, "Match", object_id=ref, object_type="CareerOpening",
        summary=f"Matched {pool_size} active candidates against '{o.get('title') or ref}'; "
                f"top score {top[0]['total_score'] if top else 0:.3f}",
        data={"opening_ref": ref, "k": k, "model_tag": tag, "pre_filtered": pre_filtered},
        collection="talent_pool",
    )
    await agent_run_log(
        db, _AGENT, "match_candidates",
        status="SUCCESS",
        detail={"opening_ref": ref, "k": k, "candidate_pool_size": pool_size,
                "pre_filtered": pre_filtered, "model_tag": tag,
                "top_score": top[0]["total_score"] if top else 0.0,
                "duration_s": round(time.monotonic() - t0, 2)},
    )
    return {
        "opening": {"id": ref, "title": o.get("title")},
        "results": top,
        "model_tag": tag,
        "candidate_pool_size": pool_size,
        "pre_filtered": pre_filtered,
    }


async def match_score(db, candidate_id: str, opening: Any) -> Dict[str, Any]:
    """Single-candidate hybrid breakdown (router /ai/match-score payload).

    Result keys: candidate_id, candidate_name, opening_ref, target_role,
    match_score_pct, badge ("strong match" | "partial" | "weak"),
    matched_skills, missing_skills, factors {semantic, skill_overlap,
    exp_fit, weights}, total_score, recommendation, model_tag.
    """
    t0 = time.monotonic()
    await _ensure_taxonomy_seeded(db)
    o = await _resolve_opening(db, opening)
    ref = _opening_ref(o, opening)
    mn, mx = _exp_range(o)
    req_skills = [s for s in await canonicalize_skills(db, o.get("skills") or [], source=_AGENT) if s]

    p = await _load_candidate(db, candidate_id)
    if p is None:
        raise ValueError(f"talent candidate not found: {candidate_id!r}")
    cid = str(p.get("id") or p.get("_id"))

    emb_info = await embed_candidate(db, cid)
    doc = await db.candidate_embeddings.find_one({"candidate_id": cid})
    cand_vec = np.asarray(doc["vector"], dtype="float32") if doc and doc.get("vector") else _hashbow(_candidate_text(p))
    ovec, tag = await _embed_text_batch([_opening_text(o)])
    sem = _cosine(cand_vec, ovec[0])

    cand_skills = _normalize_skill_list(p.get("skills"))
    skill_f, matched, missing = _skill_overlap(cand_skills, req_skills)
    exp = _candidate_exp_years(p)
    efit = _exp_fit(exp, mn, mx)
    total = _factors_total(sem, skill_f, efit)
    pct = int(round(total * 100))
    badge = _badge(pct)

    rec_parts = [
        f"{p.get('full_name') or 'Candidate'} is a {badge} for "
        f"'{o.get('title') or ref}' ({pct}%).",
        f" {len(matched)} of {len(req_skills)} required skills matched"
        + (f" ({', '.join(matched[:5])})" if matched else "")
        + (f"; gaps: {', '.join(missing[:4])}." if missing else "."),
        f" Semantic cosine {sem:.2f} (backend: {tag}).",
    ]
    if exp is not None:
        band = f"{mn if mn is not None else 0}–{mx if mx is not None else '∞'}y"
        rec_parts.append(f" Experience {exp:g}y vs band {band} (fit {efit:.2f}).")
    else:
        rec_parts.append(" Experience not on file (neutral 0.50 fit applied).")
    recommendation = " ".join(rec_parts)

    await db.talent_pool_match_scores.update_one(
        {"candidate_id": cid, "opening_ref": ref},
        {"$set": {
            "candidate_id": cid,
            "full_name": p.get("full_name"),
            "opening_ref": ref,
            "score": round(total, 4),
            "factors": {"semantic": round(sem, 4), "skill_overlap": round(skill_f, 4),
                        "exp_fit": round(efit, 4)},
            "matched_skills": matched,
            "missing_skills": missing,
            "model_tag": tag,
            "computed_at": now_utc(),
        }},
        upsert=True,
    )
    await log_activity(
        db, _AGENT, "Match", object_id=cid,
        summary=f"{p.get('full_name')} vs '{o.get('title') or ref}': {pct}% ({badge})",
        data={"opening_ref": ref, "score": round(total, 4), "model_tag": tag},
        collection="talent_pool",
    )
    await agent_run_log(
        db, _AGENT, "match_score",
        status="SUCCESS",
        detail={"candidate_id": cid, "opening_ref": ref, "pct": pct, "model_tag": tag,
                "embedding_cached": emb_info.get("cached"),
                "duration_s": round(time.monotonic() - t0, 2)},
    )
    return {
        "candidate_id": cid,
        "candidate_name": p.get("full_name") or "—",
        "opening_ref": ref,
        "target_role": o.get("title") or ref,
        "match_score_pct": pct,
        "badge": badge,
        "matched_skills": matched,
        "missing_skills": missing,
        "factors": {"semantic": round(sem, 4), "skill_overlap": round(skill_f, 4),
                    "exp_fit": round(efit, 4), "weights": _WEIGHTS},
        "total_score": round(total, 4),
        "recommendation": recommendation,
        "model_tag": tag,
    }


# ── dashboard agent card ─────────────────────────────────────────────

class _TalentMatchAgent:
    """Singleton handle (house agent-service pattern); all logic is the
    module functions above so callers may import either way."""
    pass


talent_match_agent = _TalentMatchAgent()


async def agent_status(db) -> Dict[str, Any]:
    """Dashboard card payload. status: idle (never run), ok (last run clean
    on fastembed), degraded (hash-BOW fallback active or last run failed)."""
    tag = await _active_tag()
    last = await db.scheduler_logs.find(
        {"agent": _AGENT}
    ).sort("started_at", -1).limit(1).to_list(1)
    last = last[0] if last else None
    if last is None:
        status = "idle"
    elif last.get("status") != "SUCCESS" or tag != "fastembed":
        status = "degraded"
    else:
        status = "ok"
    if tag == "fastembed":
        notes = "fastembed ONNX MiniLM active — local, $0/mo, no external API."
    else:
        notes = "fastembed unavailable — numpy hash-BOW fallback active; semantic factor is approximate."
    return {
        "name": "TP18 Semantic Matcher",
        "group": "intelligence",
        "priority": "P1",
        "status": status,
        "model_tag": tag,
        "est_cost_per_month": "$0 (local OSS)",
        "last_run_at": last.get("completed_at").isoformat() if last and last.get("completed_at") else None,
        "notes": notes,
    }
