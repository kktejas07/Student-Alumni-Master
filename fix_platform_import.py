import os
import glob
import re

files = glob.glob('frontend/src/views/web/portals/*/*PortalRN.tsx')

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Check if Platform is already imported from react-native
    if re.search(r"import\s+\{[^}]*Platform[^}]*\}\s+from\s+['\"]react-native['\"]", content):
        continue
    
    # Add Platform to the react-native import
    # Usually it's something like `import { View, ScrollView, StyleSheet } from 'react-native';`
    content = re.sub(
        r"(import\s+\{.*?)(\}\s+from\s+['\"]react-native['\"])",
        r"\1, Platform\2",
        content,
        count=1
    )
    
    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)

print("Fixed Platform imports in all portals")
