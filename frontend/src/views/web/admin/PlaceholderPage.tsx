/**
 * PlaceholderPage — used for pages not yet built (Phase 2/3).
 */
import { View, Text, StyleSheet } from 'react-native';
import { Construction } from 'lucide-react-native';
import { AdminLayout } from './AdminLayout';
import { GlassCard } from './primitives';
import { ADMIN_THEME as T } from './theme';

interface Props { title: string; subtitle?: string; phase?: number; }
export default function AdminPlaceholderPage({ title, subtitle, phase = 2 }: Props) {
  return (
    <AdminLayout title={title} subtitle={subtitle}>
      <GlassCard style={{ alignItems: 'center', padding: 60 }}>
        <Construction size={48} color={T.light} />
        <Text style={styles.title}>Coming in Phase {phase}</Text>
        <Text style={styles.sub}>This page is part of the upcoming admin build phase.</Text>
      </GlassCard>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  title: { color: T.text, fontFamily: 'DMSans_700Bold', fontSize: 20, marginTop: 18, letterSpacing: -0.3 },
  sub: { color: T.textMute, fontFamily: 'DMSans_500Medium', fontSize: 12.5, marginTop: 6 },
});
