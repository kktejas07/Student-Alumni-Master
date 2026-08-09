// @ts-nocheck
/**
 * /echo/{slug}/coupons — User's session coupons for an ECHO event.
 * Shows QR codes for each enabled session (lunch, snacks, etc.).
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Platform, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, QrCode, Check, Clock, Ticket } from 'lucide-react-native';
import { api, resolveImageUrl } from '@/src/models/services/api';
import { EchoHeader, EchoFooter, ECHO_TOP_PADDING } from '@/src/views/web/components/EchoChrome';

const SESSION_ICONS: Record<string, string> = {
  breakfast: '🍳', lunch: '🍽️', snacks: '🍪',
  tiffin: '🥪', coffee: '☕',
};

export default function EchoCouponsPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [regName, setRegName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const base = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || '';
        const { tokenStore } = await import('@/src/models/services/api');
        const token = await tokenStore.getAccess();
        const resp = await fetch(`${base}/api/echo/${slug}/my-coupons`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (resp.status === 401) {
          if (mounted) { setError('Please sign in to view your coupons.'); setLoading(false); }
          return;
        }
        if (!resp.ok) throw new Error('Failed to load coupons');
        const data = await resp.json();
        if (mounted) {
          setCoupons(data.coupons || []);
          setRegName(data.registration?.name || '');
          setLoading(false);
        }
      } catch (err: any) {
        if (mounted) { setError(err?.message || 'Failed to load coupons'); setLoading(false); }
      }
    })();
    return () => { mounted = false; };
  }, [slug]);

  const usedCount = coupons.filter((c) => c.used).length;
  const totalCount = coupons.length;

  return (
    <View style={s.root}>
      <EchoHeader current="echo" />
      <ScrollView contentContainerStyle={{ paddingTop: ECHO_TOP_PADDING }}>
        <View style={s.content}>
          <Pressable onPress={() => router.push(`/echo/${slug}`)} style={s.backBtn}>
            <ArrowLeft size={14} color="#fff" />
            <Text style={s.backText}>Back to event</Text>
          </Pressable>

          <LinearGradient colors={['rgba(124,58,237,0.30)', 'rgba(30,10,80,0.5)']} style={s.header}>
            <View style={s.headerIcon}><Ticket size={20} color="#C4B5FD" /></View>
            <Text style={s.headerTitle}>My Session Coupons</Text>
            <Text style={s.headerSub}>{regName ? `Registered as ${regName}` : 'Your event coupons'}</Text>
            {totalCount > 0 && (
              <View style={s.badgeRow}>
                <View style={[s.badge, { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.3)' }]}>
                  <Check size={12} color="#10B981" />
                  <Text style={[s.badgeText, { color: '#34D399' }]}>{usedCount} used</Text>
                </View>
                <View style={[s.badge, { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.3)' }]}>
                  <Clock size={12} color="#F59E0B" />
                  <Text style={[s.badgeText, { color: '#FCD34D' }]}>{totalCount - usedCount} remaining</Text>
                </View>
              </View>
            )}
          </LinearGradient>

          {loading ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color="#A78BFA" />
              <Text style={s.centerText}>Loading coupons…</Text>
            </View>
          ) : error ? (
            <View style={s.center}>
              <Text style={[s.centerText, { color: '#F87171' }]}>{error}</Text>
            </View>
          ) : coupons.length === 0 ? (
            <View style={s.center}>
              <Text style={s.centerText}>No session coupons for this event.</Text>
              <Text style={[s.centerText, { fontSize: 12, marginTop: 4 }]}>The organizer hasn't enabled session passes yet.</Text>
            </View>
          ) : (
            <View style={s.grid}>
              {coupons.map((c, i) => (
                <View key={c._id || i} style={[s.couponCard, c.used && s.couponUsed]}>
                  <View style={s.couponHeader}>
                    <Text style={s.couponIcon}>{SESSION_ICONS[c.session_key] || '🎫'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.couponName}>{c.session_name}</Text>
                      <Text style={s.couponCode}>{c.coupon_code}</Text>
                    </View>
                    {c.used ? (
                      <View style={[s.statusBadge, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                        <Check size={14} color="#10B981" />
                        <Text style={[s.statusText, { color: '#34D399' }]}>Used</Text>
                      </View>
                    ) : (
                      <View style={[s.statusBadge, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                        <Clock size={14} color="#F59E0B" />
                        <Text style={[s.statusText, { color: '#FCD34D' }]}>Active</Text>
                      </View>
                    )}
                  </View>
                  {!c.used && (
                    <View style={s.qrSection}>
                      <View style={s.qrPlaceholder}>
                        <QrCode size={48} color="#A78BFA" />
                        <Text style={s.qrHint}>Show this QR at the {c.session_name.toLowerCase()} counter</Text>
                      </View>
                    </View>
                  )}
                  {c.used && c.used_at && (
                    <Text style={s.usedInfo}>Scanned {new Date(c.used_at).toLocaleString()}</Text>
                  )}
                </View>
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
  content: { padding: 20, maxWidth: 800, width: '100%', alignSelf: 'center', gap: 16 },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 4,
  },
  backText: { color: '#fff', fontFamily: 'DMSans_500Medium', fontSize: 13 },
  header: { borderRadius: 18, padding: 24, gap: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)' },
  headerIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(124,58,237,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'DMSans_800ExtraBold', fontSize: 20, color: '#fff', textAlign: 'center' },
  headerSub: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  badgeText: { fontFamily: 'DMSans_700Bold', fontSize: 11 },
  center: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  centerText: { color: 'rgba(255,255,255,0.6)', fontFamily: 'DMSans_500Medium', fontSize: 13 },
  grid: { gap: 12 },
  couponCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.2)', padding: 20, overflow: 'hidden',
  },
  couponUsed: { opacity: 0.6 },
  couponHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  couponIcon: { fontSize: 32 },
  couponName: { fontFamily: 'DMSans_800ExtraBold', fontSize: 16, color: '#fff' },
  couponCode: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: '#A78BFA', letterSpacing: 1, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusText: { fontFamily: 'DMSans_700Bold', fontSize: 12 },
  qrSection: { marginTop: 16, alignItems: 'center' },
  qrPlaceholder: {
    width: 180, height: 180, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  qrHint: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'center', paddingHorizontal: 12 },
  usedInfo: { marginTop: 12, fontFamily: 'DMSans_500Medium', fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },
});
