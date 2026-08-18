import re

with open('app/deals.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Line 321
text = text.replace(
    'style={s.bundleLogo} resizeMode="contain" />',
    'style={[s.bundleLogo, { tintColor: b.accent || \'#000\' }]} resizeMode="contain" />'
)

# Line 431
text = text.replace(
    'style={s.modalLogo} resizeMode="contain" />',
    'style={[s.modalLogo, { tintColor: claimDeal.accent || \'#000\' }]} resizeMode="contain" />'
)

# Line 559
text = text.replace(
    'style={s.cardLogo} resizeMode="contain" />',
    'style={[s.cardLogo, { tintColor: d.accent || \'#000\' }]} resizeMode="contain" />'
)

with open('app/deals.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Added tintColor to logos in deals.tsx")
