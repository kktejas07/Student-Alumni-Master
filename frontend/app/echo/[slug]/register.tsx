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
  ActivityIndicator, Image, Platform, useWindowDimensions, Linking, Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter, Redirect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Calendar, MapPin, Clock, Ticket, CreditCard,
  Check, ShieldCheck, Users, ChevronLeft, ChevronRight, ExternalLink,
  ChevronDown, FileText, Share2, Link2, X, MessageCircle, Send,
} from 'lucide-react-native';
import { api, resolveImageUrl } from '@/src/models/services/api';
import { PALETTE, FONTS, TYPO } from '@/src/views/web/portals/student/tokens';
import { GRAD } from '@/src/views/web/portals/student/portalkit';
import { EchoHeader, EchoFooter, ECHO_TOP_PADDING } from '@/src/views/web/components/EchoChrome';
import { CollegeAutocomplete } from '@/src/views/web/components/CollegeAutocomplete';
import { CalendarDatePicker } from '@/src/views/web/components/CalendarDatePicker';
import { DarkDropdown } from '@/src/views/web/components/DarkDropdown';
import { ImportantRegistrationInfo } from '@/src/views/web/components/ImportantRegistrationInfo';
import { BTECH_BRANCHES, BTECH_YEAR_OPTIONS } from '@/src/constants/branches';

const YEARS = [
  '1st Year', '2nd Year', '3rd Year', 'Final Year',
];

const BRANCHES = [
  'CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL',
  'AIML', 'CSDS', 'CST', 'AIDS', 'CSE (AI & ML)',
  'EIE', 'Others',
];

export const HACKWAVE_THEME_OPTIONS = [
  { value: 'AI That Solves a Real Problem', label: 'AI That Solves a Real Problem' },
  { value: 'Beyond the Chatbot', label: 'Beyond the Chatbot' },
  { value: 'AI for Builders', label: 'AI for Builders' },
  { value: 'Autonomous AI Workflows', label: 'Autonomous AI Workflows' },
  { value: 'Build the Unexpected', label: 'Build the Unexpected' },
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
    let timerId: any = null;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) {
      timerId = setTimeout(() => {
        document.addEventListener('mousedown', handler);
      }, 0);
    }
    return () => {
      if (timerId) clearTimeout(timerId);
      document.removeEventListener('mousedown', handler);
    };
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
          <ScrollView style={s.selectMenuScroll} nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
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
          </ScrollView>
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
    <View style={{ zIndex: 100, position: 'relative' }}>
      <Text style={s.label}>Date of Birth</Text>
      <View style={{ flexDirection: 'row', gap: 8, zIndex: 100, position: 'relative' }}>
        <View style={{ flex: 1, zIndex: 30, position: 'relative' }}>
          <FieldSelect label="" value={d} options={days} onChange={setD} placeholder="DD" zIndex={30} />
        </View>
        <View style={{ flex: 1.4, zIndex: 20, position: 'relative' }}>
          <FieldSelect label="" value={m} options={months} onChange={setM} placeholder="Month" zIndex={20} />
        </View>
        <View style={{ flex: 1, zIndex: 10, position: 'relative' }}>
          <FieldSelect label="" value={y} options={years} onChange={setY} placeholder="Year" zIndex={10} />
        </View>
      </View>
    </View>
  );
}

/* ── Email validation regex ─────────────────────────────────────────────── */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/* ── Team member type ──────────────────────────────────────────────────── */
interface TeamMember {
  name: string;
  email: string;
  phone: string;
}

