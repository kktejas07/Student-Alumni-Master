import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('backend/.env')
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME')

async def run():
    db = AsyncIOMotorClient(MONGO_URL)[DB_NAME]
    
    # 1. Update all existing students to have some interests and a career path if they don't have them
    await db.users.update_many(
        {"role": "student", "interests": {"$exists": False}},
        {"$set": {"interests": ["AI", "Web Development", "Entrepreneurship"], "career_path": "Software Engineer", "school_info.institution_name": "IIT Madras"}}
    )

    # 2. Add some fake users
    fake_users = [
        {"full_name": "Alice Alumni", "email": "alice@alumni.demo", "role": "alumni", "interests": ["AI", "Machine Learning"], "career_path": "Data Scientist", "school_info": {"institution_name": "IIT Madras"}},
        {"full_name": "Bob Mentor", "email": "bob@mentor.demo", "role": "mentor", "mentor_status": "approved", "interests": ["Web Development"], "career_path": "Software Engineer", "school_info": {"institution_name": "IIT Delhi"}, "category": "Software Engineer"},
        {"full_name": "Charlie Student", "email": "charlie@student.demo", "role": "student", "interests": ["Entrepreneurship"], "career_path": "Product Manager", "school_info": {"institution_name": "IIT Madras"}},
        {"full_name": "Diana Alumni", "email": "diana@alumni.demo", "role": "alumni", "interests": ["Web Development", "Cloud"], "career_path": "Software Engineer", "school_info": {"institution_name": "NIT Trichy"}},
        {"full_name": "Eve Mentor", "email": "eve@mentor.demo", "role": "mentor", "mentor_status": "approved", "interests": ["AI", "Entrepreneurship"], "career_path": "Data Scientist", "school_info": {"institution_name": "BITS Pilani"}, "category": "Data Scientist"}
    ]
    
    for u in fake_users:
        # insert only if doesn't exist
        existing = await db.users.find_one({"email": u["email"]})
        if not existing:
            await db.users.insert_one(u)

    print("Seeded network data successfully.")

asyncio.run(run())
