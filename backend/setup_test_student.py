"""Setup test student account for acceptance testing."""
import urllib.request
import json

API = "http://localhost:8000"
EMAIL = "acceptance.test.student@test.com"
PASSWORD = "AcceptanceTest2024!"

def api(endpoint, method="GET", body=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(f"{API}{endpoint}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())
    except Exception as ex:
        return 0, {"error": str(ex)}

# 1. Register student
print("Registering test student...")
status, body = api("/api/auth/register", "POST", {
    "email": EMAIL,
    "password": PASSWORD,
    "full_name": "Acceptance Test Student",
    "role": "student",
    "phone": "+919876543210"
})
print(f"  Register: {status} -> {json.dumps(body, default=str)[:200]}")

# 2. Login
print("Logging in...")
status, body = api("/api/auth/login", "POST", {"email": EMAIL, "password": PASSWORD})
print(f"  Login: {status}")
token = body.get("access_token", body.get("token", ""))
if not token:
    print(f"  ERROR: no token in response: {body}")
else:
    print(f"  Token: {token[:40]}...")

    # 3. Get /me to verify role
    status, me = api("/api/auth/me", token=token)
    print(f"  /me: role={me.get('role')}, email={me.get('email')}")

    # Save credentials for test
    with open("test_credentials.json", "w") as f:
        json.dump({"email": EMAIL, "password": PASSWORD, "token": token}, f)
    print("  Saved to test_credentials.json ✓")
