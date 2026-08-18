import re
import os

files = [
    'src/views/web/profile/primitives.tsx',
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

    # Add strong 3D shadows to btnGhost
    # We will replace the btnGhost object
    if 'views/web/profile/primitives.tsx' in filepath:
        text = re.sub(
            r"btnGhost: \{\s*backgroundColor: 'rgba\(255,255,255,0\.2\)', borderColor: 'transparent', borderWidth: 0\s*\},?",
            "btnGhost: {\n    backgroundColor: 'rgba(255,255,255,0.25)', borderColor: 'rgba(255,255,255,0.4)', borderWidth: 1,\n    shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.4, shadowRadius: 6, elevation: 8,\n  },",
            text
        )
        text = re.sub(
            r"btnPrimary: \{\s*backgroundColor: '#fff', borderColor: 'transparent'\s*\},?",
            "btnPrimary: {\n    backgroundColor: '#fff', borderColor: '#fff', borderWidth: 1,\n    shadowColor: '#000', shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.5, shadowRadius: 8, elevation: 10,\n  },",
            text
        )
    else:
        # Update btnGhost in portal views
        text = re.sub(
            r"btnGhost: \{\s*paddingHorizontal: 14,.*?\}\),?\s*\}",
            "btnGhost: {\n    paddingHorizontal: 14, height: 36, borderRadius: 9,\n    backgroundColor: 'rgba(255,255,255,0.25)', borderColor: 'rgba(255,255,255,0.4)', borderWidth: 1,\n    alignItems: 'center', justifyContent: 'center',\n    shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.4, shadowRadius: 6, elevation: 8,\n    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' } as any) : {}),\n  }",
            text,
            flags=re.DOTALL
        )

        # Update btnPrimary in portal views
        text = re.sub(
            r"btnPrimary: \{\s*flexDirection: 'row'.*?\}\),?\s*\}",
            "btnPrimary: {\n    flexDirection: 'row', alignItems: 'center', gap: 6,\n    paddingHorizontal: 16, height: 36, borderRadius: 9,\n    backgroundColor: '#fff', borderColor: '#fff', borderWidth: 1,\n    shadowColor: '#000', shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.5, shadowRadius: 8, elevation: 10,\n    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', boxShadow: '0 6px 16px rgba(0,0,0,0.4)' } as any) : {}),\n  }",
            text,
            flags=re.DOTALL
        )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(text)
    
    print(f"Updated shadows in {filepath}")

for f in files:
    update_file(f)

