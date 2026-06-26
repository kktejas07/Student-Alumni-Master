import urllib.request
import time

for _ in range(60):
    try:
        urllib.request.urlopen('http://localhost:8081', timeout=2)
        print('UP')
        break
    except Exception:
        time.sleep(2)
