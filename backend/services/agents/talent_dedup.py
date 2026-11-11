"""
talent_dedup.py — TP20: cross-collection deduplication + entity resolution.

Scans talent_pool and db.contacts for duplicate profiles:
- Blocking: (first 3 chars of normalized full_name, email domain or "none").
- Pair similarity: rapidfuzz jaro_winkler on the normalized full_name AND on
  the email local-part (when both sides have an email);
  similarity = max(name_score, email_score) * 100; a pair is a duplicate
  when >= 85. recordlinkage (optional, via import_optional) acts as a second
  opinion — pairs it backs at >= 0.75 are flagged even when rapidfuzz is
  below threshold; when recordlinkage is absent the pure-rapidfuzz path is
  the fallback.
- Groups are union-find'ed, persisted to db.talent_pool_dedup_groups
  (status "open") and merge_candidates() resolves them on merge.

Merges are conservative: empty keeper fields are backfilled from the dropped
doc, skills are unioned + canonicalized, PII (email/phone) always prefers the
keeper, and no non-empty keeper value is ever silently overwritten — a
conflict is recorded instead. Audit goes to db.talent_pool_merge_log; the
activity feed gets a "Merge" event via log_activity. Dropped docs are
soft-marked (is_active=False + merged_into=keeper_id) so merges stay
reversible.

repair_timestamps fixes the legacy bug where agent-written docs stored
ISO-string timestamps (last_synced_at / imported_at) while the router writes
datetimes, which silently broke the 24h-staleness query. The scheduler calls
it daily; the router merge endpoint calls it opportunistically before
acting on freshness.
"""
from __future__ import annotations

import hashlib
from typing import Any, Dict, List, Optional, Tuple

from services.agents.talent_common import (
    agent_run_log,
    as_datetime,
    import_optional,
    log_activity,
    normalize_email,
    normalize_text,
    now_utc,
)
from services.agents.talent_skill_taxonomy import canonicalize_skills
from services.agents.talent_compliance import pii_fields

_AGENT = "TP20 Dedup"
DUPLICATE_THRESHOLD = 85.0
_RECORDLINKAGE_THRESHOLD = 0.75

# PII fields prefer the keeper on conflict; empty ones still get backfilled.
_PII_FIELDS = ("email", "phone")
# Non-PII fields backfillable when the keeper's value is empty.
_BACKFILL_FIELDS = (
    "email", "phone", "linkedin_url", "github_url", "location", "education",
    "graduation_year", "current_role", "experience_years", "headline", "bio",
    "photo_url", "position", "company", "interests",
)
_TS_FIELDS = ("last_synced_at", "imported_at", "updated_at", "created_at")

_POOL_PROJECTION = {
    "id": 1, "full_name": 1, "email": 1, "phone": 1, "source": 1,
    "linkedin_url": 1, "github_url": 1, "quality_score": 1, "imported_at": 1,
    "is_active": 1,
}
_CONTACT_PROJECTION = {
    "id": 1, "full_name": 1, "name": 1, "email": 1, "phone": 1, "source": 1,
    "linkedin": 1, "linkedin_url": 1,
}


# ── similarity primitives ────────────────────────────────────────────

def _pure_jaro_winkler(a: str, b: str) -> float:
    """Pure-Python Jaro-Winkler (0..1) used only when rapidfuzz is missing."""
    a, b = a.lower(), b.lower()
    if a == b:
        return 1.0
    la, lb = len(a), len(b)
    if not la or not lb:
        return 0.0
    window = max(la, lb) // 2 - 1
    matches_a = [False] * la
    matches_b = [False] * lb
    m = 0
    for i, ca in enumerate(a):
        lo, hi = max(0, i - window), min(lb, i + window + 1)
        for j in range(lo, hi):
            if not matches_b[j] and b[j] == ca:
                matches_a[i] = matches_b[j] = True
                m += 1
                break
    if m < 2:
        return 0.0
    t = 0
    k = 0
    for i in range(la):
        if matches_a[i]:
            while not matches_b[k]:
                k += 1
            if a[i] != b[k]:
                t += 1
            k += 1
    jaro = (m / la + m / lb + (m - t / 2) / m) / 3
    prefix = 0
    while prefix < min(4, window) and a[prefix] == b[prefix]:
        prefix += 1
    if prefix:
        jaro += prefix * 0.1 * (1 - jaro)
    return jaro


