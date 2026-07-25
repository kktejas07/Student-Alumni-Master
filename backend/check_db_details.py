import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

# Load env variables from backend/.env
dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path)

mongo_url = os.environ.get("MONGO_URL")
if not mongo_url:
    raise ValueError("MONGO_URL is not set.")

client = AsyncIOMotorClient(mongo_url)
db = client.get_database("studentalumniadmin")

async def main():
    collections = await db.list_collection_names()
    print("=== Database Collections ===")
    for col_name in sorted(collections):
        count = await db[col_name].count_documents({})
        print(f"Collection: {col_name} - {count} documents")
        
    print("\n=== User Roles Summary ===")
    # Count users by role
    pipeline = [
        {"$group": {"_id": "$role", "count": {"$sum": 1}}}
    ]
    cursor = db.users.aggregate(pipeline)
    async for doc in cursor:
        print(f"Role: {doc['_id']} - {doc['count']} users")

    print("\n=== Sample Document per Collection ===")
    for col_name in sorted(collections):
        doc = await db[col_name].find_one({})
        if doc:
            # Strip or format large values to keep output readable
            clean_doc = {}
            for k, v in doc.items():
                if isinstance(v, bytes):
                    clean_doc[k] = f"<bytes: {len(v)}>"
                elif isinstance(v, str) and len(v) > 200:
                    clean_doc[k] = v[:200] + "..."
                else:
                    clean_doc[k] = v
            print(f"\n[{col_name}]:")
            print(clean_doc)
        else:
            print(f"\n[{col_name}]: Empty")

if __name__ == "__main__":
    asyncio.run(main())
