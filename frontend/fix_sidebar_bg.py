import os
import re

portals = ['student', 'alumni', 'mentor', 'college']

for portal in portals:
    path = f'src/views/web/portals/{portal}/Sidebar.tsx'
    if not os.path.exists(path): continue
    
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We are looking for the main container which might be like:
    # backgroundColor: C.bg or backgroundColor: theme.bg or something.
    # Let's just find the main wrapper. It's usually the first <View style={[..., backgroundColor: ...]}>
    # Or we can just look for ackgroundColor: C.bg in the style={[s.aside, { width: railWidth, backgroundColor: C.bg, ...
    
    # In student/Sidebar.tsx, it's ackgroundColor: C.bg
    content = content.replace("backgroundColor: C.bg", "backgroundColor: '#0F172A'")
    content = content.replace("backgroundColor: MC.bg", "backgroundColor: '#0F172A'")
    content = content.replace("backgroundColor: NX.bg", "backgroundColor: '#0F172A'")
    content = content.replace("backgroundColor: SC.bg", "backgroundColor: '#0F172A'")
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
        
print("Updated Sidebar backgrounds to #0F172A")
