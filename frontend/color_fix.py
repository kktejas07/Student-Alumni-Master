import re

with open('app/deals.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix invisible/clumsy colors

# Remove backgroundColor: '#fff' from logos in StyleSheet so they don't fight inline styles
text = text.replace("bundleLogo: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff' }",
                    "bundleLogo: { width: 36, height: 36, borderRadius: 10 }")
text = text.replace("cardLogo: { width: 44, height: 44, backgroundColor: '#fff' }",
                    "cardLogo: { width: 44, height: 44 }")
text = text.replace("modalLogo: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#fff' }",
                    "modalLogo: { width: 48, height: 48, borderRadius: 12 }")

# Darken neon colors
text = text.replace("color: '#86EFAC'", "color: '#166534'")  # price label
text = text.replace("color: '#FCD34D'", "color: '#B45309'")  # discount pct
text = text.replace("color: '#FBCFE8'", "color: '#BE185D'")  # smart bundle savings

# Remove pink from claimAllBtn
text = text.replace("backgroundColor: '#EC4899'", "backgroundColor: '#2563EB'")
text = text.replace("color: '#3F0518'", "color: '#fff'") # claimAllText to white

# Fix modal background from dark to light
text = text.replace("backgroundColor: '#1A1626'", "backgroundColor: '#fff'")

with open('app/deals.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Cleaned up clumsy colors in deals.tsx")
