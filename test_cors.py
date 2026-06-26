import requests

try:
    print("Sending POST request to /api/auth/login...")
    r = requests.post("http://localhost:8000/api/auth/login", json={"email":"test@example.com","password":"password"})
    print("Status Code:", r.status_code)
    print("Response Headers:", r.headers)
    print("Response Body:", r.text)
except Exception as e:
    print("Exception:", e)

try:
    print("\nSending OPTIONS request to /api/auth/login...")
    r = requests.options("http://localhost:8000/api/auth/login", headers={"Origin": "http://localhost:8081", "Access-Control-Request-Method": "POST"})
    print("Status Code:", r.status_code)
    print("Response Headers:", r.headers)
    print("Response Body:", r.text)
except Exception as e:
    print("Exception:", e)
