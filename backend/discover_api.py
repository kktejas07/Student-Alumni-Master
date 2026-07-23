import requests
import re

BASE = "https://hiring-mvvm.preview.emergentagent.com"
r = requests.get(BASE, timeout=10)
html = r.text

# Look for API URLs in HTML
urls = re.findall(r"https?://[^\s\"'<>]+", html)
print("API-related URLs found in HTML:")
for u in urls[:30]:
    print(" ", u)

print()
domains = set(re.findall(r"https?://([^/\s\"'<>]+)", html))
print("All domains referenced:")
for d in sorted(domains):
    print(" ", d)

# Check JS bundle files
print()
js_links = re.findall(r'src="([^"]+\.js[^"]*)"', html)
print(f"JS bundles: {js_links}")
