import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv("backend/.env")

async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    user = await db.users.find_one({"email": "mentor1@mail.com"})
    if not user:
        print("User mentor1@mail.com not found!")
        return
    print(f"User ID: {user['_id']}")
    reviews = await db.reviews.find({"mentor_id": str(user["_id"])}).to_list(100)
    print(f"Found {len(reviews)} reviews for mentor1@mail.com by string _id")
    
    # check sample mentors
    sample_reviews = await db.reviews.find({"mentor_id": "m1"}).to_list(100)
    print(f"Found {len(sample_reviews)} reviews for mentor_id='m1'")

if __name__ == "__main__":
    asyncio.run(main())
