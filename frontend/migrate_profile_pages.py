import re
import os

files_to_update = [
    'src/views/web/profile/ProfileInfoPage.tsx',
    'src/views/web/profile/ManageProfilePage.tsx'
]

def modify_styles_block(s_block):
    # Change dark backgrounds to white/light-grey
    s_block = re.sub(r"backgroundColor:\s*'(#0[A-Fa-f0-9]{5}|#1[A-Fa-f0-9]{5}|#2[A-Fa-f0-9]{5})'", "backgroundColor: '#fff'", s_block)
    
    # Text color replacements
    s_block = s_block.replace("color: '#fff'", "color: '#000'")
    s_block = s_block.replace('color: "#fff"', 'color: "#000"')
    s_block = s_block.replace("color: '#FFF'", "color: '#000'")
    s_block = s_block.replace('color: "#FFF"', 'color: "#000"')
    
    # Change rgba(255,255,255,...) to rgba(0,0,0,...)
    s_block = s_block.replace("rgba(255,255,255,", "rgba(0,0,0,")
    
    # Restore button text colors back to white
    for btn_key in ['btnPrimaryText', 'btnConfirmText', 'uploadBtnText', 'completePillText', 'bannerTitle']:
        s_block = re.sub(fr"{btn_key}:\s*{{([^}}]*)color:\s*'#000'", rf"{btn_key}: {{\g<1>color: '#fff'", s_block)
    
    return s_block

for filepath in files_to_update:
    if not os.path.exists(filepath):
        print(f"File {filepath} not found.")
        continue
        
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()

    # Apply inline replacements in the main render body if needed
    # Specifically for C objects if they exist
    text = re.sub(r"text:\s*'#fff'", "text: '#000'", text)
    text = re.sub(r"text2:\s*'rgba\(255,255,255,", "text2: 'rgba(0,0,0,", text)
    text = re.sub(r"text3:\s*'rgba\(255,255,255,", "text3: 'rgba(0,0,0,", text)

    # Apply to StyleSheet blocks
    pattern = r'(StyleSheet\.create\(\{)(.*?)(\}\);)'
    
    def repl(m):
        return m.group(1) + modify_styles_block(m.group(2)) + m.group(3)

    text = re.sub(pattern, repl, text, flags=re.DOTALL)
    
    # Also replace any stray white text inline (like inline style={{ color: '#fff' }})
    text = text.replace("color: '#fff'", "color: '#000'")
    text = text.replace('color: "#fff"', 'color: "#000"')
    text = text.replace("color: '#FFF'", "color: '#000'")
    text = text.replace('color: "#FFF"', 'color: "#000"')
    text = text.replace("rgba(255,255,255,", "rgba(0,0,0,")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(text)
    
    print(f"Migrated {filepath} to light theme")

print("All done!")
