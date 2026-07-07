import re

with open('server.py', 'r') as f:
    content = f.read()

# We can use regex to extract blocks starting with `@api_router.(post|get)("/auth/` and ending at the next `@api_router` or `# -----`
