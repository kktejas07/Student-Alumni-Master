import asyncio
import os
import time
from motor.motor_asyncio import AsyncIOMotorClient

async def test_direct_connection():
    # Constructing the direct connection string
    # Nodes: ac-7tcoz2w-shard-00-01, ac-7tcoz2w-shard-00-02, ac-7tcoz2w-shard-00-00
    hosts = "ac-7tcoz2w-shard-00-00.hhu4uao.mongodb.net:27017,ac-7tcoz2w-shard-00-01.hhu4uao.mongodb.net:27017,ac-7tcoz2w-shard-00-02.hhu4uao.mongodb.net:27017"
    creds = "studentalumniadmin_db_user:wDruHz5sCPoEVuFy"
    
    # We bypass SRV and dnspython completely
    direct_uri = f"mongodb://{creds}@{hosts}/?tls=true&authSource=admin&replicaSet=atlas-7tcoz2-shard-0"
    
    print(f"Testing direct URI: {direct_uri}")
    start = time.time()
    try:
        client = AsyncIOMotorClient(direct_uri, serverSelectionTimeoutMS=5000)
        db = client["studentalumniadmin"]
        user = await db.users.find_one({"email": "mentor1@mail.com"})
        print(f"Success! Found user ID: {user['_id']}")
    except Exception as e:
        print(f"Failed with replicaSet param: {e}")
        
        # Try without replicaSet param
        direct_uri_no_rs = f"mongodb://{creds}@{hosts}/?tls=true&authSource=admin"
        print(f"Testing direct URI without replicaSet: {direct_uri_no_rs}")
        try:
            client = AsyncIOMotorClient(direct_uri_no_rs, serverSelectionTimeoutMS=5000)
            db = client["studentalumniadmin"]
            user = await db.users.find_one({"email": "mentor1@mail.com"})
            print(f"Success without RS! Found user ID: {user['_id']}")
            direct_uri = direct_uri_no_rs
        except Exception as e2:
            print(f"Failed again: {e2}")
            return
            
    end = time.time()
    print(f"Time taken: {end - start:.2f}s")
    
    # Write the successful URI to a file so we can grab it
    with open("fast_mongo_url.txt", "w") as f:
        f.write(direct_uri)

if __name__ == "__main__":
    asyncio.run(test_direct_connection())
