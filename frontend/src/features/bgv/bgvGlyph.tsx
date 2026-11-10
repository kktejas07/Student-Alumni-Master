// LinkedinGlyph — the LinkedIn 'in' badge glyph (web-safe fallback) — split verbatim from BGVAccountVerticalsView.tsx (audit Step 6d).
// @ts-nocheck
import { View, Text } from 'react-native';

/** LinkedIn 'in' badge glyph component — bulletproof web-safe fallback */
export function LinkedinGlyph({ size = 13, color = '#38BDF8' }: { size?: number; color?: string }) {
  const isMuted = color === '#64748B' || color === '#94A3B8';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 2,
        backgroundColor: isMuted ? 'rgba(100, 116, 139, 0.2)' : '#0A66C2',
        borderWidth: isMuted ? 1 : 0,
        borderColor: '#64748B',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: isMuted ? '#64748B' : '#FFFFFF',
          fontSize: Math.max(7, Math.floor(size * 0.65)),
          fontWeight: '900',
          lineHeight: size * 0.9,
          textAlign: 'center',
        }}
      >
        in
      </Text>
    </View>
  );
}
