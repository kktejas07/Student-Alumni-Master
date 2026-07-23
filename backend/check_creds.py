import requests
BASE = "https://hiring-mvvm.preview.emergentagent.com/api"
ACCOUNTS = [
    ("admin-super1@persona.demo",   "TestPass@123", "admin"),
    ("student01@test.com",          "TestPass@123", "student"),
    ("beginner1@persona.demo",      "TestPass@123", "student"),
    ("booked1@persona.demo",        "TestPass@123", "student"),
    ("incomplete1@persona.demo",    "TestPass@123", "student"),
    ("mentor01@test.com",           "TestPass@123", "mentor"),
    ("mentor-active1@persona.demo", "TestPass@123", "mentor"),
    ("mentor-new1@persona.demo",    "TestPass@123", "mentor"),
    ("college-high1@persona.demo",  "TestPass@123", "college"),
    ("alumni01@test.com",           "TestPass@123", "alumni"),
    ("admin@careerpath.app",        "Admin@12345",  "admin"),
    ("admin2@careerpath.app",       "Admin@12345",  "admin"),
    ("admin2@careerpath.app",       "TestPass@123", "admin"),
]
print("Checking credentials...")
for email, pwd, role in ACCOUNTS:
    r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": pwd}, timeout=10)
    if r.status_code == 200:
        user = r.json().get("user", {})
        print(f"[OK  ] {email} | role={user.get('role')} | name={user.get('full_name')}")
    else:
        print(f"[FAIL] {email} | {r.status_code} | {r.text[:80]}")
