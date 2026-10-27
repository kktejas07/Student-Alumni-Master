import asyncio
import os
import sys
from pathlib import Path

# Setup environment to import core modules
sys.path.append(str(Path(__file__).parent.parent))
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / '.env')

from core.db import db
from core.roadmap_evaluator import evaluate_roadmap_progress

async def migrate_roadmaps():
    print("Starting Roadmap Migration to Dynamic Milestones...")
    roadmaps = await db.career_roadmaps.find({}).to_list(None)
    
    migrated_count = 0
    for r in roadmaps:
        if not r.get("weekly_plan"):
            continue
            
        needs_update = False
        plan = r["weekly_plan"]
        
        for idx, item in enumerate(plan):
            # If it's a legacy item without milestone_type, convert it
            if "milestone_type" not in item:
                needs_update = True
                
                title = item.get("title", "").lower()
                tasks_str = " ".join(item.get("tasks", [])).lower()
                content = title + " " + tasks_str
                
                # Heuristic mapping
                m_type = "PROFILE"
                if "resume" in content:
                    m_type = "RESUME"
                elif "project" in content or "portfolio" in content:
                    m_type = "PROJECT"
                elif "network" in content or "alumni" in content or "connect" in content:
                    m_type = "NETWORKING"
                elif "interview" in content:
                    m_type = "MOCK_INTERVIEW"
                elif "skill" in content or "module" in content:
                    m_type = "SKILLS"
                elif "cert" in content:
                    m_type = "CERTIFICATION"
                elif "apply" in content or "internship" in content or "job" in content:
                    m_type = "JOB_APPLICATION"
                
                # Build new schema
                item["id"] = f"wk{idx+1}"
                item["description"] = item.get("title", "Complete milestone")
                item["milestone_type"] = m_type
                item["completed"] = False
                item["completed_at"] = None
                
                # Cleanup old fields if desired, but we can keep tasks for fallback
        
        if needs_update:
            await db.career_roadmaps.update_one(
                {"_id": r["_id"]},
                {"$set": {"weekly_plan": plan}}
            )
            migrated_count += 1
            
        # Run evaluator to auto-complete
        await evaluate_roadmap_progress(r["user_id"])
        
    print(f"Migrated {migrated_count} legacy roadmaps.")
    print("Evaluated all active roadmaps.")

if __name__ == "__main__":
    asyncio.run(migrate_roadmaps())
