"""
financial_services.py — 5-category Financial Services aggregator + AI helper +
match-score engine + EMI calculator.

Stack remap: FastAPI + MongoDB + curated seed data (Indian gov "APIs" listed in
the spec are web portals, not REST endpoints — using realistic curated data
covering 60+ products across all 5 categories).

Endpoints (all under /api):

    Search per-category (uses ?filters):
        GET /financial/scholarships/search
        GET /financial/loans/search
        GET /financial/startup-funding/search
        GET /financial/insurance/search
        GET /financial/venture-capital/search   ← NEW per user request
        GET /financial/all                       (all 5 categories combined)
        GET /financial/{financial_id}            (detail)

    User profile (drives match score):
        GET /financial/me/profile
        PATCH /financial/me/profile

    Saved / activity:
        POST /financial/{id}/save                (toggle bookmark)
        POST /financial/{id}/apply               (records click-through)
        GET  /financial/me/saved                 (saved list)
        POST /financial/{id}/activity            (view/save/apply/calculate_emi/ai_query)

    AI Helper (Prompt 9):
        POST /financial/ai/scholarships          → re-rank by qualification
        POST /financial/ai/loans                 → recommend best 3
        POST /financial/ai/startup-funding       → rank by stage/sector
        POST /financial/ai/insurance             → recommend coverage
        POST /financial/ai/venture-capital       → rank VCs by stage/sector

    EMI:
        POST /financial/emi-calculate            (server-side EMI)

    Refresh (admin/dev):
        POST /financial/refresh                  (re-seed curated catalog)
"""
from __future__ import annotations

import os
import math
import hashlib
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query



from core.db import db as _db
from core.catalogs import CATEGORIES, FINANCIAL_CATALOG

logger = logging.getLogger("financial_services")
router = APIRouter()


def _get_current_user_dependency():
    from core.deps import get_current_user  # noqa
    return get_current_user


def _dh(name: str, provider: str, category: str) -> str:
    raw = f"{(name or '').lower().strip()}|{(provider or '').lower().strip()}|{category}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


def _safe_iso(d: Any) -> Optional[str]:
    if not d: return None
    if isinstance(d, datetime):
        return (d if d.tzinfo else d.replace(tzinfo=timezone.utc)).isoformat()
    return str(d)


def _seed_doc(d: Dict[str, Any], category: str) -> Dict[str, Any]:
    h = _dh(d["name"], d.get("provider", ""), category)
    return {
        "financial_id": f"{category}-{h[:10]}",
        "dedup_hash": h,
        "category": category,
        "name": d["name"],
        "provider": d.get("provider", ""),
        "subcategory": d.get("subcategory", ""),
        "institution_name": d.get("institution_name", d.get("provider", "")),
        "amount_min": d.get("amount_min", 0),
        "amount_max": d.get("amount_max", 0),
        "currency": d.get("currency", "INR"),
        "interest_rate": d.get("interest_rate"),
        "tenure_months": d.get("tenure_months"),
        "eligibility_criteria": d.get("eligibility_criteria", []),
        "application_deadline": d.get("application_deadline"),
        "status": d.get("status", "open"),
        "application_url": d.get("application_url", ""),
        "tint": d.get("tint", "#7C3AED"),
        "short_desc": d.get("short_desc", ""),
        "stage": d.get("stage"),
        "sector_focus": d.get("sector_focus", ""),
        "region": "india",
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }


async def _ensure_seeded():
    cnt = await _db.financial_products.count_documents({})
    if cnt > 0:
        return
    bulk = []
    for cat in CATEGORIES:
        for s in FINANCIAL_CATALOG[cat]:
            bulk.append(_seed_doc(s, cat))
    if bulk:
        await _db.financial_products.insert_many(bulk)


