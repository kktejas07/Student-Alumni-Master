import re

with open('src/views/web/portals/student/views/DashboardView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Change mockupSection dark bg to white
text = text.replace("backgroundColor: 'rgba(10, 8, 22, 0.65)'", "backgroundColor: '#FFFFFF'")
text = text.replace("borderColor: 'rgba(255, 255, 255, 0.1)'", "borderColor: 'rgba(0,0,0,0.06)'")
text = text.replace("backgroundColor: 'rgba(255, 255, 255, 0.03)'", "backgroundColor: '#F8FAFC'")
text = text.replace("borderColor: 'rgba(255, 255, 255, 0.08)'", "borderColor: 'rgba(0,0,0,0.06)'")
text = text.replace("backgroundColor: 'rgba(255, 255, 255, 0.06)'", "backgroundColor: 'rgba(0,0,0,0.06)'")
text = text.replace("backgroundColor: '#111827'", "backgroundColor: '#FFFFFF'")
text = text.replace("borderColor: 'rgba(255,255,255,0.08)'", "borderColor: 'rgba(0,0,0,0.08)'")

# Change inline text colors that assume dark mode
text = text.replace("color: '#fff'", "color: '#1C1C1E'")
text = text.replace("color: '#FFF'", "color: '#1C1C1E'")
text = text.replace('color: "#fff"', 'color: "#1C1C1E"')

# Restore specific button text colors back to white if they are solid buttons
text = text.replace("primaryCtaText: { color: '#1C1C1E',", "primaryCtaText: { color: '#fff',")
text = text.replace("bookCtaText: { color: '#1C1C1E',", "bookCtaText: { color: '#fff',")
text = text.replace("modalConfirmTxt: { color: '#1C1C1E',", "modalConfirmTxt: { color: '#fff',")
text = text.replace("completionScoreText: { color: '#1C1C1E',", "completionScoreText: { color: '#fff',")
text = text.replace("missingText: { color: '#1C1C1E',", "missingText: { color: '#fff',")
text = text.replace("completeCtaText: { color: SC.primaryD", "completeCtaText: { color: '#fff'")
text = text.replace("backgroundColor: 'rgba(255,255,255,0.92)'", "backgroundColor: SC.primaryD")

# Some extra tweaks for matchRow, mentorCard, eventCard backgrounds so they pop against the white mockupSection
text = text.replace("backgroundColor: SC.glassBg, borderColor: SC.glassBorder,", "backgroundColor: '#F8FAFC', borderColor: 'rgba(0,0,0,0.06)',")
text = text.replace("backgroundColor: SC.glassBg", "backgroundColor: '#FFFFFF'")

with open('src/views/web/portals/student/views/DashboardView.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed DashboardView styling.")
