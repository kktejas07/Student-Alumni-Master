import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient("mongodb+srv://studentalumniadmin_db_user:wDruHz5sCPoEVuFy@studentalumniadmin.hhu4uao.mongodb.net/?appName=studentalumniadmin")
    db = client.studentalumniadmin

    from reviews import seed_sample_reviews
    count = await seed_sample_reviews(db, count_per_mentor=5)
    print(f"Seeded {count} sample reviews successfully.")

if __name__ == "__main__":
    asyncio.run(main())
