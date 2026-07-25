import re

file_path = 'frontend/src/views/web/platform/components.tsx'

with open(file_path, 'r', encoding='utf-8') as file:
    content = file.read()

# Replace ShieldLogo defaults
old_sig = "export function ShieldLogo({ size = 26, bg = '#1A1B2F', fg = '#FFFFFF' }: { size?: number; bg?: string; fg?: string }) {"
new_sig = "export function ShieldLogo({ size = 26, bg = '#4F46E5', fg = '#FFFFFF' }: { size?: number; bg?: string; fg?: string }) {"

content = content.replace(old_sig, new_sig)

with open(file_path, 'w', encoding='utf-8') as file:
    file.write(content)

print(f"Patched {file_path}")
