import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

mongo_url = "mongodb+srv://studentalumniadmin_db_user:wDruHz5sCPoEVuFy@studentalumniadmin.hhu4uao.mongodb.net/?appName=studentalumniadmin"
client = AsyncIOMotorClient(mongo_url)
db = client.get_database("studentalumniadmin")

async def main():
    users = await db.users.find().to_list(20)
    for u in users:
        print(u.get("email"), u.get("role"))

asyncio.run(main())
