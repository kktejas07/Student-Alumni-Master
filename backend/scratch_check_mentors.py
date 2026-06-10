import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    db = AsyncIOMotorClient('mongodb://localhost:27017').student_alumni
    mentors = await db.users.find({'role': 'mentor'}).to_list(100)
    print(f"Total mentors: {len(mentors)}")
    for m in mentors:
        print(f"{m.get('full_name')} - {m.get('mentor_status')}")

if __name__ == '__main__':
    asyncio.run(main())
