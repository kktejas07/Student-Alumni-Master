import re

with open('app/financial.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

def replace_color(match):
    color = match.group(0).upper()
    if color in ['#FFF', '#FFFFFF', '#000', '#000000']:
        return match.group(0) 
    return '#7C3AED'

hex_pattern_8 = r'#[0-9a-fA-F]{3,8}'

def replace_hex(match):
    c = match.group(0).upper()
    if c in ['#FFF', '#FFFFFF', '#000', '#000000']: return match.group(0)
    if len(c) == 9:
        alpha = c[7:9]
        return f'#7C3AED{alpha}'
    return '#7C3AED'

text = re.sub(hex_pattern_8, replace_hex, text)

def replace_rgba(match):
    r, g, b = int(match.group(1)), int(match.group(2)), int(match.group(3))
    if (r,g,b) == (0,0,0) or (r,g,b) == (255,255,255):
        return match.group(0)
    return 'rgba(124,58,237,'

text = re.sub(r'rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,', replace_rgba, text)

text = text.replace("color: '#7C3AED'}]}>Chat with AI", "color: '#fff'}]}>Chat with AI")
text = text.replace("aiSubmitText: { color: '#7C3AED'", "aiSubmitText: { color: '#fff'")
text = text.replace("aiTop3RankText: { color: '#7C3AED'", "aiTop3RankText: { color: '#fff'")
text = text.replace("optimizeText: { color: '#7C3AED'", "optimizeText: { color: '#fff'")
text = text.replace("ctaBtnText: { color: '#7C3AED'", "ctaBtnText: { color: '#fff'")
text = text.replace("applyText: { color: '#7C3AED'", "applyText: { color: '#fff'")
text = text.replace("savPillText: { color: '#7C3AED'", "savPillText: { color: '#7C3AED'") 
text = text.replace("tabCountText: { color: '#7C3AED'", "tabCountText: { color: '#fff'")

with open('app/financial.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Done colors!")
