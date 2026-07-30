import urllib.request
import json
import sys

try:
    req = urllib.request.Request("http://localhost:8002/api/agent-k/debug")
    with urllib.request.urlopen(req, timeout=5) as response:
        data = response.read()
        print(data.decode('utf-8'))
except Exception as e:
    print(f"Error: {e}")
