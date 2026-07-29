import asyncio
from core.db import db
async def main():
    m = await db.users.find_one({'full_name': 'Arjun Mentor2'})
    print(m)
asyncio.run(main())
