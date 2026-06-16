import os
import asyncio

load_dotenv()

async def reset():
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME", "studentalumniadmin")
    if not mongo_url:
        print("MONGO_URL not found in env.")
        return

    # Safety checks against production/staging databases
    url_lower = (mongo_url or "").lower()
    if "production" in url_lower or "prod" in url_lower or "staging" in url_lower:
        print("Error: Running this destructive script against production or staging databases is blocked.")
        return

    # Check for known safe development/test database names
    safe_dbs = ("studentalumniadmin", "studentalumnitest", "test")
    if db_name not in safe_dbs:
        print(f"Warning: database '{db_name}' is not in the safe development/test database list {safe_dbs}.")
        confirm = input("Are you absolutely sure you want to run this destructive operation? (type 'yes' to proceed): ")
        if confirm.strip().lower() != "yes":
            print("Aborted.")
            return

    # Explicit interactive confirmation prompt
    print(f"WARNING: This script will wipe applied_jobs for all users, all internship applications, and all job apply audits in '{db_name}'.")
    confirm = input("Do you want to proceed? (type 'yes' to proceed): ")
    if confirm.strip().lower() != "yes":
        print("Aborted.")
        return

    print(f"Connecting to MongoDB: {db_name}...")
    from db import client as client
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
