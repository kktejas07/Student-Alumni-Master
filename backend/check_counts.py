import asyncio
from db import db

async def main():
    roles = await db.users.aggregate([{"$group": {"_id": "$role", "count": {"$sum": 1}}}]).to_list(None)
    print("User counts by role:")
    for r in roles:
        print(r)
        
    mock_count = await db.users.count_documents({"is_test": True})
    print(f"\nAccounts with is_test: True: {mock_count}")
    
    mock_count2 = await db.users.count_documents({"email": {"$regex": "mock|example|test|fake"}})
    print(f"\nAccounts with test-like emails: {mock_count2}")
    
    sample = await db.users.find({}, {"email": 1, "role": 1, "is_test": 1, "is_mock": 1}).limit(5).to_list(None)
    print("\nSample users:")
    for s in sample:
        print(s)

asyncio.run(main())
