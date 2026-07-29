import os
import glob
import re

files = glob.glob('frontend/app/(onboarding)/*.tsx') + glob.glob('frontend/src/views/web/*.tsx')

replacements = [
    (r"rgba\(255,\s*255,\s*255,\s*0\.03\)", "'#FFFFFF'"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.04\)", "'#F9FAFB'"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.06\)", "'#F3F4F6'"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.08\)", "'#E5E7EB'"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.12\)", "'#E5E7EB'"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.14\)", "'#E5E7EB'"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.18\)", "'#E5E7EB'"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.2\)", "'#D1D5DB'"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.3\)", "'#D1D5DB'"),
    (r"rgba\(255,\s*255,\s*255,\s*0\.4\)", "'#9CA3AF'"),
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

# specific overrides for strings in JSX vs styles
def process_content(c):
    for old, new in replacements:
        # replace in strings where quotes are missing from the old pattern
        # the replacements list assumes it's within a string in TS, e.g. 'rgba(...)'
        # Let's just do text replacement for the rgba string itself
        rgba_pattern = old.replace("'", "")
        hex_color = new.replace("'", "")
        c = re.sub(rgba_pattern, hex_color, c)
    
    # replace color: '#FFF' and color: '#FFFFFF'
    c = re.sub(r"color:\s*'#FFF'", r"color: '#111827'", c)
    c = re.sub(r"color:\s*'#FFFFFF'", r"color: '#111827'", c)
    c = re.sub(r'color="#FFF"', r'color="#111827"', c)
    c = re.sub(r'color="#FFFFFF"', r'color="#111827"', c)
    
    # specifically fix active state colors that shouldn't be white on light purple
    c = re.sub(r"priceChipTextActive:\s*\{\s*color:\s*'#111827'\s*\}", r"priceChipTextActive: { color: '#4C1D95' }", c)
    c = re.sub(r"dotTextActive:\s*\{\s*color:\s*'#111827'\s*\}", r"dotTextActive: { color: '#FFFFFF' }", c) # Dot active has solid dark purple bg, so white is fine
    c = re.sub(r"cardLabelActive:\s*\{\s*color:\s*'#111827'\s*\}", r"cardLabelActive: { color: '#4C1D95' }", c)
    
    # Fix the smallBtn text and icons since the bg is light purple (rgba(124,58,237,0.32) -> '#F3E8FF' or similar)
    c = re.sub(r"smallBtnText:\s*\{\s*color:\s*'#111827'", r"smallBtnText: { color: '#4C1D95'", c)
    
    # ArrowLeft
    c = re.sub(r"<ArrowLeft([^>]+)color=\"#111827\"", r'<ArrowLeft\1color="#374151"', c)

    return c

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    new_content = process_content(content)
    
    if content != new_content:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(new_content)
        print(f"Fixed {f}")