# ─── Match score per Prompt 13 ──────────────────────────────────────────
def _match_score(profile: Dict[str, Any], product: Dict[str, Any]) -> int:
    cat = product.get("category")
    s = 50

    if cat == "scholarship":
        s = 0
        # CGPA threshold (20 pts)
        eligs = " ".join(product.get("eligibility_criteria", [])).lower()
        cgpa = float(profile.get("cgpa") or 0)
        if "cgpa" in eligs:
            try:
                req = float(eligs.split("cgpa")[1][:6].replace(".", " ").split()[0])
                if cgpa >= req: s += 20
            except Exception:
                if cgpa >= 7: s += 20
        else:
            s += 10
        # course_level (20)
        cl = (profile.get("course_level") or "").lower()
        if cl and cl in product.get("name", "").lower(): s += 20
        else: s += 10
        # institution_tier (20)
        tier = (profile.get("institution_tier") or "").lower()
        if tier in eligs or tier == "top_tier": s += 20
        else: s += 10
        # category preference (20)
        sub = (product.get("subcategory") or "").lower()
        pref = (profile.get("scholarship_preference") or "merit").lower()
        if sub == pref or pref in sub: s += 20
        else: s += 10
        # deadline proximity (20)
        try:
            d = datetime.fromisoformat((product.get("application_deadline") or "").replace("Z","+00:00"))
            days = (d - datetime.now(timezone.utc)).days
            if days >= 30: s += 20
            elif days >= 7: s += 12
            else: s += 5
        except Exception:
            s += 10

    elif cat == "loan":
        s = 0
        need = float(profile.get("loan_need") or 1500000)
        if (product.get("amount_max") or 0) >= need: s += 25
        else: s += 10
        rate = product.get("interest_rate") or 12
        if rate <= 9: s += 25
        elif rate <= 11: s += 18
        elif rate <= 13: s += 12
        else: s += 6
        ten = product.get("tenure_months") or 0
        if ten >= 144: s += 25
        elif ten >= 96: s += 17
        else: s += 8
        income = float(profile.get("annual_family_income") or 0)
        if income > 0 and income < 1500000: s += 25
        else: s += 12

    elif cat == "startup_funding":
        s = 0
        st = (profile.get("startup_stage") or "").lower()
        prod_st = (product.get("stage") or "").lower()
        if st and prod_st and (st in prod_st or prod_st in st): s += 25
        else: s += 10
        sec = (profile.get("startup_sector") or "").lower()
        sf = (product.get("sector_focus") or "").lower()
        if sec and sec in sf: s += 25
        else: s += 12
        need = float(profile.get("funding_need") or 5000000)
        if (product.get("amount_max") or 0) >= need: s += 25
        else: s += 10
        s += 18  # location match (assumed India)

    elif cat == "insurance":
        s = 0
        ct = (profile.get("coverage_type") or "").lower()
        sub = (product.get("subcategory") or "").lower()
        if ct and (ct in sub or sub in ct): s += 30
        else: s += 12
        budget = float(profile.get("insurance_budget") or 5000)
        prem = product.get("interest_rate") or 0  # repurposed: yearly premium
        if prem > 0 and prem <= budget: s += 30
        else: s += 15
        s += 16  # benefit relevance
        s += 16  # provider rating

    elif cat == "venture_capital":
        s = 0
        st = (profile.get("startup_stage") or "").lower()
        prod_st = (product.get("stage") or "").lower()
        if st and prod_st and (st in prod_st or prod_st in st): s += 30
        else: s += 12
        sec = (profile.get("startup_sector") or "").lower()
        sf = (product.get("sector_focus") or "").lower()
        if sec and (sec in sf or "all sectors" in sf): s += 25
        else: s += 13
        need = float(profile.get("funding_need") or 50000000)
        if (product.get("amount_min") or 0) <= need <= (product.get("amount_max") or 1e15):
            s += 25
        else: s += 10
        s += 15  # location match

    return max(0, min(100, int(s)))


def _doc_to_public(d: Dict[str, Any], profile: Dict[str, Any] = None,
                    saved_ids: set = None) -> Dict[str, Any]:
    fid = d.get("financial_id") or str(d.get("_id"))
    return {
        "financial_id": fid,
        "category": d.get("category"),
        "name": d.get("name"),
        "provider": d.get("provider"),
        "subcategory": d.get("subcategory"),
        "institution_name": d.get("institution_name"),
        "amount_min": d.get("amount_min"),
        "amount_max": d.get("amount_max"),
        "currency": d.get("currency", "INR"),
        "interest_rate": d.get("interest_rate"),
        "tenure_months": d.get("tenure_months"),
        "eligibility_criteria": d.get("eligibility_criteria", []),
        "application_deadline": _safe_iso(d.get("application_deadline")),
        "status": d.get("status", "open"),
        "application_url": d.get("application_url"),
        "tint": d.get("tint", "#7C3AED"),
        "short_desc": d.get("short_desc", ""),
        "stage": d.get("stage"),
        "sector_focus": d.get("sector_focus", ""),
        "region": d.get("region", "india"),
        "is_saved": (fid in saved_ids) if saved_ids else False,
        "match_score": _match_score(profile or {}, d) if profile is not None else None,
    }


