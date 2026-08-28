// @ts-nocheck
/**
 * /echo — public index listing every college's ECHO event showcase.
 * Each card links to /echo/{college-slug} where the full showcase (image
 * carousel, partners, sponsors, speakers, testimonials, registration) lives.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, ArrowRight, Calendar, Building2, MapPin } from 'lucide-react-native';
import { api, resolveImageUrl } from '@/src/models/services/api';
import { EchoHeader, EchoFooter, ECHO_TOP_PADDING } from '@/src/views/web/components/EchoChrome';
import LandingPage from '@/src/views/web/LandingPage';

export default function EchoIndexPage() {
  if (Platform.OS === 'web') {
    return <LandingPage initialTab="echo" />;
  }

  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.listEchoShowcases()
      .then((res) => { if (mounted) setItems(res?.items || []); })
      .catch((err) => { console.error('[ECHO EVENTS FETCH ERROR]', err); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  return (
    <View style={s.root}>
      <EchoHeader current="echo" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: ECHO_TOP_PADDING }}>
      <View style={s.content}>
      <LinearGradient
        colors={['rgba(124,58,237,0.28)', 'rgba(30,10,80,0.4)', '#0a0f1e']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={s.hero}
      >        <View style={s.heroBadge}>
          <Sparkles size={14} color="#C4B5FD" />
          <Text style={s.heroBadgeText}>ECHO EVENTS</Text>
        </View>
        <Text style={s.heroTitle}>Explore ECHO Events by College</Text>
        <Text style={s.heroSub}>
          Image galleries, partners, sponsors, speakers, testimonials and registration
          for every ECHO event we've conducted.
        </Text>
      </LinearGradient>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#A78BFA" />
          <Text style={s.centerText}>Loading events…</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={s.center}>
          <Text style={s.centerText}>No published events yet.</Text>
        </View>
      ) : (
        <View style={s.grid}>
          {items.map((sc) => (
            <Pressable key={sc.slug} style={s.card} onPress={() => router.push(`/echo/${sc.slug}`)}>
              {sc.hero_image_url || sc.hero_cover_url ? (
                <Image
                  source={{ uri: resolveImageUrl(sc.hero_image_url || sc.hero_cover_url) }}
                  style={s.cardImg} resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={['#7C3AED', '#4C1D95']}
                  style={[s.cardImg, s.cardImgFallback]}
                >
                  <Sparkles size={28} color="#fff" />
                </LinearGradient>
              )}
              <View style={s.cardBody}>
                <View style={s.badgeRow}>
                  {sc.event_status_badge ? (
                    <View style={s.statusBadge}>
                      <Text style={s.statusText}>{sc.event_status_badge.toUpperCase()}</Text>
                    </View>
                  ) : null}
                  {sc.college ? (
                    <View style={s.collegeBadge}>
                      <Building2 size={11} color="#C4B5FD" />
                      <Text style={s.collegeText}>{sc.college}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={s.cardTitle} numberOfLines={1}>{sc.title}</Text>
                {sc.subtitle ? <Text style={s.cardSub} numberOfLines={2}>{sc.subtitle}</Text> : null}
                <View style={s.metaRow}>
                  {sc.date ? (
                    <View style={s.meta}><Calendar size={12} color="rgba(255,255,255,0.55)" /><Text style={s.metaText}>{sc.date}</Text></View>
                  ) : null}
                  {sc.venue ? (
                    <View style={s.meta}><MapPin size={12} color="rgba(255,255,255,0.55)" /><Text style={s.metaText} numberOfLines={1}>{sc.venue}</Text></View>
                  ) : null}
                </View>
                <View style={s.cardFooter}>
                  <Text style={s.viewText}>View event</Text>
                  <ArrowRight size={14} color="#A78BFA" />
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}
      </View>
        <EchoFooter />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0f1e' },
  content: { padding: 16, maxWidth: 1400, width: '100%', alignSelf: 'center' },
  hero: { borderRadius: 18, padding: 20, marginBottom: 20, gap: 10 },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6,
    backgroundColor: 'rgba(124,58,237,0.25)', borderColor: 'rgba(167,139,250,0.4)',
    borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  heroBadgeText: { color: '#C4B5FD', fontFamily: 'DMSans_800ExtraBold', fontSize: 11, letterSpacing: 1.2 },
  heroTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 24, lineHeight: 32 },
  heroSub: { color: 'rgba(255,255,255,0.7)', fontFamily: 'DMSans_500Medium', fontSize: 13, lineHeight: 20, maxWidth: 640 },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  centerText: { color: 'rgba(255,255,255,0.6)', fontFamily: 'DMSans_500Medium', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '31.5%', minWidth: 260, flexGrow: 1, borderRadius: 16, overflow: 'hidden',
    backgroundColor: '#0d1326', borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  cardImg: { width: '100%', height: 140 },
  cardImgFallback: { alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: 14, gap: 6 },
  badgeRow: { flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  statusBadge: {
    backgroundColor: 'rgba(245,158,11,0.14)', borderColor: 'rgba(245,158,11,0.35)',
    borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  statusText: { color: '#FCD34D', fontFamily: 'DMSans_700Bold', fontSize: 10, letterSpacing: 0.6 },
  collegeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: 'rgba(124,58,237,0.2)' },
  collegeText: { color: '#C4B5FD', fontFamily: 'DMSans_700Bold', fontSize: 10 },
  cardTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 16 },
  cardSub: { color: 'rgba(255,255,255,0.6)', fontFamily: 'DMSans_400Regular', fontSize: 12, lineHeight: 17 },
  metaRow: { gap: 4, marginTop: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_500Medium', fontSize: 11 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  viewText: { color: '#A78BFA', fontFamily: 'DMSans_700Bold', fontSize: 12.5 },
});
