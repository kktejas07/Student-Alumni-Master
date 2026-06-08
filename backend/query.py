import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()
async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    user = await db.users.find_one({"email": "student01@test.com"})
    print(user.get("year"), user.get("current_year"), user.get("school_info"), user.get("academic_year"), user.get("graduation_year"))

asyncio.run(main())
