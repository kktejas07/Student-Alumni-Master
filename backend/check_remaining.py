import asyncio
from db import db

async def main():
    roles = await db.users.aggregate([{"$group": {"_id": "$role", "count": {"$sum": 1}}}]).to_list(None)
    print("User counts by role:")
    for r in roles:
        print(r)
        
    sample = await db.users.find({"role": "student"}).limit(10).to_list(None)
    print("\nSample student emails:")
    for s in sample:
        print(s.get("email"), s.get("full_name"), s.get("source"))

asyncio.run(main())
