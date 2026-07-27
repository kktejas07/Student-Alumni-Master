import asyncio
import json
import urllib.request

async def get_student():
    from motor.motor_asyncio import AsyncIOMotorClient
    
    import os
    MONGO_URL = os.environ.get('MONGO_URL')
    if not MONGO_URL:
        raise RuntimeError(
            "MONGO_URL environment variable is not set.\n"
            "Set it before running: export MONGO_URL='mongodb+srv://...' or populate backend/.env"
        )
    client = AsyncIOMotorClient(MONGO_URL)
    db = client['studentalumniadmin']
    
    # Find students with hashed_password 
    students = await db.users.find(
        {'role': 'student', 'hashed_password': {'$exists': True, '$ne': None}},
        {'email': 1, 'full_name': 1, 'hashed_password': 1, '_id': 0}
    ).limit(10).to_list(10)
    
    for s in students:
        hp = s.get('hashed_password', '')
        has_pw = bool(hp)
        email = s.get('email', '')
        name = s.get('full_name', '')
        print(f"email={email} | name={name} | has_pw={has_pw}")
    
    return students

asyncio.run(get_student())
