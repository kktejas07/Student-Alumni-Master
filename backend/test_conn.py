import asyncio
from httpx import AsyncClient
from server import app

async def main():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        res_a = await ac.post("/api/auth/register", json={
            "email": "a3@example.com", "password": "pass", "full_name": "User A", "role": "student"
        })
        user_a = res_a.json()
        token_a = user_a["access_token"]
        a_id = user_a["user"]["id"]
        
        res_b = await ac.post("/api/auth/register", json={
            "email": "b3@example.com", "password": "pass", "full_name": "User B", "role": "student"
        })
        user_b = res_b.json()
        token_b = user_b["access_token"]
        b_id = user_b["user"]["id"]
        
        req1 = await ac.post(f"/api/network/connect/{b_id}", headers={"Authorization": f"Bearer {token_a}"})
        print("Send req:", req1.json())
        
        req2 = await ac.get("/api/network/requests", headers={"Authorization": f"Bearer {token_b}"})
        print("B Requests:", req2.json())

        req3 = await ac.get("/api/network/requests", headers={"Authorization": f"Bearer {token_a}"})
        print("A Requests:", req3.json())

asyncio.run(main())
