"""
student_perks.py — Student Perks & Goodies Vault Router
Exposes endpoints for students to browse and claim scouted goodies (cloud vouchers, API credits, swag kits).
"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Body

from core.deps import get_current_user

router = APIRouter(prefix="/api/v1/student/perks", tags=["Student Perks"])

@router.get("")
async def get_student_perks(user=Depends(get_current_user)):
    """Fetches all active scouted goodies, cloud credits, and promo vouchers available for students."""
    from db import db
    from services.agents.outreach_scout_service import INITIAL_COMMUNITIES

    perks = []
    try:
        communities = await db.community_directory.find({}, {"_id": 0}).to_list(100)
    except Exception:
        communities = []

    if not communities:
        communities = INITIAL_COMMUNITIES

    for comm in communities:
        for g in comm.get("free_goodies", []):
            perks.append({
                "id": f"perk-{uuid.uuid5(uuid.NAMESPACE_DNS, comm['id'] + g.get('title', '')).hex[:8]}",
                "title": g.get("title"),
                "value": g.get("value"),
                "type": g.get("type"),
                "code": g.get("code"),
                "community_name": comm.get("name"),
                "domain": comm.get("domain", "general"),
                "icon": "Gift",
                "claimed": False,
            })

    return {"perks": perks, "total": len(perks)}

@router.post("/{perk_id}/claim")
async def claim_student_perk(
    perk_id: str,
    user=Depends(get_current_user)
):
    """Claims a specific perk/voucher for the logged-in student."""
    from db import db
    user_id = str(user.get("id") or user.get("user_id") or "student-123")
    user_email = str(user.get("email") or "student@example.com")
    now = datetime.now(timezone.utc).isoformat()

    claim_doc = {
        "id": f"claim-{uuid.uuid4().hex[:8]}",
        "perk_id": perk_id,
        "user_id": user_id,
        "user_email": user_email,
        "claimed_at": now,
        "status": "claimed"
    }

    try:
        await db.claimed_perks.insert_one(claim_doc)
    except Exception as e:
        print(f"Error logging claim: {e}")

    return {"ok": True, "claim": claim_doc}
