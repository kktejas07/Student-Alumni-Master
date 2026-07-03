import requests
import json
import time

BASE_URL = "http://localhost:8000"

# Register a new student
timestamp = int(time.time())
email = f"newstudent{timestamp}@example.com"
reg_data = {
    "email": email,
    "password": "Password123!",
    "full_name": "New Student",
    "role": "student"
}
r_reg = requests.post(f"{BASE_URL}/api/auth/register", json=reg_data)
print("Register:", r_reg.status_code)

if r_reg.status_code in [200, 201]:
    token = r_reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Hit roadmap endpoint
    r_roadmap = requests.post(f"{BASE_URL}/api/ai/career-roadmap", json={"force": True}, headers=headers)
    print("Roadmap Response:", r_roadmap.status_code)
    try:
        print(json.dumps(r_roadmap.json(), indent=2))
    except:
        print(r_roadmap.text)
