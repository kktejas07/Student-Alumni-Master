import re

with open('app/financial.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. AI features -> Purple #7C3AED (rgb 124,58,237)
text = text.replace("aiHelper: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: 'rgba(37,99,235,0.14)', borderColor: 'rgba(37,99,235,0.40)', borderWidth: 1, marginTop: 8, ...({ cursor: 'pointer' } as any) },",
                    "aiHelper: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: 'rgba(124,58,237,0.14)', borderColor: 'rgba(124,58,237,0.40)', borderWidth: 1, marginTop: 8, ...({ cursor: 'pointer' } as any) },")
text = text.replace("aiHelperText: { color: '#2563EB'", "aiHelperText: { color: '#7C3AED'")
text = text.replace("aiPanel: { marginTop: 10, padding: 16, borderRadius: 14, backgroundColor: 'rgba(37,99,235,0.08)', borderColor: 'rgba(37,99,235,0.30)'",
                    "aiPanel: { marginTop: 10, padding: 16, borderRadius: 14, backgroundColor: 'rgba(124,58,237,0.08)', borderColor: 'rgba(124,58,237,0.30)'")
text = text.replace("aiSubmit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 11, borderRadius: 10, backgroundColor: '#2563EB'",
                    "aiSubmit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 11, borderRadius: 10, backgroundColor: '#7C3AED'")

# 2. Match success / Top 3 / Savings -> Teal #0D9488 (rgb 13,148,136)
text = text.replace("savPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(37,99,235,0.14)', borderColor: 'rgba(37,99,235,0.40)'",
                    "savPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(13,148,136,0.14)', borderColor: 'rgba(13,148,136,0.40)'")
text = text.replace("savPillText: { color: '#2563EB'", "savPillText: { color: '#0D9488'")
text = text.replace("matchBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(37,99,235,0.18)', borderColor: 'rgba(37,99,235,0.45)'",
                    "matchBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(13,148,136,0.18)', borderColor: 'rgba(13,148,136,0.45)'")
text = text.replace("matchText: { color: '#2563EB'", "matchText: { color: '#0D9488'")
text = text.replace("aiTop3Box: { padding: 12, borderRadius: 10, backgroundColor: 'rgba(37,99,235,0.08)', borderColor: 'rgba(37,99,235,0.30)'",
                    "aiTop3Box: { padding: 12, borderRadius: 10, backgroundColor: 'rgba(13,148,136,0.08)', borderColor: 'rgba(13,148,136,0.30)'")
text = text.replace("aiTop3Title: { color: '#2563EB'", "aiTop3Title: { color: '#0D9488'")
text = text.replace("aiTop3Rank: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#2563EB'",
                    "aiTop3Rank: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#0D9488'")
text = text.replace("aiTop3Name: { color: '#2563EB'", "aiTop3Name: { color: '#0D9488'")

# 3. Floating Action Button (FAB) -> Purple
text = text.replace("color=\"#2563EB\"", "color=\"#7C3AED\"") # For FAB and maybe some icons. Wait, this might replace <Icon ... color="#2563EB"> too.
# The FAB is:
# <FAB icon="brain" label="Financial AI" color="#2563EB"
text = text.replace('color="#2563EB"\n            onPress={() => setAdvisorChatOpen(true)}', 'color="#7C3AED"\n            onPress={() => setAdvisorChatOpen(true)}')

# Also the CTA buttons at the bottom. The first one is Advisor, second is AI.
# Advisor -> Blue #2563EB (rgb 37,99,235)
# AI -> Purple #7C3AED (rgb 124,58,237)
text = text.replace("          <View style={[s.iconBox, { backgroundColor: '#2563EB22', borderColor: '#2563EB55', width: 38, height: 38 }]}>\n            <MaterialCommunityIcons name=\"target\" size={18} color=\"#2563EB\" />",
                    "          <View style={[s.iconBox, { backgroundColor: '#2563EB22', borderColor: '#2563EB55', width: 38, height: 38 }]}>\n            <MaterialCommunityIcons name=\"target\" size={18} color=\"#2563EB\" />") # This stays Blue

text = text.replace("          <View style={[s.iconBox, { backgroundColor: '#2563EB22', borderColor: '#2563EB55', width: 38, height: 38 }]}>\n            <MaterialCommunityIcons name=\"auto-fix\" size={18} color=\"#2563EB\" />",
                    "          <View style={[s.iconBox, { backgroundColor: '#7C3AED22', borderColor: '#7C3AED55', width: 38, height: 38 }]}>\n            <MaterialCommunityIcons name=\"auto-fix\" size={18} color=\"#7C3AED\" />") # AI CTA Icon -> Purple

# And the CTA cards themselves
text = text.replace("        {/* AI card */}\n        <View style={[s.ctaCard, { borderColor: '#2563EB55' }]}>",
                    "        {/* AI card */}\n        <View style={[s.ctaCard, { borderColor: '#7C3AED55' }]}>")

text = text.replace("          <Pressable\n            style={[s.ctaBtn, { backgroundColor: '#2563EB', borderRadius: 8 }]}\n            onPress={() => setAdvisorChatOpen(true)}",
                    "          <Pressable\n            style={[s.ctaBtn, { backgroundColor: '#7C3AED', borderRadius: 8 }]}\n            onPress={() => setAdvisorChatOpen(true)}")


with open('app/financial.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Done updating palettes!")
