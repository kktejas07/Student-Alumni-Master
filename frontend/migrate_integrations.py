import re
import os

filepath = 'src/views/web/profile/IntegrationsView.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

# Fix platformChipText color
text = text.replace("platformChipText: { color: '#fff'", "platformChipText: { color: '#1C1C1E'")
text = text.replace("<Video size={13} color={active ? '#0F2922' : '#fff'} />", "<Video size={13} color={active ? '#0F2922' : '#475569'} />")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(text)

print(f"Migrated {filepath} platform chips to dark text")
