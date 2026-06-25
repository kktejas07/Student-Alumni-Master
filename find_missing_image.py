import os, re

missing = []
for root, dirs, files in os.walk('frontend'):
    if 'node_modules' in root: continue
    for f in files:
        if f.endswith('.tsx') or f.endswith('.ts'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
                # Check if it uses <Image
                if '<Image' in content:
                    # Check if it has 'Image' in react-native import
                    rn_import = re.search(r"import\s+\{([^}]+)\}\s+from\s+['\"]react-native['\"]", content)
                    if rn_import and 'Image' in rn_import.group(1):
                        continue
                    # Check if it has 'Image' in expo-image import
                    expo_import = re.search(r"import\s+Image\s+from\s+['\"]expo-image['\"]", content)
                    if expo_import:
                        continue
                    # Check if it has 'Image' from lucide-react etc
                    other_import = re.search(r"import\s+\{.*?\bImage\b.*?\}.*", content)
                    if other_import:
                        continue
                    missing.append(path)

print('MISSING:', missing)
