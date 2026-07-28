import re

file_path = 'frontend/src/views/web/portals/alumni/Sidebar.tsx'

with open(file_path, 'r', encoding='utf-8') as file:
    content = file.read()

# Remove the shadow completely for web and native
old_active_style = """  navItemActive: {
    ...(Platform.OS === 'web' ? ({
      boxShadow: '0 6px 18px rgba(99,102,241,0.45), inset 0 1px 0 rgba(255,255,255,0.18)',
    } as any) : { shadowColor: SC.primary, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } as any }),
  },"""

new_active_style = """  navItemActive: {
    ...(Platform.OS === 'web' ? ({
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
    } as any) : {}),
  },"""

content = content.replace(old_active_style, new_active_style)

with open(file_path, 'w', encoding='utf-8') as file:
    file.write(content)

print(f"Patched {file_path}")
