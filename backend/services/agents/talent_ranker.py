"""
talent_ranker.py — TP19: ML candidate-ranking agent.

Ranks active talent_pool candidates for a career opening using either a
persisted logistic-regression model trained on real application outcomes
or a deterministic weighted cold-start formula when labels or scikit-learn
are unavailable.

Labels — per (candidate, opening) pair, derived from real data:
    source: career_applications joined to career_application_history
            (latest history row by changed_at wins, else application status)
    positive terminal: SELECTED, SHORTLISTED, INTERVIEWED
    negative terminal: REJECTED, NOT_SELECTED, WITHDRAWN, DROPPED
    any other status (APPLIED, IN_REVIEW, ...) carries no label.
Candidate link: application.student_id -> users.email -> talent_pool.email
(lowercased, enc:: PII transparently decrypted). Unlinked pairs are
skipped and counted in the reports ("unlinked").

Features (7, order is the model's feature vector):
    skill_overlap_ratio  |canonical skills ∩ required skills| / |required|
    exp_fit              1.0 within [min, max] years, else linear decay to 0
    years_norm           min(experience_years / 10, 1.0)
    quality_norm         quality_score / 100 (0 when missing)
    has_linkedin         0/1 linkedin_url presence
    source_score         linkedin 1.0 / github 0.9 / platform 0.8 /
                         csv 0.7 / import 0.7 / manual 0.5 / else 0.5
    recency              days since newest(last_synced_at, imported_at) / 365,
                         capped at 1.0; missing -> 1.0 (stalest possible)

Model: LogisticRegression(max_iter=1000, class_weight="balanced") when
labeled pairs >= 50; artifact pickled into db.talent_ranker_model
(single doc, _id="primary"). Cold start (< 50 labels or sklearn missing):
score = 100 * Σ w_i·v_i with documented weights skill 0.30, exp 0.25,
quality 0.15, recency 0.10 (v = 1 - recency), source 0.10, linkedin 0.05,
years 0.05, plus a full per-factor breakdown.

KILL THE FAKE FIT SCORE: the frontend's fit-score pill is computed from a
name-length / string formula. That formula must be replaced by
rank_candidates() output (exposed via the suite's /rank endpoint); this
module is the only source of fit scores.
"""
from __future__ import annotations

import logging
import math
import pickle
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

from services.agents.talent_common import (
    agent_run_log,
    as_datetime,
    import_optional,
    log_activity,
    now_utc,
)
from services.agents.talent_skill_taxonomy import canonicalize_skills, normalize_skill

logger = logging.getLogger("talent_ranker")

_POSITIVE_STATUSES = {"SELECTED", "SHORTLISTED", "INTERVIEWED"}
_NEGATIVE_STATUSES = {"REJECTED", "NOT_SELECTED", "WITHDRAWN", "DROPPED"}
_MIN_LABELS = 50
_MODEL_DOC_ID = "primary"
_EPOCH = datetime.min.replace(tzinfo=timezone.utc)

# Fixed feature-vector order (model, training, and cold-start all use it).
_FEATURE_NAMES = [
    "skill_overlap_ratio",
    "exp_fit",
    "years_norm",
    "quality_norm",
    "has_linkedin",
    "source_score",
    "recency",
]
assert len(_FEATURE_NAMES) == 7

# Documented cold-start weights (sum to 1.0 -> score is 0-100 points).
_COLD_START_WEIGHTS: Dict[str, float] = {
    "skill_overlap_ratio": 0.30,
    "exp_fit": 0.25,
    "quality_norm": 0.15,
    "recency": 0.10,      # contribution uses v = 1 - recency (fresher = better)
    "source_score": 0.10,
    "has_linkedin": 0.05,
    "years_norm": 0.05,
}
assert abs(sum(_COLD_START_WEIGHTS.values()) - 1.0) < 1e-9

_SOURCE_SCORES: Dict[str, float] = {
    "linkedin": 1.0, "github": 0.9, "platform": 0.8,
    "csv": 0.7, "import": 0.7, "manual": 0.5,
}


# ── small pure helpers ─────────────────────────────────────────────────


def _norm_email(v: Any) -> Optional[str]:
    """Lowercased email; transparently unwraps enc:: Fernet-wrapped PII."""
    if not v:
        return None
    s = str(v).strip()
    if s.startswith("enc::"):
        try:
            from core.security import decrypt_value
            d = decrypt_value(s)
            if d:
                s = str(d)
        except Exception:
            pass
    s = s.lower().strip()
    return s or None