export default function EchoRegisterPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const [showcase, setShowcase] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState<any>(null);

  const [form, setForm] = useState({ full_name: '', email: '', phone: '', date_of_birth: '', branch: '', year: '', college: '', hackwave_theme: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [posterIdx, setPosterIdx] = useState(0);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Team registration state
  const [registrationType, setRegistrationType] = useState<'individual' | 'team'>('individual');
  const [teamName, setTeamName] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

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
      const regEmail = done?.email || existing?.email || form.email || '';
      const emailParam = regEmail ? `?email=${encodeURIComponent(regEmail)}` : '';
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
      const regEmail = done?.email || existing?.email || form.email || '';
      const emailParam = regEmail ? `?email=${encodeURIComponent(regEmail)}&format=json` : '?format=json';
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
    setShareModalOpen(true);
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
        if (mounted && reg?.id) {
          setExisting(reg);
        }
      } catch { /* no auth / none */ }
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, [slug]);

  const canonicalSlug: string = showcase?.slug || slug || '';

  const eventDateLabel: string = useMemo(() => {
    const start = (showcase?.date || '').trim();
    const end = (showcase?.end_date || '').trim();
    if (start && end && end !== start) return `${start} – ${end}`;
    return start || end || '';
  }, [showcase?.date, showcase?.end_date]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Team member management (primary registrant is separate, team members are additional)
  const addTeamMember = () => {
    if (teamMembers.length < 4) { // Max 4 additional members + primary = 5 total
      setTeamMembers([...teamMembers, { name: '', email: '', phone: '' }]);
    }
  };

  const removeTeamMember = (index: number) => {
    setTeamMembers(teamMembers.filter((_, i) => i !== index));
  };

  const updateTeamMember = (index: number, field: keyof TeamMember, value: string) => {
    const updated = [...teamMembers];
    updated[index] = { ...updated[index], [field]: value };
    setTeamMembers(updated);
  };

  const validateEmail = (email: string): boolean => {
    return EMAIL_REGEX.test(email.trim().toLowerCase());
  };

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

  // Calculate total fee based on registration type
  const teamSize = registrationType === 'team' ? teamMembers.length : 1;
  const totalFee = fee * teamSize;

  const openPayment = () => {
    if (Platform.OS === 'web') {
      window.open(paymentUrl, '_blank');
    } else {
      Linking.openURL(paymentUrl);
    }
  };

  const onSubmit = async () => {
    const errs: Record<string, string> = {};
    
    // Validate primary registrant
    if (!form.full_name.trim()) errs.full_name = 'Please fill in your name.';
    if (!form.email.trim() || !validateEmail(form.email)) errs.email = 'Please enter a valid email address.';
    if (!form.phone.trim()) {
      errs.phone = 'Phone number is required.';
    } else {
      const digits = form.phone.replace(/[^\d]/g, '');
      if (digits.length < 7 || digits.length > 15) {
        errs.phone = 'Please enter a valid phone number.';
      }
    }
    if (form.date_of_birth) {
      const d = new Date(form.date_of_birth);
      if (isNaN(d.getTime())) {
        errs.date_of_birth = 'Please select a valid date of birth.';
      } else if (d > new Date()) {
        errs.date_of_birth = 'Date of birth cannot be in the future.';
      }
    }

    // Validate team members if team registration
    if (registrationType === 'team') {
      // Validate team name
      if (!teamName.trim()) {
        errs.team_name = 'Team name is required for team registration.';
      } else if (teamName.trim().length < 2) {
        errs.team_name = 'Team name must be at least 2 characters.';
      } else if (teamName.trim().length > 50) {
        errs.team_name = 'Team name must be 50 characters or less.';
      }
      
      teamMembers.forEach((member, idx) => {
        if (!member.name.trim()) errs[`team_member_${idx}_name`] = `Team member ${idx + 1}: Name is required.`;
        if (!member.email.trim() || !validateEmail(member.email)) errs[`team_member_${idx}_email`] = `Team member ${idx + 1}: Valid email is required.`;
        if (!member.phone.trim()) {
          errs[`team_member_${idx}_phone`] = `Team member ${idx + 1}: Phone is required.`;
        } else {
          const digits = member.phone.replace(/[^\d]/g, '');
          if (digits.length < 7 || digits.length > 15) {
            errs[`team_member_${idx}_phone`] = `Team member ${idx + 1}: Valid phone is required.`;
          }
        }
      });
    }

    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setError('Please fix the highlighted errors before submitting.');
      return;
    }

    if (!termsAccepted) {
      setError('Please accept the Terms & Conditions to continue.');
      return;
    }

    setSubmitting(true);
    setError(null);
    let keepLoading = true;
    try {
      const contact = { ...form, email: form.email.trim().toLowerCase() };
      
      // Prepare team members data
      const teamMembersData = registrationType === 'team' 
        ? teamMembers.map(m => ({
            name: m.name.trim(),
            email: m.email.trim().toLowerCase(),
            phone: m.phone.trim(),
          }))
        : [];

      const regPayload = { 
        ...contact, 
        registration_type: registrationType,
        team_name: teamName.trim(),
        team_size: teamSize,
        team_members: teamMembersData,
        payment_method: totalFee > 0 ? 'online' : 'free', 
        terms_accepted: termsAccepted, 
        terms_accepted_at: new Date().toISOString(), 
        whatsapp_opt_in: whatsappOptIn 
      };

      // Free event → register directly.
      if (totalFee <= 0) {
        const res = await api.registerEchoShowcase(canonicalSlug, regPayload);
        const regObj = res.registration || res;
        setDone(regObj);
        return;
      }

      // Paid event → create a payment order, then redirect to the gateway.
      const order = await api.createEchoPaymentOrder(canonicalSlug, { 
        ...contact, 
        registration_type: registrationType,
        team_name: teamName.trim(),
        team_size: teamSize,
        team_members: teamMembersData,
        terms_accepted: termsAccepted, 
        whatsapp_opt_in: whatsappOptIn 
      });

      // Already paid → show the existing registration + invoice.
      if (order?.already) {
        const regObj = order.registration || order;
        setDone(regObj);
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
            const regObj = verified.registration || verified;
            setDone(regObj);
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
    const regDetails = [
      { label: 'Name', value: reg.full_name || reg.name || '—' },
      { label: 'Email', value: reg.email || '—' },
      { label: 'Phone', value: reg.phone || '—' },
      { label: 'Hackwave 3.0 Track', value: reg.hackwave_theme || reg.theme || '—' },
      { label: 'College', value: reg.college || showcase.college || '—' },
      { label: 'Branch', value: reg.branch || '—' },
      { label: 'Year', value: reg.year || '—' },
    ].filter((d) => d.value !== '—');

    return (
      <View style={s.root}>
        {showcase.hero_bg_url ? (
          <>
            <Image source={{ uri: resolveImageUrl(showcase.hero_bg_url) }} style={s.pageBg} resizeMode="cover" />
            <View style={s.pageBgOverlay} />
          </>
        ) : null}
        <EchoHeader current="echo" />
        <ScrollView contentContainerStyle={{ paddingTop: ECHO_TOP_PADDING }}>
        <View style={s.content}>
        <Pressable onPress={() => router.push(`/echo/${canonicalSlug}`)} style={s.backBtn}>
          <ArrowLeft size={14} color="#fff" />
          <Text style={s.backText}>Back to event</Text>
        </Pressable>

        {/* Hero banner at the top */}
        <View style={[s.heroBanner, !isWide && s.heroBannerStack]}>
          {showcase.hero_image_url ? (
            <Image source={{ uri: resolveImageUrl(showcase.hero_image_url) }} style={s.heroBannerImg} resizeMode="cover" />
          ) : null}
          <LinearGradient
            colors={['rgba(10,15,30,0.82)', 'rgba(10,15,30,0.92)']}
            style={s.heroBannerOverlay}
          />
          <View style={s.heroBannerContent}>
            <View style={s.headerBadge}><Check size={12} color="#34D399" /><Text style={[s.headerBadgeText, { color: '#34D399' }]}>REGISTERED</Text></View>
            <Text style={s.headerTitle}>{showcase.title}</Text>
            <Text style={s.headerOrg}>Organized by {showcase.organizer_name || showcase.college || '—'}</Text>
            <View style={s.metaCol}>
              {eventDateLabel ? <View style={s.metaRow}><Calendar size={13} color={PALETTE.muted} /><Text style={s.metaText}>{eventDateLabel}</Text></View> : null}
              {showcase.time ? <View style={s.metaRow}><Clock size={13} color={PALETTE.muted} /><Text style={s.metaText}>{showcase.time}</Text></View> : null}
              {showcase.venue ? <View style={s.metaRow}><MapPin size={13} color={PALETTE.muted} /><Text style={s.metaText}>{showcase.venue}</Text></View> : null}
            </View>
          </View>
        </View>

        <View style={[s.split, !isWide && s.splitStack]}>
          {/* LEFT: POSTER */}
          <View style={[s.posterCol, !isWide && s.posterColStack]}>
            <View style={s.posterWrap}>
              {activePoster ? (
                <Image source={{ uri: resolveImageUrl(activePoster) }} style={s.poster} resizeMode="contain" />
              ) : (
                <LinearGradient colors={['rgba(123,61,191,0.35)', 'rgba(95,37,159,0.55)', 'rgba(30,10,80,0.85)']} style={s.poster}>
                  <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1, gap: 10, padding: 20 }}>
                    <Ticket size={40} color={GRAD.from} />
                    <Text style={{ fontFamily: TYPO.display800, fontSize: 20, color: '#fff', textAlign: 'center' }}>{showcase.title}</Text>
                    <Text style={{ fontFamily: TYPO.body500, fontSize: 12.5, color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>Event poster</Text>
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
            {posters.length > 1 && (
              <View style={s.dots}>
                {posters.map((_, i) => (
                  <Pressable key={i} onPress={() => setPosterIdx(i)} style={[s.dot, i === (posterIdx % posters.length) && s.dotOn]} />
                ))}
              </View>
            )}
          </View>

          {/* RIGHT: CONFIRMATION DETAILS */}
          <View style={[s.formCol, !isWide && s.formColStack]}>
            {/* Success card with emerald tint */}
            <View style={s.successCard}>
              <View style={s.successIconRow}>
                <View style={s.successCheckCircle}>
                  <Check size={20} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.successCardTitle}>You're registered!</Text>
                  <Text style={s.successCardSub}>
                    {payment.status === 'paid' ? `Payment of ${payment.currency || currency} ${payment.amount || fee} received.` : 'Registration confirmed.'}
                  </Text>
                </View>
              </View>
              {payment.payment_id ? (
                <View style={s.payIdBadge}>
                  <ShieldCheck size={12} color="#34D399" />
                  <Text style={s.payIdBadgeText}>Payment ID: {payment.payment_id}</Text>
                </View>
              ) : null}
            </View>

            {/* Pass QR Card */}
            {reg.qr_code_base64 ? (
              <View style={s.formCard}>
                <Text style={[s.cardTitle, { marginBottom: 12 }]}>Your Entry Pass</Text>
                <Text style={s.qrHint}>Show this QR code at the venue entrance to check in.</Text>
                <View style={s.qrWrapper}>
                  <Image
                    source={{ uri: `data:image/png;base64,${reg.qr_code_base64}` }}
                    style={s.qrCodeImg} resizeMode="contain"
                  />
                </View>
                <Text style={s.qrRegId}>Registration ID: {reg.id}</Text>
              </View>
            ) : null}

            {/* Attendee Details Card */}
            {regDetails.length > 0 && (
              <View style={s.formCard}>
                <Text style={[s.cardTitle, { marginBottom: 16 }]}>Attendee Information</Text>
                <View style={s.detailsGrid}>
                  {regDetails.map((d) => (
                    <View key={d.label} style={s.detailsGridRow}>
                      <Text style={s.detailsGridLabel}>{d.label}</Text>
                      <Text style={s.detailsGridValue}>{d.value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Action buttons */}
            <View style={{ gap: 10, marginTop: 8 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable onPress={() => openTicket(reg.id)} style={[s.actionBtn, { flex: 1 }]}>
                  <Ticket size={16} color="#fff" />
                  <Text style={s.actionBtnText}>Print Ticket</Text>
                </Pressable>
                {invoiceNo ? (
                  <Pressable onPress={() => openInvoice(invoiceNo)} style={[s.actionBtn, s.actionBtnOutline, { flex: 1 }]}>
                    <CreditCard size={16} color="#34D399" />
                    <Text style={[s.actionBtnText, { color: '#34D399' }]}>Invoice</Text>
                  </Pressable>
                ) : null}
              </View>

              <Pressable onPress={() => router.push(`/echo/${canonicalSlug}/coupons`)} style={s.couponLinkBtn}>
                <Ticket size={16} color="#C4B5FD" />
                <Text style={s.couponLinkBtnText}>View My Exclusive Coupons</Text>
              </Pressable>

              <Pressable onPress={() => router.push(`/echo/${canonicalSlug}`)} style={s.doneBtn}>
                <Text style={s.doneBtnText}>Back to Event</Text>
              </Pressable>
            </View>

          </View>
        </View>

        </View>
        <EchoFooter />
        </ScrollView>

        {/* Share Modal */}
        {shareModalOpen && (
          <Modal transparent animationType="fade" onRequestClose={() => setShareModalOpen(false)}>
            <Pressable style={s.modalOverlay} onPress={() => setShareModalOpen(false)}>
              <Pressable style={s.modalBox} onPress={(e) => e.stopPropagation()}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>SHARE EVENT</Text>
                  <Pressable onPress={() => setShareModalOpen(false)} style={s.modalCloseBtn}>
                    <Text style={s.modalCloseText}>✕</Text>
                  </Pressable>
                </View>

                <Text style={[s.modalBody, { marginVertical: 8 }]}>
                  Share <Text style={{ color: '#fff', fontFamily: FONTS.semi }}>{showcase?.title || 'SNIST Hackwave 3.0'}</Text> with your friends & teammates:
                </Text>

                <View style={{ gap: 10, marginTop: 8 }}>
                  {/* WhatsApp */}
                  <Pressable
                    onPress={() => {
                      const url = typeof window !== 'undefined' ? window.location.href : 'http://localhost:8081/echo/snist/register';
                      const text = encodeURIComponent(`Register for ${showcase?.title || 'SNIST Hackwave 3.0'} — National Level AI Hackathon!\n\nLink: ${url}`);
                      const waUrl = `https://api.whatsapp.com/send?text=${text}`;
                      if (Platform.OS === 'web' && typeof window !== 'undefined') window.open(waUrl, '_blank');
                      else Linking.openURL(waUrl);
                      setShareModalOpen(false);
                    }}
                    style={[s.shareOptionBtn, { backgroundColor: 'rgba(37,211,102,0.15)', borderColor: 'rgba(37,211,102,0.4)' }]}
                  >
                    <MessageCircle size={18} color="#25D366" />
                    <Text style={[s.shareOptionText, { color: '#25D366' }]}>Share on WhatsApp</Text>
                  </Pressable>

                  {/* Telegram */}
                  <Pressable
                    onPress={() => {
                      const url = typeof window !== 'undefined' ? window.location.href : 'http://localhost:8081/echo/snist/register';
                      const text = encodeURIComponent(`Register for ${showcase?.title || 'SNIST Hackwave 3.0'} — National Level AI Hackathon!`);
                      const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${text}`;
                      if (Platform.OS === 'web' && typeof window !== 'undefined') window.open(tgUrl, '_blank');
                      else Linking.openURL(tgUrl);
                      setShareModalOpen(false);
                    }}
                    style={[s.shareOptionBtn, { backgroundColor: 'rgba(0,136,204,0.15)', borderColor: 'rgba(0,136,204,0.4)' }]}
                  >
                    <Send size={18} color="#38BDF8" />
                    <Text style={[s.shareOptionText, { color: '#38BDF8' }]}>Share on Telegram</Text>
                  </Pressable>

                  {/* Copy Link */}
                  <Pressable
                    onPress={() => {
                      const url = typeof window !== 'undefined' ? window.location.href : 'http://localhost:8081/echo/snist/register';
                      if (typeof window !== 'undefined' && navigator.clipboard) {
                        navigator.clipboard.writeText(url);
                        setError('Registration page link copied to clipboard!');
                      }
                      setShareModalOpen(false);
                    }}
                    style={[s.shareOptionBtn, { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)' }]}
                  >
                    <Link2 size={16} color="#A78BFA" />
                    <Text style={[s.shareOptionText, { color: '#fff' }]}>Copy Registration Link</Text>
                  </Pressable>
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        )}
      </View>
    );
  }

  return (
    <View style={s.root}>
      {showcase.hero_bg_url ? (
        <>
          <Image source={{ uri: resolveImageUrl(showcase.hero_bg_url) }} style={s.pageBg} resizeMode="cover" />
          <View style={s.pageBgOverlay} />
        </>
      ) : null}
      <EchoHeader current="echo" />
      <ScrollView contentContainerStyle={{ paddingTop: ECHO_TOP_PADDING }}>
      <View style={s.content}>
      <Pressable onPress={() => router.push(`/echo/${canonicalSlug}`)} style={s.backBtn}>
        <ArrowLeft size={14} color="#fff" />
        <Text style={s.backText}>Back to event</Text>
      </Pressable>

      <View style={[s.heroBanner, !isWide && s.heroBannerStack]}>
        {showcase.hero_image_url ? (
          <Image source={{ uri: resolveImageUrl(showcase.hero_image_url) }} style={s.heroBannerImg} resizeMode="cover" />
        ) : null}
        <LinearGradient
          colors={['rgba(10,15,30,0.82)', 'rgba(10,15,30,0.92)']}
          style={s.heroBannerOverlay}
        />
        <View style={s.heroBannerContent}>
          <View style={s.headerBadge}><Ticket size={14} color="#C4B5FD" /><Text style={s.headerBadgeText}>REGISTER</Text></View>
          <Text style={s.headerTitle}>{showcase.title}</Text>
          <Text style={s.headerOrg}>Organized by {showcase.organizer_name || showcase.college || '—'}</Text>
          <View style={s.metaCol}>
            {eventDateLabel ? <View style={s.metaRow}><Calendar size={13} color={PALETTE.muted} /><Text style={s.metaText}>{eventDateLabel}</Text></View> : null}
            {showcase.time ? <View style={s.metaRow}><Clock size={13} color={PALETTE.muted} /><Text style={s.metaText}>{showcase.time}</Text></View> : null}
            {showcase.venue ? <View style={s.metaRow}><MapPin size={13} color={PALETTE.muted} /><Text style={s.metaText}>{showcase.venue}</Text></View> : null}
          </View>
        </View>
      </View>

      <View style={[s.split, !isWide && s.splitStack]}>
        {/* ── LEFT: POSTER PLACEHOLDER(S) ─────────────────────────────── */}
        <View style={[s.posterCol, !isWide && s.posterColStack]}>
          <View style={s.posterWrap}>
            {activePoster ? (
              <Image source={{ uri: resolveImageUrl(activePoster) }} style={s.poster} resizeMode="contain" />
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
            <ScrollView 
              style={{ flex: 1 }} 
              contentContainerStyle={{ gap: 12, paddingBottom: 20 }} 
              showsVerticalScrollIndicator={true}
              indicatorStyle="white"
            >
              {/* Registration Type Toggle */}
              <View style={s.feeCard}>
                <Text style={[s.cardTitle, { marginBottom: 12 }]}>Registration Type</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable
                    onPress={() => { setRegistrationType('individual'); setTeamMembers([{ name: form.full_name, email: form.email, phone: form.phone }]); }}
                    style={[s.typeToggle, registrationType === 'individual' && s.typeToggleActive]}
                  >
                    <Text style={[s.typeToggleText, registrationType === 'individual' && s.typeToggleTextActive]}>
                      Individual
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setRegistrationType('team')}
                    style={[s.typeToggle, registrationType === 'team' && s.typeToggleActive]}
                  >
                    <Text style={[s.typeToggleText, registrationType === 'team' && s.typeToggleTextActive]}>
                      Team (up to 5)
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Fee panel */}
              <View style={s.feeCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={s.feeIcon}><CreditCard size={18} color={GRAD.from} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.feeLabel}>Registration Fee</Text>
                    {registrationType === 'team' && fee > 0 ? (
                      // Team fee breakdown
                      <View style={{ marginTop: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={[s.feeValue, { fontSize: 16 }]}>{currency} {fee}</Text>
                          <Text style={{ color: PALETTE.muted, fontFamily: FONTS.med, fontSize: 12 }}>per person</Text>
                        </View>
                        <View style={{ 
                          flexDirection: 'row', alignItems: 'center', gap: 6, 
                          marginTop: 8, paddingVertical: 8, paddingHorizontal: 12,
                          backgroundColor: 'rgba(124,58,237,0.12)', borderRadius: 8,
                          borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)',
                        }}>
                          <Users size={14} color="#C4B5FD" />
                          <Text style={{ color: '#C4B5FD', fontFamily: FONTS.semi, fontSize: 12 }}>
                            {teamSize} team member{teamSize > 1 ? 's' : ''}
                          </Text>
                          <Text style={{ color: PALETTE.muted, fontFamily: FONTS.med, fontSize: 12 }}>&#215;</Text>
                          <Text style={{ color: '#C4B5FD', fontFamily: FONTS.semi, fontSize: 12 }}>
                            {currency} {fee}
                          </Text>
                          <Text style={{ color: PALETTE.muted, fontFamily: FONTS.med, fontSize: 12 }}>=</Text>
                          <Text style={{ color: '#fff', fontFamily: TYPO.display800, fontSize: 16, marginLeft: 4 }}>
                            {currency} {totalFee}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      // Individual fee
                      <Text style={s.feeValue}>{fee > 0 ? `${currency} ${fee}` : 'FREE'}</Text>
                    )}
                    {regCfg.registration_type ? (
                      <Text style={[s.feeLabel, { marginTop: 6, textTransform: 'none', letterSpacing: 0 }]}>
                        {regCfg.registration_type === 'team' ? 'Team Registration' : 'Individual Registration'}
                      </Text>
                    ) : null}
                  </View>
                  {paymentUrl ? (
                    <View style={s.secureBadge}><ExternalLink size={12} color="#34D399" /><Text style={s.secureText}>Secure payment</Text></View>
                  ) : fee > 0 ? (
                    <View style={s.secureBadge}><ShieldCheck size={12} color="#34D399" /><Text style={s.secureText}>Secure payment</Text></View>
                  ) : null}
                </View>
                {regCfg.max_seats ? (() => {
                  const maxSeats = Number(regCfg.max_seats) || 0;
                  const paidCount = Number(regCfg.paid_count) || 0;
                  const totalCount = Number(regCfg.total_registrations) || 0;
                  const leverage = Number(regCfg.seat_leverage) || 0.8;
                  const isPaidEvent = fee > 0;
                  const consumed = isPaidEvent
                    ? Math.ceil(paidCount * leverage)
                    : Math.ceil(totalCount * leverage);
                  const remaining = Math.max(0, maxSeats - consumed);
                  return (
                    <View style={s.seatsRow}>
                      <Users size={12} color={PALETTE.muted} />
                      <Text style={s.seatsText}>{remaining} seats available</Text>
                    </View>
                  );
                })() : null}
                {regCfg.payment_note ? <Text style={s.note}>{regCfg.payment_note}</Text> : null}
              </View>

              {/* Handbook Download & Share Action Bar */}
              <View style={s.handbookBar}>
                <Pressable
                  onPress={() => {
                    const base = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8002';
                    if (Platform.OS === 'web') {
                      window.open(`${base}/api/echo/handbook/download`, '_blank');
                    } else {
                      Linking.openURL(`${base}/api/echo/handbook/download`);
                    }
                  }}
                  style={s.handbookBtn}
                >
                  <FileText size={15} color="#C4B5FD" />
                  <Text style={s.handbookBtnText}>Download Event Handbook (PDF)</Text>
                </Pressable>

                <Pressable onPress={() => shareTicket(showcase?.id || canonicalSlug)} style={s.shareBtnInline}>
                  <Share2 size={15} color="#34D399" />
                  <Text style={s.shareBtnInlineText}>Share Event</Text>
                </Pressable>
              </View>

              {/* Form */}
              <View style={s.formCard}>
                <Text style={s.cardTitle}>Registration Details</Text>

                <Text style={s.label}>Full Name *</Text>
                <TextInput style={[s.input, fieldErrors.full_name ? s.inputError : null]} value={form.full_name} onChangeText={(v) => set('full_name', v)} placeholder="Your full name" placeholderTextColor={PALETTE.dim} />
                {fieldErrors.full_name ? <Text style={s.fieldErrText}>{fieldErrors.full_name}</Text> : null}

                <Text style={s.label}>Email *</Text>
                <TextInput style={[s.input, fieldErrors.email ? s.inputError : null]} value={form.email} onChangeText={(v) => set('email', v)} placeholder="you@example.com" placeholderTextColor={PALETTE.dim} keyboardType="email-address" autoCapitalize="none" />
                {fieldErrors.email ? <Text style={s.fieldErrText}>{fieldErrors.email}</Text> : null}

                <Text style={s.label}>Phone Number *</Text>
                <TextInput style={[s.input, fieldErrors.phone ? s.inputError : null]} value={form.phone} onChangeText={(v) => set('phone', v)} placeholder="+91 …" placeholderTextColor={PALETTE.dim} keyboardType="phone-pad" />
                {fieldErrors.phone ? <Text style={s.fieldErrText}>{fieldErrors.phone}</Text> : null}

                <CalendarDatePicker
                  label="Date of Birth"
                  value={form.date_of_birth}
                  onChange={(iso) => set('date_of_birth', iso)}
                  placeholder="YYYY-MM-DD"
                  error={fieldErrors.date_of_birth}
                />

                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                  <DarkDropdown
                    label="Branch"
                    value={form.branch}
                    options={BTECH_BRANCHES}
                    onChange={(v) => set('branch', v)}
                    placeholder="Select your B.Tech branch"
                    error={fieldErrors.branch}
                    modalTitle="SELECT B.TECH BRANCH"
                  />
                  <DarkDropdown
                    label="Current B.Tech Year"
                    value={form.year}
                    options={BTECH_YEAR_OPTIONS}
                    onChange={(v) => set('year', v)}
                    placeholder="Select your current year"
                    error={fieldErrors.year}
                    modalTitle="SELECT CURRENT YEAR"
                  />
                </View>

                <View style={{ zIndex: 35, position: 'relative', marginTop: 4 }}>
                  <DarkDropdown
                    label="Hackwave 3.0 Track / Theme (Optional — can update on event day)"
                    value={form.hackwave_theme}
                    options={HACKWAVE_THEME_OPTIONS}
                    onChange={(v) => set('hackwave_theme', v)}
                    placeholder="Select theme (Optional — can choose on event day)"
                    error={fieldErrors.hackwave_theme}
                    modalTitle="SELECT HACKWAVE 3.0 THEME"
                  />
                </View>

                <View style={{ zIndex: 30, position: 'relative' }}>
                  <Text style={s.label}>College</Text>
                  <CollegeAutocomplete
                    value={form.college}
                    onChangeText={(v) => set('college', v)}
                    placeholder={showcase.college || 'Search your college…'}
                  />
                </View>

                {/* Team Members Section */}
                {registrationType === 'team' && (
                  <View style={s.teamSection}>
                    <View style={s.teamHeader}>
                      <Text style={s.teamTitle}>Team Registration</Text>
                      <Text style={s.teamCount}>{1 + teamMembers.length}/5 members</Text>
                    </View>
                    
                    {/* Team Name Input */}
                    <View style={{ marginBottom: 16 }}>
                      <Text style={s.teamMemberSublabel}>Team Name * (unique for this event)</Text>
                      <TextInput 
                        style={[s.input, fieldErrors.team_name ? s.inputError : null]} 
                        value={teamName} 
                        onChangeText={setTeamName} 
                        placeholder="e.g., Code Warriors, AI Innovators" 
                        placeholderTextColor={PALETTE.dim}
                        maxLength={50}
                      />
                      {fieldErrors.team_name ? <Text style={s.fieldErrText}>{fieldErrors.team_name}</Text> : null}
                      <Text style={{ color: PALETTE.dim, fontFamily: FONTS.med, fontSize: 11, marginTop: 4 }}>
                        2-50 characters. Must be unique for this event.
                      </Text>
                    </View>
                    
                    {/* Primary Registrant (You) */}
                    <View style={s.teamMemberCard}>
                      <View style={s.teamMemberHeader}>
                        <Text style={s.teamMemberLabel}>Member 1 (You)</Text>
                      </View>
                      <View style={{ gap: 8 }}>
                        <View>
                          <Text style={s.teamMemberSublabel}>Name</Text>
                          <Text style={{ color: '#fff', fontFamily: FONTS.med, fontSize: 13 }}>{form.full_name || '—'}</Text>
                        </View>
                        <View>
                          <Text style={s.teamMemberSublabel}>Email</Text>
                          <Text style={{ color: '#fff', fontFamily: FONTS.med, fontSize: 13 }}>{form.email || '—'}</Text>
                        </View>
                        <View>
                          <Text style={s.teamMemberSublabel}>Phone</Text>
                          <Text style={{ color: '#fff', fontFamily: FONTS.med, fontSize: 13 }}>{form.phone || '—'}</Text>
                        </View>
                      </View>
                    </View>
                    
                    {/* Additional Team Members */}
                    {teamMembers.length > 0 && (
                      <Text style={[s.teamMemberSublabel, { marginBottom: 8, marginTop: 8, textTransform: 'none', letterSpacing: 0 }]}>Additional Team Members</Text>
                    )}
                    {teamMembers.map((member, idx) => (
                      <View key={idx} style={s.teamMemberCard}>
                        <View style={s.teamMemberHeader}>
                          <Text style={s.teamMemberLabel}>Member {idx + 2}</Text>
                          <Pressable onPress={() => removeTeamMember(idx)} style={s.removeMemberBtn}>
                            <Text style={s.removeMemberText}>Remove</Text>
                          </Pressable>
                        </View>
                        
                        <Text style={s.teamMemberSublabel}>Name *</Text>
                        <TextInput 
                          style={[s.input, fieldErrors[`team_member_${idx}_name`] ? s.inputError : null]} 
                          value={member.name} 
                          onChangeText={(v) => updateTeamMember(idx, 'name', v)} 
                          placeholder={`Member ${idx + 2} name`} 
                          placeholderTextColor={PALETTE.dim} 
                        />
                        {fieldErrors[`team_member_${idx}_name`] ? <Text style={s.fieldErrText}>{fieldErrors[`team_member_${idx}_name`]}</Text> : null}
                        
                        <Text style={s.teamMemberSublabel}>Email *</Text>
                        <TextInput 
                          style={[s.input, fieldErrors[`team_member_${idx}_email`] ? s.inputError : null]} 
                          value={member.email} 
                          onChangeText={(v) => updateTeamMember(idx, 'email', v)} 
                          placeholder={`member${idx + 2}@example.com`} 
                          placeholderTextColor={PALETTE.dim} 
                          keyboardType="email-address" 
                          autoCapitalize="none" 
                        />
                        {fieldErrors[`team_member_${idx}_email`] ? <Text style={s.fieldErrText}>{fieldErrors[`team_member_${idx}_email`]}</Text> : null}
                        
                        <Text style={s.teamMemberSublabel}>Phone *</Text>
                        <TextInput 
                          style={[s.input, fieldErrors[`team_member_${idx}_phone`] ? s.inputError : null]} 
                          value={member.phone} 
                          onChangeText={(v) => updateTeamMember(idx, 'phone', v)} 
                          placeholder={`+91 ...`} 
                          placeholderTextColor={PALETTE.dim} 
                          keyboardType="phone-pad" 
                        />
                        {fieldErrors[`team_member_${idx}_phone`] ? <Text style={s.fieldErrText}>{fieldErrors[`team_member_${idx}_phone`]}</Text> : null}
                      </View>
                    ))}
                    
                    {teamMembers.length < 4 && (
                      <Pressable onPress={addTeamMember} style={s.addMemberBtn}>
                        <Text style={s.addMemberText}>+ Add Team Member</Text>
                      </Pressable>
                    )}
                  </View>
                )}

                {error ? <Text style={s.error}>{error}</Text> : null}

                {/* Terms & Conditions checkbox */}
                <View style={s.termsRow}>
                  <Pressable
                    onPress={() => setTermsAccepted((v) => !v)}
                    style={[s.checkbox, termsAccepted && s.checkboxChecked]}
                  >
                    {termsAccepted ? <Check size={13} color="#fff" /> : null}
                  </Pressable>
                  <Text style={s.termsText}>
                    I have read and agree to the{' '}
                    <Text
                      style={s.termsLink}
                      onPress={() => setTermsModalVisible(true)}
                    >
                      Terms &amp; Conditions
                    </Text>
                  </Text>
                </View>
                {!termsAccepted && (
                  <Text style={s.termsHint}>Please accept the Terms &amp; Conditions to continue.</Text>
                )}

                {/* WhatsApp opt-in checkbox */}
                <View style={s.termsRow}>
                  <Pressable
                    onPress={() => setWhatsappOptIn((v) => !v)}
                    style={[s.checkbox, whatsappOptIn && s.checkboxChecked]}
                  >
                    {whatsappOptIn ? <Check size={13} color="#fff" /> : null}
                  </Pressable>
                  <Text style={s.termsText}>
                    Send my entry passes, invoices &amp; coupons via WhatsApp
                  </Text>
                </View>

                {paymentUrl ? (
                  <>
                    <View style={[s.payBtnWrap, !termsAccepted && s.payBtnDisabledWrap]}>
                      <LinearGradient colors={!termsAccepted ? ['#374151', '#374151'] : ['#059669', '#047857']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.payBtnWrap}>
                        <Pressable onPress={termsAccepted ? openPayment : undefined} disabled={!termsAccepted} style={[s.payBtn, !termsAccepted && s.payBtnDisabled]}>
                          <ExternalLink size={16} color={termsAccepted ? '#fff' : 'rgba(255,255,255,0.4)'} />
                          <Text style={[s.payBtnText, !termsAccepted && s.payBtnTextDisabled]}>
                            {totalFee > 0 ? `Pay ${currency} ${totalFee}` : 'Proceed'} — Payment Gateway
                          </Text>
                        </Pressable>
                      </LinearGradient>
                    </View>
                    <Text style={s.disclaimer}>
                      You'll be redirected to the secure payment gateway to complete payment. Registration is confirmed after payment.
                    </Text>
                  </>
                ) : (
                  <>
                    <LinearGradient colors={!termsAccepted ? ['#374151', '#374151'] : [GRAD.from, GRAD.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.payBtnWrap}>
                      <Pressable onPress={termsAccepted ? onSubmit : undefined} disabled={!termsAccepted || submitting} style={[s.payBtn, (!termsAccepted) && s.payBtnDisabled]}>
                        {submitting ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <>
                            <CreditCard size={16} color={termsAccepted ? '#fff' : 'rgba(255,255,255,0.4)'} />
                            <Text style={[s.payBtnText, !termsAccepted && s.payBtnTextDisabled]}>
                              {totalFee > 0 ? `Pay ${currency} ${totalFee} via Razorpay` : 'Register Free'}
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

                {/* Terms & Conditions Modal */}
                <Modal
                  visible={termsModalVisible}
                  transparent={true}
                  animationType="slide"
                  onRequestClose={() => setTermsModalVisible(false)}
                >
                  <View style={s.modalOverlay}>
                    <View style={s.modalBox}>
                      <View style={s.modalHeader}>
                        <Text style={s.modalTitle}>Terms &amp; Conditions</Text>
                        <Pressable onPress={() => setTermsModalVisible(false)} style={s.modalCloseBtn}>
                          <Text style={s.modalCloseText}>✕</Text>
                        </Pressable>
                      </View>
                      <ScrollView style={s.modalScroll} showsVerticalScrollIndicator={true}>
                        <Text style={s.modalHeading}>Hackathon Registration – Terms &amp; Conditions</Text>
                        <Text style={s.modalBody}>
                          By registering for the hackathon, I acknowledge that I have read, understood, and agree to comply with the following Terms &amp; Conditions:
                        </Text>

                        <Text style={s.modalSection}>1. Registration</Text>
                        <Text style={s.modalBullet}>• Registration must be completed before the stated deadline.</Text>
                        <Text style={s.modalBullet}>• Each participant/team may register only once unless otherwise permitted by the organizers.</Text>
                        <Text style={s.modalBullet}>• Participants are responsible for providing accurate and complete information.</Text>
                        <Text style={s.modalBullet}>• A valid phone number is mandatory for registration. Participants must provide an active phone number that can be used for hackathon-related communication.</Text>
                        <Text style={s.modalBullet}>• Participants are responsible for ensuring that the phone number provided during registration is accurate and accessible.</Text>
                        <Text style={s.modalBullet}>• Team size must comply with the event rules specified by the organizers.</Text>

                        <Text style={s.modalSection}>2. Participation</Text>
                        <Text style={s.modalBullet}>• Participants must follow all hackathon rules, guidelines, schedules, and instructions provided by the organizers.</Text>
                        <Text style={s.modalBullet}>• Participants must behave respectfully toward other participants, mentors, judges, volunteers, and organizers.</Text>
                        <Text style={s.modalBullet}>• Harassment, abusive behavior, cheating, or disruptive conduct may result in removal from the event.</Text>

                        <Text style={s.modalSection}>3. Project Development and Submission</Text>
                        <Text style={s.modalBullet}>• Projects must be created within the specified hackathon period, unless the event rules explicitly state otherwise.</Text>
                        <Text style={s.modalBullet}>• Participants must submit their project before the specified submission deadline.</Text>
                        <Text style={s.modalBullet}>• Participants are responsible for ensuring that their submission is complete and accessible to the judges.</Text>

                        <Text style={s.modalSection}>4. Originality and Plagiarism</Text>
                        <Text style={s.modalBullet}>• Participants must submit original work or have appropriate rights and permissions for any third-party resources used in their project.</Text>
                        <Text style={s.modalBullet}>• Plagiarism, fraudulent submissions, unauthorized copying, or misrepresentation of another person's work may result in immediate disqualification.</Text>
                        <Text style={s.modalBullet}>• Organizers reserve the right to verify the originality and eligibility of submitted projects.</Text>

                        <Text style={s.modalSection}>5. Disqualification</Text>
                        <Text style={s.modalBody}>
                          The organizers reserve the right to disqualify a participant or team if they violate the hackathon rules, these Terms &amp; Conditions, or engage in fraudulent, inappropriate, or disruptive conduct.
                        </Text>

                        <Text style={s.modalSection}>6. Acceptance</Text>
                        <Text style={s.modalBody}>By selecting the acceptance checkbox during registration, I confirm that:</Text>
                        <Text style={s.modalBullet}>• I have read and understood these Hackathon Terms &amp; Conditions.</Text>
                        <Text style={s.modalBullet}>• I agree to comply with these Terms &amp; Conditions and the applicable hackathon rules.</Text>
                        <Text style={s.modalBullet}>• I have provided accurate and complete registration information, including my phone number.</Text>
                        <Text style={s.modalBullet}>• I understand that acceptance of these Terms &amp; Conditions is mandatory to proceed with payment and complete my registration.</Text>

                        <View style={{ height: 24 }} />
                      </ScrollView>
                      <Pressable onPress={() => setTermsModalVisible(false)} style={s.modalDoneBtn}>
                        <Text style={s.modalDoneBtnText}>Close</Text>
                      </Pressable>
                    </View>
                  </View>
                </Modal>
                <ImportantRegistrationInfo phones={(showcase?.registration?.contact_phones || []).filter((p: string) => p.trim())} />
                <View style={s.accountNote}>
                  <ShieldCheck size={13} color="#A78BFA" />
                  <Text style={s.accountNoteText}>
                    A <Text style={{ color: '#C4B5FD', fontFamily: FONTS.semi }}>free Student Alumni account</Text> will be
                    created with this email — your login credentials will be emailed to you so you can
                    view your tickets anytime under <Text style={{ color: '#C4B5FD', fontFamily: FONTS.semi }}>My Tickets</Text>.
                  </Text>
                </View>
            </ScrollView>
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
  contentScrollView: {
    flex: 1,
    ...(Platform.OS === 'web' ? {
      overflowY: 'auto' as any,
      scrollbarWidth: 'thin' as any,
      scrollbarColor: 'rgba(167,139,250,0.3) transparent' as any,
    } : {}),
  },
  pageBg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  pageBgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,15,30,0.50)' },
  content: { padding: 16, maxWidth: 1400, width: '100%', alignSelf: 'center' },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 100, gap: 14 },
  centerText: { color: PALETTE.muted, fontFamily: FONTS.med, fontSize: 14 },

  split: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  splitStack: { flexDirection: 'column', gap: 16 },

  posterCol: { flex: 1.2, minWidth: 0, maxHeight: 600 },
  posterColStack: { width: '100%', maxHeight: 400 },
  posterWrap: { position: 'relative', borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: PALETTE.glassBorder, width: '100%', height: '100%', minHeight: 400 },
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

  formCol: { flex: 1, minWidth: 0, maxWidth: 520, maxHeight: 600 },
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

  heroBanner: {
    position: 'relative', borderRadius: 18, overflow: 'hidden',
    marginBottom: 16, minHeight: 180,
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)',
  },
  heroBannerStack: { width: '100%' },
  heroBannerImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroBannerOverlay: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroBannerContent: { position: 'relative', padding: 20, gap: 8, zIndex: 2 },

  header: { borderRadius: 18, padding: 16, gap: 8, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)' },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6,
    backgroundColor: 'rgba(124,58,237,0.25)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14,
  },
  headerBadgeText: { color: '#C4B5FD', fontFamily: TYPO.display700, fontSize: 10, letterSpacing: 1 },
  headerTitle: { color: '#fff', fontFamily: TYPO.display800, fontSize: 22 },
  headerOrg: { color: PALETTE.muted, fontFamily: FONTS.med, fontSize: 12 },
  metaCol: { gap: 6, marginTop: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { color: PALETTE.muted, fontFamily: FONTS.med, fontSize: 12.5 },

  feeCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, borderWidth: 1,
    borderColor: PALETTE.glassBorder, padding: 14, gap: 10, marginBottom: 12,
  },
  feeIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(124,58,237,0.18)', alignItems: 'center', justifyContent: 'center' },
  feeLabel: { color: PALETTE.muted, fontFamily: FONTS.med, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 },
  feeValue: { color: '#fff', fontFamily: TYPO.display800, fontSize: 20 },
  secureBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(16,185,129,0.12)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  secureText: { color: '#34D399', fontFamily: FONTS.semi, fontSize: 10 },
  seatsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  seatsText: { color: PALETTE.muted, fontFamily: FONTS.med, fontSize: 11.5 },
  note: { color: PALETTE.muted, fontFamily: FONTS.med, fontSize: 11.5, lineHeight: 17 },

  formCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, borderWidth: 1,
    borderColor: PALETTE.glassBorder, padding: 16, gap: 8,
  },
  cardTitle: { color: '#fff', fontFamily: TYPO.display700, fontSize: 15, marginBottom: 6 },
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
    backgroundColor: '#0f1629', borderColor: 'rgba(167,139,250,0.45)', borderWidth: 1,
    borderRadius: 10, overflow: 'hidden', maxHeight: 260,
    zIndex: 999,
    ...(Platform.OS === 'web' ? ({
      boxShadow: '0 18px 50px rgba(0,0,0,0.85), 0 0 0 1px rgba(124,58,237,0.15)',
    } as any) : {}),
  },
  selectMenuScroll: {
    maxHeight: 250,
    ...(Platform.OS === 'web' ? ({ overflowY: 'auto' } as any) : {}),
  },
  selectItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#0f1629',
    borderBottomWidth: 1, borderBottomColor: 'rgba(167,139,250,0.1)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  selectItemActive: { backgroundColor: 'rgba(124,58,237,0.25)' },
  selectItemText: { color: 'rgba(255,255,255,0.85)', fontFamily: FONTS.med, fontSize: 13.5 },
  selectItemTextActive: { color: '#C4B5FD', fontFamily: FONTS.semi },
  inputError: { borderColor: '#F87171' },
  fieldErrText: { color: '#F87171', fontFamily: FONTS.med, fontSize: 12, marginTop: 2 },
  error: { color: '#F87171', fontFamily: FONTS.med, fontSize: 12.5, marginTop: 6 },
  payBtnWrap: { borderRadius: 12, marginTop: 16, overflow: 'hidden' },
  payBtnDisabledWrap: { opacity: 0.45 },
  payBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14,
    minHeight: 48,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  payBtnDisabled: {
    ...(Platform.OS === 'web' ? ({ cursor: 'not-allowed' } as any) : {}),
  },
  payBtnText: { color: '#fff', fontFamily: TYPO.display700, fontSize: 14 },
  payBtnTextDisabled: { color: 'rgba(255,255,255,0.45)' },

  termsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, marginBottom: 4,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 1.5,
    borderColor: 'rgba(167,139,250,0.5)', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  checkboxChecked: {
    backgroundColor: GRAD.from, borderColor: GRAD.from,
  },
  termsText: { color: '#94a3b8', fontFamily: FONTS.med, fontSize: 13, flex: 1, lineHeight: 18 },
  termsLink: {
    color: '#A78BFA', fontFamily: FONTS.semi, fontSize: 13,
    textDecorationLine: 'underline',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  termsHint: { color: '#F87171', fontFamily: FONTS.med, fontSize: 11.5, marginBottom: 4 },

  /* Modal */
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
    ...(Platform.OS === 'web' ? { justifyContent: 'center', alignItems: 'center' } as any : {}),
  },
  modalBox: {
    backgroundColor: '#0f1629', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)',
    maxHeight: '85%',
    ...(Platform.OS === 'web' ? { borderRadius: 16, maxWidth: 680, width: '92%', maxHeight: '88vh' } as any : {}),
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(167,139,250,0.15)',
  },
  modalTitle: { color: '#fff', fontFamily: TYPO.display700, fontSize: 17 },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  modalCloseText: { color: '#fff', fontFamily: FONTS.semi, fontSize: 15 },
  modalScroll: { paddingHorizontal: 20, paddingTop: 16, flex: 1 },
  modalHeading: { color: '#fff', fontFamily: TYPO.display800, fontSize: 15, marginBottom: 10 },
  modalSection: { color: '#A78BFA', fontFamily: TYPO.display700, fontSize: 13.5, marginTop: 16, marginBottom: 6 },
  modalBody: { color: '#94a3b8', fontFamily: FONTS.med, fontSize: 13, lineHeight: 20, marginBottom: 6 },
  modalBullet: { color: '#94a3b8', fontFamily: FONTS.med, fontSize: 13, lineHeight: 20, marginBottom: 4, paddingLeft: 4 },
  modalDoneBtn: {
    backgroundColor: GRAD.from, borderRadius: 12, margin: 16, paddingVertical: 13, alignItems: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  modalDoneBtnText: { color: '#fff', fontFamily: TYPO.display700, fontSize: 14 },
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
  successCard: {
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderColor: 'rgba(52,211,153,0.3)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    gap: 12,
  },
  successIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  successCheckCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(16,185,129,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCardTitle: {
    color: '#fff',
    fontFamily: TYPO.display800,
    fontSize: 18,
  },
  successCardSub: {
    color: '#A7F3D0',
    fontFamily: FONTS.med,
    fontSize: 12.5,
    marginTop: 2,
    lineHeight: 16,
  },
  payIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  payIdBadgeText: {
    color: '#D1FAE5',
    fontFamily: FONTS.semi,
    fontSize: 11,
  },
  qrHint: {
    color: PALETTE.muted,
    fontFamily: FONTS.med,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  qrWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignSelf: 'center',
    marginVertical: 12,
  },
  qrCodeImg: {
    width: 160,
    height: 160,
  },
  qrRegId: {
    color: PALETTE.dim,
    fontFamily: FONTS.semi,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  detailsGrid: {
    gap: 10,
    marginTop: 4,
  },
  detailsGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  detailsGridLabel: {
    color: '#64748b',
    fontFamily: FONTS.semi,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailsGridValue: {
    color: '#fff',
    fontFamily: FONTS.semi,
    fontSize: 13.5,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 12,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  actionBtnOutline: {
    backgroundColor: 'rgba(52,211,153,0.06)',
    borderColor: 'rgba(52,211,153,0.3)',
    borderWidth: 1,
  },
  couponLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderColor: 'rgba(167,139,250,0.3)',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    marginVertical: 4,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  couponLinkBtnText: {
    color: '#C4B5FD',
    fontFamily: TYPO.display700,
    fontSize: 13.5,
  },
  handbookBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 10,
  },
  handbookBtn: {
    flex: 1,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(124,58,237,0.12)',
    borderColor: 'rgba(167,139,250,0.3)',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  handbookBtnText: {
    color: '#C4B5FD',
    fontFamily: FONTS.semi,
    fontSize: 12,
  },
  shareBtnInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(52,211,153,0.1)',
    borderColor: 'rgba(52,211,153,0.3)',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minWidth: 120,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  shareBtnInlineText: {
    color: '#34D399',
    fontFamily: FONTS.semi,
    fontSize: 12,
  },
  // Team registration styles
  typeToggle: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.3)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  typeToggleActive: {
    borderColor: GRAD.from,
    backgroundColor: 'rgba(124,58,237,0.2)',
  },
  typeToggleText: {
    color: PALETTE.muted,
    fontFamily: FONTS.semi,
    fontSize: 14,
  },
  typeToggleTextActive: {
    color: '#fff',
  },
  teamSection: {
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.3)',
    backgroundColor: 'rgba(124,58,237,0.08)',
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  teamTitle: {
    color: '#fff',
    fontFamily: TYPO.display700,
    fontSize: 16,
  },
  teamCount: {
    color: '#C4B5FD',
    fontFamily: FONTS.semi,
    fontSize: 12,
  },
  teamMemberCard: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.2)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  teamMemberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  teamMemberLabel: {
    color: '#fff',
    fontFamily: FONTS.semi,
    fontSize: 14,
  },
  teamMemberSublabel: {
    color: '#94a3b8',
    fontFamily: FONTS.semi,
    fontSize: 11,
    marginTop: 8,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  removeMemberBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  removeMemberText: {
    color: '#F87171',
    fontFamily: FONTS.semi,
    fontSize: 12,
  },
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(167,139,250,0.4)',
    backgroundColor: 'rgba(124,58,237,0.1)',
  },
  addMemberText: {
    color: '#C4B5FD',
    fontFamily: FONTS.semi,
    fontSize: 13,
  },
});
