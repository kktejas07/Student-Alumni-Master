import re

# Fix college
college_path = 'frontend/src/views/web/portals/college/atoms.tsx'
with open(college_path, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('SC.muted', 'CC.muted')
with open(college_path, 'w', encoding='utf-8') as f:
    f.write(content)

# Fix superadmin
superadmin_path = 'frontend/src/views/web/portals/superadmin/atoms.tsx'
with open(superadmin_path, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('SC.muted', 'SAC.muted')
with open(superadmin_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed CC and SAC muted values")
