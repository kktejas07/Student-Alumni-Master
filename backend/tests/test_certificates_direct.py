import sys
import os
import asyncio
import certifi
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

from routers.certificates import router as certificates_router

app = FastAPI()
app.include_router(certificates_router, prefix="/api")

async def run_tests():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        print("Testing GET /api/certificates/verify/ECHO26-P-0001 ...")
        res = await client.get("/api/certificates/verify/ECHO26-P-0001")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert data["valid"] is True
        assert data["type"] == "certificate"
        assert data["certificate"]["recipient_name"] == "Pendem Sai Suhaas Srivathsav"
        assert data["certificate"]["branch"] == "CSE"
        print("SUCCESS: ECHO26-P-0001 verified!")

        print("Testing GET /api/certificates/verify/25071A05C3 ...")
        res = await client.get("/api/certificates/verify/25071A05C3")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert data["valid"] is True
        assert data["certificate"]["id"] == "ECHO26-P-0001"
        print("SUCCESS: Roll Number 25071A05C3 verified!")

        print("Testing GET /api/certificates/verify/SA-EXC-2026-0002 ...")
        res = await client.get("/api/certificates/verify/SA-EXC-2026-0002")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert data["valid"] is True
        assert data["type"] == "certificate"
        assert data["certificate"]["recipient_name"] == "Sethu Rohith"
        print("SUCCESS: SA-EXC-2026-0002 Award of Excellence verified for Sethu Rohith!")

        print("Testing GET /api/certificates/list ...")

        res = await client.get("/api/certificates/list?branch=AIML")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert data["total"] > 0
        print(f"SUCCESS: Catalog returned {data['total']} certificates for AIML branch!")

        print("\n🎉 ALL ASYNC CERTIFICATE API TESTS PASSED PERFECTLY!")

if __name__ == "__main__":
    asyncio.run(run_tests())
