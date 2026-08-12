import sys
import os
import asyncio
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server import app

client = TestClient(app)

def test_verify_cert_id():
    print("Testing GET /api/certificates/verify/ECHO26-P-0001 ...")
    res = client.get("/api/certificates/verify/ECHO26-P-0001")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["valid"] is True
    assert data["type"] == "certificate"
    assert data["certificate"]["recipient_name"] == "Pendem Sai Suhaas Srivathsav"
    assert data["certificate"]["branch"] == "CSE"
    print("OK - ECHO26-P-0001 verification passed!")

def test_verify_roll_number():
    print("Testing GET /api/certificates/verify/25071A05C3 ...")
    res = client.get("/api/certificates/verify/25071A05C3")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["valid"] is True
    assert data["certificate"]["id"] == "ECHO26-P-0001"
    print("OK - Roll number verification passed!")

def test_verify_invalid():
    print("Testing GET /api/certificates/verify/INVALID_ID_9999 ...")
    res = client.get("/api/certificates/verify/INVALID_ID_9999")
    assert res.status_code == 404
    print("OK - Invalid ID returned 404 as expected!")

if __name__ == "__main__":
    test_verify_cert_id()
    test_verify_roll_number()
    test_verify_invalid()
    print("All backend certificate verification API tests PASSED successfully!")
