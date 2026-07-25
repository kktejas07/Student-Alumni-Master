import os
import re

file_path = 'frontend/src/views/components/OptionListCard.tsx'

with open(file_path, 'r', encoding='utf-8') as file:
    content = file.read()

# Make card background white
content = re.sub(r"backgroundColor:\s*'#13091F'", r"backgroundColor: '#FFFFFF'", content)
content = re.sub(r"borderColor:\s*'rgba\(176,127,223,0\.30\)'", r"borderColor: '#E5E7EB'", content)
content = re.sub(r"backgroundImage:\s*'linear-gradient\(180deg,\s*#1A0E2E\s*0%,\s*#0A0512\s*100%\)'", r"backgroundImage: 'none'", content)
content = re.sub(r"boxShadow:\s*'0px 16px 60px rgba\(91,33,182,0\.45\),\s*0px 0px 0px 1px rgba\(176,127,223,0\.18\)\s*inset'", r"boxShadow: '0px 10px 25px rgba(0,0,0,0.1)'", content)

# Text colors
content = re.sub(r"color:\s*'rgba\(255,255,255,0\.55\)'", r"color: '#6B7280'", content)
content = re.sub(r"color:\s*'rgba\(255,255,255,0\.90\)'", r"color: '#111827'", content)
content = re.sub(r"color:\s*'rgba\(255,255,255,0\.78\)'", r"color: '#6B7280'", content)
content = re.sub(r"color:\s*'rgba\(255,255,255,0\.85\)'", r"color: '#111827'", content)

# Check icon (when selected)
# {isSelected ? <Check size={16} color="#FFFFFF" /> : null}
# Keep Check icon white since selected background is `primary` which is a solid color (e.g., orange or purple)

# Divider
content = re.sub(r"backgroundColor:\s*'rgba\(255,255,255,0\.08\)'", r"backgroundColor: '#F3F4F6'", content)

with open(file_path, 'w', encoding='utf-8') as file:
    file.write(content)
