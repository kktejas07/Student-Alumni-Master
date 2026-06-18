import asyncio
import os
import sys

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))
load_dotenv("backend/.env")

async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"], serverSelectionTimeoutMS=5000)
    db = client[os.environ["DB_NAME"]]
    
    # 1. Find all reviews with mentor_id="auto-resolved"
    auto_resolved_reviews = await db.reviews.find({"mentor_id": "auto-resolved"}).to_list(100)
    print(f"Reviews with mentor_id='auto-resolved': {len(auto_resolved_reviews)}")
    for r in auto_resolved_reviews:
        print(f"  - {r.get('id')} / booking_id: {r.get('booking_id')}")

    # 2. Check the student's reviews to see what mentor_id they have
    student_email = "kalyandasari272@gmail.com"
    student = await db.users.find_one({"email": student_email})
    if student:
        student_id = str(student["_id"])
        print(f"\nStudent ID: {student_id}")
        student_reviews = await db.reviews.find({"student_id": student_id}).to_list(100)
        print(f"Reviews left by student: {len(student_reviews)}")
        for r in student_reviews:
            print(f"  - {r.get('id')} / mentor_id: {r.get('mentor_id')} / booking_id: {r.get('booking_id')}")
    else:
        print(f"\nStudent {student_email} not found.")

if __name__ == "__main__":
    asyncio.run(main())
