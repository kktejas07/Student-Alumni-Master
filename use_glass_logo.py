import re

file_path = 'frontend/src/views/web/platform/components.tsx'

with open(file_path, 'r', encoding='utf-8') as file:
    content = file.read()

# Replace ShieldLogo with SALogo import and usage

# Add import if missing
if "import { SALogo }" not in content:
    content = content.replace("import { SA, SAGradients } from './tokens';", "import { SA, SAGradients } from './tokens';\nimport { SALogo } from '@/src/views/components';")

# Replace <ShieldLogo size={26} /> with <SALogo size={26} variant="glass" />
content = content.replace("<ShieldLogo size={26} />", '<SALogo size={26} variant="glass" />')

with open(file_path, 'w', encoding='utf-8') as file:
    file.write(content)

print(f"Patched {file_path}")
