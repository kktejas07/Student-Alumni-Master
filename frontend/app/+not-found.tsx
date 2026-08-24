import { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useRouter, usePathname, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Home, Sparkles } from 'lucide-react-native';
import { SALogo } from '@/src/views/components';

export default function NotFoundScreen() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const fullPath = window.location.pathname;
      const lowerPath = fullPath.toLowerCase();

      // Normalize uppercase URLs (e.g. /WELCOME -> /welcome)
      if (fullPath !== lowerPath) {
        const normalized = lowerPath.length > 1 && lowerPath.endsWith('/') 
          ? lowerPath.slice(0, -1) 
          : lowerPath;
        router.replace(normalized as any);
      }
    }
  }, [pathname]);

  return (
    <>
      <Stack.Screen options={{ title: 'Page Not Found', headerShown: false }} />
      <View style={styles.shell}>
        <LinearGradient
          colors={['#0F0C20', '#151030', '#0B0717']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Decorative background ambient glows */}
        <View pointerEvents="none" style={[styles.glow, { top: -100, right: -100, backgroundColor: 'rgba(139,92,246,0.25)' }]} />
        <View pointerEvents="none" style={[styles.glow, { bottom: -100, left: -100, backgroundColor: 'rgba(59,130,246,0.20)' }]} />

        <View style={styles.content}>
          <SALogo size={64} variant="glass" />

          <View style={styles.badge}>
            <Sparkles size={12} color="#A78BFA" />
            <Text style={styles.badgeText}>ERROR 404</Text>
          </View>

          <Text style={styles.title}>Page Not Found</Text>

          <Text style={styles.subtitle}>
            The page you are looking for doesn't exist, was moved, or has an invalid URL.
          </Text>

          <View style={styles.actionRow}>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => router.replace('/welcome')}
            >
              <LinearGradient
                colors={['#8B5CF6', '#6D28D9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.btnGradient}
              >
                <Home size={16} color="#FFF" />
                <Text style={styles.primaryBtnText}>Go to Home</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              style={styles.secondaryBtn}
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/welcome');
                }
              }}
            >
              <ArrowLeft size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.secondaryBtnText}>Go Back</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0F0C20',
  },
  glow: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    ...({ filter: 'blur(100px)' } as any),
  },
  content: {
    alignItems: 'center',
    maxWidth: 480,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 24,
    padding: 40,
    ...({
      backdropFilter: 'blur(20px)',
      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
    } as any),
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    marginTop: 24,
    marginBottom: 16,
  },
  badgeText: {
    color: '#A78BFA',
    fontFamily: 'DMSans_700Bold',
    fontSize: 11,
    letterSpacing: 1.5,
  },
  title: {
    color: '#FFFFFF',
    fontFamily: 'Outfit_700Bold',
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
  },
  primaryBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  secondaryBtnText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
  },
});
