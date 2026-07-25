import re
import glob
import os

files = glob.glob('frontend/src/views/web/portals/*/Sidebar.tsx')

for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add import if missing
    if "import { SALogo }" not in content:
        # insert after the last standard import
        content = re.sub(r"(import .*?;\n)(?=\s*export)", r"\1import { SALogo } from '@/src/views/components';\n", content, count=1, flags=re.DOTALL)
        if "import { SALogo }" not in content:
            # fallback
            content = "import { SALogo } from '@/src/views/components';\n" + content

    # Replace the square gradient logo with SALogo
    # We look for a <LinearGradient> that has style={...brandLogo...} and contains <Text>SA</Text>
    
    # regex to match:
    # <LinearGradient ... style={...brandLogo...} ... >
    #   <Text ... >SA</Text>
    # </LinearGradient>
    
    pattern = r"<LinearGradient[^>]*brandLogo[^>]*>.*?<Text[^>]*>SA</Text>.*?</LinearGradient>"
    
    if re.search(pattern, content, re.DOTALL):
        content = re.sub(pattern, '<SALogo size={32} variant="glass" />', content, flags=re.DOTALL)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Patched {file_path}")
    else:
        # Maybe it's a View instead of LinearGradient?
        pattern_view = r"<View[^>]*brandLogo[^>]*>.*?<Text[^>]*>SA</Text>.*?</View>"
        if re.search(pattern_view, content, re.DOTALL):
            content = re.sub(pattern_view, '<SALogo size={32} variant="glass" />', content, flags=re.DOTALL)
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Patched {file_path} (View)")
        else:
            print(f"Skipped {file_path}")
