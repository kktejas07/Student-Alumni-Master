# Coding Rules

## Icon Usage

**Never use emojis in code, UI text, or documentation.**

### Why
- Emojis render differently across platforms (iOS, Android, Windows, Web)
- They break accessibility (screen readers struggle with emojis)
- They look unprofessional in production apps
- They cause inconsistent visual appearance

### What to use instead
- **React Native**: Use `lucide-react-native` icons (`<IconName size={16} color="#FFF" />`)
- **Web HTML**: Use `lucide-react` or SVG icons
- **Admin portals**: Use `@expo/vector-icons` (FontAwesome5, MaterialIcons)
- **Text labels**: Use plain text with proper formatting (e.g., "Food & Beverages" not "🍔 Food & Beverages")

### Examples

**Wrong:**
```tsx
<Text>🍔 Food & Beverages</Text>
<Text>🔒 Locked coupons</Text>
<Text>🤝 Partner Offers</Text>
```

**Correct:**
```tsx
import { Lock, Tag, Users } from 'lucide-react-native';

<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
  <Tag size={14} color="#8B5CF6" />
  <Text>Food & Beverages</Text>
</View>

<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
  <Lock size={14} color="#EF4444" />
  <Text>Locked coupons</Text>
</View>

<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
  <Users size={14} color="#3B82F6" />
  <Text>Partner Offers</Text>
</View>
```

### Icon Packs Available
- `lucide-react-native` — Primary icon library (already installed)
- `@expo/vector-icons` — FontAwesome5, MaterialIcons, Ionicons
- Custom SVG — For complex icons not in the above libraries

### Enforcement
- Run `grep -r "🍔\|🤝\|🎫\|🎁\|🔒\|🔑\|💰\|🎯\|🚀\|⚡" frontend/` to find emoji violations
- All new code must use icon components, not emojis
- Existing emoji usage should be replaced during refactoring
