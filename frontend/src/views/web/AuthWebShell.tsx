/**
 * AuthWebShell — shared web-only layout for all auth + onboarding screens.
 *
 * Two layout modes:
 *   - "split"  → brand pane (purple, left) + flat content pane (right). Used
 *                for register / login style screens with rich form content.
 *   - "center" → brand pane (purple, left) + a centered focused glass card
 *                on solid black (right). Used for short task-completion
 *                screens like email verification & 2FA setup.
 *
 * The brand pane mirrors the Login screen exactly so the visual language is
 * consistent across the entire web auth flow.
 */
import { ReactNode } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Colors as C } from '@/src/theme';
import { SALogo } from '@/src/views/components';
import { RoleThemeProvider, type Role } from '@/src/views/auth/RoleTheme';

type Variant = 'split' | 'center';

export function AuthWebShell({
  variant = 'split',
  children,
  cardMaxWidth = 480,
  role,
}: {
  variant?: Variant;
  children: ReactNode;
  cardMaxWidth?: number;
  /** Active role — propagates accent colour to nested CTAs / inputs. */
  role?: Role;
}) {
  const { width } = useWindowDimensions();
  const compact = width < 980;

  return (
    <RoleThemeProvider role={role}>
    <View style={styles.shell}>
      {/* LEFT — brand pane (hidden on small screens) */}
      {!compact && (
        <View style={styles.brandPane}>
          <View pointerEvents="none" style={[styles.orb, { width: 280, height: 280, top: '-10%', right: '-15%', backgroundColor: 'rgba(139,92,246,0.18)' }]} />
          <View pointerEvents="none" style={[styles.orb, { width: 200, height: 200, bottom: '10%', left: '-10%', backgroundColor: 'rgba(109,40,217,0.16)' }]} />
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <SALogo size={76} variant="white" />
          </View>
          <Text style={styles.brandTitle}>Student Alumni</Text>
          <Text style={styles.brandSub}>
            AI career guidance, internships, mentorship, and alumni networking.
          </Text>
          {[
            { emoji: '🤖', t: 'AI Career Guidance', s: 'Personalised roadmap based on your goals' },
            { emoji: '🌍', t: '10,000+ Internships', s: 'Global opportunities matched to you' },
            { emoji: '🤝', t: '500+ Mentors', s: 'Alumni who want to help you grow' },
          ].map((f) => (
            <View key={f.t} style={styles.featRow}>
              <View style={styles.featIcon}>
                <Text style={{ fontSize: 17 }}>{f.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featTitle}>{f.t}</Text>
                <Text style={styles.featSub}>{f.s}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* RIGHT — content pane */}
      <View style={styles.rightPane}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            variant === 'center' && styles.scrollCenter,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {variant === 'center' ? (
            <View style={[styles.glassCard, { maxWidth: cardMaxWidth }]}>
              {/* subtle gradient halo behind the card */}
              <View pointerEvents="none" style={styles.cardHalo} />
              {children}
            </View>
          ) : (
            <View style={{ width: '100%', maxWidth: 480 }}>{children}</View>
          )}
        </ScrollView>
      </View>
    </View>
    </RoleThemeProvider>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: 'row',
    minHeight: '100%' as any,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  brandPane: {
    flex: 1,
    paddingHorizontal: 64,
    paddingVertical: 80,
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: 640,
    minWidth: 0,
    backgroundColor: '#5B21B6',
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({ web: { display: 'flex' as any } }),
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    ...({ filter: 'blur(80px)' } as any),
  },
  brandTitle: {
    color: C.white,
    fontFamily: 'DMSans_700Bold',
    fontSize: 32,
    letterSpacing: -1,
    marginBottom: 12,
    textAlign: 'center',
  },
  brandSub: {
    color: 'rgba(255,255,255,0.46)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
    marginBottom: 32,
  },
  featRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 14,
    width: '100%',
    maxWidth: 300,
  },
  featIcon: {
    width: 36, height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featTitle: { color: C.white, fontFamily: 'DMSans_700Bold', fontSize: 13 },
  featSub: { color: 'rgba(255,255,255,0.44)', fontFamily: 'DMSans_400Regular', fontSize: 11, marginTop: 1 },

  rightPane: {
    flex: 1,
    minWidth: 380,
    backgroundColor: '#000000',
  },
  scroll: {
    paddingHorizontal: 40,
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexGrow: 1,
  },
  scrollCenter: {
    justifyContent: 'center',
  },
  glassCard: {
    width: '100%',
    backgroundColor: 'rgba(20,12,40,0.65)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 32,
    paddingVertical: 36,
    position: 'relative',
    overflow: 'hidden',
    ...({ backdropFilter: 'blur(24px)' } as any),
    boxShadow: '0px 16px 48px rgba(124,58,237,0.25)',
  },
  cardHalo: {
    position: 'absolute',
    top: -120,
    right: -120,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: 'rgba(124,58,237,0.22)',
    ...({ filter: 'blur(80px)' } as any),
  },
});
