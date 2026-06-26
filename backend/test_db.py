import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
db = AsyncIOMotorClient('mongodb://localhost:27017')['studentalumniadmin']

async def main():
    async for doc in db.installed_tools.find():
        print(doc)

asyncio.run(main())