def _experience_years(p: Dict[str, Any]) -> float:
    try:
        v = float(p.get("experience_years") or 0)
    except (TypeError, ValueError):
        v = 0.0
    return max(v, 0.0)


def _quality_norm(p: Dict[str, Any]) -> float:
    q = p.get("quality_score")
    try:
        q = float(q)
    except (TypeError, ValueError):
        q = 0.0
    return max(0.0, min(q / 100.0, 1.0))


def _recency_raw(p: Dict[str, Any]) -> float:
    """0 = fresh, 1 = 365+ days stale or unknown (worst case)."""
    stamps = [t for t in (as_datetime(p.get("last_synced_at")), as_datetime(p.get("imported_at"))) if t]
    if not stamps:
        return 1.0
    days = (now_utc() - max(stamps)).total_seconds() / 86400.0
    return max(0.0, min(days / 365.0, 1.0))


def _source_score(p: Dict[str, Any]) -> float:
    return _SOURCE_SCORES.get(str(p.get("source") or "").strip().lower(), 0.5)


def _exp_fit(yrs: float, min_y: Optional[float], max_y: Optional[float]) -> float:
    """1.0 when inside [min, max] years; linear decay toward 0 outside it."""
    lo = 0.0 if min_y is None else float(min_y)
    if max_y is None:
        val = 1.0 if yrs >= lo else ((yrs / lo) if lo > 0 else 1.0)
    else:
        hi = float(max_y)
        if lo <= yrs <= hi:
            val = 1.0
        elif yrs < lo:
            val = (yrs / lo) if lo > 0 else 1.0
        else:
            val = (hi / yrs) if yrs > 0 else 0.0
    return max(0.0, min(val, 1.0))


def _first_num(d: Optional[Dict[str, Any]], *keys: str) -> Optional[float]:
    for key in keys:
        v = (d or {}).get(key)
        if v is None or isinstance(v, bool):
            continue
        try:
            return float(v)
        except (TypeError, ValueError):
            continue
    return None


def _sigmoid(z: float) -> float:
    z = max(min(z, 50.0), -50.0)
    return 1.0 / (1.0 + math.exp(-z))


# ── opening / candidate feature builders ───────────────────────────────


async def _opening_features(db, opening: Dict[str, Any]) -> Dict[str, Any]:
    """Canonical required skills + tolerant min/max experience bounds."""
    opening = opening or {}
    raw: List[Any] = []
    for key in ("required_skills", "must_have_skills", "skills", "tech_stack"):
        v = opening.get(key)
        if isinstance(v, list) and v:
            raw = [str(s) for s in v]
            break
    canonical = await canonicalize_skills(db, raw, source="career_opening") if raw else []
    return {
        "canonical": canonical,
        "skill_set": {s.lower() for s in canonical},
        "min_exp": _first_num(opening, "min_exp_years", "min_experience", "min_experience_years"),
        "max_exp": _first_num(opening, "max_exp_years", "max_experience", "max_experience_years"),
    }


def _candidate_features(
    profile: Dict[str, Any],
    opening_f: Dict[str, Any],
    skill_cache: Dict[str, Set[str]],
) -> Tuple[List[float], Dict[str, float], List[str], List[str]]:
    """Feature vector (+ raw value map, matched/missing skills) for one profile.

    Candidate skills are normalized with the pure normalize_skill() and
    cached per call so ranking thousands of profiles causes no taxonomy
    write churn (the opening side is the one place that bumps usage_count).
    """
    pid = str(profile.get("id") or profile["_id"])
    cset = skill_cache.get(pid)
    if cset is None:
        canon: List[str] = []
        for s in profile.get("skills") or []:
            c, _method = normalize_skill(str(s))
            if c:
                canon.append(c.lower())
        cset = set(canon)
        skill_cache[pid] = cset
    opening_skills = opening_f["canonical"]
    oset = opening_f["skill_set"]
    matched = [s for s in opening_skills if s.lower() in cset]
    missing = [s for s in opening_skills if s.lower() not in cset]

    yrs = _experience_years(profile)
    overlap = (len(cset & oset) / len(oset)) if oset else 0.0
    vals: Dict[str, float] = {
        "skill_overlap_ratio": overlap,
        "exp_fit": _exp_fit(yrs, opening_f["min_exp"], opening_f["max_exp"]),
        "years_norm": min(yrs / 10.0, 1.0),
        "quality_norm": _quality_norm(profile),
        "has_linkedin": 1.0 if str(profile.get("linkedin_url") or "").strip() else 0.0,
        "source_score": _source_score(profile),
        "recency": _recency_raw(profile),
    }
    row = [float(vals[name]) for name in _FEATURE_NAMES]
    return row, vals, matched, missing


