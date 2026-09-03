/**
 * /echo/marketplace — Event Marketplace (no slug required).
 * Shows available events with marketplaces, or redirects if only one exists.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ShoppingCart, ArrowRight, Store, Calendar, MapPin } from 'lucide-react-native';
import { EchoHeader, EchoFooter, ECHO_TOP_PADDING } from '@/src/views/web/components/EchoChrome';
import { api } from '@/src/models/services/api';

export default function MarketplaceIndexPage() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.listEchoShowcases().then((res) => {
      if (mounted && res?.items) {
        setEvents(res.items);
      }
    }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!loading && events.length === 1 && events[0]?.slug) {
      router.replace(`/echo/${events[0].slug}/marketplace`);
    }
  }, [loading, events, router]);

  return (
    <View style={s.root}>
      <EchoHeader />
      <ScrollView contentContainerStyle={s.scrollContent}>
        <View style={s.content}>
          {/* Back link */}
          <Pressable onPress={() => router.push('/echo')} style={s.backBtn}>
            <Text style={s.backText}>← Back to ECHO</Text>
          </Pressable>

          {/* Header */}
          <View style={s.header}>
            <View style={s.headerIcon}>
              <ShoppingCart size={24} color="#A78BFA" />
            </View>
            <Text style={s.headerTitle}>Event Marketplace</Text>
            <Text style={s.headerSub}>
              Pre-order food, beverages, and exclusive handcrafts to collect at the event!
            </Text>
          </View>

          {loading ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color="#A78BFA" />
              <Text style={s.centerText}>Loading events...</Text>
            </View>
          ) : events.length === 0 ? (
            <View style={s.center}>
              <Store size={48} color="rgba(255,255,255,0.15)" />
              <Text style={s.centerText}>No events available yet</Text>
              <Text style={[s.centerText, { fontSize: 12, marginTop: 4, opacity: 0.6 }]}>
                Check back later for upcoming events with marketplaces.
              </Text>
            </View>
          ) : (
            <View style={s.grid}>
              {events.map((ev) => (
                <Pressable
                  key={ev.id || ev.slug}
                  style={({ hovered }) => [s.card, hovered && s.cardHover]}
                  onPress={() => router.push(`/echo/${ev.slug}/marketplace`)}
                >
                  {ev.hero_image_url || ev.banner_url || ev.poster_url ? (
                    <View style={s.cardImageWrap}>
                      <img
                        src={ev.hero_image_url || ev.banner_url || ev.poster_url}
                        alt={ev.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '14px 14px 0 0' }}
                      />
                    </View>
                  ) : (
                    <View style={[s.cardImageWrap, s.cardImagePlaceholder]}>
                      <ShoppingCart size={32} color="rgba(167,139,250,0.3)" />
                    </View>
                  )}
                  <View style={s.cardBody}>
                    <Text style={s.cardTitle}>{ev.title || 'ECHO Event'}</Text>
                    <Text style={s.cardCollege}>{ev.college_name || ev.college || ev.organizer_name || 'ECHO Campus'}</Text>
                    <View style={s.cardMeta}>
                      {(ev.date || ev.dates) && (
                        <View style={s.metaItem}>
                          <Calendar size={11} color="#A78BFA" />
                          <Text style={s.metaText}>{ev.date || ev.dates}</Text>
                        </View>
                      )}
                      {ev.venue && (
                        <View style={s.metaItem}>
                          <MapPin size={11} color="#A78BFA" />
                          <Text style={s.metaText} numberOfLines={1}>{ev.venue}</Text>
                        </View>
                      )}
                    </View>
                    <View style={s.cardAction}>
                      <Text style={s.cardActionText}>Browse Marketplace</Text>
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
  scrollContent: { paddingTop: ECHO_TOP_PADDING },
  content: { maxWidth: 1000, width: '100%', alignSelf: 'center', paddingHorizontal: 20, gap: 20 },
  backBtn: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  backText: { color: '#fff', fontFamily: 'DMSans_500Medium', fontSize: 13 },
  header: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  headerIcon: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: 'rgba(124,58,237,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: 'DMSans_800ExtraBold', fontSize: 26, color: '#fff', textAlign: 'center' },
  headerSub: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: 'rgba(255,255,255,0.55)', textAlign: 'center', maxWidth: 480 },
  center: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  centerText: { color: 'rgba(255,255,255,0.5)', fontFamily: 'DMSans_500Medium', fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center' },
  card: {
    width: '100%', maxWidth: 460, borderRadius: 18, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)',
    transition: 'all .2s ease',
  },
  cardHover: { borderColor: 'rgba(167,139,250,0.5)', transform: 'translateY(-2px)' },
  cardImageWrap: { width: '100%', height: 180, overflow: 'hidden' },
  cardImagePlaceholder: {
    width: '100%', height: 180,
    background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(99,102,241,0.08))',
    alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { padding: 18, gap: 8 },
  cardTitle: { fontFamily: 'DMSans_800ExtraBold', fontSize: 18, color: '#fff' },
  cardCollege: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: -2 },
  cardMeta: { flexDirection: 'row', gap: 12, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  cardAction: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8,
    backgroundColor: 'rgba(124,58,237,0.15)', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  cardActionText: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: '#A78BFA' },
});
