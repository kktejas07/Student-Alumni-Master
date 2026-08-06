// @ts-nocheck
/**
 * /echo/{college}/register — public registration + payment for an ECHO event.
 *
 * Two-column layout on wide screens:
 *   left  — poster image placeholder(s) (single or multiple, from CMS `poster_images`)
 *   right — registration form + payment (fee panel + external payment link or mock gateway)
 *
 * Everything (fee, currency, posters, payment link) is configured in the
 * superadmin CMS (Registration tab). On submit it registers the user in BOTH
 * the StudentAlumni platform and the event itself.
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  ActivityIndicator, Image, Platform, useWindowDimensions, Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter, Redirect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Calendar, MapPin, Clock, Ticket, CreditCard,
  Check, ShieldCheck, Users, ChevronLeft, ChevronRight, ExternalLink,
} from 'lucide-react-native';
import { api } from '@/src/models/services/api';
import { PALETTE, FONTS, TYPO } from '@/src/views/web/portals/student/tokens';
import { GRAD } from '@/src/views/web/portals/student/portalkit';
import { EchoHeader, EchoFooter, ECHO_TOP_PADDING } from '@/src/views/web/components/EchoChrome';

export default function EchoRegisterPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const [showcase, setShowcase] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState<any>(null);

  const [form, setForm] = useState({ full_name: '', email: '', phone: '', branch: '', year: '', college: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [posterIdx, setPosterIdx] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const d = await api.getEchoShowcase(slug);
        if (mounted) setShowcase(d);
      } catch { /* not found */ }
      try {
        const reg = await api.myEchoRegistration(slug);
        if (mounted && reg?.id) setExisting(reg);
      } catch { /* no auth / none */ }
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, [slug]);

  const canonicalSlug: string = showcase?.slug || slug || '';

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const regCfg = showcase?.registration || {};
  const fee = Number(regCfg.fee || 0);
  const currency = regCfg.currency || 'INR';
  const isOpen = regCfg.enabled !== false;
  const paymentUrl = regCfg.payment_url || null;
  const posters = Array.isArray(regCfg.poster_images) && regCfg.poster_images.length > 0
    ? regCfg.poster_images
    : (showcase?.gallery || []).map((g: any) => g.url).filter(Boolean);
  const activePoster = posters.length > 0 ? posters[posterIdx % posters.length] : (showcase?.hero_image_url || null);

  const openPayment = () => {
    if (Platform.OS === 'web') {
      window.open(paymentUrl, '_blank');
    } else {
      Linking.openURL(paymentUrl);
    }
  };

  const onSubmit = async () => {
    if (!form.full_name.trim() || !form.email.trim()) {
      setError('Please fill in your name and email.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // Payment gateway: if an external payment_url is configured, the attendee
      // pays there; the mock gateway below simulates that step for the demo.
      await new Promise((r) => setTimeout(r, 900));
      const res = await api.registerEchoShowcase(canonicalSlug, { ...form, payment_method: paymentUrl ? 'external' : 'mock' });
      setDone(res);
    } catch (e: any) {
      setError(e?.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (canonicalSlug && slug !== canonicalSlug) {
    return <Redirect href={`/echo/${canonicalSlug}/register`} />;
  }

  if (loading) {
    return (
      <View style={s.root}>
        <EchoHeader current="echo" />
        <ScrollView contentContainerStyle={[s.content, { flexGrow: 1, justifyContent: 'center', paddingTop: ECHO_TOP_PADDING }]}>
          <View style={[s.center, { flex: 1 }]}>
            <ActivityIndicator size="large" color={GRAD.from} />
            <Text style={s.centerText}>Loading event…</Text>
          </View>
          <EchoFooter />
        </ScrollView>
      </View>
    );
  }

  if (!showcase) {
    return (
      <View style={s.root}>
        <EchoHeader current="echo" />
        <ScrollView contentContainerStyle={[s.content, { flexGrow: 1, justifyContent: 'center', paddingTop: ECHO_TOP_PADDING }]}>
          <View style={[s.center, { flex: 1 }]}>
            <Text style={s.centerText}>Event not found.</Text>
            <Pressable onPress={() => router.push('/echo')} style={s.backInline}>
              <ArrowLeft size={14} color="#fff" />
              <Text style={s.backInlineText}>Back to all events</Text>
            </Pressable>
          </View>
          <EchoFooter />
        </ScrollView>
      </View>
    );
  }

  // Success screen with QR + payment confirmation
  if (done?.id || existing?.id) {
    const reg = done || existing;
    const payment = reg.payment || {};
    return (
      <View style={s.root}>
        <EchoHeader current="echo" />
        <ScrollView contentContainerStyle={[s.content, { paddingBottom: 80, paddingTop: ECHO_TOP_PADDING }]}>
        <Pressable onPress={() => router.push(`/echo/${canonicalSlug}`)} style={s.backBtn}>
          <ArrowLeft size={14} color="#fff" />
          <Text style={s.backText}>Back to event</Text>
        </Pressable>

        <LinearGradient colors={['#065F46', '#059669']} style={s.successHero}>
          <View style={s.successIcon}><Check size={30} color="#fff" /></View>
          <Text style={s.successTitle}>You're registered!</Text>
          <Text style={s.successSub}>
            {payment.status === 'paid' ? `Payment of ${payment.currency || currency} ${payment.amount || fee} received.` : 'Registration confirmed.'}
          </Text>
          {payment.payment_id ? (
            <View style={s.payId}>
              <ShieldCheck size={13} color="#A7F3D0" />
              <Text style={s.payIdText}>Payment ID: {payment.payment_id}</Text>
            </View>
          ) : null}
        </LinearGradient>

        <View style={s.card}>
          <Text style={s.cardTitle}>Event Details</Text>
          <View style={s.detailRow}><Calendar size={14} color={PALETTE.muted} /><Text style={s.detailText}>{showcase.date || '—'}</Text></View>
          <View style={s.detailRow}><Clock size={14} color={PALETTE.muted} /><Text style={s.detailText}>{showcase.time || '—'}</Text></View>
          <View style={s.detailRow}><MapPin size={14} color={PALETTE.muted} /><Text style={s.detailText}>{showcase.venue || '—'}</Text></View>
        </View>

        {reg.qr_code_base64 ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>Your Check-in QR</Text>
            <Text style={s.hint}>Show this at the venue to check in.</Text>
            <View style={s.qrWrap}>
              <Image
                source={{ uri: `data:image/png;base64,${reg.qr_code_base64}` }}
                style={s.qr} resizeMode="contain"
              />
            </View>
            <Text style={s.regId}>Registration ID: {reg.id}</Text>
          </View>
        ) : null}

        <Pressable onPress={() => router.push(`/echo/${canonicalSlug}`)} style={s.doneBtn}>
          <Text style={s.doneBtnText}>Done</Text>
        </Pressable>
        <EchoFooter />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <EchoHeader current="echo" />
      <ScrollView contentContainerStyle={{ paddingTop: ECHO_TOP_PADDING }}>
      <View style={s.content}>
      <Pressable onPress={() => router.push(`/echo/${canonicalSlug}`)} style={s.backBtn}>
        <ArrowLeft size={14} color="#fff" />
        <Text style={s.backText}>Back to event</Text>
      </Pressable>

      <LinearGradient colors={['rgba(124,58,237,0.30)', 'rgba(30,10,80,0.5)']} style={s.header}>
        <View style={s.headerBadge}><Ticket size={14} color="#C4B5FD" /><Text style={s.headerBadgeText}>REGISTER</Text></View>
        <Text style={s.headerTitle}>{showcase.title}</Text>
        <Text style={s.headerOrg}>Organized by {showcase.organizer_name || showcase.college || '—'}</Text>
        <View style={s.metaCol}>
          {showcase.date ? <View style={s.metaRow}><Calendar size={13} color={PALETTE.muted} /><Text style={s.metaText}>{showcase.date}</Text></View> : null}
          {showcase.time ? <View style={s.metaRow}><Clock size={13} color={PALETTE.muted} /><Text style={s.metaText}>{showcase.time}</Text></View> : null}
          {showcase.venue ? <View style={s.metaRow}><MapPin size={13} color={PALETTE.muted} /><Text style={s.metaText}>{showcase.venue}</Text></View> : null}
        </View>
      </LinearGradient>

      <View style={[s.split, !isWide && s.splitStack]}>
        {/* ── LEFT: POSTER PLACEHOLDER(S) ─────────────────────────────── */}
        <View style={[s.posterCol, !isWide && s.posterColStack]}>
          <View style={s.posterWrap}>
            {activePoster ? (
              <Image source={{ uri: activePoster }} style={s.poster} resizeMode="cover" />
            ) : (
              <LinearGradient colors={['rgba(123,61,191,0.35)', 'rgba(95,37,159,0.55)', 'rgba(30,10,80,0.85)']} style={s.poster}>
                <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1, gap: 10, padding: 20 }}>
                  <Ticket size={40} color={GRAD.from} />
                  <Text style={{ fontFamily: TYPO.display800, fontSize: 20, color: '#fff', textAlign: 'center' }}>{showcase.title}</Text>
                  <Text style={{ fontFamily: TYPO.body500, fontSize: 12.5, color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>Event poster — upload from the Admin CMS</Text>
                </View>
              </LinearGradient>
            )}
            {posters.length > 1 && (
              <>
                <Pressable onPress={() => setPosterIdx((posterIdx - 1 + posters.length) % posters.length)} style={[s.posterNav, s.posterNavL]}>
                  <ChevronLeft size={20} color="#fff" />
                </Pressable>
                <Pressable onPress={() => setPosterIdx((posterIdx + 1) % posters.length)} style={[s.posterNav, s.posterNavR]}>
                  <ChevronRight size={20} color="#fff" />
                </Pressable>
              </>
            )}
          </View>

          {/* Poster dots */}
          {posters.length > 1 && (
            <View style={s.dots}>
              {posters.map((_, i) => (
                <Pressable key={i} onPress={() => setPosterIdx(i)} style={[s.dot, i === (posterIdx % posters.length) && s.dotOn]} />
              ))}
            </View>
          )}
        </View>

        {/* ── RIGHT: REGISTRATION + PAYMENT ───────────────────────────── */}
        <View style={[s.formCol, !isWide && s.formColStack]}>
          {!isOpen ? (
            <View style={s.closedCard}>
              <Text style={s.closedTitle}>Registrations are closed</Text>
              <Text style={s.closedSub}>This event is no longer accepting registrations.</Text>
            </View>
          ) : (
            <>
              {/* Fee panel */}
              <View style={s.feeCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={s.feeIcon}><CreditCard size={18} color={GRAD.from} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.feeLabel}>Registration Fee</Text>
                    <Text style={s.feeValue}>{fee > 0 ? `${currency} ${fee}` : 'FREE'}</Text>
                  </View>
                  {paymentUrl ? (
                    <View style={s.secureBadge}><ExternalLink size={12} color="#34D399" /><Text style={s.secureText}>Secure payment</Text></View>
                  ) : fee > 0 ? (
                    <View style={s.secureBadge}><ShieldCheck size={12} color="#34D399" /><Text style={s.secureText}>Secure mock payment</Text></View>
                  ) : null}
                </View>
                {regCfg.max_seats ? (
                  <View style={s.seatsRow}><Users size={12} color={PALETTE.muted} /><Text style={s.seatsText}>{regCfg.max_seats} seats available</Text></View>
                ) : null}
                {regCfg.payment_note ? <Text style={s.note}>{regCfg.payment_note}</Text> : null}
              </View>

              {/* Form */}
              <View style={s.formCard}>
                <Text style={s.cardTitle}>Registration Details</Text>

                <Text style={s.label}>Full Name *</Text>
                <TextInput style={s.input} value={form.full_name} onChangeText={(v) => set('full_name', v)} placeholder="Your full name" placeholderTextColor={PALETTE.dim} />

                <Text style={s.label}>Email *</Text>
                <TextInput style={s.input} value={form.email} onChangeText={(v) => set('email', v)} placeholder="you@example.com" placeholderTextColor={PALETTE.dim} keyboardType="email-address" autoCapitalize="none" />

                <Text style={s.label}>Phone</Text>
                <TextInput style={s.input} value={form.phone} onChangeText={(v) => set('phone', v)} placeholder="+91 …" placeholderTextColor={PALETTE.dim} keyboardType="phone-pad" />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.label}>Branch</Text>
                    <TextInput style={s.input} value={form.branch} onChangeText={(v) => set('branch', v)} placeholder="CSE" placeholderTextColor={PALETTE.dim} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.label}>Year</Text>
                    <TextInput style={s.input} value={form.year} onChangeText={(v) => set('year', v)} placeholder="Final" placeholderTextColor={PALETTE.dim} />
                  </View>
                </View>

                <Text style={s.label}>College</Text>
                <TextInput style={s.input} value={form.college} onChangeText={(v) => set('college', v)} placeholder={showcase.college || 'Your college' } placeholderTextColor={PALETTE.dim} />

                {error ? <Text style={s.error}>{error}</Text> : null}

                {paymentUrl ? (
                  <>
                    <LinearGradient colors={['#059669', '#047857']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.payBtnWrap}>
                      <Pressable onPress={openPayment} style={s.payBtn}>
                        <ExternalLink size={16} color="#fff" />
                        <Text style={s.payBtnText}>
                          {fee > 0 ? `Pay ${currency} ${fee}` : 'Proceed'} — Payment Gateway
                        </Text>
                      </Pressable>
                    </LinearGradient>
                    <Text style={s.disclaimer}>
                      You'll be redirected to the secure payment gateway to complete payment. Registration is confirmed after payment.
                    </Text>
                  </>
                ) : (
                  <>
                    <LinearGradient colors={[GRAD.from, GRAD.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.payBtnWrap}>
                      <Pressable onPress={onSubmit} disabled={submitting} style={s.payBtn}>
                        {submitting ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <>
                            <CreditCard size={16} color="#fff" />
                            <Text style={s.payBtnText}>
                              {fee > 0 ? `Pay ${currency} ${fee} & Register` : 'Register Free'}
                            </Text>
                          </>
                        )}
                      </Pressable>
                    </LinearGradient>
                    <Text style={s.disclaimer}>
                      By registering you agree to receive event updates. This is a demo payment flow — no real charge is made.
                    </Text>
                  </>
                )}
              </View>
            </>
          )}
        </View>
      </View>
      </View>
      <EchoFooter />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0f1e' },
  content: { padding: 20, maxWidth: 1100, width: '100%', alignSelf: 'center' },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 100, gap: 14 },
  centerText: { color: PALETTE.muted, fontFamily: FONTS.med, fontSize: 14 },

  split: { flexDirection: 'row', gap: 20, alignItems: 'stretch' },
  splitStack: { flexDirection: 'column' },

  posterCol: { flex: 1, minWidth: 0, gap: 12 },
  posterColStack: { width: '100%' },
  posterWrap: { position: 'relative', borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: PALETTE.glassBorder, flex: 1, minHeight: 460 },
  poster: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', backgroundColor: '#0d1326' },
  posterNav: {
    position: 'absolute', top: '50%', marginTop: -20, width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  posterNavL: { left: 12 },
  posterNavR: { right: 12 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)' },
  dotOn: { backgroundColor: GRAD.from, width: 22 },

  formCol: { width: 420, minWidth: 0 },
  formColStack: { width: '100%' },

  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: PALETTE.glassBorder,
    marginBottom: 16,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  backText: { color: '#fff', fontFamily: FONTS.med, fontSize: 13 },
  backInline: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  backInlineText: { color: GRAD.from, fontFamily: FONTS.semi, fontSize: 13 },

  header: { borderRadius: 18, padding: 24, gap: 8, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)' },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6,
    backgroundColor: 'rgba(124,58,237,0.25)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14,
  },
  headerBadgeText: { color: '#C4B5FD', fontFamily: TYPO.display700, fontSize: 10, letterSpacing: 1 },
  headerTitle: { color: '#fff', fontFamily: TYPO.display800, fontSize: 26 },
  headerOrg: { color: PALETTE.muted, fontFamily: FONTS.med, fontSize: 13 },
  metaCol: { gap: 6, marginTop: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { color: PALETTE.muted, fontFamily: FONTS.med, fontSize: 12.5 },

  feeCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, borderWidth: 1,
    borderColor: PALETTE.glassBorder, padding: 16, gap: 10, marginBottom: 14,
  },
  feeIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(124,58,237,0.18)', alignItems: 'center', justifyContent: 'center' },
  feeLabel: { color: PALETTE.muted, fontFamily: FONTS.med, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 },
  feeValue: { color: '#fff', fontFamily: TYPO.display800, fontSize: 22 },
  secureBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(16,185,129,0.12)', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  secureText: { color: '#34D399', fontFamily: FONTS.semi, fontSize: 10 },
  seatsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  seatsText: { color: PALETTE.muted, fontFamily: FONTS.med, fontSize: 11.5 },
  note: { color: PALETTE.muted, fontFamily: FONTS.med, fontSize: 11.5, lineHeight: 17 },

  formCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, borderWidth: 1,
    borderColor: PALETTE.glassBorder, padding: 20, gap: 8,
  },
  cardTitle: { color: '#fff', fontFamily: TYPO.display700, fontSize: 16, marginBottom: 6 },
  label: { color: '#94a3b8', fontFamily: FONTS.semi, fontSize: 11, marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderColor: PALETTE.glassBorder, borderWidth: 1,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: '#fff',
    fontFamily: FONTS.med, fontSize: 14,
  },
  error: { color: '#F87171', fontFamily: FONTS.med, fontSize: 12.5, marginTop: 6 },
  payBtnWrap: { borderRadius: 12, marginTop: 18, overflow: 'hidden' },
  payBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 15,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  payBtnText: { color: '#fff', fontFamily: TYPO.display700, fontSize: 15 },
  disclaimer: { color: PALETTE.dim, fontFamily: FONTS.med, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 10 },

  successHero: { borderRadius: 18, padding: 28, alignItems: 'center', gap: 8, marginBottom: 16 },
  successIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  successTitle: { color: '#fff', fontFamily: TYPO.display800, fontSize: 24 },
  successSub: { color: '#A7F3D0', fontFamily: FONTS.med, fontSize: 13.5 },
  payId: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, marginTop: 4 },
  payIdText: { color: '#D1FAE5', fontFamily: FONTS.semi, fontSize: 11 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, borderWidth: 1,
    borderColor: PALETTE.glassBorder, padding: 18, marginBottom: 14, gap: 8,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { color: 'rgba(255,255,255,0.75)', fontFamily: FONTS.med, fontSize: 13 },
  hint: { color: PALETTE.muted, fontFamily: FONTS.med, fontSize: 12 },
  qrWrap: { alignItems: 'center', marginVertical: 10 },
  qr: { width: 180, height: 180, backgroundColor: '#fff', borderRadius: 12 },
  regId: { color: PALETTE.muted, fontFamily: FONTS.med, fontSize: 11.5, textAlign: 'center' },
  doneBtn: {
    backgroundColor: GRAD.from, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  doneBtnText: { color: '#fff', fontFamily: TYPO.display700, fontSize: 14 },

  closedCard: {
    backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)', padding: 20, gap: 6,
  },
  closedTitle: { color: '#FCD34D', fontFamily: TYPO.display700, fontSize: 16 },
  closedSub: { color: PALETTE.muted, fontFamily: FONTS.med, fontSize: 13 },
});
