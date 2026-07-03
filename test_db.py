import asyncio
from backend.server import ai_career_roadmap
from backend.core.db import db
from motor.motor_asyncio import AsyncIOMotorClient
import json

async def test_roadmap():
    # connect to real db
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    real_db = client["studentalumniadmin"]
    
    # We need to overwrite the db in backend.server
    import backend.server
    backend.server.db = real_db
    
    # create a dummy user
    user = {
        "_id": "dummy_id",
        "email": "test@example.com",
        "role": "student",
        "student_info": {"career_goal": "SE"},
        "full_name": "Test User",
        "projects": [],
        "certificates": []
    }
    
    try:
        res = await backend.server.ai_career_roadmap(body={"force": True}, user=user)
        print(json.dumps(res, indent=2))
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_roadmap())