def _jaro_winkler(a: Optional[str], b: Optional[str]) -> float:
    """0..1 similarity; rapidfuzz when available, pure-Python fallback."""
    a, b = (a or "").strip(), (b or "").strip()
    if not a and not b:
        return 1.0
    if not a or not b:
        return 0.0
    rf = import_optional("rapidfuzz")
    if rf is not None:
        try:
            return max(0.0, min(1.0, float(rf.jaro_winkler(a, b))))
        except Exception:
            pass
    return _pure_jaro_winkler(a, b)


def _recordlinkage_second_opinion(a: Dict[str, Any], b: Dict[str, Any]) -> Optional[float]:
    """Optional recordlinkage heuristic score (0..1); None when unavailable."""
    rl = import_optional("recordlinkage")
    if rl is None:
        return None
    try:
        ra = {"name": a.get("full_name", ""), "email_local": a.get("_local") or "", "domain": a.get("_domain", "")}
        rb = {"name": b.get("full_name", ""), "email_local": b.get("_local") or "", "domain": b.get("_domain", "")}
        rr = rl.Record(ra, rb)
        rc = rl.RecordComparator(rr)
        rc.compare(0, 1)
        return float(rc.get_score(0, 1))
    except Exception:
        return None


def _pair_similarity(a: Dict[str, Any], b: Dict[str, Any]) -> Tuple[float, List[str]]:
    """Return (similarity_pct, reasons) for one candidate pair."""
    reasons: List[str] = []
    name_sim = _jaro_winkler(a.get("full_name"), b.get("full_name"))
    email_sim = _jaro_winkler(a.get("_local"), b.get("_local")) if a.get("_local") and b.get("_local") else 0.0
    sim = max(name_sim, email_sim)
    reasons.append(f"name_jw={name_sim:.2f}")
    if a.get("_local") and b.get("_local"):
        reasons.append(f"email_local_jw={email_sim:.2f}")
    if a.get("_domain") not in (None, "", "none") and a.get("_domain") == b.get("_domain"):
        reasons.append(f"shared_email_domain={a['_domain']}")
    if a.get("collection") != b.get("collection"):
        reasons.append("cross_collection")
    return sim * 100.0, reasons


def _entry_from_doc(collection: str, doc: Dict[str, Any]) -> Dict[str, Any]:
    pii = pii_fields(doc)
    email = normalize_email(pii.get("email") or doc.get("email"))
    name = normalize_text(doc.get("full_name") or doc.get("name"))
    local = domain = None
    if email and "@" in email:
        local, domain = email.split("@", 1)
    return {
        "collection": collection,
        "id": str(doc.get("id") or doc["_id"]),
        "full_name": name,
        "email": email,
        "phone": pii.get("phone") or doc.get("phone"),
        "source": doc.get("source") or (collection if collection == "contacts" else "unknown"),
        "linkedin_url": doc.get("linkedin_url") or doc.get("linkedin"),
        "github_url": doc.get("github_url") or doc.get("github"),
        "quality_score": doc.get("quality_score"),
        "imported_at": doc.get("imported_at"),
        "_local": local,
        "_domain": domain or "none",
    }


