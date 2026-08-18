import re
import os

files_to_update = [
    'app/deals.tsx',
    'app/wallet.tsx',
    'app/higher-education.tsx',
    'app/rentals.tsx',
    'app/profile/[id].tsx'
]

# Patterns for the C object replacements
def modify_c_object(text):
    # Replace hardcoded C object text fields
    text = re.sub(r"text:\s*'#fff'", "text: '#000'", text)
    text = re.sub(r"text:\s*NX\.textP", "text: '#000'", text)
    text = re.sub(r"text2:\s*'rgba\(255,255,255,", "text2: 'rgba(0,0,0,", text)
    text = re.sub(r"text3:\s*'rgba\(255,255,255,", "text3: 'rgba(0,0,0,", text)
    text = re.sub(r"border:\s*'rgba\(255,255,255,", "border: 'rgba(0,0,0,", text)
    text = re.sub(r"card:\s*'rgba\(255,255,255,", "card: 'rgba(0,0,0,", text)
    return text

def modify_styles_block(text):
    s_start = text.find('const s = StyleSheet.create({')
    if s_start == -1:
        return text
    
    new_text = text
    for match in re.finditer(r'const s = StyleSheet\.create\(\{', new_text):
        start_idx = match.start()
        end_idx = new_text.find('\n});', start_idx)
        if end_idx != -1:
            end_idx += 4
            s_block = new_text[start_idx:end_idx]
            
            # Text color replacements
            s_block = s_block.replace("color: '#fff'", "color: '#000'")
            s_block = s_block.replace("color: 'rgba(255,255,255,", "color: 'rgba(0,0,0,")
            
            # Backgrounds and borders
            s_block = s_block.replace("backgroundColor: 'rgba(255,255,255,", "backgroundColor: 'rgba(0,0,0,")
            s_block = s_block.replace("borderColor: 'rgba(255,255,255,", "borderColor: 'rgba(0,0,0,")
            s_block = s_block.replace("borderTopColor: 'rgba(255,255,255,", "borderTopColor: 'rgba(0,0,0,")
            s_block = s_block.replace("borderBottomColor: 'rgba(255,255,255,", "borderBottomColor: 'rgba(0,0,0,")

            # Restore button text colors back to white
            for btn_key in ['applyText', 'submitText', 'ctaText', 'ctaBtnText', 'actionText', 'btnText', 'buttonText', 
                            'badgeText', 'rankText', 'aiSubmitText', 'checkoutText', 'bookText', 'payText', 'topupText']:
                s_block = re.sub(fr"{btn_key}:\s*{{([^}}]*)color:\s*'#000'", rf"{btn_key}: {{\g<1>color: '#fff'", s_block)

            new_text = new_text[:start_idx] + s_block + new_text[end_idx:]
    
    return new_text

for filepath in files_to_update:
    if not os.path.exists(filepath):
        print(f"Skipping {filepath}, not found")
        continue
        
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()
        
    text = modify_c_object(text)
    text = modify_styles_block(text)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(text)
        
    print(f"Migrated {filepath} to light theme")

print("All done!")
