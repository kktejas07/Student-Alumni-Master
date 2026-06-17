import asyncio
import os
import time
import socket
from motor.motor_asyncio import AsyncIOMotorClient

# IPv4 patch so standard DNS lookups don't hang
_original_getaddrinfo = socket.getaddrinfo
def _ipv4_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    if family == 0:
        family = socket.AF_INET
    return _original_getaddrinfo(host, port, family, type, proto, flags)
socket.getaddrinfo = _ipv4_getaddrinfo

async def test_direct_connection():
    hosts = "ac-7tcoz2w-shard-00-00.hhu4uao.mongodb.net:27017,ac-7tcoz2w-shard-00-01.hhu4uao.mongodb.net:27017,ac-7tcoz2w-shard-00-02.hhu4uao.mongodb.net:27017"
    creds = "studentalumniadmin_db_user:wDruHz5sCPoEVuFy"
    
    # Without replicaSet
    direct_uri = f"mongodb://{creds}@{hosts}/?tls=true&authSource=admin&appName=studentalumniadmin"
    
    print(f"Testing direct URI: {direct_uri}")
    start = time.time()
    try:
        client = AsyncIOMotorClient(direct_uri, serverSelectionTimeoutMS=5000)
        db = client["studentalumniadmin"]
        user = await db.users.find_one({"email": "mentor1@mail.com"})
        print(f"Success! Found user ID: {user['_id']}")
    except Exception as e:
        print(f"Failed: {e}")
        
    end = time.time()
    print(f"Time taken: {end - start:.2f}s")

if __name__ == "__main__":
    asyncio.run(test_direct_connection())
