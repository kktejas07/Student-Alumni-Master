import asyncio
from backend.server import ai_career_roadmap
import json

async def test_roadmap():
    user = {
        "_id": "dummy_id",
        "email": "test@example.com",
        "role": "student",
        "student_info": {"career_goal": "SE"},
        "full_name": "Test User",
        "projects": [],
        "certificates": []
    }
    
    # Mock db
    class MockDB:
        class career_roadmaps:
            async def find_one(self, *args, **kwargs): return None
            async def update_one(self, *args, **kwargs): return None
        class connections:
            async def count_documents(self, *args, **kwargs): return 0
        class bookings:
            async def count_documents(self, *args, **kwargs): return 0
            
    import backend.server
    backend.server.db = MockDB()
    
    try:
        res = await ai_career_roadmap(body={"force": True}, user=user)
        print(json.dumps(res, indent=2))
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_roadmap())
