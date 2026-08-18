import re
import os

shell_path = 'c:/Users/HP/OneDrive/Desktop/intern/Student-Alumni-Master-main/frontend/src/views/web/FeaturePageShell.tsx'
rentals_path = 'c:/Users/HP/OneDrive/Desktop/intern/Student-Alumni-Master-main/frontend/app/rentals.tsx'

# 1. Update FeaturePageShell.tsx
with open(shell_path, 'r', encoding='utf-8') as f:
    shell = f.read()

shell = shell.replace(
    "heroEmoji?: string;",
    "heroEmoji?: string;\n  heroIcon?: React.ReactNode;"
)
shell = shell.replace(
    "heroEmoji = '🚀',",
    "heroEmoji = '🚀',\n  heroIcon,"
)

shell = re.sub(
    r"<View style=\{styles\.heroBadge\}><Text style=\{styles\.heroBadgeText\}>\{heroEmoji\}</Text></View>",
    r"<View style={styles.heroBadge}>{heroIcon || <Text style={styles.heroBadgeText}>{heroEmoji}</Text>}</View>",
    shell
)

shell = re.sub(
    r"<Text style=\{styles\.heroEmoji\}>\{heroEmoji\}</Text>",
    r"{heroIcon || <Text style={styles.heroEmoji}>{heroEmoji}</Text>}",
    shell
)

with open(shell_path, 'w', encoding='utf-8') as f:
    f.write(shell)

# 2. Update rentals.tsx
with open(rentals_path, 'r', encoding='utf-8') as f:
    rentals = f.read()

rentals = rentals.replace(
    '''heroEmoji="🏙️"''',
    '''heroIcon={<MaterialCommunityIcons name="home-city" size={32} color="#fff" />}'''
)

# 3. Optimize getCategoryIcon
old_func = """function getCategoryIcon(category: string, type: string = ''): any {
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
}"""

new_func = """const TYPE_ICON_MAP: Record<string, string> = {
  'Beach House': 'beach', 'Houseboat': 'beach',
  'Farmhouse': 'pine-tree', 'Mountain Cabin': 'pine-tree', 'Group Retreat': 'pine-tree', 'Wellness Stay': 'pine-tree', 'Weekend Getaway': 'pine-tree',
  'Budget Hotel': 'bed', 'Business Hotel': 'bed', 'Heritage Hotel': 'bed',
  'Two-Wheeler': 'motorbike', 'Cycle': 'motorbike', 'Scooter': 'motorbike', 'Bike Pool': 'motorbike',
  'Car': 'car', 'SUV': 'car', 'Add-on': 'car',
  'PG / Hostel': 'bunk-bed',
  'Shared Flat': 'account-group',
  'Apartment': 'home-city-outline', 'Studio Flat': 'home-city-outline',
  'Hot Desk': 'laptop', 'Private Cabin': 'laptop', 'Day Pass': 'laptop', 'Flexi Desk': 'laptop',
};

const CATEGORY_DEFAULT_ICON: Record<string, string> = {
  'vehicle': 'car',
  'hotel': 'bed',
  'housing': 'home-city-outline',
  'coworking': 'laptop'
};

function getCategoryIcon(category: string, type: string = ''): any {
  return TYPE_ICON_MAP[type] || CATEGORY_DEFAULT_ICON[category] || 'home';
}"""

rentals = rentals.replace(old_func, new_func)

with open(rentals_path, 'w', encoding='utf-8') as f:
    f.write(rentals)

print("Optimized rentals.tsx and FeaturePageShell.tsx")
