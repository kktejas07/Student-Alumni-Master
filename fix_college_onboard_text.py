import re

file_path = 'frontend/app/(onboarding)/college-onboard.tsx'

with open(file_path, 'r', encoding='utf-8') as file:
    content = file.read()

old_style = "infoText: { flex: 1, color: 'rgba(255,255,255,0.78)', fontFamily: FONTS.med, fontSize: 12.5, lineHeight: 18 },"
new_style = "infoText: { flex: 1, color: '#1E3A8A', fontFamily: FONTS.med, fontSize: 12.5, lineHeight: 18 },"

content = content.replace(old_style, new_style)

with open(file_path, 'w', encoding='utf-8') as file:
    file.write(content)

print(f"Patched {file_path}")
