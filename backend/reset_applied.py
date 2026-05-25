import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def reset():
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME", "studentalumniadmin")
    if not mongo_url:
        print("MONGO_URL not found in env.")
        return

    print(f"Connecting to MongoDB: {db_name}...")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    # 1. Reset applied_jobs array in users collection
    print("Clearing 'applied_jobs' field for all users...")
    u_res = await db.users.update_many({}, {"$set": {"applied_jobs": []}})
    print(f"  Modified {u_res.modified_count} users.")

    # 2. Delete all records from internship_applications collection
    print("Deleting all internship applications...")
    a_res = await db.internship_applications.delete_many({})
    print(f"  Deleted {a_res.deleted_count} applications.")

    # 3. Delete all records from job_apply_audit collection
    print("Deleting job apply audits...")
    aud_res = await db.job_apply_audit.delete_many({})
    print(f"  Deleted {aud_res.deleted_count} audit logs.")

    print("\nDatabase reset complete! You can now test the apply confirmation modal cleanly.")

if __name__ == "__main__":
    asyncio.run(reset())
