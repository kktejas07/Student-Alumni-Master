import re

file_path = 'frontend/src/views/components/OptionListCard.tsx'

with open(file_path, 'r', encoding='utf-8') as file:
    content = file.read()

content = re.sub(r"color:\s*'rgba\(255,255,255,0\.92\)'", r"color: '#111827'", content)
content = re.sub(r"color:\s*'rgba\(255,255,255,0\.45\)'", r"color: '#9CA3AF'", content)

with open(file_path, 'w', encoding='utf-8') as file:
    file.write(content)
