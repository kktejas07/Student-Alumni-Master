import asyncio
from db import db

async def wipe_excess(role, keep_count=5):
    # Fetch all for this role
    cursor = db.users.find({"role": role})
    all_users = await cursor.to_list(None)
    
    # Identify important users to ALWAYS keep
    important_emails = ["kalyandasari272@gmail.com", "admin2@careerpath.app"]
    
    important = [u for u in all_users if u.get("email") in important_emails]
    others = [u for u in all_users if u.get("email") not in important_emails]
    
    print(f"Role: {role}. Total: {len(all_users)}. Important: {len(important)}")
    
    # Keep up to keep_count from 'others'
    to_keep = others[:keep_count]
    to_delete = others[keep_count:]
    
    if not to_delete:
        print(f"Nothing to delete for {role}")
        return
        
    delete_ids = [u["_id"] for u in to_delete]
    
    # Delete in batches to avoid timeout or just one delete_many
    res = await db.users.delete_many({"_id": {"$in": delete_ids}})
    print(f"Deleted {res.deleted_count} excess accounts for {role}")

async def main():
    await wipe_excess("student")
    await wipe_excess("alumni")
    await wipe_excess("mentor")

asyncio.run(main())
