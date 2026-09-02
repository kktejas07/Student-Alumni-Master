import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["studentalumni"]
    doc = await db.echo_showcases.find_one({"slug": "snist"})
    print(doc.get("registration"))

asyncio.run(main())
