import re
import os

files = [
    'src/views/web/portals/student/views/ProfileSettingsView.tsx',
    'src/views/web/portals/mentor/views/MentorProfileSettingsView.tsx',
    'src/views/web/portals/alumni/views/ProfileSettingsView.tsx'
]

def update_file(filepath):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()

    # Update FooterActions component checkmark icon
    text = text.replace('<CheckCircle2 size={14} color="#fff" />', '<CheckCircle2 size={14} color="#8B5CF6" />')

    # Update footerBar
    text = re.sub(
        r"footerBar: \{\s*flexDirection: 'row'.*?gap: 12,\s*\}",
        "footerBar: {\n    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',\n    paddingHorizontal: 18, paddingVertical: 14,\n    backgroundColor: '#8B5CF6',\n    borderColor: '#7C3AED', borderWidth: 1,\n    borderRadius: 12, gap: 12,\n    shadowColor: '#8B5CF6', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 8,\n  }",
        text,
        flags=re.DOTALL
    )

    # Update footerStatus
    text = re.sub(
        r"footerStatus: \{ color: C\.text2, fontFamily: 'DMSans_500Medium', fontSize: 12 \}",
        "footerStatus: { color: '#fff', fontFamily: 'DMSans_500Medium', fontSize: 12 }",
        text
    )

    # Update btnGhost
    text = re.sub(
        r"btnGhost: \{\s*paddingHorizontal: 14,.*?\}\),?\s*\}",
        "btnGhost: {\n    paddingHorizontal: 14, height: 36, borderRadius: 9,\n    backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'transparent', borderWidth: 0,\n    alignItems: 'center', justifyContent: 'center',\n    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),\n  }",
        text,
        flags=re.DOTALL
    )

    # Update btnGhostText
    text = re.sub(
        r"btnGhostText: \{ color: C\.text2, fontFamily: 'DMSans_700Bold', fontSize: 12 \}",
        "btnGhostText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12 }",
        text
    )

    # Update btnPrimary
    text = re.sub(
        r"btnPrimary: \{\s*flexDirection: 'row'.*?\}\),?\s*\}",
        "btnPrimary: {\n    flexDirection: 'row', alignItems: 'center', gap: 6,\n    paddingHorizontal: 16, height: 36, borderRadius: 9,\n    backgroundColor: '#fff', borderColor: 'transparent', borderWidth: 0,\n    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', boxShadow: '0 6px 18px rgba(255,255,255,0.35)' } as any) : {}),\n  }",
        text,
        flags=re.DOTALL
    )

    # Update btnPrimaryText
    text = re.sub(
        r"btnPrimaryText: \{ color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12 \}",
        "btnPrimaryText: { color: '#8B5CF6', fontFamily: 'DMSans_700Bold', fontSize: 12 }",
        text
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(text)
    
    print(f"Updated {filepath}")

for f in files:
    update_file(f)