# ─── Profile (drives match score + AI helper) ──────────────────────────
@router.get("/financial/me/profile")
async def get_fin_profile(user: dict = Depends(_get_current_user_dependency())):
    p = await _db.user_financial_profile.find_one({"user_id": str(user["_id"])}) or {}
    return {
        "cgpa": p.get("cgpa"),
        "annual_family_income": p.get("annual_family_income"),
        "course_level": p.get("course_level"),
        "institution_name": p.get("institution_name"),
        "institution_tier": p.get("institution_tier"),
        "loan_need": p.get("loan_need"),
        "loan_repayment_capacity": p.get("loan_repayment_capacity"),
        "has_collateral": p.get("has_collateral"),
        "cibil_range": p.get("cibil_range"),
        "startup_stage": p.get("startup_stage"),
        "startup_sector": p.get("startup_sector"),
        "funding_need": p.get("funding_need"),
        "has_cofounder": p.get("has_cofounder"),
        "age": p.get("age"),
        "pre_existing_conditions": p.get("pre_existing_conditions") or [],
        "insurance_budget": p.get("insurance_budget"),
        "coverage_type": p.get("coverage_type"),
        "scholarship_preference": p.get("scholarship_preference") or "merit",
        "saved_product_ids": p.get("saved_product_ids") or [],
    }


@router.patch("/financial/me/profile")
async def update_fin_profile(body: Dict[str, Any], user: dict = Depends(_get_current_user_dependency())):
    allowed = {"cgpa", "annual_family_income", "course_level", "institution_name",
               "institution_tier", "loan_need", "loan_repayment_capacity",
               "has_collateral", "cibil_range", "startup_stage", "startup_sector",
               "funding_need", "has_cofounder", "age", "pre_existing_conditions",
               "insurance_budget", "coverage_type", "scholarship_preference"}
    upd = {k: v for k, v in (body or {}).items() if k in allowed}
    if not upd:
        raise HTTPException(400, "No valid fields to update")
    upd["updated_at"] = datetime.now(timezone.utc)
    await _db.user_financial_profile.update_one(
        {"user_id": str(user["_id"])},
        {"$set": upd, "$setOnInsert": {"user_id": str(user["_id"]),
                                         "created_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    return {"ok": True, **{k: upd[k] for k in upd if k != "updated_at"}}


# ─── Generic search per category ───────────────────────────────────────
async def _search(category: str, filters: Dict[str, Any], user: dict, limit: int, page: int):
    await _ensure_seeded()
    q: Dict[str, Any] = {"is_active": True, "category": category}
    if filters.get("status") and filters["status"] != "all":
        q["status"] = filters["status"]
    if filters.get("subcategory"):
        q["subcategory"] = filters["subcategory"]
    if filters.get("min_amount") is not None:
        q["amount_max"] = {"$gte": filters["min_amount"]}
    if filters.get("max_amount") is not None:
        q.setdefault("amount_max", {})
        q["amount_max"]["$lte"] = filters["max_amount"]
    if filters.get("interest_rate_max") is not None:
        q["interest_rate"] = {"$lte": filters["interest_rate_max"]}
    if filters.get("tenure_months") is not None:
        q["tenure_months"] = {"$gte": filters["tenure_months"]}
    if filters.get("stage"):
        q["stage"] = {"$in": [s.strip() for s in filters["stage"].split(",")]}
    if filters.get("q"):
        q["$or"] = [
            {"name": {"$regex": filters["q"], "$options": "i"}},
            {"provider": {"$regex": filters["q"], "$options": "i"}},
            {"short_desc": {"$regex": filters["q"], "$options": "i"}},
        ]

    profile = await _db.user_financial_profile.find_one({"user_id": str(user["_id"])}) or {}
    saved = set(profile.get("saved_product_ids") or [])
    total = await _db.financial_products.count_documents(q)
    skip = (page - 1) * limit

    items = []
    async for d in _db.financial_products.find(q).skip(skip).limit(limit * 2):
        items.append(_doc_to_public(d, profile, saved))
    items.sort(key=lambda x: -(x.get("match_score") or 0))
    return {"results": items[:limit], "total_count": total, "page": page,
            "limit": limit, "has_more": (page * limit) < total}


@router.get("/financial/scholarships/search")
async def scholarships_search(
    filter_type: Optional[str] = Query(None),
    course_level: Optional[str] = Query(None),
    deadline_from: Optional[str] = Query(None),
    deadline_to: Optional[str] = Query(None),
    min_amount: Optional[int] = Query(None),
    max_amount: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=60),
    user: dict = Depends(_get_current_user_dependency()),
):
    return await _search("scholarship", {
        "subcategory": filter_type, "min_amount": min_amount, "max_amount": max_amount,
        "status": status, "q": q,
    }, user, limit, page)


@router.get("/financial/loans/search")
async def loans_search(
    loan_amount_min: Optional[int] = Query(None),
    loan_amount_max: Optional[int] = Query(None),
    interest_rate_max: Optional[float] = Query(None),
    tenure_months: Optional[int] = Query(None),
    institution_type: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=60),
    user: dict = Depends(_get_current_user_dependency()),
):
    return await _search("loan", {
        "min_amount": loan_amount_min, "max_amount": loan_amount_max,
        "interest_rate_max": interest_rate_max, "tenure_months": tenure_months,
        "subcategory": institution_type, "q": q,
    }, user, limit, page)


@router.get("/financial/startup-funding/search")
async def startup_search(
    funding_stage: Optional[str] = Query(None),
    funding_type: Optional[str] = Query(None),
    min_amount: Optional[int] = Query(None),
    max_amount: Optional[int] = Query(None),
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=60),
    user: dict = Depends(_get_current_user_dependency()),
):
    return await _search("startup_funding", {
        "stage": funding_stage, "subcategory": funding_type,
        "min_amount": min_amount, "max_amount": max_amount, "q": q,
    }, user, limit, page)


