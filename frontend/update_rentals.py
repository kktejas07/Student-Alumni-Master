import re

filepath = 'c:/Users/HP/OneDrive/Desktop/intern/Student-Alumni-Master-main/frontend/app/rentals.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

# Add getCategoryIcon function after imports
icon_fn = """
function getCategoryIcon(category: string, type: string = ''): any {
  if (category === 'vehicle') {
    if (type.includes('Bike') || type.includes('Scooter') || type.includes('Wheeler') || type.includes('Cycle') || type.includes('Pool')) return 'motorbike';
    return 'car';
  }
  if (category === 'hotel') {
    if (type.includes('Beach') || type.includes('Houseboat')) return 'beach';
    if (type.includes('Farm') || type.includes('Retreat') || type.includes('Cabin') || type.includes('Plantation')) return 'pine-tree';
    return 'bed';
  }
  if (category === 'housing') {
    if (type.includes('Hostel') || type.includes('PG')) return 'bunk-bed';
    if (type.includes('Shared')) return 'account-group';
    return 'home-city-outline';
  }
  if (category === 'coworking') {
    return 'laptop';
  }
  return 'home';
}
"""

text = re.sub(r"(import \{ useRouter \} from 'expo-router';)", r"\1\n" + icon_fn, text)

# Replace coverEmoji
text = re.sub(
    r"<Text style=\{s\.coverEmoji\}>\{r\.emoji\}</Text>",
    r"<MaterialCommunityIcons name={getCategoryIcon(r.category, r.type)} size={54} color={r.color} />",
    text
)

# Replace sheetEmoji
text = re.sub(
    r"<Text style=\{\{\s*fontSize:\s*26\s*\}\}>\{listing\.emoji\}</Text>",
    r"<MaterialCommunityIcons name={getCategoryIcon(listing.category, listing.type)} size={32} color={listing.color} />",
    text
)

# Replace bookingEmoji
text = re.sub(
    r"<Text style=\{\{\s*fontSize:\s*22\s*\}\}>\s*\{b\.listing_snapshot\?\.emoji \|\| '[^']+'\}\s*</Text>",
    r"<MaterialCommunityIcons name={getCategoryIcon(b.listing_snapshot?.category || '', b.listing_snapshot?.type || '')} size={28} color={b.listing_snapshot?.color || '#5F259F'} />",
    text
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated rentals.tsx to use MaterialCommunityIcons instead of emojis")
