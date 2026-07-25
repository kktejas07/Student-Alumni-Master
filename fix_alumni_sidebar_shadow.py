import re

file_path = 'frontend/src/views/web/portals/alumni/Sidebar.tsx'

with open(file_path, 'r', encoding='utf-8') as file:
    content = file.read()

# Replace the orange shadow with an indigo/purple one to match the brand gradient
old_shadow = "'0 6px 18px rgba(194,65,12,0.45), inset 0 1px 0 rgba(255,255,255,0.18)'"
new_shadow = "'0 6px 18px rgba(99,102,241,0.45), inset 0 1px 0 rgba(255,255,255,0.18)'"

content = content.replace(old_shadow, new_shadow)

with open(file_path, 'w', encoding='utf-8') as file:
    file.write(content)

print(f"Patched {file_path}")
