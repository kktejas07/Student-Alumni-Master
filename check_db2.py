import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import pprint
from dotenv import load_dotenv
import os

load_dotenv('backend/.env')
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME')

async def run():
    db = AsyncIOMotorClient(MONGO_URL)[DB_NAME]
    users = await db.users.find().to_list(100)
    for u in users:
        print(f"ID: {u.get('_id')} Email: {u.get('email')} Role: {u.get('role')} Status: {u.get('mentor_status')} Interests: {u.get('interests')} CP: {u.get('career_path')} Inst: {u.get('school_info', {}).get('institution_name')}")

asyncio.run(run())
