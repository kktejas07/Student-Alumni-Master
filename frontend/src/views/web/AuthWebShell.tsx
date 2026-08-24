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
import { View, Text, ScrollView, Platform, useWindowDimensions } from 'react-native';
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
      <View className="flex-row min-h-full overflow-hidden bg-black">
        {!compact && (
          <View className="flex-1 justify-center items-center" style={{ paddingHorizontal: 64, paddingVertical: 80, maxWidth: 640, minWidth: 0, backgroundColor: '#5B21B6', overflow: 'hidden', position: 'relative', ...(Platform.OS === 'web' ? { display: 'flex' as any } : {}) }}>
            <View pointerEvents="none" className="absolute rounded-full" style={{ width: 280, height: 280, top: '-10%', right: '-15%', backgroundColor: 'rgba(139,92,246,0.18)', filter: 'blur(80px)' } as any} />
            <View pointerEvents="none" className="absolute rounded-full" style={{ width: 200, height: 200, bottom: '10%', left: '-10%', backgroundColor: 'rgba(109,40,217,0.16)', filter: 'blur(80px)' } as any} />
            <View className="items-center mb-6">
              <SALogo size={76} variant="white" />
            </View>
            <Text className="text-white font-body-bold text-3xl tracking-tight text-center mb-3">Student Alumni</Text>
            <Text className="text-sm text-center mb-8" style={{ color: 'rgba(255,255,255,0.46)', lineHeight: 22, maxWidth: 300 }}>
              AI career guidance, internships, mentorship, and alumni networking.
            </Text>
            {[
              { emoji: '🤖', t: 'AI Career Guidance', s: 'Personalised roadmap based on your goals' },
              { emoji: '🌍', t: '10,000+ Internships', s: 'Global opportunities matched to you' },
              { emoji: '🤝', t: '500+ Mentors', s: 'Alumni who want to help you grow' },
            ].map((f) => (
              <View key={f.t} className="flex-row gap-3 items-start mb-3.5 w-full" style={{ maxWidth: 300 }}>
                <View className="rounded-lg items-center justify-center" style={{ width: 36, height: 36, backgroundColor: 'rgba(255,255,255,0.10)' }}>
                  <Text style={{ fontSize: 17 }}>{f.emoji}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white font-body-bold text-sm">{f.t}</Text>
                  <Text className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.44)' }}>{f.s}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View className="flex-1" style={{ minWidth: 380, backgroundColor: '#000000' }}>
          <ScrollView
            className="items-center grow"
            contentContainerStyle={[
              { paddingHorizontal: 40, paddingVertical: 60, alignItems: 'center', justifyContent: 'flex-start', flexGrow: 1 },
              variant === 'center' && { justifyContent: 'center' },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {variant === 'center' ? (
              <View className="w-full relative overflow-hidden rounded-2xl" style={{ maxWidth: cardMaxWidth, backgroundColor: 'rgba(20,12,40,0.65)', borderColor: '#E5E7EB', borderWidth: 1, paddingHorizontal: 32, paddingVertical: 36, backdropFilter: 'blur(24px)', boxShadow: '0px 16px 48px rgba(124,58,237,0.25)' } as any}>
                <View pointerEvents="none" className="absolute rounded-full" style={{ top: -120, right: -120, width: 260, height: 260, backgroundColor: 'rgba(124,58,237,0.22)', filter: 'blur(80px)' } as any} />
                {children}
              </View>
            ) : (
              <View className="w-full" style={{ maxWidth: 480 }}>{children}</View>
            )}
          </ScrollView>
        </View>
      </View>
    </RoleThemeProvider>
  );
}
