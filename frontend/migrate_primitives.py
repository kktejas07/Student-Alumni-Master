import re
import os

filepath = 'src/views/web/profile/primitives.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

# Change C object colors
text = re.sub(r"bg:\s*'#[0-9a-fA-F]+'", "bg: '#F9FAFB'", text)
text = text.replace("card: 'rgba(255,255,255,0.04)'", "card: '#FFFFFF'")
text = text.replace("border: 'rgba(255,255,255,0.09)'", "border: 'rgba(0,0,0,0.10)'")
text = text.replace("borderHi: 'rgba(255,255,255,0.18)'", "borderHi: 'rgba(0,0,0,0.20)'")

text = text.replace("text: '#fff'", "text: '#1C1C1E'")
text = text.replace("text2: 'rgba(255,255,255,0.65)'", "text2: '#475569'")
text = text.replace("text3: 'rgba(255,255,255,0.45)'", "text3: '#94A3B8'")

# Replace other hardcoded white/rgba white
text = text.replace("color: '#fff'", "color: '#1C1C1E'")
text = text.replace("backgroundColor: 'rgba(255,255,255,0.04)'", "backgroundColor: '#FFFFFF'")
text = text.replace("backgroundColor: 'rgba(255,255,255,0.05)'", "backgroundColor: '#FFFFFF'")
text = text.replace("backgroundColor: 'rgba(255,255,255,0.10)'", "backgroundColor: '#F1F5F9'")
text = text.replace("borderBottomColor: 'rgba(255,255,255,0.04)'", "borderBottomColor: 'rgba(0,0,0,0.06)'")
text = text.replace("borderBottomColor: 'rgba(255,255,255,0.05)'", "borderBottomColor: 'rgba(0,0,0,0.06)'")

text = text.replace("backgroundColor: '#13091F'", "backgroundColor: '#FFFFFF'")

# Button texts - keep white for primary buttons
text = text.replace("color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 12", "color: '#475569', fontFamily: 'DMSans_700Bold', fontSize: 12")
text = text.replace("btnPrimaryText: { color: '#1C1C1E',", "btnPrimaryText: { color: '#fff',")

# Save bar ghost btn text
text = text.replace("btnGhostText: { color: '#475569'", "btnGhostText: { color: '#475569'")

# Chip picker Check icon
text = text.replace('<Check size={11} color="#fff" />', '<Check size={11} color="#fff" />') # Actually, check is inside active chip, which is purple, so white is fine.
text = text.replace("isSel && { color: '#1C1C1E' }", "isSel && { color: '#fff' }") # Chip text is white when active (purple bg)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(text)

print(f"Migrated {filepath} to light theme")
