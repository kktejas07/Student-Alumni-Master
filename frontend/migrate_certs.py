import re
import os

files_to_update = [
    'src/views/web/CertificatesCard.tsx',
    'src/views/web/profile/ProfileInfoPage.tsx'
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
    # EXCEPT bannerTitle and platformChipText if they are on light backgrounds!
    # Wait, the banner background is 'rgba(167,139,250,0.07)' (light). So bannerTitle SHOULD be dark!
    # Let's NOT restore bannerTitle! Let's only restore btn text.
    for btn_key in ['btnPrimaryText', 'btnConfirmText', 'btnAccentText', 'btnDangerText', 'uploadBtnText', 'completePillText', 'addBtnText']:
        s_block = re.sub(fr"{btn_key}:\s*{{([^}}]*)color:\s*'#000'", rf"{btn_key}: {{\g<1>color: '#fff'", s_block)
    
    return s_block

for filepath in files_to_update:
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()

    # Apply inline replacements for CertificatesCard
    if 'CertificatesCard.tsx' in filepath:
        text = re.sub(r"color=\{(?:'#fff'|\"#fff\")\}", 'color="#fff"', text) # Keep icon white if button is purple, but wait, addBtn icon?
        # Actually in addBtn: <Plus size={14} color="#fff" /> - this is fine, button is purple.
        # But if there are other icons, let's just let it be, or replace if they are not in a button.
        text = text.replace("color: '#fff'", "color: '#000'")
        text = text.replace("rgba(255,255,255,", "rgba(0,0,0,")
        text = text.replace('placeholderTextColor="rgba(255,255,255,0.45)"', 'placeholderTextColor="rgba(0,0,0,0.45)"')

    # Apply to StyleSheet blocks
    pattern = r'(StyleSheet\.create\(\{)(.*?)(\}\);)'
    
    def repl(m):
        return m.group(1) + modify_styles_block(m.group(2)) + m.group(3)

    new_text = re.sub(pattern, repl, text, flags=re.DOTALL)
    
    if new_text != text:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_text)
        print(f"Migrated {filepath} to light theme")

print("Done CertificatesCard and ProfileInfoPage banner!")
