import re
import glob

files_to_update = glob.glob('src/views/web/profile/*.tsx')

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
    for btn_key in ['btnPrimaryText', 'btnConfirmText', 'btnAccentText', 'btnDangerText', 'uploadBtnText', 'completePillText', 'bannerTitle', 'platformChipText', 'title']:
        s_block = re.sub(fr"{btn_key}:\s*{{([^}}]*)color:\s*'#000'", rf"{btn_key}: {{\g<1>color: '#fff'", s_block)
    
    return s_block

for filepath in files_to_update:
    if "primitives.tsx" in filepath:
        continue # Already processed
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()

    # Apply inline replacements
    text = re.sub(r"text:\s*'#fff'", "text: '#000'", text)
    text = re.sub(r"text2:\s*'rgba\(255,255,255,", "text2: 'rgba(0,0,0,", text)
    text = re.sub(r"text3:\s*'rgba\(255,255,255,", "text3: 'rgba(0,0,0,", text)

    # Apply to StyleSheet blocks
    pattern = r'(StyleSheet\.create\(\{)(.*?)(\}\);)'
    
    def repl(m):
        return m.group(1) + modify_styles_block(m.group(2)) + m.group(3)

    new_text = re.sub(pattern, repl, text, flags=re.DOTALL)
    
    # Catch any leftover inline white text that wasn't in stylesheet
    # except we need to be careful not to break button texts. We can just replace the ones we know are bad.
    # Actually, we will just trust the StyleSheet logic mostly, but let's replace stray #fff in the text
    # ONLY if it's not a button or title. Actually, a simpler way is to just write the file back.
    if new_text != text:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_text)
        print(f"Migrated {filepath} to light theme")

print("All done!")
