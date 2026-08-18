import re
import glob
import os

# Find all tsx files in portals
files = glob.glob('src/views/web/portals/**/*.tsx', recursive=True)

# Files we should NOT touch or touch carefully because they were manually crafted
skip_files = ['atoms.tsx']

def modify_styles_block(s_block):
    # Change dark backgrounds to white
    s_block = re.sub(r"backgroundColor:\s*'(#0[A-Fa-f0-9]{5}|#1[A-Fa-f0-9]{5}|#2[A-Fa-f0-9]{5})'", "backgroundColor: '#FFFFFF'", s_block)
    s_block = re.sub(r"backgroundColor:\s*\"(#0[A-Fa-f0-9]{5}|#1[A-Fa-f0-9]{5}|#2[A-Fa-f0-9]{5})\"", 'backgroundColor: "#FFFFFF"', s_block)
    
    # Change #fff text colors to dark #1C1C1E
    s_block = s_block.replace("color: '#fff'", "color: '#1C1C1E'")
    s_block = s_block.replace('color: "#fff"', 'color: "#1C1C1E"')
    s_block = s_block.replace("color: '#FFF'", "color: '#1C1C1E'")
    s_block = s_block.replace('color: "#FFF"', 'color: "#1C1C1E"')
    s_block = s_block.replace("color: '#ffffff'", "color: '#1C1C1E'")
    s_block = s_block.replace("color: '#FFFFFF'", "color: '#1C1C1E'")
    
    # Change transparent white backgrounds and borders to transparent black
    s_block = s_block.replace("rgba(255,255,255,", "rgba(0,0,0,")
    
    # Restore button/tag text colors back to white!
    btn_keys = ['btnPrimaryText', 'btnConfirmText', 'btnAccentText', 'btnDangerText', 'uploadBtnText', 'completePillText', 'bannerTitle', 'platformChipText', 'title', 'tagText', 'badgeText', 'chipText', 'logoutText', 'idCardLabel', 'idCardSub', 'btnGhostText', 'pillText', 'buttonText']
    for btn_key in btn_keys:
        s_block = re.sub(fr"{btn_key}:\s*{{([^}}]*)color:\s*'#1C1C1E'", rf"{btn_key}: {{\g<1>color: '#fff'", s_block)
        s_block = re.sub(fr"{btn_key}:\s*{{([^}}]*)color:\s*'#475569'", rf"{btn_key}: {{\g<1>color: '#fff'", s_block)
    
    return s_block

for filepath in files:
    if any(skip in filepath for skip in skip_files):
        continue
    
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()

    # First, apply inline translucent replacements outside stylesheets too, just in case
    new_text = re.sub(r"backgroundColor:\s*'rgba\(255,255,255,([^']+)'", r"backgroundColor: 'rgba(0,0,0,\1'", text)
    new_text = re.sub(r"borderColor:\s*'rgba\(255,255,255,([^']+)'", r"borderColor: 'rgba(0,0,0,\1'", new_text)
    new_text = re.sub(r"borderTopColor:\s*'rgba\(255,255,255,([^']+)'", r"borderTopColor: 'rgba(0,0,0,\1'", new_text)
    new_text = re.sub(r"borderBottomColor:\s*'rgba\(255,255,255,([^']+)'", r"borderBottomColor: 'rgba(0,0,0,\1'", new_text)
    new_text = re.sub(r"borderRightColor:\s*'rgba\(255,255,255,([^']+)'", r"borderRightColor: 'rgba(0,0,0,\1'", new_text)
    new_text = re.sub(r"borderLeftColor:\s*'rgba\(255,255,255,([^']+)'", r"borderLeftColor: 'rgba(0,0,0,\1'", new_text)
    
    # Do NOT replace ALL text inline because we might break buttons. We'll only do it if it's explicitly styling a non-button element if possible.
    # Actually, we can safely replace all inline transparent white text to transparent black text.
    new_text = re.sub(r"color:\s*'rgba\(255,255,255,([^']+)'", r"color: 'rgba(0,0,0,\1'", new_text)
    
    # Process StyleSheet
    pattern = r'(StyleSheet\.create\(\{)(.*?)(\}\);)'
    
    def repl(m):
        return m.group(1) + modify_styles_block(m.group(2)) + m.group(3)

    new_text = re.sub(pattern, repl, new_text, flags=re.DOTALL)
    
    # Also catch inline dark background colors
    new_text = re.sub(r"backgroundColor:\s*['\"](#0[A-Fa-f0-9]{5}|#1[A-Fa-f0-9]{5}|#2[A-Fa-f0-9]{5})['\"]", "backgroundColor: '#FFFFFF'", new_text)
    
    if new_text != text:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_text)
        print(f"Migrated {filepath}")

print("Done migrating portals to light theme.")
