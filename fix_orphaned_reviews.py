import asyncio
import os
import sys
import re
from bson import ObjectId

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))
load_dotenv("backend/.env")

from backend.reviews import refresh_mentor_rating

async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"], serverSelectionTimeoutMS=5000)
    db = client[os.environ["DB_NAME"]]
    
    orphans = await db.reviews.find({"mentor_id": "auto-resolved"}).to_list(100)
    print(f"Found {len(orphans)} orphaned reviews.")
    
    fixed_mentors = set()
    
    for r in orphans:
        b_id = r.get("booking_id")
        if not b_id:
            continue
            
        booking = None
        if ObjectId.is_valid(b_id):
            booking = await db.bookings.find_one({"_id": ObjectId(b_id)})
            if not booking:
                booking = await db.sessions.find_one({"_id": ObjectId(b_id)})
                
        if not booking:
            booking_rx = f"{re.escape(b_id)}$"
            async for b in db.bookings.find({"$expr": {"$regexMatch": {"input": {"$toString": "$_id"}, "regex": booking_rx, "options": "i"}}}, {"mentor_id": 1}):
                booking = b
                break
            if not booking:
                async for s in db.sessions.find({"$expr": {"$regexMatch": {"input": {"$toString": "$_id"}, "regex": booking_rx, "options": "i"}}}, {"mentor_id": 1}):
                    booking = s
                    break
                    
        if booking and "mentor_id" in booking:
            real_mentor_id = str(booking["mentor_id"])
            print(f"Fixing review {r['_id']} -> Mentor {real_mentor_id}")
            await db.reviews.update_one({"_id": r["_id"]}, {"$set": {"mentor_id": real_mentor_id}})
            fixed_mentors.add(real_mentor_id)
        else:
            print(f"Could not resolve booking {b_id} for review {r['_id']}")
            
    for mid in fixed_mentors:
        print(f"Refreshing rating for mentor {mid}")
        await refresh_mentor_rating(db, mid)
        
    print("Done!")

if __name__ == "__main__":
    asyncio.run(main())