# ── labels + candidate linking ─────────────────────────────────────────


async def _student_email_map(db, student_ids: Set[str]) -> Dict[str, Optional[str]]:
    if not student_ids:
        return {}
    from bson import ObjectId
    oids: List[Any] = []
    for sid in student_ids:
        try:
            oids.append(ObjectId(sid))
        except Exception:
            continue
    if not oids:
        return {}
    out: Dict[str, Optional[str]] = {}
    docs = await db.users.find({"_id": {"$in": oids}}, {"email": 1}).to_list(length=len(oids))
    for u in docs:
        out[str(u["_id"])] = _norm_email(u.get("email"))
    return out


async def _labeled_pairs(db) -> Tuple[Dict[Tuple[str, str], int], int, int, int]:
    """Build {(profile_id, opening_id): label} from real application outcomes.

    Returns (pair_map, unlinked_app_count, n_positive, n_negative).
    pair_map dedupes multiple applications to the same pair (last wins).
    """
    apps = await db.career_applications.find({}).to_list(length=200000)
    if not apps:
        return {}, 0, 0, 0
    hist = await db.career_application_history.find({}).to_list(length=400000)
    hist.sort(key=lambda h: as_datetime(h.get("changed_at")) or _EPOCH)
    latest: Dict[str, str] = {}
    for h in hist:
        aid = str(h.get("application_id") or "")
        ns = str(h.get("new_status") or "").strip().upper()
        if aid and ns:
            latest[aid] = ns

    email_by_student = await _student_email_map(
        db, {str(a.get("student_id")) for a in apps if a.get("student_id")}
    )
    profiles = await db.talent_pool.find({"is_active": True}).to_list(length=200000)
    email_to_pid: Dict[str, str] = {}
    for p in profiles:
        em = _norm_email(p.get("email"))
        if em:
            email_to_pid[em] = str(p.get("id") or p["_id"])

    pair_label: Dict[Tuple[str, str], int] = {}
    unlinked = 0
    for a in apps:
        status = latest.get(str(a.get("id") or "")) or str(a.get("status") or "").strip().upper()
        if status in _POSITIVE_STATUSES:
            label = 1
        elif status in _NEGATIVE_STATUSES:
            label = 0
        else:
            continue
        oid = str(a.get("career_opening_id") or "")
        if not oid:
            continue
        pid = email_to_pid.get(email_by_student.get(str(a.get("student_id") or "")) or "")
        if not pid:
            unlinked += 1
            continue
        pair_label[(pid, oid)] = label
    n_pos = sum(1 for v in pair_label.values() if v == 1)
    return pair_label, unlinked, n_pos, len(pair_label) - n_pos


async def _openings_map(db, oids: Set[str]) -> Dict[str, Dict[str, Any]]:
    oids = sorted(oids)
    if not oids:
        return {}
    docs = await db.career_openings.find({"id": {"$in": oids}}).to_list(length=len(oids) + 50)
    m = {str(d.get("id") or d["_id"]): d for d in docs}
    missing = [o for o in oids if o not in m]
    if missing:
        from bson import ObjectId
        try:
            oid_objs = [ObjectId(o) for o in missing]
        except Exception:
            oid_objs = []
        if oid_objs:
            docs2 = await db.career_openings.find({"_id": {"$in": oid_objs}}).to_list(length=len(oid_objs) + 50)
            for d in docs2:
                m[str(d.get("id") or d["_id"])] = d
    return m


# ── model artifact (db.talent_ranker_model) ───────────────────────────


async def _load_model(db) -> Tuple[Optional[Any], Optional[Dict[str, Any]]]:
    if import_optional("sklearn") is None:
        return None, None
    doc = await db.talent_ranker_model.find_one({"_id": _MODEL_DOC_ID})
    if not doc or not doc.get("blob"):
        return None, doc
    try:
        model = pickle.loads(doc["blob"])
        if not hasattr(model, "coef_"):
            return None, doc
        return model, doc
    except Exception as e:
        logger.warning("talent_ranker unpickle failed (run retrain): %s", e)
        return None, doc


