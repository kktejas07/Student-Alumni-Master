import asyncio
import json
import urllib.request
import urllib.error
import os

EMAIL = os.getenv("API_EMAIL")
PASSWORD = os.getenv("API_PASSWORD")

async def run():
    # Login to get token
    req = urllib.request.Request(
        'http://localhost:8000/api/auth/login',
        data=json.dumps({"email": EMAIL, "password": PASSWORD}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            res = json.loads(response.read().decode())
            token = res.get("access_token")
            print("Token length:", len(token) if token else "No token")
            if not token:
                raise ValueError("Failed to retrieve access token")
            
            # Call network/requests
            req2 = urllib.request.Request(
                'http://localhost:8000/api/network/requests',
                headers={'Authorization': f'Bearer {token}'}
            )
            with urllib.request.urlopen(req2, timeout=10) as response2:
                res2 = json.loads(response2.read().decode())
                print("Items count:", len(res2.get("items", [])))
                print("Sent count:", len(res2.get("sent", [])))
    except Exception as e:
        print("Error:", e)
        if hasattr(e, 'read'):
            print(e.read().decode())

asyncio.run(run())