def _pick_keeper(entries: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Highest quality_score; tie-break: has email > has linkedin > older imported_at."""
    def key(e: Dict[str, Any]):
        imp = as_datetime(e.get("imported_at"))
        ts = imp.timestamp() if imp else float("inf")
        return (
            -(int(e.get("quality_score") or 0)),
            -int(bool(e.get("email"))),
            -int(bool(e.get("linkedin_url") or e.get("github_url"))),
            ts,
        )
    return sorted(entries, key=key)[0]


# ── scan / group detection ───────────────────────────────────────────

async def find_duplicate_groups(db, limit: int = 5000) -> Dict[str, Any]:
    """Blocking + rapidfuzz scan across talent_pool and contacts.

    Returns {"groups": [{"group_id", "members": [{collection, id, full_name,
    email, source, similarity_within_group}], "reasons": [str],
    "suggested_keeper", "collections": [str]}], "pairs_checked", "groups_found"}.
    Groups are upserted into db.talent_pool_dedup_groups (status "open").
    """
    pool_docs = await db.talent_pool.find(
        {"is_active": {"$ne": False}}, _POOL_PROJECTION
    ).limit(limit).to_list(limit)
    contact_docs = await db.contacts.find({}, _CONTACT_PROJECTION).limit(limit).to_list(limit)

    entries: List[Dict[str, Any]] = []
    for d in pool_docs:
        entries.append(_entry_from_doc("talent_pool", d))
    for d in contact_docs:
        entries.append(_entry_from_doc("contacts", d))

    blocks: Dict[Tuple[str, str], List[int]] = {}
    for i, e in enumerate(entries):
        key = (e["full_name"][:3], e["_domain"])
        blocks.setdefault(key, []).append(i)

    parent = list(range(len(entries)))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(x: int, y: int) -> None:
        rx, ry = find(x), find(y)
        if rx != ry:
            parent[max(rx, ry)] = min(rx, ry)

    pairs_checked = 0
    pair_records: List[Tuple[int, int, float, List[str]]] = []
    for idxs in blocks.values():
        if len(idxs) < 2:
            continue
        for x in range(len(idxs)):
            for y in range(x + 1, len(idxs)):
                i, j = idxs[x], idxs[y]
                a, b = entries[i], entries[j]
                if not a["full_name"] and not a["_local"]:
                    continue
                if not b["full_name"] and not b["_local"]:
                    continue
                pairs_checked += 1
                sim, reasons = _pair_similarity(a, b)
                flagged = sim >= DUPLICATE_THRESHOLD
                rl_score = None
                if not flagged:
                    rl_score = _recordlinkage_second_opinion(a, b)
                    if rl_score is not None and rl_score >= _RECORDLINKAGE_THRESHOLD:
                        flagged = True
                        reasons.append(f"recordlinkage_support={rl_score:.2f}")
                if flagged:
                    union(i, j)
                    recorded = max(sim / 100.0, rl_score) if rl_score is not None else sim / 100.0
                    pair_records.append((i, j, recorded, reasons))

    groups_map: Dict[int, List[int]] = {}
    for i in range(len(entries)):
        groups_map.setdefault(find(i), []).append(i)

    groups: List[Dict[str, Any]] = []
    now = now_utc()
    for root, member_idxs in groups_map.items():
        if len(member_idxs) < 2:
            continue
        group_edges = [r for r in pair_records if find(r[0]) == root]
        min_sim = min((r[2] for r in group_edges), default=0.0) * 100.0
        reasons = sorted({r for _, _, _, rs in group_edges for r in rs})
        collections = sorted({entries[i]["collection"] for i in member_idxs})
        keeper = _pick_keeper([entries[i] for i in member_idxs])

        gkey = "|".join(sorted(f"{entries[i]['collection']}:{entries[i]['id']}" for i in member_idxs))
        gid = hashlib.sha1(gkey.encode()).hexdigest()[:16]
        members = [
            {
                "collection": entries[i]["collection"],
                "id": entries[i]["id"],
                "full_name": entries[i]["full_name"],
                "email": entries[i]["email"],
                "source": entries[i]["source"],
                "similarity_within_group": round(min_sim, 1),
            }
            for i in member_idxs
        ]
        group_doc = {
            "group_id": gid,
            "members": members,
            "reasons": reasons,
            "suggested_keeper": keeper["id"],
            "collections": collections,
        }
        groups.append(group_doc)
        await db.talent_pool_dedup_groups.update_one(
            {"group_id": gid},
            {"$set": {**group_doc, "status": "open", "updated_at": now},
             "$setOnInsert": {"found_at": now}},
            upsert=True,
        )

    result = {"groups": groups, "pairs_checked": pairs_checked, "groups_found": len(groups)}
    await agent_run_log(db, _AGENT, "scan", status="SUCCESS",
                        detail={"pairs_checked": pairs_checked, "groups_found": len(groups)})
    return result


# ── merge / entity resolution ────────────────────────────────────────

def _split_ref(ref: Any) -> Tuple[str, str]:
    """Accept "contacts:email@x.com", "talent_pool:<id>", a bare id, or {collection, id}."""
    if isinstance(ref, dict):
        return (ref.get("collection") or "talent_pool"), str(ref.get("id") or "")
    s = str(ref).strip()
    if ":" in s and s.split(":", 1)[0] in ("contacts", "talent_pool"):
        coll, rid = s.split(":", 1)
        return coll, rid
    return "talent_pool", s


async def _load_doc(db, collection: str, rid: str) -> Optional[Dict[str, Any]]:
    if not rid:
        return None
    if collection == "talent_pool":
        doc = await db.talent_pool.find_one({"id": rid})
        if doc:
            return doc
        try:
            from bson import ObjectId, InvalidId
            return await db.talent_pool.find_one({"_id": ObjectId(rid)})
        except (InvalidId, TypeError):
            return None
    doc = await db.contacts.find_one({"id": rid})
    if doc:
        return doc
    if "@" in rid:
        doc = await db.contacts.find_one({"email": rid.lower()})
        if doc:
            return doc
    try:
        from bson import ObjectId, InvalidId
        return await db.contacts.find_one({"_id": ObjectId(rid)})
    except (InvalidId, TypeError):
        return None


def _doc_fields(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Normalized merge view over a talent_pool or contacts doc."""
    pii = pii_fields(doc)
    return {
        "full_name": normalize_text(doc.get("full_name") or doc.get("name")),
        "email": normalize_email(pii.get("email") or doc.get("email")),
        "phone": pii.get("phone") or doc.get("phone"),
        "linkedin_url": doc.get("linkedin_url") or doc.get("linkedin"),
        "github_url": doc.get("github_url") or doc.get("github"),
        "location": doc.get("location"),
        "education": doc.get("education"),
        "graduation_year": doc.get("graduation_year"),
        "current_role": doc.get("current_role") or doc.get("position"),
        "experience_years": doc.get("experience_years"),
        "headline": doc.get("headline"),
        "bio": doc.get("bio"),
        "photo_url": doc.get("photo_url"),
        "interests": doc.get("interests") or doc.get("skills"),
    }


def _empty(v: Any) -> bool:
    return v is None or (isinstance(v, str) and not v.strip()) or (isinstance(v, list) and not v)


def _digits(v: Any) -> str:
    return "".join(ch for ch in str(v or "") if ch.isdigit())


def _values_differ(field: str, a: Any, b: Any) -> bool:
    if field == "email":
        return normalize_email(a) != normalize_email(b)
    if field == "phone":
        return _digits(a) != _digits(b)
    return str(a).strip().lower() != str(b).strip().lower()


def _merge_fields(keeper: Dict[str, Any], fields: Dict[str, Any], conflicts: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Field-wise merge: backfill empty keeper fields; PII + non-empty values never
    silently overwrite — differing values become conflict records, keeper wins."""
    patch: Dict[str, Any] = {}
    for f in _BACKFILL_FIELDS:
        kv, dv = keeper.get(f), fields.get(f)
        if _empty(kv) and not _empty(dv):
            patch[f] = dv
        elif not _empty(kv) and not _empty(dv) and _values_differ(f, kv, dv):
            conflicts.append({"field": f, "kept_value": kv, "discarded_value": dv})
    return patch


async def _resolve_groups(db, keeper_id: str, dropped: List[Dict[str, Any]]) -> None:
    ids = {keeper_id} | {d["id"] for d in dropped}
    now = now_utc()
    async for g in db.talent_pool_dedup_groups.find({"status": "open"}):
        gids = {str(m.get("id")) for m in g.get("members", [])}
        if gids & ids:
            await db.talent_pool_dedup_groups.update_one(
                {"_id": g["_id"]},
                {"$set": {"status": "resolved", "resolved_at": now, "resolved_by_merge": keeper_id}},
            )


async def merge_candidates(db, keep_ref, drop_refs, actor: str, reasons: Optional[List[str]] = None) -> Dict[str, Any]:
    """Merge duplicate docs into the keeper profile (soft, reversible).

    keep_ref: talent_pool id (or {collection, id}); drop_refs: talent_pool ids,
    "contacts:<email|id>" refs, or {collection, id} dicts. Backfills empty
    keeper fields, unions + canonicalizes skills, prefers the keeper for PII,
    and records conflicts. Dropped docs get is_active=False + merged_into.
    Audit: db.talent_pool_merge_log + a "Merge" activity event.
    Returns {"merged": n, "log_id"}.
    """
    keeper_id_in = keep_ref.get("id") if isinstance(keep_ref, dict) else keep_ref
    keeper = await _load_doc(db, "talent_pool", str(keeper_id_in))
    if not keeper:
        return {"merged": 0, "log_id": None, "error": "keeper_not_found"}

    keeper_id = str(keeper.get("id") or keeper["_id"])
    now = now_utc()
    merged = 0
    conflicts: List[Dict[str, Any]] = []
    dropped_meta: List[Dict[str, Any]] = []

    for ref in drop_refs or []:
        coll, rid = _split_ref(ref)
        doc = await _load_doc(db, coll, rid)
        if not doc or str(doc.get("id") or doc["_id"]) == keeper_id:
            continue
        fields = _doc_fields(doc)
        patch = _merge_fields(keeper, fields, conflicts)
        union_skills = list((keeper.get("skills") or []) + (fields.get("interests") or []))
        if union_skills:
            patch["skills"] = await canonicalize_skills(db, union_skills, source="dedup-merge")
        await db.talent_pool.update_one(
            {"_id": keeper["_id"]},
            {"$set": {**patch, "updated_at": now}},
        )
        qid = str(doc.get("id") or doc["_id"])
        await db[coll].update_one(
            {"_id": doc["_id"]},
            {"$set": {"is_active": False, "merged_into": keeper_id,
                      "merged_at": now, "merged_by": actor, "updated_at": now}},
        )
        merged += 1
        dropped_meta.append({"id": qid, "name": fields.get("full_name") or doc.get("name")})

    log_doc = await db.talent_pool_merge_log.insert_one({
        "merged_at": now,
        "keeper_id": keeper_id,
        "keeper_name": keeper.get("full_name"),
        "dropped": dropped_meta,
        "actor": actor,
        "conflicts": conflicts,
        "reasons": reasons or [],
    })
    if merged:
        await _resolve_groups(db, keeper_id, dropped_meta)
        await log_activity(
            db, actor, "Merge", object_id=keeper_id,
            summary=f"Merged {merged} duplicate(s) into {keeper.get('full_name') or keeper_id}",
            data={"dropped": [d["id"] for d in dropped_meta], "conflicts": conflicts},
            collection="talent_pool",
        )
    return {"merged": merged, "log_id": str(log_doc.inserted_id)}


# ── legacy timestamp repair ──────────────────────────────────────────

async def repair_timestamps(db, limit: int = 5000) -> Dict[str, int]:
    """Convert legacy ISO-string timestamps to tz-aware UTC datetimes in place.

    The old agent wrote last_synced_at/imported_at as ISO strings while the
    router writes datetimes, which broke the 24h-stale query (string-vs-date
    comparison). The scheduler calls this daily; the router merge endpoint
    calls it opportunistically before acting on freshness.
    """
    repaired = 0
    q = {"$or": [{f: {"$type": "string"}} for f in _TS_FIELDS]}
    async for doc in db.talent_pool.find(q).limit(limit):
        patch: Dict[str, Any] = {}
        for f in _TS_FIELDS:
            v = doc.get(f)
            if isinstance(v, str):
                dt = as_datetime(v)
                if dt:
                    patch[f] = dt
        if patch:
            res = await db.talent_pool.update_one({"_id": doc["_id"]}, {"$set": patch})
            repaired += res.modified_count
    return {"repaired": repaired}


# ── status / singleton ───────────────────────────────────────────────

async def agent_status(db) -> Dict[str, Any]:
    open_groups = await db.talent_pool_dedup_groups.count_documents({"status": "open"})
    last = await db.talent_pool_dedup_groups.find(
        {"found_at": {"$exists": True}}
    ).sort("found_at", -1).limit(1).to_list(1)
    last_scan = last[0].get("found_at") if last else None
    return {
        "name": _AGENT,
        "group": "intelligence",
        "priority": "P1",
        "status": "needs_review" if open_groups else "clean",
        "est_cost_per_month": "$0",
        "last_scan_at": last_scan.isoformat() if last_scan else None,
        "open_groups": open_groups,
    }


class TalentDedupAgent:
    """TP20 singleton — the scheduler entry point (module functions are the impl)."""

    name = _AGENT

    async def scan(self, db, limit: int = 5000) -> Dict[str, Any]:
        return await find_duplicate_groups(db, limit)

    async def merge(self, db, keep_ref, drop_refs, actor: str, reasons: Optional[List[str]] = None) -> Dict[str, Any]:
        return await merge_candidates(db, keep_ref, drop_refs, actor, reasons)

    async def repair(self, db, limit: int = 5000) -> Dict[str, int]:
        return await repair_timestamps(db, limit)

    async def agent_status(self, db) -> Dict[str, Any]:
        return await agent_status(db)


tp20_dedup_agent = TalentDedupAgent()
