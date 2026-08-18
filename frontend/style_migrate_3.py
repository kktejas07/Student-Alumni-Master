import re

with open('app/financial.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace the purple/pink hex code with a true blue
text = text.replace('#7C3AED', '#2563EB')
text = text.replace('#7c3aed', '#2563EB')

# Replace the purple/pink rgba with the true blue rgba
text = text.replace('rgba(124,58,237,', 'rgba(37,99,235,')

with open('app/financial.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Done removing pink/purple!")
