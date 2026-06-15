import asyncio
import json
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

async def check():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["student_alumni_db"]
    mentor_id = "6a27cde3045bf8ce7898a73a"
    print("Checking sample_mentors...")
    sample = await db.sample_mentors.find_one({"id": mentor_id})
    print(f"Sample: {sample}")
    if not sample:
        try:
            real = await db.users.find_one({"_id": ObjectId(mentor_id)})
            print(f"Real: {real}")
        except Exception as e:
            print(f"Error checking real: {e}")

asyncio.run(check())
