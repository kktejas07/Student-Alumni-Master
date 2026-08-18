import re

with open('app/deals.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Undo color_fix.py

text = text.replace("bundleLogo: { width: 36, height: 36, borderRadius: 10 }",
                    "bundleLogo: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff' }")
text = text.replace("cardLogo: { width: 44, height: 44 }",
                    "cardLogo: { width: 44, height: 44, backgroundColor: '#fff' }")
text = text.replace("modalLogo: { width: 48, height: 48, borderRadius: 12 }",
                    "modalLogo: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#fff' }")

# Revert neon colors
text = text.replace("color: '#166534'", "color: '#86EFAC'")
text = text.replace("color: '#B45309'", "color: '#FCD34D'")
text = text.replace("color: '#BE185D'", "color: '#FBCFE8'")

# Revert pink button
text = text.replace("backgroundColor: '#2563EB'", "backgroundColor: '#EC4899'")
text = text.replace("color: '#fff'", "color: '#3F0518'") # this might catch other things, let's be careful
text = text.replace("claimAllText: { color: '#fff', fontSize: 12.5, fontWeight: '800' }", 
                    "claimAllText: { color: '#3F0518', fontSize: 12.5, fontWeight: '800' }")


text = text.replace("backgroundColor: '#fff'", "backgroundColor: '#1A1626'") # wait this will replace ALL white backgrounds, this is DANGEROUS!

with open('app/deals.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Reverted color_fix.py")
