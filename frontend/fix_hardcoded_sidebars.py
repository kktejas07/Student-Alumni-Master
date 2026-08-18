import os

# Fix mentor
path = 'src/views/web/portals/mentor/Sidebar.tsx'
if os.path.exists(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace("colors={['#4338ca', '#6d28d9'] as any}", "colors={['#0F172A', '#0F172A'] as any}")
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

# Fix alumni
path = 'src/views/web/portals/alumni/Sidebar.tsx'
if os.path.exists(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace("backgroundColor: '#5D3FD3'", "backgroundColor: '#0F172A'")
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

# Fix college
path = 'src/views/web/portals/college/Sidebar.tsx'
if os.path.exists(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace("backgroundColor: '#5D3FD3'", "backgroundColor: '#0F172A'")
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Fixed hardcoded backgrounds.")
