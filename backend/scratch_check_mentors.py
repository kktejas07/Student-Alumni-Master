import asyncio
from db import db

async def main():
    mentors = await db.users.find({'role': 'mentor'}).to_list(100)
    print(f"Total mentors: {len(mentors)}")
    for m in mentors:
        print(f"{m.get('full_name')} - {m.get('mentor_status')}")

if __name__ == '__main__':
    asyncio.run(main())
