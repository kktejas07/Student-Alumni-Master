import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
import sys
from dotenv import load_dotenv
from datetime import datetime, timezone, timedelta

# Ensure output is UTF-8 encoded
sys.stdout.reconfigure(encoding='utf-8')

dotenv_path = os.path.join(os.path.dirname(__file__), "..", ".env")
# Or try backend/.env
if not os.path.exists(dotenv_path):
    dotenv_path = "c:\\Users\\kavya\\OneDrive\\Apps\Desktop\\Master\\Student-Alumni-Master\\backend\\.env"

load_dotenv(dotenv_path)

mongo_url = os.environ.get("MONGO_URL")
if not mongo_url:
    raise ValueError("MONGO_URL is not set.")

client = AsyncIOMotorClient(mongo_url)
db = client.get_database("studentalumniadmin")

async def main():
    # Find mentor Kavya Deshini
    mentor = await db.users.find_one({"full_name": "Kavya Deshini"})
    if not mentor:
        print("Mentor Kavya Deshini not found by name. Finding first mentor...")
        mentor = await db.users.find_one({"role": "mentor"})
    
    if not mentor:
        print("No mentor found.")
        return
        
    mentor_id = str(mentor["_id"])
    print(f"Mentor: {mentor.get('full_name')} ({mentor.get('email')}), ID: {mentor_id}")

    # Find bookings for this mentor
    bookings_cursor = db.bookings.find({"mentor_id": mentor_id})
    bookings = [b async for b in bookings_cursor]
    print(f"Total bookings for mentor: {len(bookings)}")

    print("\n--- Bookings Details ---")
    for i, b in enumerate(bookings):
        # Resolve student
        student_id = b.get("student_id")
        student = None
        if student_id:
            try:
                from bson import ObjectId
                student = await db.users.find_one({"_id": ObjectId(student_id)})
            except Exception:
                student = await db.users.find_one({"_id": student_id})
        
        sname = student.get("full_name") if student else b.get("student_name", "Unknown student")
        
        print(f"{i+1}. ID: {b.get('_id')}")
        print(f"   Student: {sname} ({student.get('email') if student else 'N/A'})")
        print(f"   Scheduled At: {b.get('scheduled_at')} (type: {type(b.get('scheduled_at'))})")
        print(f"   Status: {b.get('status')}")
        print(f"   Topic: {b.get('topic')}")
        print(f"   Duration: {b.get('duration_minutes')} min")
        print("-" * 40)

if __name__ == "__main__":
    asyncio.run(main())
