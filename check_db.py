import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import pprint

async def run():
    db = AsyncIOMotorClient('mongodb://localhost:27017')['nexus']
    users = await db.users.find().to_list(100)
    for u in users:
        print(f"ID: {u.get('_id')} Email: {u.get('email')} Role: {u.get('role')} Status: {u.get('mentor_status')} Interests: {u.get('interests')} CP: {u.get('career_path')}")

asyncio.run(run())