async def _persist_model(db, model: Any, n_pos: int, n_neg: int) -> int:
    doc = await db.talent_ranker_model.find_one({"_id": _MODEL_DOC_ID})
    version = (int(doc.get("version") or 0) + 1) if doc else 1
    await db.talent_ranker_model.replace_one(
        {"_id": _MODEL_DOC_ID},
        {
            "_id": _MODEL_DOC_ID,
            "version": version,
            "blob": pickle.dumps(model, protocol=4),   # BSON binary
            "trained_at": now_utc(),
            "n_positive": n_pos,
            "n_negative": n_neg,
            "feature_names": _FEATURE_NAMES,
        },
        upsert=True,
    )
    return version


# ── public API ─────────────────────────────────────────────────────────


async def rank_candidates(db, opening: Optional[Dict[str, Any]] = None, k: int = 20) -> Dict[str, Any]:
    """Rank active candidates for one opening.

    Uses the persisted ML model when one exists AND labeled pairs >= 50,
    otherwise the documented cold-start formula. `factors` is points-toward-
    the-100-scale (cold start) or per-feature log-odds contribution
    x_i·coef_i (ML).
    """
    opening_f = await _opening_features(db, opening or {})
    skill_cache: Dict[str, Set[str]] = {}
    profiles = await db.talent_pool.find({"is_active": True}).to_list(length=200000)

    pair_label, _unlinked, _n_pos, _n_neg = await _labeled_pairs(db)
    label_count = len(pair_label)

    model, _doc = await _load_model(db)
    use_ml = model is not None and label_count >= _MIN_LABELS
    ml_coef = [float(c) for c in model.coef_[0]] if use_ml else None
    ml_intercept = float(model.intercept_[0]) if use_ml else 0.0

    entries: List[Dict[str, Any]] = []
    for p in profiles:
        row, vals, matched, missing = _candidate_features(p, opening_f, skill_cache)
        if use_ml:
            z = ml_intercept + sum(c * x for c, x in zip(ml_coef, row))
            score = round(_sigmoid(z) * 100.0, 2)
            factors = {name: round(c * x, 4) for name, c, x in zip(_FEATURE_NAMES, ml_coef, row)}
        else:
            factors = {}
            total = 0.0
            for name in _FEATURE_NAMES:
                w = _COLD_START_WEIGHTS[name]
                v = (1.0 - vals[name]) if name == "recency" else vals[name]
                pts = w * v * 100.0
                factors[name] = round(pts, 2)
                total += pts
            score = round(total, 2)
        entries.append({
            "candidate_id": str(p.get("id") or p["_id"]),
            "full_name": p.get("full_name"),
            "score": score,
            "factors": factors,
            "matched_skills": matched,
            "missing_skills": missing,
        })
    entries.sort(key=lambda e: e["score"], reverse=True)

    top_factors_global: List[str] = []
    if use_ml and ml_coef is not None:
        top_factors_global = [
            n for n, _a in sorted(
                zip(_FEATURE_NAMES, [abs(c) for c in ml_coef]), key=lambda t: t[1], reverse=True
            )[:3]
        ]

    return {
        "model_used": "ml" if use_ml else "cold_start",
        "label_count": label_count,
        "results": entries[:k],
        "top_factors_global": top_factors_global,
    }


