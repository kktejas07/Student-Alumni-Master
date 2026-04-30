/**
 * Network shell sub-components: NetworkSidebar, TopHero, ChatPhonePopup, BookingDrawer.
 */
import { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal, Image, Platform, Linking,
} from 'react-native';
import {
  Compass, Users, UserPlus, Filter, X as CloseX, Phone, MessageSquare, Calendar,
  Gift, Star, Check, Clock, ChevronRight,
} from 'lucide-react-native';

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
          {me?.photo_data ? (
            <Image source={{ uri: me.photo_data }} style={{ width: '100%', height: '100%' }} />
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

export function BookingDrawer({
  visible, mentor, freeRemaining, onClose, onConfirm,
}: {
  visible: boolean;
  mentor: any | null;
  freeRemaining: number;
  onClose: () => void;
  onConfirm: (payload: { date: string; time: string; mentorId: string; isFree: boolean }) => void;
}) {
  const days = useMemo(() => nextNDays(7), []);
  const [pickedDay, setPickedDay] = useState<string | null>(null);
  const [pickedTime, setPickedTime] = useState<string | null>(null);
  if (!mentor) return null;
  const initials = ((mentor.full_name || '?').split(' ').slice(0, 2).map((s: string) => s[0] || '').join('') || '?').toUpperCase();
  const isFree = freeRemaining > 0;
  const price = mentor.expected_rate_inr || 999;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={s.modalBg} onPress={onClose}>
        <Pressable style={s.drawer} onPress={(e) => e.stopPropagation()}>
          <ScrollView contentContainerStyle={{ padding: 22, gap: 18 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Text style={s.drawerKicker}>BOOK A SESSION</Text>
              <Pressable onPress={onClose} style={s.closeBtn} testID="booking-close"><CloseX size={16} color={C.text2} /></Pressable>
            </View>

            {/* Mentor card */}
            <View style={s.bookMentor}>
              <View style={s.bookAvatar}>
                {mentor.photo_data ? (
                  <Image source={{ uri: mentor.photo_data }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Text style={s.bookAvatarText}>{initials}</Text>
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.bookName} numberOfLines={1}>{mentor.full_name}</Text>
                {mentor.job_title && (
                  <Text style={s.bookRole} numberOfLines={1}>{mentor.job_title}{mentor.organization ? ' · ' + mentor.organization : ''}</Text>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  {mentor.rating != null && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Star size={11} color="#F59E0B" fill="#F59E0B" />
                      <Text style={s.metaText}>{Number(mentor.rating).toFixed(1)}</Text>
                    </View>
                  )}
                  {mentor.sessions != null && <Text style={s.metaText}>{mentor.sessions} sessions</Text>}
                  <View style={{ flex: 1 }} />
                  <Text style={s.priceText}>
                    {isFree ? 'FREE' : `₹${Number(price).toLocaleString('en-IN')}`}
                  </Text>
                </View>
              </View>
            </View>

            {/* Free badge */}
            {isFree && (
              <View style={s.freeRibbon}>
                <Gift size={13} color="#FCD34D" />
                <Text style={s.freeRibbonText}>This session is on us — {freeRemaining} free remaining</Text>
              </View>
            )}

            {/* Date picker */}
            <View style={{ gap: 8 }}>
              <Text style={s.sectionLabel}>Pick a Date</Text>
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
            </View>

            {/* Time picker */}
            <View style={{ gap: 8 }}>
              <Text style={s.sectionLabel}>Pick a Time {pickedDay ? '' : '— select a day first'}</Text>
              <View style={s.slots}>
                {TIME_SLOTS.map((t) => {
                  const sel = pickedTime === t;
                  return (
                    <Pressable
                      key={t}
                      onPress={() => pickedDay && setPickedTime(t)}
                      disabled={!pickedDay}
                      style={[s.slot, sel && s.slotSel, !pickedDay && { opacity: 0.5 }]}
                      testID={`book-slot-${t}`}
                    >
                      <Clock size={11} color={sel ? '#fff' : C.text2} />
                      <Text style={[s.slotText, sel && { color: '#fff' }]}>{t}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Confirm */}
            <Pressable
              onPress={() => pickedDay && pickedTime && onConfirm({ date: pickedDay, time: pickedTime, mentorId: mentor.id, isFree })}
              disabled={!pickedDay || !pickedTime}
              style={[s.confirmBtn, (!pickedDay || !pickedTime) && { opacity: 0.5 }]}
              testID="booking-confirm"
            >
              <Calendar size={14} color="#fff" />
              <Text style={s.confirmText}>{isFree ? 'Confirm Free Session' : `Book for ₹${Number(price).toLocaleString('en-IN')}`}</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  // Sidebar
  sidebar: { width: 268, padding: 18, gap: 8, borderRightColor: 'rgba(255,255,255,0.06)', borderRightWidth: 1, backgroundColor: C.bg2 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  logoBox: { width: 38, height: 38, borderRadius: 9, backgroundColor: '#A78BFA', alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 14 },
  logoTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 14 },
  logoSub: { color: C.text3, fontFamily: 'DMSans_400Regular', fontSize: 10.5, marginTop: 1 },

  miniProf: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderColor: C.border, borderWidth: 1, marginVertical: 6 },
  miniAvatar: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', backgroundColor: 'rgba(167,139,250,0.30)', alignItems: 'center', justifyContent: 'center' },
  miniInitials: { color: '#C4B5FD', fontFamily: 'DMSans_800ExtraBold', fontSize: 12 },
  miniName: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12.5 },
  miniMeta: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 10.5, marginTop: 2 },

  freeBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, backgroundColor: 'rgba(252,211,77,0.08)', borderColor: 'rgba(252,211,77,0.30)', borderWidth: 1 },
  freeTitle: { color: '#FCD34D', fontFamily: 'DMSans_700Bold', fontSize: 12 },
  freeSub: { color: C.text3, fontFamily: 'DMSans_400Regular', fontSize: 10.5, marginTop: 1 },

  label: { color: C.text3, fontFamily: 'DMSans_700Bold', fontSize: 9.5, letterSpacing: 0.8, marginTop: 8, marginBottom: 4 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 9, ...({ cursor: 'pointer' } as any) },
  navItemActive: { backgroundColor: 'rgba(167,139,250,0.16)' },
  navText: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 12.5, flex: 1 },
  navBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999, backgroundColor: 'rgba(167,139,250,0.20)', minWidth: 20, alignItems: 'center' },
  navBadgeText: { color: '#C4B5FD', fontFamily: 'DMSans_800ExtraBold', fontSize: 10 },

  typeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, ...({ cursor: 'pointer' } as any) },
  typeRowActive: { backgroundColor: 'rgba(167,139,250,0.10)' },
  typeText: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12 },

  stats: { gap: 6, padding: 10, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: C.border, borderWidth: 1 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 11 },
  statValue: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12 },

  // Hero
  hero: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 18, gap: 6 },
  heroTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 22, letterSpacing: -0.3 },
  heroSub: { color: C.text2, fontFamily: 'DMSans_400Regular', fontSize: 13 },
  heroPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  heroPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(167,139,250,0.10)', borderColor: 'rgba(167,139,250,0.30)', borderWidth: 1 },
  heroPillText: { color: '#C4B5FD', fontFamily: 'DMSans_500Medium', fontSize: 11 },

  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  popup: { width: 380, maxWidth: '92%', backgroundColor: '#1A0F2E', borderColor: C.border, borderWidth: 1, borderRadius: 14, padding: 18 },
  popupTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 14 },
  closeBtn: { width: 28, height: 28, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: C.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...({ cursor: 'pointer' } as any) },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: C.border, borderWidth: 1 },
  contactIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  contactLabel: { color: C.text3, fontFamily: 'DMSans_700Bold', fontSize: 9.5, letterSpacing: 0.6, textTransform: 'uppercase' },
  contactValue: { color: '#fff', fontFamily: 'DMSans_500Medium', fontSize: 12.5, marginTop: 2 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7, ...({ cursor: 'pointer' } as any) },
  actionBtnText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 11 },
  bookCta: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 11, borderRadius: 10, backgroundColor: C.green, justifyContent: 'center', marginTop: 4, ...({ cursor: 'pointer' } as any) },
  bookCtaText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12.5 },

  // Drawer
  drawer: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 460, maxWidth: '100%', backgroundColor: '#0C0818', borderLeftColor: C.border, borderLeftWidth: 1 },
  drawerKicker: { color: '#A78BFA', fontFamily: 'DMSans_800ExtraBold', fontSize: 11, letterSpacing: 1 },

  bookMentor: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderColor: C.border, borderWidth: 1 },
  bookAvatar: { width: 52, height: 52, borderRadius: 26, overflow: 'hidden', backgroundColor: 'rgba(16,185,129,0.20)', alignItems: 'center', justifyContent: 'center' },
  bookAvatarText: { color: '#34D399', fontFamily: 'DMSans_800ExtraBold', fontSize: 16 },
  bookName: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 15 },
  bookRole: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12, marginTop: 3 },
  metaText: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11 },
  priceText: { color: C.green, fontFamily: 'DMSans_800ExtraBold', fontSize: 14 },

  freeRibbon: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, backgroundColor: 'rgba(252,211,77,0.10)', borderColor: 'rgba(252,211,77,0.30)', borderWidth: 1 },
  freeRibbonText: { color: '#FCD34D', fontFamily: 'DMSans_500Medium', fontSize: 11.5, flex: 1 },

  sectionLabel: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase' },
  dayCard: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderColor: C.border, borderWidth: 1, alignItems: 'center', minWidth: 76, ...({ cursor: 'pointer' } as any) },
  dayCardSel: { backgroundColor: '#A78BFA', borderColor: '#A78BFA' },
  daySub: { color: C.text3, fontFamily: 'DMSans_700Bold', fontSize: 9, letterSpacing: 0.4, textTransform: 'uppercase' },
  dayLabel: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 13, marginTop: 3 },

  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderColor: C.border, borderWidth: 1, ...({ cursor: 'pointer' } as any) },
  slotSel: { backgroundColor: '#A78BFA', borderColor: '#A78BFA' },
  slotText: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 12 },

  confirmBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 13, borderRadius: 11, backgroundColor: C.green, justifyContent: 'center', marginTop: 6, ...({ cursor: 'pointer' } as any) },
  confirmText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 13 },
});
