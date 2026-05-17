"""
routers/tour.py — Per-portal product tour completion tracking (Phase B).

Endpoints:
  GET   /api/me/tour-status              — read which tours the user has seen
  PATCH /api/me/tour-status              — mark a tour completed / skipped / replayed

Schema:
  user_tour_status: {
    _id, user_id (indexed),
    tours: {
      "student":    { completed_at, skipped, replays, version },
      "alumni":     { ... },
      "college":    { ... },
      "mentor":     { ... },
      "super_admin":{ ... },
      "landing":    { ... },
    },
    updated_at,
  }
"""
from __future__ import annotations
from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core.db import db
from core.deps import get_current_user


router = APIRouter(prefix="/api", tags=["tours"])

TourKey = Literal["student", "alumni", "college", "mentor", "super_admin", "landing"]
TOUR_VERSION = "1.0"


class TourUpdateIn(BaseModel):
    tour: TourKey
    status: Literal["completed", "skipped", "replayed", "started"]
    step: Optional[int] = Field(default=None, ge=0, le=50)


def _shape(doc: dict | None) -> dict:
    tours = (doc or {}).get("tours", {}) or {}
    return {
        "tours": {
            k: {
                "completed_at": v.get("completed_at").isoformat() if v.get("completed_at") else None,
                "skipped":   bool(v.get("skipped", False)),
                "replays":   int(v.get("replays", 0)),
                "version":   v.get("version", TOUR_VERSION),
                "last_step": v.get("last_step"),
            }
            for k, v in tours.items()
        }
    }


@router.get("/me/tour-status")
async def get_tour_status(user: dict = Depends(get_current_user)):
    doc = await db.user_tour_status.find_one({"user_id": user["_id"]})
    return _shape(doc)


@router.patch("/me/tour-status")
async def update_tour_status(
    body: TourUpdateIn,
    user: dict = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    field = f"tours.{body.tour}"

    if body.status == "completed":
        set_ops = {
            f"{field}.completed_at": now,
            f"{field}.skipped": False,
            f"{field}.version": TOUR_VERSION,
            f"{field}.last_step": body.step,
        }
        inc_ops: dict = {}
    elif body.status == "skipped":
        set_ops = {
            f"{field}.completed_at": now,
            f"{field}.skipped": True,
            f"{field}.version": TOUR_VERSION,
            f"{field}.last_step": body.step,
        }
        inc_ops = {}
    elif body.status == "replayed":
        set_ops = {
            f"{field}.version": TOUR_VERSION,
            f"{field}.last_step": body.step or 0,
        }
        inc_ops = {f"{field}.replays": 1}
    else:  # started — just stamp last_step
        set_ops = {f"{field}.last_step": body.step or 0}
        inc_ops = {}

    update: dict = {"$set": {**set_ops, "updated_at": now}}
    if inc_ops:
        update["$inc"] = inc_ops

    res = await db.user_tour_status.find_one_and_update(
        {"user_id": user["_id"]},
        update,
        upsert=True,
        return_document=True,
    )
    return _shape(res)


__all__ = ["router"]
