import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv("backend/.env")

async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    user = await db.users.find_one({"email": "mentor1@mail.com"})
    print(f"User from DB: {user.keys()}")
    print(f"User ID: {user['_id']}")
    
if __name__ == "__main__":
    asyncio.run(main())
