/**
 * nativeGuard — keeps web-only routes from crashing the native app.
 *
 * Many routes (super-admin, vendor portal, ECHO, marketplace, blog, policy
 * pages, ...) render raw DOM or rely on browser APIs. On iOS/Android we render
 * a small placeholder instead that opens the same page on studentalumni.ai.
 *
 * Usage, at the top of a route/layout component:
 *
 *   if (Platform.OS !== 'web') return <WebOnlyRoute path="/help-center" />;
 *
 * `path` defaults to the current pathname (handy for dynamic routes).
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

export const WEB_ORIGIN = 'https://studentalumni.ai';

export function isNative(): boolean {
  return Platform.OS !== 'web';
}

export async function openOnWeb(path: string): Promise<void> {
  const clean = path.startsWith('/') ? path : `/${path}`;
  const url = `${WEB_ORIGIN}${clean}`;
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    try {
      await Linking.openURL(url);
    } catch {}
  }
}

export function WebOnlyRoute({ path, title }: { path?: string; title?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const target = path || pathname || '/';

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/' as any);
  };

  return (
    <SafeAreaView style={s.root}>
      <View style={s.card}>
        <Text style={s.title}>{title || 'Available on the web'}</Text>
        <Text style={s.body}>
          This section is available on the web. Open it in your browser to continue.
        </Text>
        <Text style={s.url} numberOfLines={2}>{WEB_ORIGIN}{target}</Text>

        <Pressable
          onPress={() => { openOnWeb(target); }}
          style={({ pressed }) => [s.primary, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Open on the web"
          testID="web-only-open"
        >
          <Text style={s.primaryText}>Open on the web</Text>
        </Pressable>

        <Pressable
          onPress={goBack}
          style={({ pressed }) => [s.secondary, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          testID="web-only-back"
        >
          <Text style={s.secondaryText}>Back</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#08080F', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    gap: 12,
  },
  title: { color: '#F4F4FA', fontSize: 20, fontWeight: '700' },
  body: { color: 'rgba(255,255,255,0.72)', fontSize: 14, lineHeight: 20 },
  url: { color: 'rgba(255,255,255,0.45)', fontSize: 12, marginBottom: 6 },
  primary: { backgroundColor: '#7C3AED', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondary: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  secondaryText: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600' },
  pressed: { opacity: 0.8 },
});
