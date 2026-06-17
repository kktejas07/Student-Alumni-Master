import asyncio
from db import client, db as _db

async def main():
    db = client.studentalumniadmin

    user = await db.users.find_one({"role": "mentor", "full_name": {"$regex": "kal", "$options": "i"}})
    if user:
        print(f"Found kal mentor: {user['email']} with ID {user['_id']}")
        
        # Check reviews
        count = await db.reviews.count_documents({"mentor_id": str(user["_id"])})
        print(f"Reviews for this mentor: {count}")
    else:
        print("kal mentor not found in users collection.")

if __name__ == "__main__":
    asyncio.run(main())
