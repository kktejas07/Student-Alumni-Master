import os
import re

files_to_fix = [
    'frontend/app/(onboarding)/alumni-onboard.tsx',
    'frontend/app/(onboarding)/college-onboard.tsx',
    'frontend/app/(onboarding)/mentor-onboard.tsx',
    'frontend/app/(onboarding)/quick-setup.tsx',
    'frontend/app/(onboarding)/role-details.tsx',
]

def fix_colors(content):
    # Dot inactive
    content = re.sub(
        r"borderColor: 'rgba\(255,255,255,0\.18\)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba\(255,255,255,0\.04\)'",
        r"borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB'",
        content
    )
    # Dot Text inactive
    content = re.sub(
        r"color: 'rgba\(255,255,255,0\.4\)', fontFamily: FONTS\.bold",
        r"color: '#9CA3AF', fontFamily: FONTS.bold",
        content
    )
    # Line inactive
    content = re.sub(
        r"backgroundColor: 'rgba\(255,255,255,0\.14\)'",
        r"backgroundColor: '#E5E7EB'",
        content
    )
    # Title
    content = re.sub(
        r"title:\s*\{\s*color:\s*'#FFF'",
        r"title: { color: '#111827'",
        content
    )
    # Sub
    content = re.sub(
        r"sub:\s*\{\s*color:\s*'rgba\(255,255,255,0\.6\)'",
        r"sub: { color: '#6B7280'",
        content
    )
    # Section
    content = re.sub(
        r"section:\s*\{\s*color:\s*'rgba\(255,255,255,0\.55\)'",
        r"section: { color: '#6B7280'",
        content
    )
    # Cards
    content = re.sub(
        r"borderColor:\s*'rgba\(255,255,255,0\.12\)',\s*backgroundColor:\s*'rgba\(255,255,255,0\.03\)'",
        r"borderColor: '#E5E7EB', backgroundColor: '#FFFFFF'",
        content
    )
    content = re.sub(
        r"borderColor:\s*'rgba\(255,255,255,0\.14\)',\s*backgroundColor:\s*'rgba\(255,255,255,0\.03\)'",
        r"borderColor: '#E5E7EB', backgroundColor: '#FFFFFF'",
        content
    )
    
    # Text in Cards
    content = re.sub(
        r"color:\s*'rgba\(255,255,255,0\.85\)'",
        r"color: '#1F2937'",
        content
    )
    content = re.sub(
        r"color:\s*'rgba\(255,255,255,0\.75\)'",
        r"color: '#374151'",
        content
    )
    content = re.sub(
        r"color:\s*'rgba\(255,255,255,0\.7\)'",
        r"color: '#4B5563'",
        content
    )
    content = re.sub(
        r"color:\s*'rgba\(255,255,255,0\.55\)'",
        r"color: '#6B7280'",
        content
    )
    content = re.sub(
        r"color:\s*'rgba\(255,255,255,0\.5\)'",
        r"color: '#6B7280'",
        content
    )
    
    # Back button
    content = re.sub(
        r"backgroundColor: 'rgba\(255,255,255,0\.06\)', borderWidth: 1, borderColor: 'rgba\(255,255,255,0\.12\)'",
        r"backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB'",
        content
    )
    
    # ArrowLeft
    content = re.sub(
        r"<ArrowLeft size=\{18\} color=\"#FFF\" />",
        r"<ArrowLeft size={18} color=\"#374151\" />",
        content
    )
    
    # Textarea
    content = re.sub(
        r"textarea:\s*\{\s*color:\s*'#FFF'",
        r"textarea: { color: '#1F2937'",
        content
    )
    
    # Greeting
    content = re.sub(
        r"greeting:\s*\{\s*color:\s*'#FFF'",
        r"greeting: { color: '#1F2937'",
        content
    )
    
    # Badge tier
    content = re.sub(
        r"badgeTier:\s*\{\s*color:\s*'#FFF'",
        r"badgeTier: { color: '#1F2937'",
        content
    )

    # Archetype Title Active
    content = re.sub(
        r"archetypeTitleActive:\s*\{\s*color:\s*'#FFF'",
        r"archetypeTitleActive: { color: '#1F2937'",
        content
    )
    
    return content

for f in files_to_fix:
    if not os.path.exists(f):
        continue
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    new_content = fix_colors(content)
    
    with open(f, 'w', encoding='utf-8') as file:
        file.write(new_content)
        print(f"Fixed {f}")
