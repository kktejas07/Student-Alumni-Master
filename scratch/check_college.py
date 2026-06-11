import dotenv, asyncio, os
from motor.motor_asyncio import AsyncIOMotorClient

dotenv.load_dotenv("backend/.env")
db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]

async def main():
    u = await db.users.find_one({"role": "college"})
    if u:
        print("Email:", u.get("email"))
        print("College Info:", u.get("college_info"))
        print("School Info:", u.get("school_info"))
    else:
        print("No college user found")

asyncio.run(main())
