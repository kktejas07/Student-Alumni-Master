/**
 * /echo/{slug}/coupons — User's session coupons for an ECHO event.
 * Shows real scannable QR codes for each enabled session.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, QrCode, Check, Clock, Ticket, Lock, CupSoda, UtensilsCrossed, Cookie, Sandwich, Coffee, CalendarDays } from 'lucide-react-native';
import { EchoHeader, EchoFooter, ECHO_TOP_PADDING } from '@/src/views/web/components/EchoChrome';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { api, resolveImageUrl } from '@/src/models/services/api';

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
  const [regName, setRegName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notRegistered, setNotRegistered] = useState(false);
  const [expandedCoupon, setExpandedCoupon] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const base = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || '';
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
    <View className="flex-1 bg-navy">
      <EchoHeader />
      <ScrollView contentContainerStyle={{ paddingTop: ECHO_TOP_PADDING }}>
        <View className="px-5 py-4 max-w-[800px] w-full self-center gap-4">
          <Pressable onPress={() => router.push(`/echo/${slug}`)} className="flex-row items-center gap-1.5 self-start bg-white/5 rounded-full px-3 py-1.5 border border-white/10 mb-1">
            <ArrowLeft size={14} color="#fff" />
            <Text className="text-white text-sm font-body-semibold">Back to event</Text>
          </Pressable>

          <LinearGradient colors={['rgba(124,58,237,0.30)', 'rgba(30,10,80,0.5)']} className="rounded-2xl p-6 gap-2.5 items-center border border-violet">
            <View className="w-11 h-11 rounded-full bg-violet/20 items-center justify-center"><Ticket size={20} color="#C4B5FD" /></View>
            <Text className="font-display-bold text-lg text-white text-center">My Session Coupons</Text>
            <Text className="text-sm text-muted text-center">{regName ? `Registered as ${regName}` : 'Your event coupons'}</Text>
            {totalCount > 0 && (
              <View className="flex-row gap-2 mt-1.5">
                <View className="flex-row items-center gap-1 px-2.5 py-1 rounded-xl border border-teal/30 bg-teal/10">
                  <Check size={12} color="#10B981" />
                  <Text className="text-teal text-xs font-body-bold">{usedCount} used</Text>
                </View>
                <View className="flex-row items-center gap-1 px-2.5 py-1 rounded-xl border border-amber/30 bg-amber/10">
                  <Clock size={12} color="#F59E0B" />
                  <Text className="text-amber text-xs font-body-bold">{totalCount - usedCount} remaining</Text>
                </View>
              </View>
            )}
          </LinearGradient>

          {loading ? (
            <View className="items-center py-16 gap-3">
              <ActivityIndicator size="large" color="#A78BFA" />
              <Text className="text-sm text-muted font-body-semibold">Loading coupons...</Text>
            </View>
          ) : error ? (
            <View className="items-center py-16 gap-3">
              <Text className="text-sm text-rose font-body-semibold">{error}</Text>
            </View>
          ) : notRegistered ? (
            <View className="items-center py-16 gap-3">
              <Ticket size={48} color="rgba(255,255,255,0.2)" />
              <Text className="text-sm text-muted font-body-semibold">You haven't registered for this event yet.</Text>
              <Text className="text-xs text-muted opacity-60">
                Register to unlock your session passes.
              </Text>
              <Pressable
                onPress={() => router.push(`/echo/${slug}/register`)}
                className="mt-4 bg-violet rounded-xl px-5 py-2.5"
              >
                <Text className="text-white font-body-bold text-sm">Register Now</Text>
              </Pressable>
            </View>
          ) : coupons.length === 0 ? (
            <View className="items-center py-16 gap-3">
              <QrCode size={48} color="rgba(255,255,255,0.2)" />
              <Text className="text-sm text-muted font-body-semibold">No session coupons for this event.</Text>
              <Text className="text-xs text-muted opacity-60">The organizer hasn't enabled session passes yet.</Text>
            </View>
          ) : (
            <View className="gap-5">
              {(() => {
                const days = Array.from(new Set((coupons as any[]).map((c) => Number(c.session_day) || 1))).sort((a, b) => a - b);
                return days.map((day) => {
                  const dayCoupons = coupons.filter((c) => (Number(c.session_day) || 1) === day);
                  const dayUsed = dayCoupons.filter((c) => c.used).length;
                  const hasMultiDay = days.length > 1;
                  return (
                    <View key={day}>
                      {hasMultiDay && (
                        <View className="flex-row items-center justify-between px-1 pt-1">
                          <View className="flex-row items-center gap-2">
                            <CalendarDays size={13} color="#A78BFA" />
                            <Text className="font-body-bold text-sm text-violet">Day {day}</Text>
                          </View>
                          <Text className="text-xs text-muted font-body-semibold">{dayUsed}/{dayCoupons.length} used</Text>
                        </View>
                      )}
                      <View className="gap-3">
                        {dayCoupons.map((c, i) => {
                const Icon = SESSION_ICONS[c.session_key] || Ticket;
                const color = SESSION_COLORS[c.session_key] || '#A78BFA';
                const isExpanded = expandedCoupon === c.coupon_code;

                return (
                  <View key={c._id || i} className={`rounded-2xl border border-violet/20 overflow-hidden ${c.used ? 'opacity-60' : ''} ${c.session_locked && !c.used ? 'border-violet/30' : ''}`} style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                    <Pressable
                      onPress={() => !c.used && !c.session_locked && setExpandedCoupon(isExpanded ? null : c.coupon_code)}
                      className="flex-row items-center gap-3 p-4"
                    >
                      <View className="w-10 h-10 rounded-xl border items-center justify-center" style={{ backgroundColor: `${color}20`, borderColor: `${color}40` }}>
                        <Icon size={20} color={color} />
                      </View>
                      <View className="flex-1">
                        <Text className="font-display-bold text-base text-white">{c.session_name}</Text>
                        <Text className="text-xs text-violet font-body-semibold mt-0.5" style={c.session_locked ? { color: 'rgba(255,255,255,0.25)', letterSpacing: 3 } : { letterSpacing: 1 }}>
                          {c.session_locked ? '****-****-****' : c.coupon_code}
                        </Text>
                      </View>
                      {c.used ? (
                        <View className="flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-teal/10">
                          <Check size={12} color="#10B981" />
                          <Text className="text-teal font-body-bold text-xs">Used</Text>
                        </View>
                      ) : c.session_locked ? (
                        <View className="flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-violet/10">
                          <Lock size={12} color="#8B5CF6" />
                          <Text className="text-violet font-body-bold text-xs">Locked</Text>
                        </View>
                      ) : (
                        <View className="flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber/10">
                          <QrCode size={12} color="#F59E0B" />
                          <Text className="text-amber font-body-bold text-xs">Tap to show QR</Text>
                        </View>
                      )}
                    </Pressable>

                    {!c.used && c.session_locked && (
                      <View className="px-4 pt-0 items-center">
                        <View className="items-center justify-center gap-2" style={{ width: 180, height: 180, borderRadius: 16, backgroundColor: 'rgba(139,92,246,0.08)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)' }}>
                          <Lock size={32} color="#8B5CF6" />
                          <Text className="font-display-bold text-sm text-violet">Available soon</Text>
                          <Text className="text-xs text-muted text-center px-3">Session locked - {c.session_name} will open shortly</Text>
                        </View>
                      </View>
                    )}

                    {c.used && (
                      <View className="px-4 pt-0 items-center">
                        <View className="items-center justify-center gap-2" style={{ width: 180, height: 100, borderRadius: 16, backgroundColor: 'rgba(16,185,129,0.08)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' }}>
                          <Check size={32} color="#10B981" />
                          <Text className="font-display-bold text-sm text-teal">Already used</Text>
                          <Text className="text-xs text-muted text-center px-3">Scanned {c.used_at ? new Date(c.used_at).toLocaleString() : ''}</Text>
                        </View>
                      </View>
                    )}

                    {!c.used && !c.session_locked && isExpanded && (
                      <View className="px-4 pt-0 items-center">
                        <View className="bg-white rounded-2xl p-4 items-center gap-3 w-full max-w-[300px]">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : 'https://studentalumni.ai'}/echo/scan/${c.coupon_code}`)}&color=1a1a2e&bgcolor=ffffff`}
                            alt={`QR code for ${c.session_name}`}
                            style={{ width: 240, height: 240, borderRadius: 12 }}
                          />
                          <View className="bg-violet/10 rounded-lg px-3 py-1.5">
                            <Text className="font-body-bold text-base text-navy" style={{ letterSpacing: 2 }}>{c.coupon_code}</Text>
                          </View>
                          <Text className="text-xs text-muted text-center">Show this QR at the {c.session_name.toLowerCase()} counter</Text>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
                      </View>
                    </View>
                  );
                });
              })()}
            </View>
          )}
        </View>
        <EchoFooter />
      </ScrollView>
    </View>
  );
}
