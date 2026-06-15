import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from httpx import AsyncClient
from server import app
from datetime import datetime, timezone
import uuid
import secrets

async def run_test():
    from httpx import ASGITransport
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Create user
        email = f"test-{secrets.token_hex(4)}@test.com"
        r = await ac.post("/api/auth/register", json={
            "email": email, "password": "x"*6, "full_name": "Test", "role": "student"
        })
        token = r.json()["access_token"]
        
        # Complete onboarding
        r2 = await ac.post("/api/users/onboarding", json={
            "school_info": {"institution_name": "X", "institution_type": "school", "class_or_year": "12", "country": "India"},
            "career_path": "job",
            "interests": []
        }, headers={"Authorization": f"Bearer {token}"})
        
        # Try AI endpoint
        r3 = await ac.post("/api/ai/career-suggestions", json={"additional_context": "test"}, headers={"Authorization": f"Bearer {token}"})
        print(f"Status: {r3.status_code}")
        print(f"Response: {r3.text}")

if __name__ == "__main__":
    asyncio.run(run_test())
