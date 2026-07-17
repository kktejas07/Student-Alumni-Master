import requests, json

BASE = "http://localhost:8000/api"

ACCOUNTS = [
    ("student01@test.com",          "TestPass@123"),
    ("student02@test.com",          "TestPass@123"),
    ("student03@test.com",          "TestPass@123"),
    ("student04@test.com",          "TestPass@123"),
    ("testmjlwsm@test.com",         "TestPass@123"),
    ("mentor01@test.com",           "TestPass@123"),
    ("mentor02@test.com",           "TestPass@123"),
    ("mentor05@test.com",           "TestPass@123"),
    ("admin@careerpath.app",        "Admin@12345"),
    ("admin2@careerpath.app",       "Admin@12345"),
    ("admin@careerpath.app",        "TestPass@123"),
    ("alumni01@test.com",           "TestPass@123"),
    ("alumni02@test.com",           "TestPass@123"),
    ("alumni03@test.com",           "TestPass@123"),
    ("iitb@university.in",          "TestPass@123"),
    ("iith@university.in",          "TestPass@123"),
    ("bits@university.in",          "TestPass@123"),
    ("stanford@university.in",      "TestPass@123"),
    ("test@example.com",            "TestPass@123"),
    ("test@example.com",            "Admin@12345"),
    ("test-alumni-85033bd9@test.com","TestPass@123"),
    ("alumni-test-1777465028@test.com","TestPass@123"),
]

print("Checking credentials with correct API path /api/auth/login ...")
print("=" * 70)
working = []
for email, pwd in ACCOUNTS:
    try:
        r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": pwd}, timeout=8)
        if r.status_code == 200:
            user = r.json().get("user", {})
            token = r.json().get("access_token", "")
            print(f"  [OK  ] {email} | role={user.get('role')} | name={user.get('full_name')}")
            working.append({"email": email, "password": pwd, "role": user.get("role"), "token": token[:40], "name": user.get("full_name")})
        else:
            print(f"  [FAIL] {email} | {r.status_code} | {r.text[:60]}")
    except Exception as e:
        print(f"  [ERR ] {email} | {e}")

print(f"\n{'='*70}")
print(f"Working accounts: {len(working)}")
for w in working:
    print(f"  {w['email']} ({w['role']}) - {w['name']}")
with open("working_accounts.json", "w") as f:
    json.dump(working, f, indent=2)
print("\nSaved to working_accounts.json")
