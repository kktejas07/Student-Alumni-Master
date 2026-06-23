import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

from dotenv import load_dotenv

load_dotenv()
mongo_url = os.environ.get("MONGO_URL")
if not mongo_url:
    raise ValueError("MONGO_URL environment variable is not set. Please ensure the .env file is present or the variable is exported.")
client = AsyncIOMotorClient(mongo_url)
db = client.get_database("studentalumniadmin")

async def main():
    users = await db.users.find({}, {"email": 1, "role": 1, "_id": 0}).to_list(20)
    for u in users:
        print(u.get("email"), u.get("role"))

asyncio.run(main())
