import os
import sys
import asyncio
import random
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")

if not MONGO_URL or not DB_NAME:
    print("Missing DB config")
    sys.exit(1)

_mongo = AsyncIOMotorClient(MONGO_URL)
_db = _mongo[DB_NAME]

async def seed_ai_studio():
    # 1. Find a mentor
    mentor = await _db.users.find_one({"email": "mentor01@test.com"})
    if not mentor:
        mentor = await _db.users.find_one({"role": {"$in": ["mentor", "admin"]}})
        
    if not mentor:
        print("No mentor found in the database. Please run seed_realistic.py first.")
        return
        
    mentor_id = str(mentor["_id"])
    print(f"Target Mentor: {mentor.get('email', mentor_id)}")
    
    # 2. Find 10 students
    cursor = _db.users.find({"role": "student"}).limit(10)
    students = await cursor.to_list(length=10)
    
    if not students:
        print("No students found. Please run seed_realistic.py first.")
        return
        
    print(f"Found {len(students)} students to link.")
    
    now = datetime.now(timezone.utc)
    
    skills_pool = ["Python", "React", "System Design", "Data Structures", "Cloud Architecture", "Communication"]
    
    for i, student in enumerate(students):
        student_id = str(student["_id"])
        
        # 3. Create Connection
        await _db.connections.update_one(
            {"mentor_id": mentor_id, "user_id": student_id},
            {"$set": {
                "mentor_id": mentor_id,
                "user_id": student_id,
                "status": "accepted",
                "created_at": now - timedelta(days=random.randint(10, 60))
            }},
            upsert=True
        )
        
        # 4. Update Badges
        badges = [f"Badge_{k}" for k in range(random.randint(1, 4))]
        await _db.users.update_one(
            {"_id": student["_id"]},
            {"$set": {"badges": badges, "last_login": now - timedelta(days=random.randint(0, 10))}}
        )
        
        # 5. Create Career Roadmap
        # Ensure we have common skill gaps (e.g., Python and React often < 60)
        scores = {}
        for s in skills_pool:
            if s in ["Python", "React"] and random.random() < 0.7:
                scores[s] = random.randint(30, 55) # Weak skill
            else:
                scores[s] = random.randint(65, 95) # Strong skill
                
        total_milestones = 8
        done = random.randint(1, 7)
        weekly_plan = [{"title": f"Week {w} Milestone"} for w in range(1, total_milestones + 1)]
        milestones_completed = list(range(done))
        
        await _db.career_roadmaps.update_one(
            {"user_id": student_id},
            {"$set": {
                "user_id": student_id,
                "progress_pct": int((done / total_milestones) * 100),
                "weekly_plan": weekly_plan,
                "milestones_completed": milestones_completed,
                "skill_scores": scores,
                "target_role": "Software Engineer"
            }},
            upsert=True
        )
        
        # 6. Create Sessions (some in past 30 days)
        for _ in range(random.randint(1, 3)):
            await _db.sessions.insert_one({
                "mentor_id": mentor_id,
                "user_id": student_id,
                "mentee_id": student_id,
                "scheduled_at": now - timedelta(days=random.randint(1, 28)),
                "status": "completed"
            })
            
    print("✅ Mentor AI Studio data successfully seeded!")

if __name__ == "__main__":
    asyncio.run(seed_ai_studio())
