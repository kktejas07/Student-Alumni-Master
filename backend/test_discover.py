
import asyncio
import os
import sys
sys.path.append(os.getcwd())
from db import db
from server import network_discover
from bson import ObjectId

async def main():
    user = await db.users.find_one({'email': 'asha.student@example.com'})
    print(f'User ID: {user['_id']}')
    res = await network_discover(user=user, q='')
    for sec in res['sections']:
        for item in sec['items']:
            if str(item['id']) == str(user['_id']):
                print(f'FOUND SELF IN SECTION {sec['key']}!')
    print('Done checking')

asyncio.run(main())

