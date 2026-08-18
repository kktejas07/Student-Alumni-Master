import re
with open('app/financial.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Change C object
text = text.replace(
    "const C = { text: '#fff', text2: 'rgba(255,255,255,0.70)', text3: 'rgba(255,255,255,0.45)', border: 'rgba(255,255,255,0.09)' };",
    "const C = { text: '#000', text2: 'rgba(0,0,0,0.70)', text3: 'rgba(0,0,0,0.45)', border: 'rgba(0,0,0,0.09)' };"
)

# In the styles block, replace '#fff' with '#000' EXCEPT for CTA buttons that have solid background
s_start = text.find('const s = StyleSheet.create({')
s_end = text.find('});', s_start) + 3

s_block = text[s_start:s_end]

# Make colors dark
s_block = s_block.replace("color: '#fff'", "color: '#000'")
s_block = s_block.replace("color: 'rgba(255,255,255,0.75)'", "color: 'rgba(0,0,0,0.75)'")
s_block = s_block.replace("color: 'rgba(255,255,255,0.65)'", "color: 'rgba(0,0,0,0.65)'")
s_block = s_block.replace("color: 'rgba(255,255,255,0.55)'", "color: 'rgba(0,0,0,0.55)'")

# Make backgrounds light
s_block = s_block.replace("backgroundColor: 'rgba(255,255,255,", "backgroundColor: 'rgba(0,0,0,")
s_block = s_block.replace("borderColor: 'rgba(255,255,255,", "borderColor: 'rgba(0,0,0,")
s_block = s_block.replace("borderTopColor: 'rgba(255,255,255,", "borderTopColor: 'rgba(0,0,0,")

# Add some color to specific texts as requested
# 'aiTop3Name'
s_block = s_block.replace("aiTop3Name: { color: '#000'", "aiTop3Name: { color: '#047857'") # Dark green
# 'emiValue'
s_block = s_block.replace("emiValue: { color: '#93C5FD'", "emiValue: { color: '#1D4ED8'") # Dark blue
# 'aiHelperText'
s_block = s_block.replace("aiHelperText: { color: '#C4B5FD'", "aiHelperText: { color: '#5B21B6'") # Dark purple

# Revert button text color that got changed to black, keep it white because they sit on solid backgrounds
# applyBtn text, aiSubmit text, optimizeText, ctaBtnText
s_block = s_block.replace("applyText: { color: '#000'", "applyText: { color: '#fff'")
s_block = s_block.replace("aiSubmitText: { color: '#000'", "aiSubmitText: { color: '#fff'")
s_block = s_block.replace("optimizeText: { color: '#000'", "optimizeText: { color: '#fff'")
s_block = s_block.replace("ctaBtnText: { color: '#000'", "ctaBtnText: { color: '#fff'")
# weekBadgeText etc don't exist here. But aiTop3RankText should be white on green
s_block = s_block.replace("aiTop3RankText: { color: '#000'", "aiTop3RankText: { color: '#fff'")

text = text[:s_start] + s_block + text[s_end:]

# Also replace in the EmiSlider component where there is inline styling
text = text.replace("color: '#fff', fontSize: 11.5", "color: '#000', fontSize: 11.5")
text = text.replace("color: 'rgba(255,255,255,0.4)'", "color: 'rgba(0,0,0,0.4)'")
text = text.replace("placeholderTextColor=\"rgba(255,255,255,0.3)\"", "placeholderTextColor=\"rgba(0,0,0,0.3)\"")
text = text.replace("color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)'", "color: '#000', borderWidth: 1, borderColor: 'rgba(0,0,0,0.18)'")
text = text.replace("backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)'", "backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)'")

with open('app/financial.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print('Done!')
