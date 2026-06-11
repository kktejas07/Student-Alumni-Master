import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os

async def main():
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(mongo_url)
    db = client["studentalumniadmin"]
    
    mentor_id = "6a27cde3045bf8ce7898a73a"
    bookings = await db.bookings.find({"mentor_id": mentor_id}).to_list(100)
    print("--- BOOKINGS ---")
    for b in bookings:
        print(f"Student: {b.get('student_name')} ({b.get('student_id')}), Topic: {b.get('topic')}")

if __name__ == "__main__":
    env_file = "backend/.env"
    if os.path.exists(env_file):
        with open(env_file) as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    k, v = line.strip().split("=", 1)
                    os.environ[k] = v
    asyncio.run(main())
