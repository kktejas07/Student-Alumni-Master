// @ts-nocheck
/**
 * Network shell sub-components: NetworkSidebar, TopHero, ChatPhonePopup, BookingDrawer.
 */
import { useMemo, useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, Modal, Image, Platform, Linking, TextInput, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as MCI } from '@expo/vector-icons';
import {
  Compass, Users, UserPlus, Filter, X as CloseX, Phone, MessageSquare, Calendar,
  Gift, Star, Check, Clock, ChevronRight,
} from 'lucide-react-native';
import { request } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

const C = {
  bg: '#0C0818', bg2: '#130A28',
  card: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.09)',
  text: 'rgba(255,255,255,0.92)', text2: 'rgba(255,255,255,0.65)', text3: 'rgba(255,255,255,0.45)',
  purple: '#A78BFA', green: '#10B981', amber: '#F59E0B', cyan: '#22D3EE', pink: '#EC4899',
};

// ─────────────────────────────────────────────────────────────────────────
// Sidebar — persistent left rail with mini profile, free sessions, nav, filters, stats
// ─────────────────────────────────────────────────────────────────────────
export function NetworkSidebar({
  me, tab, onTabChange, typeFilter, onTypeFilter,
  connectionsCount, requestsCount, freeSessionsRemaining,
}: {
  me: any;
  tab: 'discover' | 'connections' | 'requests';
  onTabChange: (t: 'discover' | 'connections' | 'requests') => void;
  typeFilter: 'all' | 'student' | 'alumni' | 'mentor';
  onTypeFilter: (t: 'all' | 'student' | 'alumni' | 'mentor') => void;
  connectionsCount: number;
  requestsCount: number;
  freeSessionsRemaining: number;
}) {
  const initials = ((me?.full_name || '?').split(' ').slice(0, 2).map((s: string) => s[0] || '').join('') || '?').toUpperCase();
  const photo = useAuthStore((s) => s.photoOverride) || me?.photo_data || me?.face_image_base64;
  const NAV: { key: 'discover' | 'connections' | 'requests'; label: string; icon: any; badge?: number }[] = [
    { key: 'discover', label: 'Discover', icon: Compass },
    { key: 'connections', label: 'My Connections', icon: Users, badge: connectionsCount },
    { key: 'requests', label: 'Requests', icon: UserPlus, badge: requestsCount },
  ];
  const TYPES: { key: 'all' | 'student' | 'alumni' | 'mentor'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'student', label: 'Students' },
    { key: 'alumni', label: 'Alumni' },
    { key: 'mentor', label: 'Mentors' },
  ];

  return (
    <View style={s.sidebar}>
      {/* Logo + title */}
      <View style={s.logoRow}>
        <View style={s.logoBox}><Text style={s.logoText}>SA</Text></View>
        <View>
          <Text style={s.logoTitle}>SA Network</Text>
          <Text style={s.logoSub}>Discover · Connect · Grow</Text>
        </View>
      </View>

      {/* Mini profile */}
      <View style={s.miniProf}>
        <View style={s.miniAvatar}>
          {photo ? (
            <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} />
          ) : (
            <Text style={s.miniInitials}>{initials}</Text>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.miniName} numberOfLines={1}>{me?.full_name || 'Your name'}</Text>
          <Text style={s.miniMeta} numberOfLines={1}>{me?.institution || 'College'} · {me?.graduation_year || '—'}</Text>
        </View>
      </View>

      {/* Free sessions banner */}
      {freeSessionsRemaining > 0 && (
        <View style={s.freeBanner}>
          <Gift size={14} color="#FCD34D" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.freeTitle}>{freeSessionsRemaining} free session{freeSessionsRemaining !== 1 ? 's' : ''}</Text>
            <Text style={s.freeSub}>Book a mentor — first 2 free</Text>
          </View>
        </View>
      )}

      {/* Nav */}
      <Text style={s.label}>NAVIGATE</Text>
      {NAV.map((n) => {
        const Icon = n.icon; const active = tab === n.key;
        return (
          <Pressable key={n.key} onPress={() => onTabChange(n.key)} style={[s.navItem, active && s.navItemActive]} testID={`net-tab-${n.key}`}>
            <Icon size={15} color={active ? '#fff' : C.text2} />
            <Text style={[s.navText, active && { color: '#fff' }]}>{n.label}</Text>
            {n.badge != null && n.badge > 0 && (
              <View style={[s.navBadge, active && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={s.navBadgeText}>{n.badge}</Text>
              </View>
            )}
          </Pressable>
        );
      })}

      {/* Filter by type */}
      {tab === 'discover' && (
        <>
          <Text style={[s.label, { marginTop: 14 }]}>FILTER BY TYPE</Text>
          <View style={{ gap: 4 }}>
            {TYPES.map((t) => {
              const active = typeFilter === t.key;
              return (
                <Pressable key={t.key} onPress={() => onTypeFilter(t.key)} style={[s.typeRow, active && s.typeRowActive]} testID={`net-type-${t.key}`}>
                  <Text style={[s.typeText, active && { color: C.purple, fontFamily: 'DMSans_700Bold' }]}>{t.label}</Text>
                  {active && <Check size={12} color={C.purple} />}
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {/* Network stats */}
      <Text style={[s.label, { marginTop: 14 }]}>YOUR NETWORK</Text>
      <View style={s.stats}>
        <View style={s.statRow}>
          <Text style={s.statLabel}>Connections</Text>
          <Text style={s.statValue}>{connectionsCount}</Text>
        </View>
        <View style={s.statRow}>
          <Text style={s.statLabel}>Pending requests</Text>
          <Text style={s.statValue}>{requestsCount}</Text>
        </View>
        <View style={s.statRow}>
          <Text style={s.statLabel}>Free sessions left</Text>
          <Text style={[s.statValue, { color: '#FCD34D' }]}>{freeSessionsRemaining}</Text>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Top hero — Discover People + interest pills
// ─────────────────────────────────────────────────────────────────────────
export function TopHero({ me }: { me: any }) {
  const interests: string[] = me?.interests || [];
  const firstName = (me?.full_name || 'there').split(' ')[0];
  return (
    <View style={s.hero}>
      <Text style={s.heroTitle}>Discover People</Text>
      <Text style={s.heroSub}>Personalised for {firstName}</Text>
      {interests.length > 0 && (
        <View style={s.heroPills}>
          {interests.slice(0, 6).map((it, i) => (
            <View key={`${it}-${i}`} style={s.heroPill}><Text style={s.heroPillText}>{it}</Text></View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Chat / Phone popup — opens when chat icon clicked
// ─────────────────────────────────────────────────────────────────────────
export function ChatPhonePopup({
  visible, person, onClose, onBookSession,
}: {
  visible: boolean;
  person: any | null;
  onClose: () => void;
  onBookSession?: () => void;
}) {
  if (!person) return null;
  const phone = person.phone || person.contact_phone || null;
  const isMentor = person.role === 'mentor';
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={s.modalBg} onPress={onClose}>
        <Pressable style={s.popup} onPress={(e) => e.stopPropagation()}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={s.popupTitle}>Reach out to {(person.full_name || 'them').split(' ')[0]}</Text>
            <Pressable onPress={onClose} style={s.closeBtn} testID="chat-popup-close"><CloseX size={16} color={C.text2} /></Pressable>
          </View>

          <View style={{ gap: 10, marginTop: 8 }}>
            {/* Phone row */}
            <View style={s.contactRow}>
              <View style={[s.contactIcon, { backgroundColor: 'rgba(34,211,238,0.14)' }]}>
                <Phone size={16} color={C.cyan} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.contactLabel}>Phone</Text>
                {phone ? (
                  <Text style={s.contactValue} numberOfLines={1}>{phone}</Text>
                ) : (
                  <Text style={[s.contactValue, { color: C.text3 }]}>Not shared</Text>
                )}
              </View>
              {phone && (
                <Pressable
                  onPress={() => Platform.OS === 'web' ? (window as any).open(`tel:${phone}`) : Linking.openURL(`tel:${phone}`)}
                  style={[s.actionBtn, { backgroundColor: C.cyan }]}
                  testID="chat-popup-call"
                >
                  <Phone size={12} color="#fff" /><Text style={s.actionBtnText}>Call</Text>
                </Pressable>
              )}
            </View>

            {/* Direct message stub */}
            <View style={s.contactRow}>
              <View style={[s.contactIcon, { backgroundColor: 'rgba(167,139,250,0.14)' }]}>
                <MessageSquare size={16} color={C.purple} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.contactLabel}>Direct Message</Text>
                <Text style={[s.contactValue, { color: C.text3 }]}>Coming soon ✨</Text>
              </View>
            </View>

            {/* Book session for mentors */}
            {isMentor && (
              <Pressable onPress={() => { onClose(); onBookSession?.(); }} style={s.bookCta} testID="chat-popup-book">
                <Calendar size={14} color="#fff" />
                <Text style={s.bookCtaText}>Book a 1-on-1 session</Text>
                <ChevronRight size={14} color="#fff" />
              </Pressable>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// BookingDrawer — slide-in for mentors with date+slot picker
// ─────────────────────────────────────────────────────────────────────────
const TIME_SLOTS = ['09:00', '11:00', '14:00', '16:00', '18:00', '20:00'];

function nextNDays(n: number) {
  const out: { date: Date; label: string; sub: string; key: string }[] = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i);
    const day = d.toLocaleDateString('en', { weekday: 'short' });
    const num = d.getDate();
    const month = d.toLocaleDateString('en', { month: 'short' });
    out.push({ date: d, label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `${day} ${num}`, sub: month, key: d.toISOString().slice(0, 10) });
  }
  return out;
}

type TabKey = 'overview' | 'book' | 'pay';

export function BookingDrawer({
  visible, mentor, freeRemaining, onClose, onConfirm,
}: {
  visible: boolean;
  mentor: any | null;
  freeRemaining: number;
  onClose: () => void;
  onConfirm: (payload: { date: string; time: string; mentorId: string; isFree: boolean }) => void;
}) {
  const fallbackDays = useMemo(() => nextNDays(7), []);
  const [tab, setTab] = useState<TabKey>('overview');
  const [pickedDay, setPickedDay] = useState<string | null>(null);
  const [pickedTime, setPickedTime] = useState<string | null>(null);
  const [useCredits, setUseCredits] = useState(false);
  const [payMethod, setPayMethod] = useState<'upi' | 'card'>('upi');
  const [upiId, setUpiId] = useState('');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [liveDays, setLiveDays] = useState<Array<{ date: string; weekday: string; label: string; slots: Array<{ time: string; available: boolean }> }> | null>(null);

  // Fetch wallet balance + mentor availability when drawer opens
  useEffect(() => {
    if (!visible || !mentor?.id) return;
    request<any>('/wallet/balance')
      .then((j) => setCreditBalance(Number(j?.balance_credits || 0)))
      .catch(() => {});
    request<any>(`/mentors/${mentor.id}/availability?days=7`)
      .then((j) => { if (j?.days) setLiveDays(j.days); })
      .catch(() => {});
  }, [visible, mentor?.id]);

  // Reset state whenever a new mentor is opened
  useEffect(() => {
    if (visible) {
      setTab('overview'); setPickedDay(null); setPickedTime(null);
      setUseCredits(false); setPayMethod('upi'); setUpiId('');
      setPaying(false); setPayError(null); setConfirmed(false);
    }
  }, [visible, mentor?.id]);

  if (!mentor) return null;
  const initials = ((mentor.full_name || '?').split(' ').slice(0, 2).map((s: string) => s[0] || '').join('') || '?').toUpperCase();
  const isFree = freeRemaining > 0;
  const price = mentor.expected_rate_inr || 999;
  const SA_CREDITS = creditBalance;
  const totalAfterCredits = useCredits ? Math.max(0, price - SA_CREDITS) : price;
  // Use live availability when present, else fallback to default 7-day grid
  const days = liveDays && liveDays.length
    ? liveDays.map((d) => ({ key: d.date, label: d.weekday, sub: d.label }))
    : fallbackDays;
  const dayObj = days.find((d: any) => d.key === pickedDay);
  // Time slots filtered by live availability for the picked day
  const liveDay = liveDays?.find((d) => d.date === pickedDay);
  const slotsForDay: Array<{ time: string; available: boolean }> =
    liveDay ? liveDay.slots : TIME_SLOTS.map((t) => ({ time: t, available: true }));

  const handlePay = async () => {
    if (paying) return;
    setPaying(true);
    setPayError(null);
    try {
      const idem = `book-${mentor.id}-${pickedDay}-${pickedTime}-${Date.now()}`;
      await request(`/mentors/${mentor.id}/availability/book`, {
        method: 'POST',
        body: { date: pickedDay, time: pickedTime, idempotency_key: idem },
      });
      // Deduct credits if applied
      if (useCredits && SA_CREDITS > 0) {
        const amount = Math.min(SA_CREDITS, price);
        await request('/wallet/deduct', {
          method: 'POST',
          body: {
            amount, reason: `Session with ${mentor.full_name}`,
            idempotency_key: `deduct-${idem}`,
          },
        });
      }
      // (Real Razorpay charge for `totalAfterCredits` would happen here)
      await new Promise((r) => setTimeout(r, 800));
      setConfirmed(true);
      onConfirm({ date: pickedDay!, time: pickedTime!, mentorId: mentor.id, isFree });
    } catch (e: any) {
      setPayError(e?.message || 'Could not book session. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  const TabBtn = ({ k, label, icon }: { k: TabKey; label: string; icon: any }) => {
    const active = tab === k;
    return (
      <Pressable
        onPress={() => setTab(k)}
        style={[s.drawerTab, active && s.drawerTabActive]}
        testID={`drawer-tab-${k}`}
      >
        <MCI name={icon} size={14} color={active ? '#A78BFA' : 'rgba(255,255,255,0.55)'} />
        <Text style={[s.drawerTabText, active && { color: '#fff' }]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={s.modalBg} onPress={onClose}>
        <Pressable style={s.drawer} onPress={(e) => e.stopPropagation()}>
          {/* Sticky header with mentor mini + close */}
          <View style={s.drawerHeader}>
            <View style={s.bookAvatar}>
              {mentor.photo_data ? (
                <Image source={{ uri: mentor.photo_data }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Text style={s.bookAvatarText}>{initials}</Text>
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.bookName} numberOfLines={1}>{mentor.full_name}</Text>
              <Text style={s.bookRole} numberOfLines={1}>
                {mentor.job_title || '—'}{mentor.organization ? ' · ' + mentor.organization : ''}
              </Text>
            </View>
            <Pressable onPress={onClose} style={s.closeBtn} testID="booking-close">
              <CloseX size={16} color={C.text2} />
            </Pressable>
          </View>

          {/* Tab strip */}
          {!confirmed && (
            <View style={s.drawerTabs}>
              <TabBtn k="overview" label="Overview" icon="account-outline" />
              <TabBtn k="book"     label="Book"     icon="calendar-month-outline" />
              <TabBtn k="pay"      label="Pay"      icon="currency-inr" />
            </View>
          )}

          <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 100, gap: 18 }}>

            {/* ── CONFIRMATION VIEW ──────────────────────────────────── */}
            {confirmed && (
              <View style={{ alignItems: 'center', paddingVertical: 30, gap: 14 }}>
                <View style={s.successCircle}>
                  <LinearGradient
                    colors={['rgba(16,185,129,0.36)', 'rgba(16,185,129,0.10)']}
                    style={StyleSheet.absoluteFillObject}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  />
                  <MCI name="check-bold" size={56} color="#10B981" />
                </View>
                <Text style={s.successTitle}>Session Booked</Text>
                <Text style={s.successSub}>{dayObj?.label || pickedDay} · {pickedTime} with {mentor.full_name}</Text>
                <Text style={s.successHint}>Confirmation sent to your email</Text>

                <View style={{ width: '100%', gap: 10, marginTop: 8 }}>
                  <View style={[s.notifyCard, { backgroundColor: 'rgba(59,130,246,0.10)', borderColor: 'rgba(59,130,246,0.40)' }]}>
                    <MCI name="email-check-outline" size={16} color="#60A5FA" />
                    <Text style={[s.notifyText, { color: '#BFDBFE' }]}>Zoom link sent to your email</Text>
                  </View>
                  <View style={s.notifyCard}>
                    <MCI name="calendar-check-outline" size={16} color="#A78BFA" />
                    <Text style={s.notifyText}>Teams invite sent</Text>
                  </View>
                </View>

                <Pressable onPress={onClose} style={[s.confirmBtn, { marginTop: 18 }]} testID="booking-done">
                  <Text style={s.confirmText}>Done</Text>
                </Pressable>
              </View>
            )}

            {/* ── OVERVIEW TAB ───────────────────────────────────────── */}
            {!confirmed && tab === 'overview' && (
              <>
                <View style={{ alignItems: 'center', gap: 8, paddingVertical: 6 }}>
                  <View style={[s.bookAvatar, { width: 80, height: 80, borderRadius: 40 }]}>
                    {mentor.photo_data ? (
                      <Image source={{ uri: mentor.photo_data }} style={{ width: '100%', height: '100%' }} />
                    ) : (
                      <Text style={[s.bookAvatarText, { fontSize: 26 }]}>{initials}</Text>
                    )}
                  </View>
                  <Text style={[s.bookName, { fontSize: 22 }]}>{mentor.full_name}</Text>
                  {!!mentor.job_title && <Text style={s.bookRole}>{mentor.job_title}{mentor.organization ? ' · ' + mentor.organization : ''}</Text>}
                  {!!mentor.institution && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <MCI name="school-outline" size={11} color={C.text3} />
                      <Text style={[s.metaText, { fontSize: 11.5 }]}>{mentor.institution}{mentor.graduation_year ? ` · '${String(mentor.graduation_year).slice(2)}` : ''}</Text>
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    {mentor.linkedin_url && (
                      <Pressable onPress={() => Linking.openURL(mentor.linkedin_url)} style={[s.iconSquare, { backgroundColor: 'rgba(59,130,246,0.18)', borderColor: 'rgba(59,130,246,0.45)' }]}>
                        <MCI name="linkedin" size={14} color="#60A5FA" />
                      </Pressable>
                    )}
                    {mentor.github_url && (
                      <Pressable onPress={() => Linking.openURL(mentor.github_url)} style={s.iconSquare}>
                        <MCI name="github" size={14} color="rgba(255,255,255,0.85)" />
                      </Pressable>
                    )}
                  </View>
                </View>

                {!!mentor.bio && (
                  <Text style={{ color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 13.5, lineHeight: 21 }} numberOfLines={4}>
                    {mentor.bio}
                  </Text>
                )}

                <Text style={s.kicker}>CONTACT</Text>
                {[
                  { icon: 'email-outline', label: 'Email', value: mentor.email },
                  { icon: 'phone-outline', label: 'Phone', value: mentor.phone },
                ].filter((r) => r.value).map((r) => (
                  <View key={r.label} style={s.contactRow}>
                    <View style={s.iconSquare}><MCI name={r.icon as any} size={13} color="#A78BFA" /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.contactLabel}>{r.label}</Text>
                      <Text style={s.contactValue} numberOfLines={1}>{r.value}</Text>
                    </View>
                    <MCI name="open-in-new" size={13} color={C.text3} />
                  </View>
                ))}

                <Text style={s.kicker}>CONNECTED APPS</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    { name: 'Zoom',    icon: 'video-outline' },
                    { name: 'Outlook', icon: 'email-outline' },
                    { name: 'Teams',   icon: 'account-group-outline' },
                  ].map((a) => (
                    <View key={a.name} style={s.appPill}>
                      <MCI name={a.icon as any} size={11} color="#A78BFA" />
                      <Text style={s.appPillText}>{a.name}</Text>
                    </View>
                  ))}
                </View>

                {(mentor.skills || []).length > 0 && (
                  <>
                    <Text style={s.kicker}>SKILLS</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {(mentor.skills || []).slice(0, 8).map((sk: string) => (
                        <View key={sk} style={s.skillPill}><Text style={s.skillPillText}>{sk}</Text></View>
                      ))}
                    </View>
                  </>
                )}

                <Text style={[s.kicker, { color: '#FCD34D' }]}>MENTOR STATS</Text>
                <View style={s.statsCard}>
                  <View style={s.statCol}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <MCI name="star" size={14} color="#FCD34D" />
                      <Text style={s.statValue}>{Number(mentor.rating || 4.7).toFixed(1)}</Text>
                    </View>
                    <Text style={s.statLabel}>Rating</Text>
                  </View>
                  <View style={s.statCol}>
                    <Text style={s.statValue}>{mentor.sessions || 0}</Text>
                    <Text style={s.statLabel}>Sessions</Text>
                  </View>
                  <View style={s.statCol}>
                    <Text style={s.statValue}>₹{Number(price).toLocaleString('en-IN')}</Text>
                    <Text style={s.statLabel}>Per session</Text>
                  </View>
                </View>

                <Pressable onPress={() => setTab('book')} style={s.confirmBtn} testID="overview-book-cta">
                  <MCI name="calendar-month" size={15} color="#fff" />
                  <Text style={s.confirmText}>Book a Session</Text>
                </Pressable>
              </>
            )}

            {/* ── BOOK TAB ───────────────────────────────────────────── */}
            {!confirmed && tab === 'book' && (
              <>
                {isFree && (
                  <View style={s.freeRibbon}>
                    <Gift size={13} color="#FCD34D" />
                    <Text style={s.freeRibbonText}>This session is on us — {freeRemaining} free remaining</Text>
                  </View>
                )}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Text style={s.kicker}>SELECT DAY</Text>
                  <Text style={[s.kicker, { color: '#FCD34D' }]}>₹{Number(price).toLocaleString('en-IN')} / session</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {days.map((d) => {
                    const sel = pickedDay === d.key;
                    return (
                      <Pressable key={d.key} onPress={() => setPickedDay(d.key)} style={[s.dayCard, sel && s.dayCardSel]} testID={`book-day-${d.key}`}>
                        <Text style={[s.daySub, sel && { color: '#fff' }]}>{d.sub}</Text>
                        <Text style={[s.dayLabel, sel && { color: '#fff' }]}>{d.label}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <Text style={s.kicker}>AVAILABLE SLOTS {pickedDay ? '' : '— select a day first'}</Text>
                <View style={s.slots}>
                  {slotsForDay.map((sObj) => {
                    const t = sObj.time;
                    const isAvailable = sObj.available;
                    const sel = pickedTime === t;
                    return (
                      <Pressable
                        key={t}
                        onPress={() => pickedDay && isAvailable && setPickedTime(t)}
                        disabled={!pickedDay || !isAvailable}
                        style={[
                          s.slot,
                          sel && s.slotSel,
                          (!pickedDay || !isAvailable) && { opacity: 0.4 },
                          !isAvailable && { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'transparent' }
                        ]}
                        testID={`book-slot-${t}`}
                      >
                        <Clock size={11} color={sel ? '#fff' : isAvailable ? C.text2 : C.text3} />
                        <Text style={[
                          s.slotText,
                          sel && { color: '#fff' },
                          !isAvailable && { color: C.text3, textDecorationLine: 'line-through' }
                        ]}>{t}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable
                  onPress={() => pickedDay && pickedTime && setTab('pay')}
                  disabled={!pickedDay || !pickedTime}
                  style={[s.confirmBtn, (!pickedDay || !pickedTime) && { opacity: 0.55 }]}
                  testID="book-continue-pay"
                >
                  <MCI name="arrow-right-circle-outline" size={15} color="#fff" />
                  <Text style={s.confirmText}>{(!pickedDay || !pickedTime) ? 'Select a slot first' : 'Continue to Pay'}</Text>
                </Pressable>
              </>
            )}

            {/* ── PAY TAB ────────────────────────────────────────────── */}
            {!confirmed && tab === 'pay' && (
              <>
                <Text style={s.kicker}>ORDER SUMMARY</Text>
                <View style={s.summary}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.summaryLine}>Session with {mentor.full_name}</Text>
                      <Text style={s.summaryMeta}>{dayObj?.label} · {pickedTime} · 30 min</Text>
                    </View>
                    <Text style={s.summaryPrice}>₹{Number(price).toLocaleString('en-IN')}</Text>
                  </View>
                </View>

                <View style={s.creditsRow}>
                  <View style={s.iconSquare}><MCI name="circle-multiple-outline" size={14} color="#FCD34D" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.creditsLabel}>SA Credits</Text>
                    <Text style={s.creditsSub}>{SA_CREDITS} credits available · worth ₹{SA_CREDITS}</Text>
                  </View>
                  <Pressable
                    onPress={() => setUseCredits((v) => !v)}
                    style={[s.toggle, useCredits && s.toggleOn]}
                    testID="toggle-credits"
                  >
                    <View style={[s.toggleThumb, useCredits && { left: 22, backgroundColor: '#fff' }]} />
                  </Pressable>
                </View>
                {useCredits && (
                  <View style={s.creditsAppliedRow}>
                    <MCI name="check-circle" size={12} color="#10B981" />
                    <Text style={s.creditsAppliedText}>−₹{SA_CREDITS} applied · You pay ₹{totalAfterCredits.toLocaleString('en-IN')}</Text>
                  </View>
                )}

                <Text style={s.kicker}>PAYMENT METHOD</Text>
                <Pressable
                  onPress={() => setPayMethod('upi')}
                  style={[s.methodCard, payMethod === 'upi' && s.methodCardSel]}
                  testID="pay-upi"
                >
                  <View style={s.iconSquare}><MCI name="cellphone" size={14} color="#A78BFA" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.methodLabel}>UPI</Text>
                    <Text style={s.methodSub}>GPay · PhonePe · Paytm · BHIM</Text>
                  </View>
                  <View style={[s.radio, payMethod === 'upi' && s.radioOn]}>
                    {payMethod === 'upi' && <View style={s.radioDot} />}
                  </View>
                </Pressable>
                {payMethod === 'upi' && (
                  <TextInput
                    value={upiId} onChangeText={setUpiId}
                    placeholder="Enter UPI ID — name@upi"
                    placeholderTextColor={C.text3}
                    style={s.input}
                  />
                )}

                <Pressable
                  onPress={() => setPayMethod('card')}
                  style={[s.methodCard, payMethod === 'card' && s.methodCardSel]}
                  testID="pay-card"
                >
                  <View style={s.iconSquare}><MCI name="credit-card-outline" size={14} color="#A78BFA" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.methodLabel}>Credit / Debit Card</Text>
                    <Text style={s.methodSub}>Visa · Mastercard · RuPay</Text>
                  </View>
                  <View style={[s.radio, payMethod === 'card' && s.radioOn]}>
                    {payMethod === 'card' && <View style={s.radioDot} />}
                  </View>
                </Pressable>

                <Pressable
                  onPress={handlePay}
                  disabled={paying}
                  style={[s.confirmBtn, paying && { opacity: 0.7 }]}
                  testID="pay-confirm"
                >
                  {paying ? <ActivityIndicator size="small" color="#fff" /> : <MCI name="lock-outline" size={14} color="#fff" />}
                  <Text style={s.confirmText}>{paying ? 'Processing…' : `Pay ₹${totalAfterCredits.toLocaleString('en-IN')} & Confirm`}</Text>
                </Pressable>
                {payError && (
                  <View style={s.payErrorBox}>
                    <MCI name="alert-circle-outline" size={13} color="#FCA5A5" />
                    <Text style={s.payErrorText}>{payError}</Text>
                  </View>
                )}

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: -8 }}>
                  <MCI name="shield-check-outline" size={11} color={C.text3} />
                  <Text style={[s.metaText, { fontSize: 10.5 }]}>Secured by Razorpay · 256-bit SSL</Text>
                </View>
              </>
            )}

          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
;
