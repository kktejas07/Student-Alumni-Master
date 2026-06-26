import requests

try:
    print("Sending POST request to /api/auth/login with Origin...")
    r = requests.post("http://localhost:8000/api/auth/login", json={"email":"test@example.com","password":"password"}, headers={"Origin": "http://localhost:8081"})
    print("Status Code:", r.status_code)
    print("Response Headers:", r.headers)
    print("Response Body:", r.text)
except Exception as e:
    print("Exception:", e)
