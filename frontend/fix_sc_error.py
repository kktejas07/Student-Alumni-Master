import os

portals = ['alumni', 'mentor', 'college']

for portal in portals:
    path = f'src/views/web/portals/{portal}/views/DashboardView.tsx'
    if not os.path.exists(path): continue
    
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()
    
    # Replace SC.primaryD with a hardcoded hex if SC is not defined
    text = text.replace("backgroundColor: SC.primaryD", "backgroundColor: '#6366F1'")
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
        
print("Fixed SC.primaryD issue in DashboardView for all portals.")
