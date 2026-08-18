import re

with open('app/deals.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Make the white logos visible by giving them a rich dark background
# We will apply backgroundColor directly to the Image and remove the white background from StyleSheet

# Remove backgroundColor: '#fff' from StyleSheet
text = text.replace("bundleLogo: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff' }",
                    "bundleLogo: { width: 36, height: 36, borderRadius: 10 }")
text = text.replace("cardLogo: { width: 44, height: 44, backgroundColor: '#fff' }",
                    "cardLogo: { width: 44, height: 44 }")
text = text.replace("modalLogo: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#fff' }",
                    "modalLogo: { width: 48, height: 48, borderRadius: 12 }")

# Add inline backgroundColor to the Image tags
text = text.replace(
    'style={s.bundleLogo} resizeMode="contain" />',
    'style={[s.bundleLogo, { backgroundColor: b.accent || \'#000\' }]} resizeMode="contain" />'
)
text = text.replace(
    'style={s.modalLogo} resizeMode="contain" />',
    'style={[s.modalLogo, { backgroundColor: claimDeal.accent || \'#000\' }]} resizeMode="contain" />'
)
text = text.replace(
    'style={s.cardLogo} resizeMode="contain" />',
    'style={[s.cardLogo, { backgroundColor: d.accent || \'#000\' }]} resizeMode="contain" />'
)

with open('app/deals.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Applied vibrant backgrounds to logos in deals.tsx")
