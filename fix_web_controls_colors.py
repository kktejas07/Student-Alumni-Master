import os
import re

files_to_fix = [
    'frontend/src/views/web/AuthWebControls.tsx',
    'frontend/src/views/web/OnboardingShell.tsx',
    'frontend/src/views/web/SuggestionAutocomplete.tsx',
    'frontend/src/views/web/Dropdown.tsx'
]

replacements = [
    (r"rgba\(255,\s*255,\s*255,\s*0\.03\)", "'#FFFFFF'"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.04\)", "'#F9FAFB'"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.05\)", "'#FFFFFF'"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.06\)", "'#F3F4F6'"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.08\)", "'#E5E7EB'"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.10\)", "'#E5E7EB'"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.12\)", "'#E5E7EB'"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.14\)", "'#E5E7EB'"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.16\)", "'#E5E7EB'"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.18\)", "'#E5E7EB'"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.2\)", "'#D1D5DB'"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.22\)", "'#D1D5DB'"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.25\)", "'#D1D5DB'"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.3\)", "'#9CA3AF'"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.32\)", "'#9CA3AF'"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.4\)", "'#9CA3AF'"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.44\)", "'#9CA3AF'"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.45\)", "'#9CA3AF'"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.5\)", "'#6B7280'"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.55\)", "'#6B7280'"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.6\)", "'#6B7280'"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.65\)", "'#4B5563'"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.7\)", "'#4B5563'"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.75\)", "'#374151'"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.8\)", "'#374151'"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.85\)", "'#1F2937'"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.9\)", "'#111827'"),
]

def process_content(c):
    for old, new in replacements:
        rgba_pattern = old.replace("'", "")
        hex_color = new.replace("'", "")
        c = re.sub(rgba_pattern, hex_color, c)
    
    # Specific fixes
    # AuthWebControls ghost text and optTitle
    c = re.sub(r"optTitle:\s*\{\s*color:\s*C\.white", r"optTitle: { color: '#111827'", c)
    c = re.sub(r"ghostText:\s*\{\s*color:\s*C\.white", r"ghostText: { color: '#111827'", c)
    c = re.sub(r"color=\"rgba\(255,255,255,0\.85\)\"", r'color="#1F2937"', c)

    return c

for f in files_to_fix:
    if not os.path.exists(f):
        continue
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    new_content = process_content(content)
    
    if content != new_content:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(new_content)
        print(f"Fixed {f}")