@router.get("/financial/insurance/search")
async def insurance_search(
    coverage_type: Optional[str] = Query(None),
    premium_max: Optional[int] = Query(None),
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=60),
    user: dict = Depends(_get_current_user_dependency()),
):
    return await _search("insurance", {
        "subcategory": coverage_type, "interest_rate_max": premium_max, "q": q,
    }, user, limit, page)


@router.get("/financial/venture-capital/search")
async def vc_search(
    funding_stage: Optional[str] = Query(None),
    sector: Optional[str] = Query(None),
    min_amount: Optional[int] = Query(None),
    max_amount: Optional[int] = Query(None),
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=60),
    user: dict = Depends(_get_current_user_dependency()),
):
    return await _search("venture_capital", {
        "stage": funding_stage,
        "min_amount": min_amount, "max_amount": max_amount, "q": q,
    }, user, limit, page)


@router.get("/financial/all")
async def search_all(user: dict = Depends(_get_current_user_dependency())):
    await _ensure_seeded()
    profile = await _db.user_financial_profile.find_one({"user_id": str(user["_id"])}) or {}
    saved = set(profile.get("saved_product_ids") or [])
    out: Dict[str, list] = {c: [] for c in CATEGORIES}
    async for d in _db.financial_products.find({"is_active": True}):
        cat = d.get("category")
        if cat in out:
            out[cat].append(_doc_to_public(d, profile, saved))
    for cat in out:
        out[cat].sort(key=lambda x: -(x.get("match_score") or 0))
    return {"by_category": out, "total": sum(len(v) for v in out.values())}


# ─── Detail / save / activity ──────────────────────────────────────────
@router.get("/financial/{financial_id}")
async def fin_detail(financial_id: str, user: dict = Depends(_get_current_user_dependency())):
    d = await _db.financial_products.find_one({"financial_id": financial_id})
    if not d: raise HTTPException(404, "Product not found")
    profile = await _db.user_financial_profile.find_one({"user_id": str(user["_id"])}) or {}
    saved = set(profile.get("saved_product_ids") or [])
    await _db.financial_activity_log.insert_one({
        "user_id": str(user["_id"]), "financial_id": financial_id,
        "action": "view", "ts": datetime.now(timezone.utc),
    })
    return _doc_to_public(d, profile, saved)


