// @ts-nocheck
/**
 * ECHO Showcase View — fully data-driven from the CMS; content and slug are
 * resolved from the API (a canonical slug is passed in, or the first published
 * showcase is used when no slug is provided).
 *
 * 10 sections matching the reference design:
 *  1. Header  2. Hero  3. Stats  4. About + Organizers  5. Highlights
 *  6. Gallery (masonry + lightbox)  7. Testimonials  8. Timeline  9. CTA  10. Footer
 *
 * Uses exclusively existing student-portal tokens & primitives.
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform,
  ActivityIndicator, useWindowDimensions, Modal, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Share2, Calendar, Clock, MapPin, Users, Mic2,
  BookOpen, Network, Star, ChevronRight, X, ZoomIn,
  Building2, Award, TrendingUp, Target, Zap, FileText, Download,
  Ticket,
} from 'lucide-react-native';
import { api, resolveImageUrl } from '@/src/models/services/api';
import { PALETTE, SC, FONTS, TYPO } from '../tokens';
import { GlassCard } from '../glass';
import { FadeInView, PressScale } from '../motion';
import { GRAD } from '../portalkit';
import { useRouter } from 'expo-router';

// ── Status badge colors ─────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  'Completed':  { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.30)', text: '#34D399', dot: '#10B981' },
  'Live':       { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.30)',   text: '#FCA5A5', dot: '#EF4444' },
  'Upcoming':   { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.30)',  text: '#FCD34D', dot: '#F59E0B' },
  'default':    { bg: 'rgba(99,102,241,0.12)',  border: 'rgba(99,102,241,0.30)',  text: '#A5B4FC', dot: '#6366F1' },
};

const STAT_ICONS: Record<string, any> = {
  users: Users, students: Users, sessions: BookOpen, speakers: Mic2,
  partners: Building2, feedback: Star, award: Award, trending: TrendingUp,
  target: Target, default: Zap,
};

// ── Default data shape (neutral; all real content comes from the CMS) ──────
const DEFAULT_SHOWCASE: any = {
  title: '',
  subtitle: '',
  description: '',
  date: '',
  time: '',
  venue: '',
  event_status_badge: '',
  category: '',
  hero_image_url: null,
  hero_banners: [],
  organizer_name: '',
  organizer_logo_url: null,
  stats: [],
  highlights: [],
  partners: [],
  testimonials: [],
  timeline: [],
  gallery: [],
  cta_title: '',
  cta_subtitle: '',
  cta_button_text: '',
  cta_url: null,
};

// ── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({ images, startIndex, onClose }: { images: any[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex);
  const img = images[idx];

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setIdx((prev) => Math.max(0, prev - 1));
      if (e.key === 'ArrowRight') setIdx((prev) => Math.min(images.length - 1, prev + 1));
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images.length, onClose]);

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={lb.overlay}>
        <Pressable style={lb.bg} onPress={onClose} />
        <View style={lb.box}>
          <Pressable style={lb.close} onPress={onClose}>
            <X size={18} color="#fff" />
          </Pressable>
          {img?.url ? (
            <Image source={{ uri: resolveImageUrl(img.url) }} style={lb.img} resizeMode="contain" />
          ) : (
            <View style={[lb.img, { backgroundColor: 'rgba(99,102,241,0.20)', alignItems: 'center', justifyContent: 'center' }]}>
              <ZoomIn size={40} color={PALETTE.muted} />
            </View>
          )}
          {img?.caption ? (
            <Text style={lb.caption}>{img.caption}</Text>
          ) : null}
          <View style={lb.nav}>
            <Pressable onPress={() => setIdx(Math.max(0, idx - 1))} style={lb.navBtn}>
              <ArrowLeft size={18} color={idx === 0 ? PALETTE.dim : '#fff'} />
            </Pressable>
            <Text style={lb.counter}>{idx + 1} / {images.length}</Text>
            <Pressable onPress={() => setIdx(Math.min(images.length - 1, idx + 1))} style={lb.navBtn}>
              <ChevronRight size={18} color={idx === images.length - 1 ? PALETTE.dim : '#fff'} />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
const lb = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.90)', alignItems: 'center', justifyContent: 'center' },
  bg: { ...StyleSheet.absoluteFillObject },
  box: { width: '90%', maxWidth: 860, backgroundColor: '#0d1326', borderRadius: 16, overflow: 'hidden', zIndex: 2 },
  img: { width: '100%', height: 460 },
  close: { position: 'absolute', top: 10, right: 12, zIndex: 3, padding: 6, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 16 },
  caption: { color: PALETTE.muted, fontFamily: FONTS.med, fontSize: 12.5, textAlign: 'center', paddingVertical: 10, paddingHorizontal: 16 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 12 },
  navBtn: { padding: 8 },
  counter: { color: PALETTE.muted, fontFamily: FONTS.med, fontSize: 13 },
});

// ── Hero Banner Carousel (full-width, title overlaid) ─────────────────────
function HeroBannerCarousel({ banners, data, isWide, onBack, canonicalSlug, showRegistration, onRegister, onShare }: {
  banners: string[]; data: any; isWide: boolean;
  onBack?: () => void; canonicalSlug: string;
  showRegistration: boolean; onRegister: () => void; onShare: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<any>(null);
  const validBanners = (banners || []).filter(Boolean);

  const advance = useCallback(() => {
    setIdx((prev) => (prev + 1) % validBanners.length);
  }, [validBanners.length]);

  useEffect(() => {
    if (validBanners.length <= 1) return;
    timerRef.current = setInterval(advance, 4000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [advance, validBanners.length]);

  if (validBanners.length === 0) return null;

  const statusKey = data?.event_status_badge || 'Upcoming';
  const statusCol = STATUS_COLORS[statusKey] || STATUS_COLORS.default;

  return (
    <View style={bc.section}>
      {/* Banner image layer */}
      <View style={bc.imageWrap}>
        <Image
          source={{ uri: resolveImageUrl(validBanners[idx]) }}
          style={bc.image}
          resizeMode="cover"
        />
        {/* Gradient overlay from bottom (dark) to top (transparent) */}
        <View style={bc.gradient} />
      </View>

      {/* Floating back button — top left */}
      <PressScale onPress={onBack || (() => {})} style={bc.backBtn}>
        <View style={bc.backBtnInner}>
          <ArrowLeft size={14} color="#fff" />
          <Text style={bc.btnText}>Back</Text>
        </View>
      </PressScale>

      {/* Floating action buttons — bottom right */}
      <View style={bc.actions}>
        {showRegistration && (
          <Pressable onPress={onRegister} style={{ borderRadius: 20, overflow: 'hidden' }}>
            <LinearGradient colors={['#059669', '#047857']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={bc.registerPill}>
              <Ticket size={13} color="#fff" />
              <Text style={bc.pillText}>Register</Text>
            </LinearGradient>
          </Pressable>
        )}
        <PressScale onPress={onShare}>
          <View style={bc.shareBtn}>
            <Share2 size={13} color="#fff" />
            <Text style={bc.btnText}>Share</Text>
          </View>
        </PressScale>
      </View>

      {/* Content overlaid on banner — bottom left */}
      <View style={[bc.content, !isWide && { paddingHorizontal: 16 }]}>
        <View style={bc.contentInner}>
          {/* Status badge */}
          <View style={[bc.statusBadge, { backgroundColor: statusCol.bg, borderColor: statusCol.border }]}>
            <View style={[bc.statusDot, { backgroundColor: statusCol.dot }]} />
            <Text style={[bc.statusText, { color: statusCol.text }]}>{statusKey.toUpperCase()}</Text>
          </View>

          {/* Title */}
          <Text style={[bc.title, !isWide && { fontSize: 26 }]} numberOfLines={3}>
            {data?.title?.split(' ').slice(0, -1).join(' ')}{' '}
            <Text style={{ color: GRAD.from }}>{data?.title?.split(' ').slice(-1)[0]}</Text>
          </Text>

          {/* Subtitle */}
          {data?.subtitle ? <Text style={bc.subtitle}>{data.subtitle}</Text> : null}

          {/* Meta row */}
          <View style={bc.metaRow}>
            {data?.date ? (
              <View style={bc.metaItem}><Calendar size={13} color="rgba(255,255,255,0.7)" /><Text style={bc.metaText}>{data.date}</Text></View>
            ) : null}
            {data?.time ? (
              <View style={bc.metaItem}><Clock size={13} color="rgba(255,255,255,0.7)" /><Text style={bc.metaText}>{data.time}</Text></View>
            ) : null}
            {data?.venue ? (
              <View style={bc.metaItem}><MapPin size={13} color="rgba(255,255,255,0.7)" /><Text style={bc.metaText}>{data.venue}</Text></View>
            ) : null}
          </View>
        </View>
      </View>

      {/* Carousel dots */}
      {validBanners.length > 1 && (
        <View style={bc.dots}>
          {validBanners.map((_: string, i: number) => (
            <Pressable key={i} onPress={() => setIdx(i)}>
              <View style={[bc.dot, i === idx && bc.dotActive]} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
const bc = StyleSheet.create({
  section: {
    width: '100%', height: 420, position: 'relative', overflow: 'hidden',
    marginBottom: 16, borderRadius: 14,
  },
  imageWrap: { ...StyleSheet.absoluteFillObject, borderRadius: 14 },
  image: { width: '100%', height: '100%', borderRadius: 14 },
  gradient: {
    ...StyleSheet.absoluteFillObject, borderRadius: 14,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web' ? {
      background: 'linear-gradient(to top, #080714 0%, rgba(8,7,20,0.7) 40%, transparent 75%)',
    } as any : {
      backgroundColor: 'rgba(8,7,20,0.5)',
    }),
  },
  backBtn: {
    position: 'absolute', top: 14, left: 14, zIndex: 10,
  },
  backBtnInner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 34, paddingHorizontal: 12, borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  actions: {
    position: 'absolute', bottom: 14, right: 14, zIndex: 10,
    flexDirection: 'row', gap: 8, alignItems: 'center',
  },
  registerPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20,
  },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 34, paddingHorizontal: 12, borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  btnText: { fontFamily: FONTS.bold, fontSize: 12, color: '#fff' },
  pillText: { fontFamily: FONTS.bold, fontSize: 12.5, color: '#fff' },
  content: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 28, paddingBottom: 55, paddingTop: 60,
  },
  contentInner: { maxWidth: 900 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, borderWidth: 1, marginBottom: 12,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.6 },
  title: {
    fontFamily: TYPO.display800, fontSize: 34, color: '#fff',
    lineHeight: 40, letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: TYPO.body500, fontSize: 15, color: 'rgba(255,255,255,0.65)',
    marginTop: 8, maxWidth: 600, lineHeight: 22,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontFamily: FONTS.med, fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  dots: {
    position: 'absolute', bottom: 14, alignSelf: 'center',
    flexDirection: 'row', gap: 7,
    backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
  },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotActive: { backgroundColor: '#fff', width: 20 },
});

// ── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({ stat }: { stat: any }) {
  const Icon = STAT_ICONS[stat.icon] || STAT_ICONS.default;
  return (
    <View style={st.card}>
      <View style={st.iconWrap}><Icon size={22} color={GRAD.from} /></View>
      <Text style={st.value}>{stat.value}</Text>
      <Text style={st.label}>{stat.label}</Text>
    </View>
  );
}
const st = StyleSheet.create({
  card: {
    flex: 1, minWidth: 80, backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14, borderWidth: 1, borderColor: PALETTE.glassBorder,
    padding: 16, alignItems: 'center', gap: 6,
    ...(Platform.OS === 'web' ? { boxShadow: '0 4px 24px rgba(2,6,23,0.30)' } as any : {}),
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(123,61,191,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  value: { fontFamily: TYPO.display800, fontSize: 22, color: '#fff' },
  label: { fontFamily: TYPO.body500, fontSize: 11, color: PALETTE.muted, textAlign: 'center' },
});

// ── Highlight Card ─────────────────────────────────────────────────────────
function HighlightCard({ h }: { h: any }) {
  const IconMap: Record<string, any> = { book: BookOpen, network: Network, trending: TrendingUp, star: Star };
  const Icon = IconMap[h.icon] || Zap;
  return (
    <View style={hc.card}>
      <View style={hc.iconWrap}><Icon size={18} color={GRAD.from} /></View>
      <Text style={hc.title}>{h.title}</Text>
      <Text style={hc.desc}>{h.description}</Text>
    </View>
  );
}
const hc = StyleSheet.create({
  card: {
    flex: 1, minWidth: 100, backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12, borderWidth: 1, borderColor: PALETTE.glassBorder,
    padding: 16, alignItems: 'center', gap: 4,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(123,61,191,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  title: { fontFamily: TYPO.display700, fontSize: 14, color: '#fff' },
  desc: { fontFamily: TYPO.body400, fontSize: 11.5, color: PALETTE.muted, textAlign: 'center' },
});

// ── Testimonial Card ───────────────────────────────────────────────────────
function TestimonialCard({ t }: { t: any }) {
  const photoUri = t.photo_url ? resolveImageUrl(t.photo_url) : null;
  return (
    <View style={tc.card}>
      <Text style={tc.quote}>"{t.quote}"</Text>
      <View style={tc.footer}>
        <View style={tc.avatar}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={{ width: 36, height: 36, borderRadius: 18 }} resizeMode="cover" />
          ) : (
            <Text style={tc.avatarText}>{(t.name || 'U')[0]}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={tc.name}>{t.name}</Text>
          <Text style={tc.meta}>{[t.department || t.branch, t.year].filter(Boolean).join(', ')}</Text>
          {t.linkedin_url ? (
            <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: GRAD.from, marginTop: 2 }} numberOfLines={1}>
              {t.linkedin_url}
            </Text>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {Array.from({ length: t.rating || 5 }).map((_, i) => (
            <Star key={i} size={11} color="#F59E0B" fill="#F59E0B" />
          ))}
        </View>
      </View>
    </View>
  );
}
const tc = StyleSheet.create({
  card: {
    flex: 1, minWidth: 180, backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14, borderWidth: 1, borderColor: PALETTE.glassBorder,
    padding: 16, gap: 14,
  },
  quote: { fontFamily: TYPO.body400, fontSize: 13, color: PALETTE.text, lineHeight: 20 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: GRAD.from + '33',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: TYPO.display700, fontSize: 14, color: GRAD.from },
  name: { fontFamily: TYPO.body700, fontSize: 12.5, color: '#fff' },
  meta: { fontFamily: TYPO.body400, fontSize: 11, color: PALETTE.muted },
});

// ── Gallery Placeholder Cell ────────────────────────────────────────────────
function GalleryCell({ img, onPress, style }: { img: any; onPress: () => void; style: any }) {
  return (
    <Pressable onPress={onPress} style={[gc.cell, style]}>
      {img?.url ? (
        <Image source={{ uri: resolveImageUrl(img.url) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(99,102,241,0.12)', alignItems: 'center', justifyContent: 'center' }]}>
          <ZoomIn size={24} color={PALETTE.dim} />
        </View>
      )}
    </Pressable>
  );
}
const gc = StyleSheet.create({
  cell: { borderRadius: 10, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.03)' },
});

// ── Main Component ─────────────────────────────────────────────────────────
export function EchoShowcaseView({ slug, onBack }: { slug?: string; onBack?: () => void }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 860;
  const [data, setData] = useState<any>(DEFAULT_SHOWCASE);
  const [loading, setLoading] = useState(true);
  const [lbOpen, setLbOpen] = useState(false);
  const [lbIndex, setLbIndex] = useState(0);
  const router = useRouter();

  // Section visibility — defaults to showing everything when not configured.
  const sections = (data?.sections && typeof data.sections === 'object') ? data.sections : {};

  // Must be before early returns (Rules of Hooks)
  const gallery: any[] = data?.gallery || [];

  const showSection = (key: string) => sections[key] !== false;

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const resolve = async () => {
      try {
        let targetSlug = slug;
        if (!targetSlug) {
          const list: any = await api.listEchoShowcases();
          const items: any[] = list?.items || list || [];
          const first = items.find(
            (s: any) => s?.status === 'published' || !s?.status
          ) || items[0];
          targetSlug = first?.slug;
        }
        if (!targetSlug) {
          if (mounted) setData(null);
          return;
        }
        const d = await api.getEchoShowcase(targetSlug);
        if (mounted && d) {
          console.log('[STUDENT GET RESPONSE]', {
            targetSlug,
            title: d.title,
            hero_image_url: d.hero_image_url,
            hero_cover_url: d.hero_cover_url,
            resolved_hero_url: resolveImageUrl(d.hero_image_url),
          });
          setData(d);
          if (Platform.OS === 'web' && (d.seo_title || d.title)) {
            document.title = d.seo_title || `${d.title} | Student Alumni Platform`;
          }
        }
      } catch {
        /* keep default (neutral) data */
      } finally {
        if (mounted) setLoading(false);
      }
    };
    resolve();
    return () => { mounted = false; };
  }, [slug]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
        <ActivityIndicator size="large" color={GRAD.from} />
        <Text style={{ color: PALETTE.muted, fontFamily: FONTS.med, fontSize: 13, marginTop: 12 }}>
          Loading showcase…
        </Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 8 }}>
        <Calendar size={32} color={PALETTE.dim} />
        <Text style={{ color: '#fff', fontFamily: FONTS.semibold, fontSize: 16 }}>
          Showcase not found
        </Text>
        <Text style={{ color: PALETTE.muted, fontFamily: FONTS.med, fontSize: 13, textAlign: 'center', maxWidth: 320 }}>
          No event showcase is published yet. Check back soon.
        </Text>
      </View>
    );
  }

  const statusKey = data?.event_status_badge || 'Upcoming';
  const statusCol = STATUS_COLORS[statusKey] || STATUS_COLORS.default;
  const stats: any[] = data?.stats || DEFAULT_SHOWCASE.stats;
  const highlights: any[] = data?.highlights || DEFAULT_SHOWCASE.highlights;
  const testimonials: any[] = (data?.testimonials || DEFAULT_SHOWCASE.testimonials).filter(
    (t: any) => t.visible !== false
  );
  const timeline: any[] = data?.timeline || DEFAULT_SHOWCASE.timeline;
  const partners: any[] = data?.partners || DEFAULT_SHOWCASE.partners;
  const canonicalSlug: string = data?.slug || slug || '';

  return (
    <View style={{ flex: 1 }}>
      {/* ── HERO BANNERS CAROUSEL (replaces hero card when banners exist) ── */}
      {showSection('hero') && (data?.hero_banners?.length > 0) && (
        <FadeInView delay={50}>
          <HeroBannerCarousel
            banners={data.hero_banners}
            data={data}
            isWide={isWide}
            onBack={onBack}
            canonicalSlug={canonicalSlug}
            showRegistration={showSection('registration') && (data?.registration?.enabled !== false) && (data?.event_status_badge !== 'Completed')}
            onRegister={() => {
              if (Platform.OS === 'web') {
                window.location.assign(`/echo/${canonicalSlug}/register`);
              } else {
                router.push(`/echo/${canonicalSlug}/register` as any);
              }
            }}
            onShare={() => {
              const url = typeof window !== 'undefined' ? window.location.href : '';
              const text = `Check out ${data?.title || 'this event'}!`;
              if (Platform.OS === 'web' && navigator.share) {
                navigator.share({ title: data?.title, text, url }).catch(() => {});
              } else if (Platform.OS === 'web' && navigator.clipboard) {
                navigator.clipboard.writeText(`${text}\n${url}`).then(() => {
                  alert('Link copied to clipboard!');
                }).catch(() => {});
              }
            }}
          />
        </FadeInView>
      )}

      {/* ── HERO CARD (shown only when NO banners) ────────────────────────── */}
      {showSection('hero') && !(data?.hero_banners?.length > 0) && (
      <FadeInView delay={60}>
        {/* Floating action bar over hero card */}
        <View style={s.heroActionBar}>
          <PressScale onPress={onBack || (() => {})}>
            <View style={s.floatingBtn}>
              <ArrowLeft size={14} color="#fff" />
              <Text style={s.floatingBtnText}>Back</Text>
            </View>
          </PressScale>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {showSection('registration') && (data?.registration?.enabled !== false) && (data?.event_status_badge !== 'Completed') && (
              <Pressable
                onPress={() => {
                  if (Platform.OS === 'web') {
                    window.location.assign(`/echo/${canonicalSlug}/register`);
                  } else {
                    router.push(`/echo/${canonicalSlug}/register` as any);
                  }
                }}
                style={{ borderRadius: 20, overflow: 'hidden' }}
              >
                <LinearGradient colors={['#059669', '#047857']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.floatingPill}>
                  <Ticket size={13} color="#fff" />
                  <Text style={s.floatingPillText}>Register</Text>
                </LinearGradient>
              </Pressable>
            )}
            <PressScale onPress={() => {
              const url = typeof window !== 'undefined' ? window.location.href : '';
              const text = `Check out ${data?.title || 'this event'}!`;
              if (Platform.OS === 'web' && navigator.share) {
                navigator.share({ title: data?.title, text, url }).catch(() => {});
              } else if (Platform.OS === 'web' && navigator.clipboard) {
                navigator.clipboard.writeText(`${text}\n${url}`).then(() => {
                  alert('Link copied to clipboard!');
                }).catch(() => {});
              }
            }}>
              <View style={s.floatingBtn}>
                <Share2 size={13} color="#fff" />
                <Text style={s.floatingBtnText}>Share</Text>
              </View>
            </PressScale>
          </View>
        </View>
        <GlassCard style={s.heroCard}>
          <View style={[s.heroInner, !isWide && { flexDirection: 'column' }]}>
            {/* Left content */}
            <View style={[s.heroLeft, !isWide && { width: '100%' }]}>
              {/* Status badge */}
              <View style={[s.statusBadge, { backgroundColor: statusCol.bg, borderColor: statusCol.border }]}>
                <View style={[s.statusDot, { backgroundColor: statusCol.dot }]} />
                <Text style={[s.statusText, { color: statusCol.text }]}>
                  {statusKey.toUpperCase()}
                </Text>
              </View>
              {/* Title */}
              <Text style={s.heroTitle} numberOfLines={3}>
                {data?.title?.split(' ').slice(0, -1).join(' ')}{' '}
                <Text style={{ color: GRAD.from }}>{data?.title?.split(' ').slice(-1)[0]}</Text>
              </Text>
              {/* Subtitle */}
              {data?.subtitle ? <Text style={s.heroSubtitle}>{data.subtitle}</Text> : null}
              {/* Description */}
              {data?.description ? <Text style={s.heroDesc} numberOfLines={4}>{data.description}</Text> : null}
              {/* Meta rows */}
              <View style={s.metaGroup}>
                {data?.date ? (
                  <View style={s.metaRow}><Calendar size={13} color={PALETTE.muted} /><Text style={s.metaText}>{data.date}</Text></View>
                ) : null}
                {data?.time ? (
                  <View style={s.metaRow}><Clock size={13} color={PALETTE.muted} /><Text style={s.metaText}>{data.time}</Text></View>
                ) : null}
                {data?.venue ? (
                  <View style={s.metaRow}><MapPin size={13} color={PALETTE.muted} /><Text style={s.metaText}>{data.venue}</Text></View>
                ) : null}
              </View>
            </View>
            {/* Right hero image */}
            {isWide && (
              <View style={s.heroRight}>
                {data?.hero_image_url ? (
                  <Image source={{ uri: resolveImageUrl(data.hero_image_url) }} style={s.heroImg} resizeMode="cover" />
                ) : (
                  <LinearGradient
                    colors={['rgba(123,61,191,0.35)', 'rgba(95,37,159,0.55)', 'rgba(30,10,80,0.80)']}
                    style={s.heroImg}
                  >
                    <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12 }}>
                      <Text style={{ fontFamily: TYPO.display800, fontSize: 28, color: '#fff', textAlign: 'center' }}>{data?.title}</Text>
                      <Text style={{ fontFamily: TYPO.body500, fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>{data?.subtitle}</Text>
                    </View>
                  </LinearGradient>
                )}
              </View>
            )}
          </View>
        </GlassCard>
      </FadeInView>
      )}

      {/* ── STATISTICS ──────────────────────────────────────────────────── */}
      {showSection('stats') && stats.length > 0 && (
      <FadeInView delay={120}>
        <View style={s.statsRow}>
          {stats.map((stat, i) => <StatCard key={i} stat={stat} />)}
        </View>
      </FadeInView>
      )}

      {/* ── ABOUT + ORGANIZERS ──────────────────────────────────────────── */}
      {showSection('about') && (data?.description || highlights.length > 0 || data?.organizer_name) && (
      <FadeInView delay={160}>
        <View style={[s.aboutRow, !isWide && { flexDirection: 'column' }]}>
          {/* About */}
          {((data?.description) || highlights.length > 0) && (
          <GlassCard style={[s.aboutCard, !isWide && { width: '100%' }]} padding={22}>
            <Text style={s.cardTitle}>About the Event</Text>
            <Text style={s.aboutDesc}>{data?.description || ''}</Text>
            {/* Highlights */}
            {highlights.length > 0 && (
            <View style={s.highlightRow}>
              {highlights.map((h, i) => <HighlightCard key={i} h={h} />)}
            </View>
            )}
          </GlassCard>
          )}
          {/* Organizers */}
          {data?.organizer_name && (
          <GlassCard style={[s.orgCard, !isWide && { width: '100%' }]} padding={22}>
            <Text style={s.cardTitle}>Event Organized By</Text>
            <View style={s.orgRow}>
              <View style={s.orgAvatar}>
                {data?.organizer_logo_url ? (
                  <Image source={{ uri: resolveImageUrl(data.organizer_logo_url) }} style={{ width: 38, height: 38, borderRadius: 10 }} resizeMode="contain" />
                ) : (
                  <Text style={{ fontFamily: TYPO.display800, fontSize: 16, color: GRAD.from }}>
                    {(data?.organizer_name || 'EV').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={s.orgMeta}>
                <Text style={s.orgName}>{data?.organizer_name || 'Event Organizers'}</Text>
                <Text style={s.orgSub}>{data?.college || data?.venue || ''}</Text>
              </View>
            </View>
            {showSection('partners') && partners.length > 0 && (
              <>
                <Text style={s.partnerLabel}>In Association With</Text>
                <View style={s.partnerRow}>
                  {partners.map((p, i) => (
                    <View key={i} style={s.partnerChip}>
                      {p.logo_url ? (
                        <Image source={{ uri: resolveImageUrl(p.logo_url) }} style={{ width: 28, height: 28 }} resizeMode="contain" />
                      ) : (
                        <Text style={{ fontFamily: TYPO.body700, fontSize: 12, color: PALETTE.text }}>{p.name}</Text>
                      )}
                    </View>
                  ))}
                </View>
              </>
            )}
          </GlassCard>
          )}
        </View>
      </FadeInView>
      )}

      {/* ── GALLERY ─────────────────────────────────────────────────────── */}
      {showSection('gallery') && (
      <FadeInView delay={200}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Moments from the Event</Text>
          {gallery.length > 0 && (
            <Pressable onPress={() => { setLbIndex(0); setLbOpen(true); }}>
              <Text style={s.viewAll}>View all photos →</Text>
            </Pressable>
          )}
        </View>
        {gallery.length === 0 ? (
          <GlassCard style={{ padding: 32, alignItems: 'center' }}>
            <ZoomIn size={28} color={PALETTE.dim} />
            <Text style={{ color: PALETTE.muted, fontFamily: FONTS.med, fontSize: 13, marginTop: 10 }}>
              No photos yet. Upload gallery photos via Admin CMS.
            </Text>
          </GlassCard>
        ) : (
          <View style={s.galleryGrid}>
            {/* Large left image */}
            <GalleryCell img={gallery[0]} onPress={() => { setLbIndex(0); setLbOpen(true); }} style={{ gridRow: '1 / 3', height: 260 } as any} />
            {/* Top-right two */}
            <GalleryCell img={gallery[1]} onPress={() => { setLbIndex(1); setLbOpen(true); }} style={{ height: 125 }} />
            <GalleryCell img={gallery[2]} onPress={() => { setLbIndex(2); setLbOpen(true); }} style={{ height: 125 }} />
            {/* Wide bottom */}
            <GalleryCell img={gallery[3]} onPress={() => { setLbIndex(3); setLbOpen(true); }} style={{ height: 125 }} />
            <GalleryCell img={gallery[4]} onPress={() => { setLbIndex(4); setLbOpen(true); }} style={{ height: 125 }} />
            {/* Counter card */}
            {gallery.length > 5 && (
              <Pressable onPress={() => { setLbIndex(5); setLbOpen(true); }} style={s.galleryMore}>
                <Text style={s.galleryMoreNum}>+{gallery.length - 5}</Text>
                <Text style={s.galleryMoreLabel}>More Photos</Text>
              </Pressable>
            )}
          </View>
        )}
      </FadeInView>
      )}

      {/* Lightbox */}
      {lbOpen && gallery.length > 0 && (
        <Lightbox images={gallery} startIndex={lbIndex} onClose={() => setLbOpen(false)} />
      )}

      {/* ── TESTIMONIALS ────────────────────────────────────────────────── */}
      {showSection('testimonials') && testimonials.length > 0 && (
        <FadeInView delay={240}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>What People Are Saying</Text>
            <Text style={s.viewAll}>View all testimonials →</Text>
          </View>
          <View style={[s.testimonialsRow, !isWide && { flexDirection: 'column' }]}>
            {testimonials.slice(0, 3).map((t, i) => <TestimonialCard key={i} t={t} />)}
          </View>
        </FadeInView>
      )}

      {/* ── TIMELINE ────────────────────────────────────────────────────── */}
      {showSection('timeline') && timeline.length > 0 && (
        <FadeInView delay={280}>
          <Text style={[s.sectionTitle, { marginBottom: 18 }]}>Event Highlights</Text>
          <View style={[s.timelineRow, !isWide && { flexDirection: 'column', gap: 0 }]}>
            {timeline.map((item, i) => {
              const IconMap: Record<string, any> = { star: Star, users: Users, code: Zap, network: Network, default: Zap };
              const Icon = IconMap[item.icon] || IconMap.default;
              return (
                <View key={i} style={[s.tlItem, !isWide && { flexDirection: 'row', gap: 12, paddingVertical: 10 }]}>
                  <View style={s.tlIconWrap}><Icon size={18} color={GRAD.from} /></View>
                  <View style={s.tlContent}>
                    <Text style={s.tlTitle}>{item.title}</Text>
                    <Text style={s.tlDesc}>{item.description}</Text>
                  </View>
                  {isWide && i < timeline.length - 1 && (
                    <View style={s.tlConnector} />
                  )}
                </View>
              );
            })}
          </View>
        </FadeInView>
      )}

      {/* ── SPONSORS ────────────────────────────────────────────────────── */}
      {showSection('sponsors') && data?.sponsors && data.sponsors.length > 0 && (
        <FadeInView delay={300}>
          <Text style={[s.sectionTitle, { marginBottom: 14 }]}>Event Sponsors</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            {data.sponsors.map((sp: any, i: number) => (
              <GlassCard key={i} style={{ flex: 1, minWidth: 160, padding: 14, alignItems: 'center', gap: 8 }}>
                {sp.logo_url ? (
                  <Image source={{ uri: sp.logo_url }} style={{ width: 100, height: 40 }} resizeMode="contain" />
                ) : (
                  <Building2 size={24} color={GRAD.from} />
                )}
                <Text style={{ fontFamily: TYPO.display700, fontSize: 13, color: '#fff', textAlign: 'center' }}>{sp.name}</Text>
                {sp.tier ? (
                  <View style={{ backgroundColor: 'rgba(123,61,191,0.20)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                    <Text style={{ fontFamily: TYPO.body600, fontSize: 10, color: GRAD.from }}>{sp.tier}</Text>
                  </View>
                ) : null}
              </GlassCard>
            ))}
          </View>
        </FadeInView>
      )}

      {/* ── DOWNLOADS ───────────────────────────────────────────────────── */}
      {showSection('downloads') && data?.downloads && data.downloads.length > 0 && (
        <FadeInView delay={310}>
          <Text style={[s.sectionTitle, { marginBottom: 14 }]}>Resources & Downloads</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            {data.downloads.map((dl: any, i: number) => (
              <GlassCard key={i} style={{ flex: 1, minWidth: 240, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(123,61,191,0.20)', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={20} color={GRAD.from} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: TYPO.display700, fontSize: 13, color: '#fff' }}>{dl.title}</Text>
                  {dl.description ? <Text style={{ fontFamily: TYPO.body400, fontSize: 11, color: PALETTE.muted }}>{dl.description}</Text> : null}
                  {dl.file_size ? <Text style={{ fontFamily: TYPO.body500, fontSize: 10, color: PALETTE.dim, marginTop: 2 }}>{dl.file_size}</Text> : null}
                </View>
                {dl.file_url ? (
                  <Pressable onPress={() => Platform.OS === 'web' && window.open(dl.file_url, '_blank')} style={{ padding: 8 }}>
                    <Download size={18} color={GRAD.from} />
                  </Pressable>
                ) : null}
              </GlassCard>
            ))}
          </View>
        </FadeInView>
      )}

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      {showSection('cta') && (data?.cta_title || data?.cta_subtitle || data?.cta_button_text) && (
      <FadeInView delay={320}>
        <LinearGradient
          colors={['rgba(123,61,191,0.25)', 'rgba(95,37,159,0.40)']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={s.ctaBanner}
        >
          <View style={s.ctaIconWrap}>
            <Calendar size={22} color={GRAD.from} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.ctaTitle}>{data?.cta_title || ''}</Text>
            <Text style={s.ctaSubtitle}>{data?.cta_subtitle || ''}</Text>
          </View>
          <LinearGradient colors={[GRAD.from, GRAD.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.ctaBtn}>
            <Text style={s.ctaBtnText}>{data?.cta_button_text || 'Learn More'}</Text>
          </LinearGradient>
        </LinearGradient>
      </FadeInView>
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 18,
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: PALETTE.glassBorder,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
  backText: { fontFamily: FONTS.med, fontSize: 13, color: '#fff' },
  registerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  shareText: { fontFamily: FONTS.bold, fontSize: 13, color: '#fff' },

  // Hero
  heroCard: { marginBottom: 16, padding: 0, overflow: 'hidden' },
  heroActionBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: -44, zIndex: 10,
    position: 'relative',
  },
  floatingBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 34, paddingHorizontal: 12, borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  floatingBtnText: { fontFamily: FONTS.bold, fontSize: 12, color: '#fff' },
  floatingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20,
  },
  floatingPillText: { fontFamily: FONTS.bold, fontSize: 12.5, color: '#fff' },
  heroInner: { flexDirection: 'row', minHeight: 260 },
  heroLeft: { flex: 1, padding: 28, gap: 10 },
  heroRight: { width: 320 },
  heroImg: { width: '100%', height: '100%', borderTopRightRadius: 14, borderBottomRightRadius: 14 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, marginBottom: 4,
  },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusText: { fontFamily: FONTS.bold, fontSize: 10.5, letterSpacing: 0.8 },
  heroTitle: { fontFamily: TYPO.display800, fontSize: 32, color: '#fff', lineHeight: 40 },
  heroSubtitle: { fontFamily: TYPO.body600, fontSize: 15, color: PALETTE.muted },
  heroDesc: { fontFamily: TYPO.body400, fontSize: 13, color: PALETTE.muted, lineHeight: 20 },
  metaGroup: { gap: 7, marginTop: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontFamily: TYPO.body500, fontSize: 12.5, color: PALETTE.muted },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 16 },

  // About
  aboutRow: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  aboutCard: { flex: 2 },
  orgCard: { flex: 1, minWidth: 200 },
  cardTitle: { fontFamily: TYPO.display700, fontSize: 17, color: '#fff', marginBottom: 12 },
  aboutDesc: { fontFamily: TYPO.body400, fontSize: 13.5, color: PALETTE.muted, lineHeight: 22 },
  highlightRow: { flexDirection: 'row', gap: 10, marginTop: 18, flexWrap: 'wrap' },
  orgRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orgMeta: { flex: 1, gap: 2, minWidth: 0 },
  orgAvatar: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: 'rgba(123,61,191,0.20)',
    alignItems: 'center', justifyContent: 'center',
  },
  orgName: { fontFamily: TYPO.display700, fontSize: 14, color: '#fff' },
  orgSub: { fontFamily: TYPO.body400, fontSize: 12, color: PALETTE.muted },
  partnerLabel: { fontFamily: TYPO.display700, fontSize: 12, color: '#fff', marginTop: 20, marginBottom: 10 },
  partnerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  partnerChip: {
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8, borderWidth: 1, borderColor: PALETTE.glassBorder,
  },

  // Gallery
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontFamily: TYPO.display700, fontSize: 17, color: '#fff' },
  viewAll: { fontFamily: FONTS.semi, fontSize: 12.5, color: GRAD.from },
  galleryGrid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr',
    gridTemplateRows: 'auto auto',
    gap: 8,
    marginBottom: 16,
  } as any,
  galleryMore: {
    borderRadius: 10, overflow: 'hidden',
    backgroundColor: 'rgba(123,61,191,0.18)',
    borderWidth: 1, borderColor: 'rgba(123,61,191,0.30)',
    alignItems: 'center', justifyContent: 'center',
    height: 125,
  },
  galleryMoreNum: { fontFamily: TYPO.display800, fontSize: 26, color: '#fff' },
  galleryMoreLabel: { fontFamily: TYPO.body500, fontSize: 11, color: PALETTE.muted },

  // Testimonials
  testimonialsRow: { flexDirection: 'row', gap: 14, marginBottom: 16 },

  // Timeline
  timelineRow: { flexDirection: 'row', gap: 0, alignItems: 'flex-start', marginBottom: 16 },
  tlItem: { flex: 1, alignItems: 'center', position: 'relative' },
  tlIconWrap: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(123,61,191,0.18)',
    borderWidth: 1, borderColor: 'rgba(123,61,191,0.35)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  tlContent: { alignItems: 'center', gap: 3, paddingHorizontal: 4 },
  tlTitle: { fontFamily: TYPO.display700, fontSize: 13, color: '#fff', textAlign: 'center' },
  tlDesc: { fontFamily: TYPO.body400, fontSize: 11, color: PALETTE.muted, textAlign: 'center' },
  tlConnector: {
    position: 'absolute', top: 20, right: 0, left: '55%',
    height: 1, backgroundColor: 'rgba(123,61,191,0.30)',
  },

  // CTA
  ctaBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    borderRadius: 16, padding: 22, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(123,61,191,0.25)',
  },
  ctaIconWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(123,61,191,0.20)',
    alignItems: 'center', justifyContent: 'center',
  },
  ctaTitle: { fontFamily: TYPO.display800, fontSize: 17, color: '#fff' },
  ctaSubtitle: { fontFamily: TYPO.body400, fontSize: 12.5, color: PALETTE.muted },
  ctaBtn: {
    paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
  ctaBtnText: { fontFamily: FONTS.bold, fontSize: 13, color: '#fff' },
});
