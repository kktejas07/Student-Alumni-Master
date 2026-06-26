import asyncio
import os
import sys

sys.path.append(os.getcwd())
from core.db import db, client

async def main():
    user = await db.users.find_one({'email': 'vivek21104@gmail.com'})
    if user:
        print('USER FOUND:', user['email'])
    else:
        print('USER NOT FOUND IN DATABASE')
    client.close()

asyncio.run(main())
