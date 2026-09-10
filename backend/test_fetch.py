import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request("https://localhost:8000/api/echo/showcases/snist")
try:
    with urllib.request.urlopen(req, context=ctx) as response:
        data = json.loads(response.read().decode())
        print(f"registration field: {data.get('registration')}")
except Exception as e:
    print(f"Error: {e}")
