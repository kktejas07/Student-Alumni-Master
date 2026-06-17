import asyncio
import os
import time
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))
load_dotenv("backend/.env")

async def main():
    start = time.time()
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    user = await db.users.find_one({"email": "mentor1@mail.com"})
    print(f"User ID: {user['_id']}")
    
    from reviews import list_mentor_reviews, get_mentor_rating_stats
    items = await list_mentor_reviews(db, str(user["_id"]), limit=20)
    stats = await get_mentor_rating_stats(db, str(user["_id"]))
    end = time.time()
    
    print(f"Items: {len(items)}")
    print(f"Stats: {stats}")
    print(f"Time taken: {end - start:.2f}s")
    
if __name__ == "__main__":
    asyncio.run(main())
