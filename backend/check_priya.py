import asyncio
from db import db

async def main():
    phash = "$2b$12$Kq4pkXVbmHyquLAfP4qbneFEK6TJui1/Eg08/dOnNsw6HlE5v//BS"
    count = await db.users.count_documents({"password_hash": phash})
    print(f"Users with mock password hash: {count}")
    
    # Check another random user to see if it shares the hash
    u2 = await db.users.find_one({"email": "arjun.mehta@gmail.com"})
    print(f"Arjun's hash: {u2.get('password_hash')}")
    
asyncio.run(main())
