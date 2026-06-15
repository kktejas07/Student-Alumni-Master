import asyncio
import os
import sys

# Add parent directory to path to import core
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from core.skill_categorization import Subcategory, DisplayCategory, SUBCATEGORY_TO_DISPLAY

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "student_alumni_db")
_mongo = AsyncIOMotorClient(MONGO_URL)
db = _mongo[DB_NAME]

async def run_migration():
    print("Starting Career AI Category System Migration...")
    
    # 1. Migrate user_skill_categories
    print("Migrating user_skill_categories...")
    user_skills_cursor = db.user_skill_categories.find({})
    updated_skills = 0
    async for doc in user_skills_cursor:
        subcat_str = doc.get("subcategory")
        display_categories = []
        
        if subcat_str:
            try:
                subcat = Subcategory(subcat_str)
                display_enum_list = SUBCATEGORY_TO_DISPLAY.get(subcat, [DisplayCategory.technical_excellence])
                display_categories = [d.value for d in display_enum_list]
            except ValueError:
                display_categories = [DisplayCategory.technical_excellence.value]
        else:
            display_categories = [DisplayCategory.technical_excellence.value]
            
        await db.user_skill_categories.update_one(
            {"_id": doc["_id"]},
            {
                "$set": {"display_categories": display_categories},
                "$unset": {"display_category": ""}
            }
        )
        updated_skills += 1
    
    print(f"Migrated {updated_skills} user skills.")
    
    # 2. Migrate skill_taxonomy_cache
    print("Migrating skill_taxonomy_cache...")
    cache_cursor = db.skill_taxonomy_cache.find({})
    updated_cache = 0
    async for doc in cache_cursor:
        subcat_str = doc.get("subcategory")
        display_categories = []
        
        if subcat_str:
            try:
                subcat = Subcategory(subcat_str)
                display_enum_list = SUBCATEGORY_TO_DISPLAY.get(subcat, [DisplayCategory.technical_excellence])
                display_categories = [d.value for d in display_enum_list]
            except ValueError:
                display_categories = [DisplayCategory.technical_excellence.value]
        else:
            display_categories = [DisplayCategory.technical_excellence.value]
            
        await db.skill_taxonomy_cache.update_one(
            {"_id": doc["_id"]},
            {
                "$set": {"display_categories": display_categories},
                "$unset": {"display_category": ""}
            }
        )
        updated_cache += 1
        
    print(f"Migrated {updated_cache} taxonomy cache entries.")
    print("Migration completed successfully!")

if __name__ == "__main__":
    asyncio.run(run_migration())
