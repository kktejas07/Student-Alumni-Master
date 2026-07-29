import os

files_to_fix = [
    'frontend/app/(onboarding)/alumni-onboard.tsx',
    'frontend/app/(onboarding)/college-onboard.tsx',
    'frontend/app/(onboarding)/mentor-onboard.tsx',
    'frontend/app/(onboarding)/quick-setup.tsx',
    'frontend/app/(onboarding)/role-details.tsx',
]

for f in files_to_fix:
    if not os.path.exists(f):
        continue
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Replace literally escaped quotes back to normal quotes
    content = content.replace(r'color=\"#374151\"', 'color="#374151"')
    
    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)
        print(f"Fixed {f}")
