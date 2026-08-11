// @ts-nocheck
/**
 * /echo/{college}/register — public registration + payment for an ECHO event.
 *
 * Two-column layout on wide screens:
 *   left  — poster image placeholder(s) (single or multiple, from CMS `poster_images`)
 *   right — registration form + payment (fee panel + Razorpay checkout)
 *
 * Everything (fee, currency, posters, payment link) is configured in the
 * superadmin CMS (Registration tab). On submit it registers the user in BOTH
 * the StudentAlumni platform and the event itself.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  ActivityIndicator, Image, Platform, useWindowDimensions, Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter, Redirect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Calendar, MapPin, Clock, Ticket, CreditCard,
  Check, ShieldCheck, Users, ChevronLeft, ChevronRight, ExternalLink,
  ChevronDown,
} from 'lucide-react-native';
import { api, resolveImageUrl } from '@/src/models/services/api';
import { PALETTE, FONTS, TYPO } from '@/src/views/web/portals/student/tokens';
import { GRAD } from '@/src/views/web/portals/student/portalkit';
import { EchoHeader, EchoFooter, ECHO_TOP_PADDING } from '@/src/views/web/components/EchoChrome';
import { CollegeAutocomplete } from '@/src/views/web/components/CollegeAutocomplete';

const YEARS = [
  '1st Year', '2nd Year', '3rd Year', 'Final Year',
];

const BRANCHES = [
  'CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL',
  'AIML', 'CSDS', 'CST', 'AIDS', 'CSE (AI & ML)',
  'EIE', 'Others',
];

/* ── Dark-glass dropdown matching the register form's inputs ────────────── */
function FieldSelect({ label, value, options, onChange, placeholder = 'Select…', zIndex = 20 }: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
  zIndex?: number;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <View ref={wrapRef} style={{ position: 'relative', zIndex: open ? zIndex : 1 }}>
      <Text style={s.label}>{label}</Text>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={[s.input, s.selectTrigger, open && s.selectTriggerOpen]}
      >
        <Text style={value ? s.selectValue : s.selectPlaceholder}>{value || placeholder}</Text>
        <ChevronDown size={15} color={PALETTE.muted} />
      </Pressable>
      {open && (
        <View style={[s.selectMenu, { zIndex }]}>
          {options.map((opt) => {
            const active = opt === value;
            return (
              <Pressable
                key={opt}
                onPress={() => { onChange(opt); setOpen(false); }}
                style={[s.selectItem, active && s.selectItemActive]}
              >
                <Text style={[s.selectItemText, active && s.selectItemTextActive]}>{opt}</Text>
                {active ? <Check size={14} color="#A78BFA" /> : null}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

/* ── DD / MM / YYYY date picker emitting ISO YYYY-MM-DD ──────────────────── */
function DobPicker({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const [d, setD] = useState('');
  const [m, setM] = useState('');
  const [y, setY] = useState('');
  const lastEmitted = useRef(value || '');

  const curYear = new Date().getFullYear();

  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value || '';
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [yy, mm, dd] = value.split('-');
      setY(yy); setM(mm); setD(dd);
    } else if (!value) {
      setY(''); setM(''); setD('');
    }
  }, [value]);

  const years = useMemo(() => {
    const arr: string[] = [];
    for (let yr = curYear - 13; yr >= curYear - 60; yr--) arr.push(String(yr));
    return arr;
  }, [curYear]);

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const days = useMemo(() => {
    let max = 31;
    if (m && y) max = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
    return Array.from({ length: max }, (_, i) => String(i + 1).padStart(2, '0'));
  }, [m, y]);

  useEffect(() => {
    const iso = d && m && y ? `${y}-${m}-${d}` : '';
    if (iso !== lastEmitted.current) {
      lastEmitted.current = iso;
      onChange(iso);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, m, y]);

  return (
    <View>
      <Text style={s.label}>Date of Birth</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <FieldSelect label="" value={d} options={days} onChange={setD} placeholder="DD" zIndex={30} />
        </View>
        <View style={{ flex: 1.4 }}>
          <FieldSelect label="" value={m} options={months} onChange={setM} placeholder="Month" zIndex={20} />
        </View>
        <View style={{ flex: 1 }}>
          <FieldSelect label="" value={y} options={years} onChange={setY} placeholder="Year" zIndex={10} />
        </View>
      </View>
    </View>
  );
}

export default function EchoRegisterPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const [showcase, setShowcase] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState<any>(null);

  const [form, setForm] = useState({ full_name: '', email: '', phone: '', dob: '', branch: '', year: '', college: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [posterIdx, setPosterIdx] = useState(0);

  const loadRazorpay = () =>
    new Promise<boolean>((resolve) => {
      if (typeof window === 'undefined') return resolve(false);
      const w = window as any;
      if (w.Razorpay) return resolve(true);
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.async = true;
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });

  const openInvoice = async (invoiceNo?: string) => {
    if (!invoiceNo || typeof window === 'undefined') return;
    try {
      const base = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || '';
      const { tokenStore } = await import('@/src/models/services/api');
      const token = await tokenStore.getAccess();
      const emailParam = form.email ? `?email=${encodeURIComponent(form.email)}` : '';
      const resp = await fetch(`${base}/api/echo/invoices/${invoiceNo}${emailParam}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) throw new Error('Invoice not available');
      const data = await resp.json();
      const w = window.open('', '_blank');
      if (w) {
        w.document.open();
        w.document.write(data.html);
        w.document.close();
        w.focus();
        w.print();
      }
    } catch {
      setError('Could not open the invoice. Check your email for a copy.');
    }
  };

  const openTicket = async (regId?: string) => {
    if (!regId || typeof window === 'undefined') return;
    try {
      const base = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || '';
      const { tokenStore } = await import('@/src/models/services/api');
      const token = await tokenStore.getAccess();
      const emailParam = form.email ? `?email=${encodeURIComponent(form.email)}` : '';
      const resp = await fetch(`${base}/api/echo/tickets/${regId}${emailParam}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) throw new Error('Ticket not available');
      const data = await resp.json();
      const w = window.open('', '_blank');
      if (w) {
        w.document.open();
        w.document.write(data.html);
        w.document.close();
        w.focus();
        w.print();
      }
    } catch {
      setError('Could not open the ticket. Check your email for a copy.');
    }
  };

  const shareTicket = async (regId?: string) => {
    if (!regId || typeof window === 'undefined') return;
    const base = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || '';
    const url = `${base}/api/echo/tickets/${regId}`;
    const text = `My entry pass for ${showcase?.title || 'the event'}: ${url}`;
    try {
      const nav = (navigator as any);
      if (nav.share) {
        await nav.share({ title: `Entry Pass — ${showcase?.title || 'Event'}`, text, url });
        return;
      }
    } catch { /* user cancelled share sheet — fall through to copy */ }
    try {
      await navigator.clipboard.writeText(url);
      setError('Ticket link copied to clipboard — share it anywhere!');
    } catch {
      setError('Could not share the ticket. Long-press the link to copy it.');
    }
  };

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
  const isCompleted = showcase?.event_status_badge === 'Completed';
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
    let keepLoading = true;
    try {
      const contact = { ...form, email: form.email.trim().toLowerCase() };
      const regPayload = { ...contact, payment_method: fee > 0 ? 'online' : 'free' };

      // Free event → register directly.
      if (fee <= 0) {
        const res = await api.registerEchoShowcase(canonicalSlug, regPayload);
        setDone(res);
        return;
      }

      // Paid event → create a payment order, then redirect to the gateway.
      const order = await api.createEchoPaymentOrder(canonicalSlug, contact);

      // Already paid → show the existing registration + invoice.
      if (order?.already) {
        setDone(order.registration);
        return;
      }

      const w = window as any;
      if (!w.Razorpay) {
        const ok = await loadRazorpay();
        if (!ok) throw new Error('Payment gateway could not be loaded. Please try again.');
      }

      const checkout = new w.Razorpay({
        key: order.key_id,
        order_id: order.order_id,
        name: 'Student Alumni',
        description: `ECHO registration — ${showcase.title}`,
        amount: Math.round(order.amount * 100),
        currency: order.currency,
        prefill: { name: form.full_name, email: form.email, contact: form.phone || '' },
        theme: { color: '#7C3AED' },
        handler: async (res: any) => {
          try {
            const verified = await api.verifyEchoPayment(canonicalSlug, {
              ...contact,
              razorpay_payment_id: res.razorpay_payment_id,
              razorpay_order_id: res.razorpay_order_id,
              razorpay_signature: res.razorpay_signature,
            });
            setDone(verified.registration || verified);
          } catch (err: any) {
            setError(err?.message || 'Payment verification failed. Please contact support.');
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => setSubmitting(false),
        },
      });
      checkout.open();
      keepLoading = false; // keep button loading until the checkout modal closes
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      if (keepLoading) setSubmitting(false);
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

  // Success screen with QR + payment confirmation. Only shows for a
  // CONFIRMED registration (paid or free both carry payment.status "paid");
  // a `pending` payment means money wasn't captured, so keep the form up
  // and let the user resume payment.
  const confirmedReg =
    (done?.payment?.status === 'paid') || (existing?.payment?.status === 'paid');
  if (confirmedReg) {
    const reg = done || existing;
    const payment = reg.payment || {};
    const invoiceNo = reg.invoice?.invoice_no || done?.invoice?.invoice_no;
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

        <Pressable onPress={() => router.push(`/echo/${canonicalSlug}/coupons`)} style={[s.invBtn, { borderColor: 'rgba(167,139,250,0.3)' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <Ticket size={14} color="#A78BFA" />
            <Text style={[s.invBtnText, { color: '#C4B5FD' }]}>View My Coupons</Text>
          </View>
        </Pressable>

        {invoiceNo ? (
          <Pressable onPress={() => openInvoice(invoiceNo)} style={s.invBtn}>
            <Text style={s.invBtnText}>Download Invoice</Text>
          </Pressable>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
          <Pressable onPress={() => openTicket(reg.id)} style={[s.doneBtn, { flex: 1 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              <Ticket size={16} color="#fff" />
              <Text style={s.doneBtnText}>Download Ticket</Text>
            </View>
          </Pressable>
          <Pressable onPress={() => shareTicket(reg.id)} style={[s.invBtn, { flex: 1, marginBottom: 0 }]}>
            <Text style={s.invBtnText}>Share Ticket</Text>
          </Pressable>
        </View>
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
              <Image source={{ uri: resolveImageUrl(activePoster) }} style={s.poster} resizeMode="cover" />
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
          {!isOpen || isCompleted ? (
            <View style={s.closedCard}>
              <Text style={s.closedTitle}>{isCompleted ? 'This event has ended' : 'Registrations are closed'}</Text>
              <Text style={s.closedSub}>
                {isCompleted
                  ? 'This event is complete and no longer accepting registrations.'
                  : 'This event is no longer accepting registrations.'}
              </Text>
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
                    <View style={s.secureBadge}><ShieldCheck size={12} color="#34D399" /><Text style={s.secureText}>Secure payment</Text></View>
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

                <View style={{ marginBottom: 8 }}>
                  <DobPicker value={form.dob} onChange={(iso) => set('dob', iso)} />
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <FieldSelect label="Branch" value={form.branch} options={BRANCHES} onChange={(v) => set('branch', v)} placeholder="Select branch" zIndex={30} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FieldSelect label="Year" value={form.year} options={YEARS} onChange={(v) => set('year', v)} placeholder="Select year" zIndex={20} />
                  </View>
                </View>

                <Text style={s.label}>College</Text>
                <CollegeAutocomplete
                  value={form.college}
                  onChangeText={(v) => set('college', v)}
                  placeholder={showcase.college || 'Search your college…'}
                />

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
                              {fee > 0 ? `Pay ${currency} ${fee} via Razorpay` : 'Register Free'}
                            </Text>
                          </>
                        )}
                      </Pressable>
                    </LinearGradient>
                    <Text style={s.disclaimer}>
                      By registering you agree to receive event updates. Payment is processed securely via Razorpay.
                    </Text>
                  </>
                )}
                <View style={s.accountNote}>
                  <ShieldCheck size={13} color="#A78BFA" />
                  <Text style={s.accountNoteText}>
                    A <Text style={{ color: '#C4B5FD', fontFamily: FONTS.semi }}>free Student Alumni account</Text> will be
                    created with this email — your login credentials will be emailed to you so you can
                    view your tickets anytime under <Text style={{ color: '#C4B5FD', fontFamily: FONTS.semi }}>My Tickets</Text>.
                  </Text>
                </View>
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
  selectTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  selectTriggerOpen: { borderColor: GRAD.from },
  selectValue: { color: '#fff', fontFamily: FONTS.med, fontSize: 14 },
  selectPlaceholder: { color: PALETTE.dim, fontFamily: FONTS.med, fontSize: 14 },
  selectMenu: {
    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6,
    backgroundColor: '#1c2340', borderColor: 'rgba(167,139,250,0.45)', borderWidth: 1,
    borderRadius: 10, overflow: 'hidden', maxHeight: 220,
    ...(Platform.OS === 'web' ? ({
      boxShadow: '0 18px 50px rgba(0,0,0,0.65), 0 0 0 1px rgba(124,58,237,0.15)',
    } as any) : {}),
  },
  selectItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 11, backgroundColor: 'transparent',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  selectItemActive: { backgroundColor: 'rgba(124,58,237,0.16)' },
  selectItemText: { color: 'rgba(255,255,255,0.85)', fontFamily: FONTS.med, fontSize: 13.5 },
  selectItemTextActive: { color: '#C4B5FD', fontFamily: FONTS.semi },
  error: { color: '#F87171', fontFamily: FONTS.med, fontSize: 12.5, marginTop: 6 },
  payBtnWrap: { borderRadius: 12, marginTop: 18, overflow: 'hidden' },
  payBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 15,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  payBtnText: { color: '#fff', fontFamily: TYPO.display700, fontSize: 15 },
  disclaimer: { color: PALETTE.dim, fontFamily: FONTS.med, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 10 },
  accountNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 12,
    backgroundColor: 'rgba(124,58,237,0.10)', borderColor: 'rgba(167,139,250,0.25)',
    borderWidth: 1, borderRadius: 10, padding: 12,
  },
  accountNoteText: { color: PALETTE.muted, fontFamily: FONTS.med, fontSize: 11, lineHeight: 16, flex: 1 },

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

  invBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, paddingVertical: 13, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(52,211,153,0.4)', marginBottom: 14,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  invBtnText: { color: '#34D399', fontFamily: TYPO.display700, fontSize: 13.5 },

  closedCard: {
    backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)', padding: 20, gap: 6,
  },
  closedTitle: { color: '#FCD34D', fontFamily: TYPO.display700, fontSize: 16 },
  closedSub: { color: PALETTE.muted, fontFamily: FONTS.med, fontSize: 13 },
});
