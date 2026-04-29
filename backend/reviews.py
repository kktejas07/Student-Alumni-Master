"""
Mentor Reviews & Ratings Engine
================================
- Students submit reviews after a completed booking session
- Reviews aggregate into mentor's rating + total_reviews
- Used by /api/catalog/mentors and /api/analytics/mentor

Schema (MongoDB collection `reviews`):
  {
    id: str,
    mentor_id: str,
    student_id: str,
    student_name: str,
    booking_id: Optional[str],
    rating: int (1-5),
    comment: str,
    created_at: datetime
  }
"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


async def create_review(db, *, mentor_id: str, student_id: str, student_name: str,
                         rating: int, comment: str = "",
                         booking_id: Optional[str] = None) -> Dict[str, Any]:
    """Inserts a review and updates the mentor's aggregate rating."""
    if rating < 1 or rating > 5:
        raise ValueError("Rating must be between 1 and 5")
    if booking_id:
        # Optional dedupe — one review per booking
        existing = await db.reviews.find_one({"booking_id": booking_id})
        if existing:
            return existing
    doc = {
        "id": f"rev-{uuid.uuid4().hex[:10]}",
        "mentor_id": mentor_id,
        "student_id": student_id,
        "student_name": student_name,
        "booking_id": booking_id,
        "rating": int(rating),
        "comment": comment[:500],
        "created_at": datetime.now(timezone.utc),
    }
    await db.reviews.insert_one(doc)
    await refresh_mentor_rating(db, mentor_id)
    doc.pop("_id", None)
    return doc


async def list_mentor_reviews(db, mentor_id: str, limit: int = 20) -> List[Dict[str, Any]]:
    cursor = db.reviews.find({"mentor_id": mentor_id}, {"_id": 0}).sort("created_at", -1).limit(limit)
    items = await cursor.to_list(limit)
    for it in items:
        if isinstance(it.get("created_at"), datetime):
            it["created_at"] = it["created_at"].isoformat()
    return items


async def get_mentor_rating_stats(db, mentor_id: str) -> Dict[str, Any]:
    """Returns aggregate stats for one mentor: count, avg, distribution per star."""
    items = await db.reviews.find({"mentor_id": mentor_id}, {"rating": 1, "_id": 0}).to_list(1000)
    if not items:
        return {"total": 0, "average": 0.0, "distribution": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}}
    total = len(items)
    avg = round(sum(i["rating"] for i in items) / total, 2)
    dist = {s: 0 for s in range(1, 6)}
    for i in items:
        dist[int(i["rating"])] += 1
    return {"total": total, "average": avg, "distribution": dist}


async def refresh_mentor_rating(db, mentor_id: str) -> None:
    """Pushes the latest avg rating + total_reviews into the mentor's profile (sample_mentors + users)."""
    stats = await get_mentor_rating_stats(db, mentor_id)
    update = {"rating": stats["average"] or 5.0, "total_reviews": stats["total"]}
    # Update both possible mentor sources
    await db.sample_mentors.update_one({"id": mentor_id}, {"$set": update})
    try:
        from bson import ObjectId
        await db.users.update_one({"_id": ObjectId(mentor_id)}, {"$set": {"mentor_rating": update}})
    except Exception:
        await db.users.update_one({"_id": mentor_id}, {"$set": {"mentor_rating": update}})


async def seed_sample_reviews(db, count_per_mentor: int = 4) -> int:
    """Auto-seed a few reviews per mentor so the profile + rating system works out of the box."""
    mentors = await db.sample_mentors.find({}, {"id": 1, "_id": 0}).to_list(50)
    if not mentors:
        return 0
    students = await db.users.find({"role": "student"}, {"_id": 1, "full_name": 1}).limit(20).to_list(20)
    if not students:
        return 0
    sample_comments = [
        "Helped me crack my first SDE interview. Highly recommend!",
        "Very practical advice on roadmap and skills to focus on.",
        "Honest feedback on resume and LinkedIn profile.",
        "Walked me through the full system-design rounds.",
        "Excellent insights into the higher-ed application process.",
        "Saved me hours of confusion on which path to choose.",
        "Patient, kind, and full of relevant industry stories.",
        "Got an internship offer right after the mock interviews.",
    ]
    inserted = 0
    for m in mentors:
        existing = await db.reviews.count_documents({"mentor_id": m["id"]})
        if existing >= count_per_mentor:
            continue
        for i in range(count_per_mentor - existing):
            student = students[(i + len(m["id"])) % len(students)]
            rating = 4 + ((i + len(m["id"])) % 2)  # 4 or 5
            await create_review(
                db,
                mentor_id=m["id"],
                student_id=str(student["_id"]),
                student_name=student.get("full_name", "Student"),
                rating=rating,
                comment=sample_comments[(i + len(m["id"])) % len(sample_comments)],
            )
            inserted += 1
    return inserted
