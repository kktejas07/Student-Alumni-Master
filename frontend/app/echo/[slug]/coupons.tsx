/**
 * /echo/{slug}/coupons — User's session coupons for an ECHO event.
 * Shows real scannable QR codes for each enabled session.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, QrCode, Check, Clock, Ticket, Lock, CupSoda, UtensilsCrossed, Cookie, Sandwich, Coffee } from 'lucide-react-native';
import { EchoHeader, EchoFooter, ECHO_TOP_PADDING } from '@/src/views/web/components/EchoChrome';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { resolveImageUrl } from '@/src/models/services/api';

const SESSION_ICONS: Record<string, any> = {
  breakfast: CupSoda,
  lunch: UtensilsCrossed,
  snacks: Cookie,
  tiffin: Sandwich,
  coffee: Coffee,
};

const SESSION_COLORS: Record<string, string> = {
  breakfast: '#F59E0B',
  lunch: '#10B981',
  snacks: '#F97316',
  tiffin: '#8B5CF6',
  coffee: '#6366F1',
};

export default function EchoCouponsPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [regName, setRegName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedCoupon, setExpandedCoupon] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const base = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || '';
        const { tokenStore } = await import('@/src/models/services/api');
        const token = await tokenStore.getAccess();
        let userEmail = user?.email || '';
        if (!userEmail && typeof window !== 'undefined') {
          const localStr = window.localStorage.getItem(`echo_reg_${slug}`);
          if (localStr) {
            try {
              const localReg = JSON.parse(localStr);
              userEmail = localReg?.email || '';
            } catch {}
          }
        }
        const emailParam = userEmail ? `?email=${encodeURIComponent(userEmail)}` : '';
        const resp = await fetch(`${base}/api/echo/${slug}/my-coupons${emailParam}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (resp.status === 401) {
          if (mounted) { setError('Please sign in or register to view your coupons.'); setLoading(false); }
          return;
        }
        if (!resp.ok) {
          try {
            const errData = await resp.json();
            if (errData?.detail) {
              throw new Error(errData.detail);
            }
          } catch {}
          throw new Error('Failed to load coupons');
        }
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
  }, [slug, user]);

  const usedCount = coupons.filter((c) => c.used).length;
  const totalCount = coupons.length;

  return (
    <View style={s.root}>
      <EchoHeader />
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
              <Text style={s.centerText}>Loading coupons...</Text>
            </View>
          ) : error ? (
            <View style={s.center}>
              <Text style={[s.centerText, { color: '#F87171' }]}>{error}</Text>
            </View>
          ) : coupons.length === 0 ? (
            <View style={s.center}>
              <QrCode size={48} color="rgba(255,255,255,0.2)" />
              <Text style={s.centerText}>No session coupons for this event.</Text>
              <Text style={[s.centerText, { fontSize: 12, marginTop: 4, opacity: 0.6 }]}>The organizer hasn't enabled session passes yet.</Text>
            </View>
          ) : (
            <View style={s.grid}>
              {coupons.map((c, i) => {
                const Icon = SESSION_ICONS[c.session_key] || Ticket;
                const color = SESSION_COLORS[c.session_key] || '#A78BFA';
                const isExpanded = expandedCoupon === c.coupon_code;

                return (
                  <View key={c._id || i} style={[s.couponCard, c.used && s.couponUsed, c.session_locked && !c.used && s.couponLocked]}>
                    <Pressable
                      onPress={() => !c.used && !c.session_locked && setExpandedCoupon(isExpanded ? null : c.coupon_code)}
                      style={s.couponHeader}
                    >
                      <View style={[s.iconWrap, { backgroundColor: `${color}20`, borderColor: `${color}40` }]}>
                        <Icon size={20} color={color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.couponName}>{c.session_name}</Text>
                        <Text style={s.couponCode}>{c.coupon_code}</Text>
                      </View>
                      {c.used ? (
                        <View style={[s.statusBadge, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                          <Check size={12} color="#10B981" />
                          <Text style={[s.statusText, { color: '#34D399' }]}>Used</Text>
                        </View>
                      ) : c.session_locked ? (
                        <View style={[s.statusBadge, { backgroundColor: 'rgba(139,92,246,0.15)' }]}>
                          <Lock size={12} color="#8B5CF6" />
                          <Text style={[s.statusText, { color: '#A78BFA' }]}>Locked</Text>
                        </View>
                      ) : (
                        <View style={[s.statusBadge, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                          <QrCode size={12} color="#F59E0B" />
                          <Text style={[s.statusText, { color: '#FCD34D' }]}>Tap to show QR</Text>
                        </View>
                      )}
                    </Pressable>

                    {/* Locked state */}
                    {!c.used && c.session_locked && (
                      <View style={s.lockedSection}>
                        <View style={s.lockedPlaceholder}>
                          <Lock size={32} color="#8B5CF6" />
                          <Text style={s.lockedTitle}>Available soon</Text>
                          <Text style={s.lockedHint}>Session locked - {c.session_name} will open shortly</Text>
                        </View>
                      </View>
                    )}

                    {/* Used state */}
                    {c.used && (
                      <View style={s.usedSection}>
                        <View style={s.usedPlaceholder}>
                          <Check size={32} color="#10B981" />
                          <Text style={s.usedTitle}>Already used</Text>
                          <Text style={s.usedHint}>Scanned {c.used_at ? new Date(c.used_at).toLocaleString() : ''}</Text>
                        </View>
                      </View>
                    )}

                    {/* Expanded QR code */}
                    {!c.used && !c.session_locked && isExpanded && (
                      <View style={s.qrSection}>
                        <View style={s.qrCard}>
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : 'https://studentalumni.ai'}/echo/scan/${c.coupon_code}`)}&color=1a1a2e&bgcolor=ffffff`}
                            alt={`QR code for ${c.session_name}`}
                            style={{ width: 240, height: 240, borderRadius: 12 }}
                          />
                          <View style={s.qrCodeLabel}>
                            <Text style={s.qrCodeText}>{c.coupon_code}</Text>
                          </View>
                          <Text style={s.qrHint}>Show this QR at the {c.session_name.toLowerCase()} counter</Text>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
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
    borderColor: 'rgba(167,139,250,0.2)', overflow: 'hidden',
  },
  couponUsed: { opacity: 0.6 },
  couponLocked: { borderColor: 'rgba(139,92,246,0.3)' },
  couponHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  iconWrap: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  couponName: { fontFamily: 'DMSans_800ExtraBold', fontSize: 15, color: '#fff' },
  couponCode: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: '#A78BFA', letterSpacing: 1, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusText: { fontFamily: 'DMSans_700Bold', fontSize: 11 },
  qrSection: { padding: 16, paddingTop: 0, alignItems: 'center' },
  qrCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center', gap: 12,
    width: '100%', maxWidth: 300,
  },
  qrCodeLabel: {
    backgroundColor: 'rgba(124,58,237,0.1)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
  },
  qrCodeText: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: '#1a1a2e', letterSpacing: 2 },
  qrHint: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },
  lockedSection: { padding: 16, paddingTop: 0, alignItems: 'center' },
  lockedPlaceholder: {
    width: 180, height: 180, borderRadius: 16,
    backgroundColor: 'rgba(139,92,246,0.08)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  lockedTitle: { fontFamily: 'DMSans_800ExtraBold', fontSize: 14, color: '#C4B5FD' },
  lockedHint: { fontFamily: 'DMSans_500Medium', fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'center', paddingHorizontal: 12 },
  usedSection: { padding: 16, paddingTop: 0, alignItems: 'center' },
  usedPlaceholder: {
    width: 180, height: 100, borderRadius: 16,
    backgroundColor: 'rgba(16,185,129,0.08)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  usedTitle: { fontFamily: 'DMSans_800ExtraBold', fontSize: 14, color: '#34D399' },
  usedHint: { fontFamily: 'DMSans_500Medium', fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'center', paddingHorizontal: 12 },
});
