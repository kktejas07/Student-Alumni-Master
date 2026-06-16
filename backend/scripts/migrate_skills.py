import os
import sys
import asyncio
import logging
from pathlib import Path

# Add backend dir to sys.path so we can import core modules
sys.path.insert(0, str(Path(__file__).parent.parent))
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "student_alumni_db")

async def main():
    logger.info("Starting skill backfill migration...")
    from db import client as client
    db = client[DB_NAME]
    
    # We must import sync_user_skills here after path is setup
    from core.skill_categorization import sync_user_skills
    
    logger.info("Dropping V1 collections to ensure clean V2 schema...")
    await db.user_skill_categories.drop()
    await db.skill_taxonomy_cache.drop()
    
    cursor = db.users.find({"skills": {"$exists": True, "$ne": []}})
    users = await cursor.to_list(length=None)
    
    logger.info(f"Found {len(users)} users with skills.")
    
    count = 0
    for user in users:
        user_id = str(user["_id"])
        skills = user.get("skills", [])
        
        logger.info(f"Syncing {len(skills)} skills for user {user_id}")
        try:
            await sync_user_skills(user_id, skills)
            count += 1
        except Exception as e:
            logger.error(f"Failed to sync skills for user {user_id}: {e}")
            
    logger.info(f"Migration completed successfully. Processed {count} users.")

if __name__ == "__main__":
    asyncio.run(main())
