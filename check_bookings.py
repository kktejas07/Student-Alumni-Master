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
    
    booking_ids = ["704affa8", "60f588b1", "4ff17a26"]
    
    for b_id in booking_ids:
        b1 = await db.bookings.find_one({"id": b_id})
        b2 = await db.bookings.find_one({"booking_id": b_id})
        print(f"Booking {b_id} -> find_one(id): {b1 is not None}, find_one(booking_id): {b2 is not None}")
        if b1:
            print(f"  mentor_id in b1: {b1.get('mentor_id')}")
        if b2:
            print(f"  mentor_id in b2: {b2.get('mentor_id')}")

if __name__ == "__main__":
    asyncio.run(main())
