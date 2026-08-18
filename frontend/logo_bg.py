import re

with open('app/deals.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Revert tintColor, instead use backgroundColor on the image to make the white logo visible!
# Line 321
text = text.replace(
    'style={[s.bundleLogo, { tintColor: b.accent || \'#000\' }]} resizeMode="contain" />',
    'style={[s.bundleLogo, { backgroundColor: b.accent || \'#000\' }]} resizeMode="contain" />'
)

# Line 431
text = text.replace(
    'style={[s.modalLogo, { tintColor: claimDeal.accent || \'#000\' }]} resizeMode="contain" />',
    'style={[s.modalLogo, { backgroundColor: claimDeal.accent || \'#000\' }]} resizeMode="contain" />'
)

# Line 559
text = text.replace(
    'style={[s.cardLogo, { tintColor: d.accent || \'#000\' }]} resizeMode="contain" />',
    'style={[s.cardLogo, { backgroundColor: d.accent || \'#000\' }]} resizeMode="contain" />'
)

with open('app/deals.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Changed tintColor to backgroundColor for logos")
