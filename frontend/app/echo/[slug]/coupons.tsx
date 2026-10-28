/**
 * /echo/{slug}/coupons — User's session coupons for an ECHO event.
 * Shows real scannable QR codes for each enabled session.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, QrCode, Check, Clock, Ticket, Lock, CupSoda, UtensilsCrossed, Cookie, Sandwich, Coffee, CalendarDays, Home, Sparkles } from 'lucide-react-native';
import { EchoHeader, EchoFooter, ECHO_TOP_PADDING } from '@/src/views/web/components/EchoChrome';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { api, resolveImageUrl } from '@/src/models/services/api';
import { getBaseUrl } from '@/src/lib/env';
import { SALogo } from '@/src/views/components';

const SESSION_ICONS: Record<string, any> = {
  breakfast: CupSoda,
  lunch: UtensilsCrossed,
  snacks: Cookie,
  dinner: UtensilsCrossed,
  tiffin: Sandwich,
  coffee: Coffee,
};

const SESSION_COLORS: Record<string, string> = {
  breakfast: '#F59E0B',
  lunch: '#10B981',
  snacks: '#F97316',
  dinner: '#EF4444',
  tiffin: '#8B5CF6',
  coffee: '#6366F1',
};

export default function EchoCouponsPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notRegistered, setNotRegistered] = useState(false);
  const [expandedCoupon, setExpandedCoupon] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const base = getBaseUrl();
        const { tokenStore } = await import('@/src/models/services/api');
        const token = await tokenStore.getAccess();
        let userEmail = user?.email || '';
        if (!userEmail && token) {
          try {
            const reg = await api.myEchoRegistration(slug);
            if (reg?.email) userEmail = reg.email;
          } catch {}
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
          const errData = await resp.json().catch(() => null);
          if (errData?.detail?.includes('No registration')) {
            if (mounted) { setNotRegistered(true); setLoading(false); }
            return;
          }
          if (mounted) { setError(errData?.detail || 'Failed to load coupons'); setLoading(false); }
          return;
        }
        const data = await resp.json();
        if (mounted) {
          setCoupons(data.coupons || []);
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

  // ── Auth guard: show 404 for unauthenticated users ──────────────
  if (!loading && !user) {
    return (
      <View style={n404.shell}>
        <LinearGradient
          colors={['#0F0C20', '#151030', '#0B0717']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={[n404.glow, { top: -100, right: -100, backgroundColor: 'rgba(139,92,246,0.25)' }]} />
        <View pointerEvents="none" style={[n404.glow, { bottom: -100, left: -100, backgroundColor: 'rgba(59,130,246,0.20)' }]} />
        <View style={n404.content}>
          <SALogo size={64} variant="glass" />
          <View style={n404.badge}>
            <Sparkles size={12} color="#60A5FA" />
            <Text style={n404.badgeText}>ERROR 404</Text>
          </View>
          <Text style={n404.title}>Page Not Found</Text>
          <Text style={n404.subtitle}>
            The session coupons page is only available to registered users. Please sign in to continue.
          </Text>
          <View style={n404.actionRow}>
            <Pressable
              style={n404.primaryBtn}
              onPress={() => router.replace('/(auth)/login')}
            >
              <LinearGradient
                colors={['#8B5CF6', '#1D4ED8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={n404.btnGradient}
              >
                <Home size={16} color="#FFF" />
                <Text style={n404.primaryBtnText}>Sign In</Text>
              </LinearGradient>
            </Pressable>
            <Pressable
              style={n404.secondaryBtn}
              onPress={() => {
                if (router.canGoBack()) router.back();
                else router.replace('/welcome');
              }}
            >
              <ArrowLeft size={16} color="rgba(255,255,255,0.8)" />
              <Text style={n404.secondaryBtnText}>Go Back</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <EchoHeader />
      <ScrollView contentContainerStyle={{ paddingTop: ECHO_TOP_PADDING }}>
        <View style={s.content}>
          <Pressable onPress={() => router.push('/platform?role=student&tab=my-tickets')} style={s.backBtn}>
            <ArrowLeft size={14} color="#fff" />
            <Text style={s.backText}>Back to tickets</Text>
          </Pressable>

          <LinearGradient colors={['rgba(20,23,38,.12)', 'rgba(20,23,38,.06)']} style={s.header}>
            <View style={s.headerIcon}><Ticket size={20} color="#A78BFA" /></View>
            <Text style={s.headerTitle}>Unlocked by your college email</Text>
            <Text style={s.headerSub}>Every code shows what it saves, when it dies and who it came from. Copy pulls it straight to your clipboard.</Text>
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
          ) : notRegistered ? (
            <View style={s.center}>
              <Ticket size={48} color="rgba(255,255,255,0.2)" />
              <Text style={s.centerText}>You haven't registered for this event yet.</Text>
              <Text style={[s.centerText, { fontSize: 12, marginTop: 4, opacity: 0.6 }]}>
                Register to unlock your session passes.
              </Text>
              <Pressable
                onPress={() => router.push(`/echo/${slug}/register`)}
                style={{
                  marginTop: 16, backgroundColor: '#7C3AED', borderRadius: 10,
                  paddingHorizontal: 20, paddingVertical: 10,
                }}
              >
                <Text style={{ color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 13 }}>Register Now</Text>
              </Pressable>
            </View>
          ) : coupons.length === 0 ? (
            <View style={s.center}>
              <QrCode size={48} color="rgba(255,255,255,0.2)" />
              <Text style={s.centerText}>No session coupons for this event.</Text>
              <Text style={[s.centerText, { fontSize: 12, marginTop: 4, opacity: 0.6 }]}>The organizer hasn't enabled session passes yet.</Text>
            </View>
          ) : (
            <View style={{ gap: 20 }}>
              {(() => {
                const days = Array.from(new Set((coupons as any[]).map((c) => Number(c.session_day) || 1))).sort((a, b) => a - b);
                return days.map((day) => {
                  const dayCoupons = coupons.filter((c) => (Number(c.session_day) || 1) === day);
                  const dayUsed = dayCoupons.filter((c) => c.used).length;
                  const hasMultiDay = days.length > 1;
                  return (
                    <View key={day}>
                      {hasMultiDay && (
                        <View style={s.dayHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <CalendarDays size={13} color="#A78BFA" />
                            <Text style={s.dayHeaderText}>Day {day}</Text>
                          </View>
                          <Text style={s.dayHeaderCount}>{dayUsed}/{dayCoupons.length} used</Text>
                        </View>
                      )}
                      <View style={s.grid}>
                        {dayCoupons.map((c, i) => {
                const Icon = SESSION_ICONS[c.session_key] || Ticket;
                const color = SESSION_COLORS[c.session_key] || '#A78BFA';
                const isExpanded = expandedCoupon === c.coupon_code;
                const isUsed = !!c.used;
                const isLocked = !!c.session_locked && !isUsed;

                const gradientColors: [string, string] = isUsed
                  ? ['rgba(16,185,129,0.15)', 'rgba(16,185,129,0.06)']
                  : isLocked
                  ? ['rgba(139,92,246,0.15)', 'rgba(139,92,246,0.06)']
                  : c.session_key === 'workshop'
                  ? ['rgba(245,158,11,0.15)', 'rgba(245,158,11,0.06)']
                  : ['rgba(124,58,237,0.15)', 'rgba(124,58,237,0.06)'];

                return (
                  <LinearGradient key={c._id || i} colors={gradientColors} style={[s.couponCard, isUsed && s.couponUsed, isLocked && s.couponLocked]}>
                    {!isUsed && !isLocked && (
                      <LinearGradient
                        colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0)']}
                        style={s.couponSheen}
                        pointerEvents="none"
                      />
                    )}
                    <Pressable
                      onPress={() => (!isUsed && !isLocked) && setExpandedCoupon(isExpanded ? null : c.coupon_code)}
                      style={s.couponHeader}
                    >
                      <View style={[s.iconWrap, { backgroundColor: `${color}20`, borderColor: `${color}40` }]}>
                        <Icon size={20} color={color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.couponName}>{c.session_name}</Text>
                        <Text style={[s.couponCode, isLocked && { color: 'rgba(255,255,255,0.25)', letterSpacing: 3 }]}>
                          {isLocked ? '****-****-****' : c.coupon_code}
                        </Text>
                      </View>
                      {isUsed ? (
                        <View style={[s.statusBadge, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                          <Check size={12} color="#10B981" />
                          <Text style={[s.statusText, { color: '#34D399' }]}>Used</Text>
                        </View>
                      ) : isLocked ? (
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
                    {!isUsed && isLocked && (
                      <View style={s.lockedSection}>
                        <View style={s.lockedPlaceholder}>
                          <Lock size={32} color="#8B5CF6" />
                          <Text style={s.lockedTitle}>Available soon</Text>
                          <Text style={s.lockedHint}>Session locked - {c.session_name} will open shortly</Text>
                        </View>
                      </View>
                    )}

                    {/* Used state */}
                    {isUsed && (
                      <View style={s.usedSection}>
                        <View style={s.usedPlaceholder}>
                          <Check size={32} color="#10B981" />
                          <Text style={s.usedTitle}>Already used</Text>
                          <Text style={s.usedHint}>Scanned {c.used_at ? new Date(c.used_at).toLocaleString() : ''}</Text>
                        </View>
                      </View>
                    )}

                    {/* Expanded QR code */}
                    {!isUsed && !isLocked && isExpanded && (
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
                  </LinearGradient>
                );
              })}
                      </View>
                    </View>
                  );
                });
              })()}
            </View>
          )}

          {/* Savings Summary Card */}
          {totalCount > 0 && (
            <LinearGradient
              colors={['rgba(91,79,233,0.30)', 'rgba(91,79,233,0.08)']}
              style={s.savingsCard}
            >
              <View style={s.savingsGradient}>
                <Text style={s.savingsTitle}>Total Value</Text>
                <Text style={s.savingsAmount}>
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
                    (coupons as any[]).reduce((acc, c) => acc + (Number(c.session_fee) || 0), 0)
                  )}
                </Text>
                <Text style={s.savingsLabel}>Unlocked savings across all session passes</Text>
                <Pressable style={s.savingsBtn} onPress={() => router.push('/platform?role=student&tab=my-tickets')}>
                  <Text style={s.savingsBtnText}>Open Deals & Offers</Text>
                </Pressable>
              </View>
            </LinearGradient>
          )}
        </View>
        <EchoFooter />
      </ScrollView>
    </View>
  );
}

const n404 = StyleSheet.create({
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
    color: '#60A5FA',
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
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingTop: 4 },
  dayHeaderText: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: '#E9E4FF', letterSpacing: 0.3 },
  dayHeaderCount: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: 'rgba(255,255,255,0.4)' },
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
   savingsCard: {
     borderRadius: 18,
     padding: 20,
     borderWidth: 1,
     borderColor: 'rgba(167,139,250,0.3)',
     overflow: 'hidden',
     marginTop: 8,
   },
   savingsGradient: {
     padding: 20,
     borderRadius: 18,
     gap: 12,
   },
   savingsTitle: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: 'rgba(255,255,255,0.6)' },
    savingsAmount: { fontFamily: 'DMSans_800ExtraBold', fontSize: 32, color: '#fff', letterSpacing: -0.5 },
   savingsLabel: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: 'rgba(255,255,255,0.4)' },
   savingsBtn: {
     backgroundColor: '#5B4FE9', borderRadius: 12, paddingVertical: 12,
     alignItems: 'center', marginTop: 8,
   },
    savingsBtnText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 13 },
    couponSheen: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 60,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.08)',
    },
});
