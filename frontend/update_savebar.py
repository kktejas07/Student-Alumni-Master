import re
import os

filepath = 'src/views/web/profile/primitives.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

# Update saveBar container styles
text = text.replace(
    "backgroundColor: 'rgba(167,139,250,0.10)',\n      borderColor: 'rgba(167,139,250,0.30)', borderWidth: 1",
    "backgroundColor: '#8B5CF6',\n      borderColor: '#7C3AED', borderWidth: 1, shadowColor: '#8B5CF6', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 8"
)

# Update saveStatus text color
text = text.replace(
    "saveStatus: { color: C.text2,",
    "saveStatus: { color: '#fff',"
)

# In the SaveBar component, we override the button styles specifically
# Replace btnGhost
text = text.replace(
    "style={[s.btn, s.btnGhost]}",
    "style={[s.btn, { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'transparent', borderWidth: 0 }]}"
)
text = text.replace(
    "<Text style={s.btnGhostText}>Discard</Text>",
    "<Text style={[s.btnGhostText, { color: '#fff' }]}>Discard</Text>"
)

# Replace btnPrimary in SaveBar
text = text.replace(
    "style={[s.btn, s.btnPrimary, (!dirty || saving) && { opacity: 0.5 }]}",
    "style={[s.btn, { backgroundColor: '#fff', borderColor: 'transparent' }, (!dirty || saving) && { opacity: 0.5 }]}"
)

# Update icon and text color in btnPrimary
text = text.replace(
    "<Check size={14} color=\"#fff\" />",
    "<Check size={14} color=\"#8B5CF6\" />"
)
text = text.replace(
    "color=\"#fff\" /> : <Check",
    "color=\"#8B5CF6\" /> : <Check"
)
text = text.replace(
    "<Text style={s.btnPrimaryText}>Save Profile</Text>",
    "<Text style={[s.btnPrimaryText, { color: '#8B5CF6' }]}>Save Profile</Text>"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated save bar styles in primitives.tsx")
