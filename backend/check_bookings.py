import asyncio
from bson import ObjectId

class JSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, ObjectId):
            return str(o)
        return super().default(o)

async def main():
    from db import client as client
    db = client["student_alumni_db"]
    
    mentor = await db.users.find_one({"email": "mentor1@mail.com"})
    if not mentor:
        print("Mentor not found")
        return
        
    print(f"Mentor ID: {mentor['_id']}")
    
    bookings = await db.bookings.find({"mentor_id": str(mentor["_id"])}).to_list(None)
    print(f"Found {len(bookings)} bookings.")
    for b in bookings:
        print(json.dumps(b, cls=JSONEncoder, indent=2))

if __name__ == "__main__":
    asyncio.run(main())
