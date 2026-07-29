from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from bson import ObjectId

from core.db import db
from core.deps import get_current_user
from reviews import create_review, list_mentor_reviews, get_mentor_rating_stats
from notifications import notify_review_received

router = APIRouter()

class ReviewIn(BaseModel):
    mentor_id: str
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = ""
    booking_id: Optional[str] = None


@router.post("/reviews")
async def post_review(req: ReviewIn, user: dict = Depends(get_current_user)):
    """Submit a review — only students can review mentors. One review per booking_id."""
    if user["role"] not in ("student", "alumni"):
        raise HTTPException(403, "Only students/alumni can review mentors")
    mentor_id = req.mentor_id
    if mentor_id == "auto-resolved" and req.booking_id:
        b_id = req.booking_id
        booking = None
        try:
            if ObjectId.is_valid(b_id):
                booking = await db.bookings.find_one({"_id": ObjectId(b_id)})
                if not booking:
                    booking = await db.sessions.find_one({"_id": ObjectId(b_id)})
        except Exception:
            pass
        if not booking:
            import re
            booking_rx = f"{re.escape(b_id)}$"
            
            bookings_matches = []
            async for b in db.bookings.find({"$expr": {"$regexMatch": {"input": {"$toString": "$_id"}, "regex": booking_rx, "options": "i"}}}, {"mentor_id": 1}):
                bookings_matches.append(b)
                
            sessions_matches = []
            async for s in db.sessions.find({"$expr": {"$regexMatch": {"input": {"$toString": "$_id"}, "regex": booking_rx, "options": "i"}}}, {"mentor_id": 1}):
                sessions_matches.append(s)
                
            total_matches = len(bookings_matches) + len(sessions_matches)
            if total_matches == 1:
                booking = bookings_matches[0] if bookings_matches else sessions_matches[0]

        if booking and "mentor_id" in booking:
            mentor_id = str(booking["mentor_id"])

    review = await create_review(
        db,
        mentor_id=mentor_id,
        student_id=str(user["_id"]),
        student_name=user.get("full_name", "Student"),
        rating=req.rating,
        comment=req.comment or "",
        booking_id=req.booking_id,
    )
    # Best-effort notify mentor
    try:
        await notify_review_received(db, mentor_id=req.mentor_id,
                                      rating=req.rating,
                                      student_name=user.get("full_name", "Student"))
    except Exception:
        pass
    if isinstance(review.get("created_at"), datetime):
        review["created_at"] = review["created_at"].isoformat()
    if "_id" in review:
        if isinstance(review["_id"], ObjectId):
            review["_id"] = str(review["_id"])
        review["id"] = review["_id"]
    return review


class ReviewReplyIn(BaseModel):
    reply: str


@router.post("/reviews/{review_id}/reply")
async def reply_to_review(review_id: str, req: ReviewReplyIn, user: dict = Depends(get_current_user)):
    """Mentor replies to a review."""
    if user["role"] != "mentor":
        raise HTTPException(403, "Only mentors can reply to reviews")
    
    review = await db.reviews.find_one({"id": review_id})
    if not review:
        raise HTTPException(404, "Review not found")
        
    if str(review["mentor_id"]) != str(user["_id"]):
        raise HTTPException(403, "You can only reply to your own reviews")
        
    await db.reviews.update_one(
        {"id": review_id},
        {"$set": {"mentor_reply": req.reply, "mentor_reply_at": datetime.now(timezone.utc)}}
    )
    return {"ok": True}


@router.get("/mentors/{mentor_id}/reviews")
async def get_reviews(mentor_id: str, limit: int = 20):
    """Public — returns review list + aggregate stats for a mentor."""
    items = await list_mentor_reviews(db, mentor_id, limit)
    stats = await get_mentor_rating_stats(db, mentor_id)
    return {"items": items, "stats": stats}
