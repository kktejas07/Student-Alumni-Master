import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
async def main():
    db = AsyncIOMotorClient("mongodb://localhost:27017")["studentalumni"]
    doc = await db.echo_showcases.find_one({"slug": "snist"})
    print(doc.get("registration"))
    print(doc.get("registration_config"))
asyncio.run(main())
