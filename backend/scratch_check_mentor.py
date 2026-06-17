import asyncio
import json

async def check():
    from db import client as client
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
