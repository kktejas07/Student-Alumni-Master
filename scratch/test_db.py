import asyncio
import os
import motor.motor_asyncio
from dotenv import load_dotenv

load_dotenv("backend/.env")

async def main():
    mc = motor.motor_asyncio.AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = mc[os.environ['DB_NAME']]
    
    cursor = db.users.find({"role": "college"})
    async for u in cursor:
        if "Patil" in u.get("full_name", "") or "Patil" in str(u.get("school_info", {})):
            print(u)

if __name__ == "__main__":
    asyncio.run(main())