async def retrain(db) -> Dict[str, Any]:
    """Fit + persist the logistic-regression artifact. Cold-starts when
    labels < 50 or sklearn is unavailable (never raises)."""
    t0 = time.monotonic()
    pair_label, unlinked, n_pos, n_neg = await _labeled_pairs(db)
    total = n_pos + n_neg
    base: Dict[str, Any] = {
        "trained": False,
        "n_positive": n_pos,
        "n_negative": n_neg,
        "accuracy_sample": None,
        "model_version": None,
    }
    if import_optional("sklearn") is None:
        base["reason"] = "sklearn unavailable — cold start in effect"
        await agent_run_log(db, "talent_ranker", "retrain", "ERROR", detail=base, error="sklearn import failed")
        return base
    if total < _MIN_LABELS:
        base["reason"] = f"insufficient labels ({total} < {_MIN_LABELS}) — cold start in effect"
        await agent_run_log(db, "talent_ranker", "retrain", "COLD_START", detail=base)
        return base

    lm = import_optional("sklearn.linear_model")
    model = lm.LogisticRegression(max_iter=1000, class_weight="balanced")

    opening_map = await _openings_map(db, {oid for _pid, oid in pair_label})
    profiles = {str(p.get("id") or p["_id"]): p
                for p in await db.talent_pool.find({"is_active": True}).to_list(length=200000)}
    of_cache: Dict[str, Dict[str, Any]] = {}
    skill_cache: Dict[str, Set[str]] = {}
    X: List[List[float]] = []
    y: List[int] = []
    for (pid, oid), label in pair_label.items():
        if oid not in of_cache:
            of_cache[oid] = await _opening_features(db, opening_map.get(oid) or {})
        p = profiles.get(pid)
        if p is None:
            continue
        row, _vals, _m, _ms = _candidate_features(p, of_cache[oid], skill_cache)
        X.append(row)
        y.append(label)
    if len(y) < _MIN_LABELS:
        base["reason"] = f"only {len(y)} linkable feature rows after candidate resolution"
        await agent_run_log(db, "talent_ranker", "retrain", "COLD_START", detail=base)
        return base

    model.fit(X, y)
    accuracy = float(model.score(X, y))
    version = await _persist_model(db, model, n_pos, n_neg)
    out: Dict[str, Any] = {
        "trained": True,
        "n_positive": n_pos,
        "n_negative": n_neg,
        "accuracy_sample": round(accuracy, 4),
        "model_version": version,
    }
    await agent_run_log(
        db, "talent_ranker", "retrain", "SUCCESS", detail={**out, "unlinked": unlinked},
        duration_ms=int((time.monotonic() - t0) * 1000),
    )
    await log_activity(
        db, "talent_ranker", "Rank",
        summary=f"Retrained candidate ranker (v{version}, in-sample acc {accuracy:.2f}, {n_pos}+ / {n_neg}-)",
    )
    return out


async def ranking_health(db) -> Dict[str, Any]:
    """Label/model posture for the dashboard health row."""
    pair_label, unlinked, _n_pos, _n_neg = await _labeled_pairs(db)
    label_count = len(pair_label)
    ml_available = import_optional("sklearn") is not None
    model_doc = await db.talent_ranker_model.find_one({"_id": _MODEL_DOC_ID})
    trained_at = as_datetime(model_doc.get("trained_at")) if model_doc else None
    model_age_days = (
        round((now_utc() - trained_at).total_seconds() / 86400.0, 1) if trained_at else None
    )
    model_used_now = (
        "ml"
        if ml_available and model_doc and model_doc.get("blob") and label_count >= _MIN_LABELS
        else "cold_start"
    )
    return {
        "label_count": label_count,
        "unlinked": unlinked,
        "ml_available": ml_available,
        "model_age_days": model_age_days,
        "model_used_now": model_used_now,
    }


# ── singleton + dashboard status ───────────────────────────────────────


class TalentRankerAgent:
    """TP19 facade singleton for agent-dashboard registration."""
    name = "TP19 Candidate Ranker"
    group = "intelligence"
    priority = "P1"
    est_cost_per_month = "$0 (local OSS)"

    @staticmethod
    async def rank(db, opening: Optional[Dict[str, Any]] = None, k: int = 20):
        return await rank_candidates(db, opening, k=k)

    @staticmethod
    async def retrain(db):
        return await retrain(db)

    @staticmethod
    async def health(db):
        return await ranking_health(db)


TalentRanker = TalentRankerAgent()


async def agent_status(db) -> Dict[str, Any]:
    status = "idle"
    try:
        doc = await db.talent_ranker_model.find_one({"_id": _MODEL_DOC_ID})
        status = "ok" if (doc and doc.get("blob")) else "cold_start"
    except Exception as e:
        logger.warning("talent_ranker agent_status probe failed: %s", e)
        status = "idle"
    return {
        "name": TalentRanker.name,
        "group": TalentRanker.group,
        "priority": TalentRanker.priority,
        "status": status,
        "est_cost_per_month": TalentRanker.est_cost_per_month,
        "notes": (
            "Ranks candidates per opening: logistic regression (7 real-data features) "
            "once >= 50 labeled pairs exist, else documented cold-start formula. "
            "The frontend fit-score pill is a fake name-length formula and MUST be "
            "replaced with rank_candidates() output — this agent is the only source "
            "of fit scores."
        ),
    }
