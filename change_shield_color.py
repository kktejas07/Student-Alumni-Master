import re

file_path = 'frontend/src/views/web/platform/components.tsx'

with open(file_path, 'r', encoding='utf-8') as file:
    content = file.read()

# Replace ShieldLogo defaults
old_sig = "export function ShieldLogo({ size = 26, bg = '#FFFFFF', fg = SA.purple }: { size?: number; bg?: string; fg?: string }) {"
new_sig = "export function ShieldLogo({ size = 26, bg = SA.purple, fg = '#FFFFFF' }: { size?: number; bg?: string; fg?: string }) {"

content = content.replace(old_sig, new_sig)

with open(file_path, 'w', encoding='utf-8') as file:
    file.write(content)

print(f"Patched {file_path}")