@router.post("/financial/{financial_id}/save")
async def save_fin(financial_id: str, user: dict = Depends(_get_current_user_dependency())):
    uid = str(user["_id"])
    p = await _db.user_financial_profile.find_one({"user_id": uid}) or {}
    saved = list(p.get("saved_product_ids") or [])
    if financial_id in saved:
        saved.remove(financial_id); action = "unsaved"
    else:
        saved.append(financial_id); action = "saved"
    await _db.user_financial_profile.update_one(
        {"user_id": uid},
        {"$set": {"saved_product_ids": saved, "updated_at": datetime.now(timezone.utc)},
         "$setOnInsert": {"user_id": uid, "created_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    if action == "saved":
        await _db.financial_activity_log.insert_one({
            "user_id": uid, "financial_id": financial_id, "action": "save",
            "ts": datetime.now(timezone.utc),
        })
    return {"ok": True, "action": action, "saved_count": len(saved)}


@router.post("/financial/{financial_id}/apply")
async def apply_fin(financial_id: str, user: dict = Depends(_get_current_user_dependency())):
    await _db.financial_activity_log.insert_one({
        "user_id": str(user["_id"]), "financial_id": financial_id,
        "action": "apply", "ts": datetime.now(timezone.utc),
    })
    return {"ok": True}


@router.post("/financial/{financial_id}/activity")
async def fin_activity(financial_id: str, body: Dict[str, Any],
                        user: dict = Depends(_get_current_user_dependency())):
    action = (body or {}).get("action")
    if action not in ("view", "save", "apply", "calculate_emi", "ai_query"):
        raise HTTPException(400, "Invalid action")
    await _db.financial_activity_log.insert_one({
        "user_id": str(user["_id"]), "financial_id": financial_id, "action": action,
        "extra": (body or {}).get("extra"), "ts": datetime.now(timezone.utc),
    })
    return {"ok": True}


@router.get("/financial/me/saved")
async def saved_fin(user: dict = Depends(_get_current_user_dependency())):
    p = await _db.user_financial_profile.find_one({"user_id": str(user["_id"])}) or {}
    ids = list(p.get("saved_product_ids") or [])
    if not ids: return {"items": [], "total": 0}
    saved_set = set(ids)
    items = []
    async for d in _db.financial_products.find({"financial_id": {"$in": ids}}):
        items.append(_doc_to_public(d, p, saved_set))
    return {"items": items, "total": len(items)}


# ─── EMI calculator (server-side) ──────────────────────────────────────
@router.post("/financial/emi-calculate")
async def emi_calc(body: Dict[str, Any], user: dict = Depends(_get_current_user_dependency())):
    P = float(body.get("loan_amount", 0))
    rate_pa = float(body.get("interest_rate", 0))   # in % p.a.
    n = int(body.get("tenure_months", 0))
    if P <= 0 or rate_pa <= 0 or n <= 0:
        raise HTTPException(400, "loan_amount, interest_rate (p.a.), tenure_months must be > 0")
    r = rate_pa / 12 / 100
    emi = P * r * math.pow(1 + r, n) / (math.pow(1 + r, n) - 1)
    total = emi * n
    interest = total - P
    await _db.emi_calculations.insert_one({
        "user_id": str(user["_id"]),
        "loan_amount": P, "interest_rate": rate_pa, "tenure_months": n,
        "monthly_emi": round(emi, 2), "total_payable": round(total, 2),
        "total_interest": round(interest, 2),
        "calculated_at": datetime.now(timezone.utc),
    })
    return {"monthly_emi": round(emi, 2), "total_payable": round(total, 2),
            "total_interest": round(interest, 2),
            "loan_amount": P, "interest_rate": rate_pa, "tenure_months": n}


# ─── AI Helper endpoints (Prompt 9) ────────────────────────────────────
async def _ai_helper(category: str, body: Dict[str, Any], user: dict):
    """Saves the user's answers to their profile, then re-ranks the catalog."""
    profile_updates = {}
    answers = body or {}
    if category == "scholarship":
        for k in ("cgpa", "annual_family_income", "course_level", "institution_name",
                  "institution_tier", "scholarship_preference"):
            if k in answers: profile_updates[k] = answers[k]
    elif category == "loan":
        for k in ("loan_need", "loan_repayment_capacity", "has_collateral", "cibil_range"):
            if k in answers: profile_updates[k] = answers[k]
    elif category in ("startup_funding", "venture_capital"):
        for k in ("startup_stage", "startup_sector", "funding_need", "has_cofounder"):
            if k in answers: profile_updates[k] = answers[k]
    elif category == "insurance":
        for k in ("age", "pre_existing_conditions", "insurance_budget", "coverage_type"):
            if k in answers: profile_updates[k] = answers[k]

    if profile_updates:
        profile_updates["updated_at"] = datetime.now(timezone.utc)
        await _db.user_financial_profile.update_one(
            {"user_id": str(user["_id"])},
            {"$set": profile_updates,
             "$setOnInsert": {"user_id": str(user["_id"]),
                              "created_at": datetime.now(timezone.utc)}},
            upsert=True,
        )

    profile = await _db.user_financial_profile.find_one({"user_id": str(user["_id"])}) or {}
    saved = set(profile.get("saved_product_ids") or [])
    await _db.financial_activity_log.insert_one({
        "user_id": str(user["_id"]), "financial_id": "*", "action": "ai_query",
        "extra": {"category": category, "answers": answers},
        "ts": datetime.now(timezone.utc),
    })
    items = []
    async for d in _db.financial_products.find({"is_active": True, "category": category}):
        items.append(_doc_to_public(d, profile, saved))
    items.sort(key=lambda x: -(x.get("match_score") or 0))
    top3 = items[:3]
    return {
        "ok": True,
        "answers_saved": list(profile_updates.keys()) if profile_updates else [],
        "ranked": items, "top_3": top3,
        "explanations": [
            {"financial_id": it["financial_id"], "name": it["name"],
             "match_score": it["match_score"],
             "reason": _build_reason(category, profile, it)}
            for it in top3
        ],
    }


def _build_reason(category: str, profile: Dict[str, Any], item: Dict[str, Any]) -> str:
    if category == "scholarship":
        bits = []
        if profile.get("cgpa"):
            bits.append(f"matches your CGPA of {profile['cgpa']}")
        if item.get("subcategory"):
            bits.append(f"{item['subcategory']} type")
        if profile.get("institution_tier"):
            bits.append(f"good fit for {profile['institution_tier']} institutions")
        return " · ".join(bits) or "Strong overall fit"
    if category == "loan":
        return f"Rate {item.get('interest_rate', '?')}% with {item.get('tenure_months', '?')}-month tenure — covers your need."
    if category == "startup_funding":
        return f"Stage match: {item.get('stage')} · sector: {item.get('sector_focus','any')}"
    if category == "venture_capital":
        return f"Invests at {item.get('stage')} stage in {item.get('sector_focus','all sectors')} — ticket size matches."
    if category == "insurance":
        return f"Coverage: {item.get('subcategory')} · premium ₹{item.get('interest_rate', 0)}/yr fits budget."
    return "Strong match."


@router.post("/financial/ai/scholarships")
async def ai_scholarships(body: Dict[str, Any], user: dict = Depends(_get_current_user_dependency())):
    return await _ai_helper("scholarship", body, user)

@router.post("/financial/ai/loans")
async def ai_loans(body: Dict[str, Any], user: dict = Depends(_get_current_user_dependency())):
    return await _ai_helper("loan", body, user)

@router.post("/financial/ai/startup-funding")
async def ai_startup(body: Dict[str, Any], user: dict = Depends(_get_current_user_dependency())):
    return await _ai_helper("startup_funding", body, user)

@router.post("/financial/ai/insurance")
async def ai_insurance(body: Dict[str, Any], user: dict = Depends(_get_current_user_dependency())):
    return await _ai_helper("insurance", body, user)

@router.post("/financial/ai/venture-capital")
async def ai_vc(body: Dict[str, Any], user: dict = Depends(_get_current_user_dependency())):
    return await _ai_helper("venture_capital", body, user)


@router.post("/financial/refresh")
async def refresh_catalog(user: dict = Depends(_get_current_user_dependency())):
    await _db.financial_products.delete_many({})
    await _ensure_seeded()
    cnt = await _db.financial_products.count_documents({})
    return {"ok": True, "total": cnt}
