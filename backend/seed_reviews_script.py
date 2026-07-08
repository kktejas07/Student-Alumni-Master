import asyncio
from db import client, db

async def main():

    from reviews import seed_sample_reviews
    count = await seed_sample_reviews(db, count_per_mentor=5)
    print(f"Seeded {count} sample reviews successfully.")

if __name__ == "__main__":
    asyncio.run(main())
