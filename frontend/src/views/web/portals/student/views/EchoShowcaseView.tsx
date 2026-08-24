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
import {View, Text, Pressable, Platform,
  ActivityIndicator, useWindowDimensions, Modal, Image, Linking,, StyleSheet} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, ArrowRight, Share2, Calendar, Clock, MapPin, Users, Mic2,
  BookOpen, Network, Star, ChevronRight, X, ZoomIn,
  Building2, Award, TrendingUp, Target, Zap, FileText, Download,
  Ticket, Globe, Link2, HelpCircle, ChevronDown,
  Trophy, PanelTop, CheckCircle2, ExternalLink,
} from 'lucide-react-native';
import { api, resolveImageUrl } from '@/src/models/services/api';
import { PALETTE, FONTS, TYPO } from '../tokens';
import { GlassCard } from '../glass';
import { FadeInView, PressScale } from '../motion';
import { GRAD } from '../portalkit';
import { useRouter } from 'expo-router';
import { EchoImg } from '@/src/views/web/components/EchoChrome';
import { useToast } from '@/src/views/components';

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
  speakers: [],
  categories: [],
  schedule: [],
  panels: [],
  faqs: [],
  eligibility: '',
  prize_pool: null,
  team_composition: '',
  gallery: [],
  cta_title: '',
  cta_subtitle: '',
  cta_button_text: '',
  cta_url: null,
};

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
      <View className="flex-1 bg-black/90 items-center justify-center">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View className="w-[90%] max-w-[860px] bg-[#0d1326] rounded-2xl overflow-hidden z-20">
          <Pressable className="absolute top-[10px] right-3 z-30 p-1.5 bg-black/50 rounded-2xl" onPress={onClose}>
            <X size={18} color="#fff" />
          </Pressable>
          {img?.url ? (
            <Image source={{ uri: resolveImageUrl(img.url) }} className="w-full h-[460px]" resizeMode="contain" />
          ) : (
            <View className="w-full h-[460px] bg-[rgba(99,102,241,0.20)] items-center justify-center">
              <ZoomIn size={40} color={PALETTE.muted} />
            </View>
          )}
          {img?.caption ? (
            <Text className="text-muted font-body text-xs text-center py-2.5 px-4" style={{ fontFamily: FONTS.med, fontSize: 12.5 }}>{img.caption}</Text>
          ) : null}
          <View className="flex-row items-center justify-center gap-6 p-3">
            <Pressable onPress={() => setIdx(Math.max(0, idx - 1))} className="p-2">
              <ArrowLeft size={18} color={idx === 0 ? PALETTE.dim : '#fff'} />
            </Pressable>
            <Text className="text-muted font-body text-sm" style={{ fontFamily: FONTS.med }}>{idx + 1} / {images.length}</Text>
            <Pressable onPress={() => setIdx(Math.min(images.length - 1, idx + 1))} className="p-2">
              <ChevronRight size={18} color={idx === images.length - 1 ? PALETTE.dim : '#fff'} />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

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
    <View className="w-full relative overflow-hidden mb-4 rounded-lg min-h-[380px] h-[440px]">
      <View className="absolute inset-0 rounded-lg">
        <EchoImg
          source={{ uri: resolveImageUrl(validBanners[idx]) }}
          className="w-full h-full rounded-lg"
          resizeMode="cover"
          fallbackLabel={data?.title || 'Event Banner'}
        />
        <View
          className="absolute inset-0 rounded-lg"
          style={{
            backgroundColor: 'transparent',
            ...(Platform.OS === 'web' ? {
              background: 'linear-gradient(to top, #080714 0%, rgba(8,7,20,0.75) 35%, rgba(8,7,20,0.2) 60%, transparent 80%)',
            } as any : {
              backgroundColor: 'rgba(8,7,20,0.5)',
            }),
          }}
        />
      </View>

      <PressScale onPress={onBack || (() => {})} className="absolute top-3.5 left-3.5 z-10">
        <View className="flex-row items-center gap-1.5 h-[34px] px-3 rounded-[17px] bg-black/55 border border-white/[0.18]">
          <ArrowLeft size={14} color="#fff" />
          <Text className="text-white font-body-bold text-xs">Back</Text>
        </View>
      </PressScale>

      <View className="absolute bottom-3.5 right-3.5 z-10 flex-row gap-2 items-center">
        {showRegistration && (
          <Pressable onPress={onRegister} className="rounded-[20px] overflow-hidden">
            <LinearGradient colors={['#059669', '#047857']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="flex-row items-center gap-1.5 px-4 py-[9px] rounded-[20px]">
              <Ticket size={13} color="#fff" />
              <Text className="text-white font-body-bold text-sm" style={{ fontSize: 12.5 }}>Register</Text>
            </LinearGradient>
          </Pressable>
        )}
        <PressScale
          onPress={() => {
            const base = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8002';
            if (Platform.OS === 'web') {
              window.open(`${base}/api/echo/handbook/download`, '_blank');
            } else {
              Linking.openURL(`${base}/api/echo/handbook/download`);
            }
          }}
        >
          <View className="flex-row items-center gap-1.5 h-[34px] px-3 rounded-[17px] bg-black/55 border border-white/[0.18]" style={{ backgroundColor: 'rgba(124,58,237,0.45)', borderColor: '#A78BFA' }}>
            <FileText size={13} color="#fff" />
            <Text className="text-white font-body-bold text-xs">Event Handbook (PDF)</Text>
          </View>
        </PressScale>
        <PressScale onPress={onShare}>
          <View className="flex-row items-center gap-1.5 h-[34px] px-3 rounded-[17px] bg-black/55 border border-white/[0.18]">
            <Share2 size={13} color="#fff" />
            <Text className="text-white font-body-bold text-xs">Share</Text>
          </View>
        </PressScale>
      </View>

      <View className="absolute bottom-0 left-0 right-0 px-6 pb-[18px] pt-20" style={!isWide ? { paddingHorizontal: 16 } : undefined}>
        <View className="max-w-[700px]">
          <View className="flex-row items-center gap-2.5 flex-wrap mb-2.5">
            <View className="flex-row items-center gap-1.5 self-start px-2.5 py-1 rounded-full border" style={{ backgroundColor: statusCol.bg, borderColor: statusCol.border }}>
              <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusCol.dot }} />
              <Text className="font-body-bold text-[10px] tracking-wider" style={{ color: statusCol.text, letterSpacing: 0.6 }}>{statusKey.toUpperCase()}</Text>
            </View>
            {data?.organizer_name ? (
              <Text className="text-white/55 tracking-widest uppercase text-[11px]" style={{ fontFamily: TYPO.body500, letterSpacing: 1.6 }}>{data.organizer_name.toUpperCase()}</Text>
            ) : null}
          </View>

          <Text className="text-white leading-9 tracking-tight" style={{ fontFamily: TYPO.display800, fontSize: !isWide ? 26 : 30, lineHeight: !isWide ? 32 : 36, letterSpacing: -0.5 }} numberOfLines={3}>
            {data?.title?.split(' ').slice(0, -1).join(' ')}{' '}
            <Text style={{ color: GRAD.from }}>{data?.title?.split(' ').slice(-1)[0]}</Text>
          </Text>

          {data?.subtitle ? <Text className="text-white/65 mt-1.5 max-w-[550px] leading-5" style={{ fontFamily: TYPO.body500, fontSize: 14 }}>{data.subtitle}</Text> : null}

          {data?.registration?.deadline ? (
            <View className="flex-row items-center gap-1.5 self-start bg-amber/15 border border-amber/35 px-2.5 py-[5px] rounded-full mt-2.5">
              <Clock size={11} color="#FBBF24" />
              <Text className="text-amber-light font-body-semibold text-[11px]">Registration closes: {data.registration.deadline}</Text>
            </View>
          ) : null}

          <View className="flex-row flex-wrap gap-3.5 mt-2.5">
            {data?.date ? (
              <View className="flex-row items-center gap-[5px]"><Calendar size={13} color="rgba(255,255,255,0.7)" /><Text className="text-white/70" style={{ fontFamily: FONTS.med, fontSize: 12.5 }}>{data.end_date && data.end_date !== data.date ? `${data.date} – ${data.end_date}` : data.date}</Text></View>
            ) : null}
            {data?.time ? (
              <View className="flex-row items-center gap-[5px]"><Clock size={13} color="rgba(255,255,255,0.7)" /><Text className="text-white/70" style={{ fontFamily: FONTS.med, fontSize: 12.5 }}>{data.time}</Text></View>
            ) : null}
            {data?.venue ? (
              <View className="flex-row items-center gap-[5px]"><MapPin size={13} color="rgba(255,255,255,0.7)" /><Text className="text-white/70" style={{ fontFamily: FONTS.med, fontSize: 12.5 }}>{data.venue}</Text></View>
            ) : null}
          </View>
        </View>
      </View>

      {validBanners.length > 1 && (
        <View className="absolute bottom-3.5 self-center flex-row gap-1.5 bg-black/45 px-2.5 py-[5px] rounded-full">
          {validBanners.map((_: string, i: number) => (
            <Pressable key={i} onPress={() => setIdx(i)}>
              <View className={`w-1.5 h-1.5 rounded-full ${i === idx ? 'bg-white w-[18px]' : 'bg-white/35'}`} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function StatCard({ stat }: { stat: any }) {
  const Icon = STAT_ICONS[stat.icon] || STAT_ICONS.default;
  return (
    <View className="flex-1 min-w-[140px] bg-glass-subtle rounded-lg border border-glass-border p-4 items-center gap-1.5" style={Platform.OS === 'web' ? { boxShadow: '0 4px 24px rgba(2,6,23,0.30)' } as any : undefined}>
      <View className="w-10 h-10 rounded-[20px] bg-purple-soft items-center justify-center mb-1"><Icon size={22} color={GRAD.from} /></View>
      <Text className="text-white text-lg" style={{ fontFamily: TYPO.display800 }}>{stat.value}</Text>
      <Text className="text-muted text-[11px] text-center" style={{ fontFamily: TYPO.body500 }}>{stat.label}</Text>
    </View>
  );
}

// ── Highlight Card with Directional Step Flow ──────────────────────────────
function HighlightCard({ h, index, isLast }: { h: any; index: number; isLast: boolean }) {
  const IconMap: Record<string, any> = { book: BookOpen, network: Network, trending: TrendingUp, star: Star, award: Award, mic: Mic2 };
  const Icon = IconMap[h.icon] || Zap;
  return (
    <View style={{ flex: 1, minWidth: 180, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={hc.card}>
        <View style={hc.topRow}>
          <View style={hc.iconWrap}><Icon size={18} color="#8B84FF" /></View>
          <View style={hc.stepBadge}>
            <Text style={hc.stepText}>{String(index + 1).padStart(2, '0')}</Text>
          </View>
        </View>
        <Text style={hc.title}>{h.title}</Text>
        <Text style={hc.desc}>{h.description}</Text>
      </View>
      {!isLast && (
        <View style={hc.connectorWrap}>
          <ArrowRight size={15} color="rgba(139, 132, 255, 0.45)" />
        </View>
      )}
    </View>
  );
}
const hc = StyleSheet.create({
  card: {
    flex: 1, minWidth: 150, backgroundColor: 'rgba(12, 14, 27, 0.75)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(139, 132, 255, 0.22)',
    padding: 18, gap: 6,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 12px 30px -10px rgba(91, 79, 233, 0.25)',
      transition: 'transform 0.2s ease, border-color 0.2s ease',
    } as any : {}),
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  stepBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100,
    backgroundColor: 'rgba(91, 79, 233, 0.2)', borderWidth: 1, borderColor: 'rgba(139, 132, 255, 0.35)',
  },
  stepText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 10, color: '#C084FC', letterSpacing: 0.5 },
  iconWrap: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(123,61,191,0.22)',
    borderWidth: 1, borderColor: 'rgba(139, 132, 255, 0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: TYPO.display700, fontSize: 15, color: '#fff', letterSpacing: -0.2 },
  desc: { fontFamily: TYPO.body400, fontSize: 12, color: PALETTE.muted, lineHeight: 18 },
  connectorWrap: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
});

function TestimonialCard({ t }: { t: any }) {
  const photoUri = t.photo_url ? resolveImageUrl(t.photo_url) : null;
  return (
    <View className="flex-1 min-w-[180px] bg-glass-subtle rounded-lg border border-glass-border p-4 gap-3.5">
      <Text className="text-text text-sm leading-5" style={{ fontFamily: TYPO.body400, fontSize: 13 }}>"{t.quote}"</Text>
      <View className="flex-row items-center gap-2.5">
        <View className="w-9 h-9 rounded-[18px] items-center justify-center" style={{ backgroundColor: GRAD.from + '33' }}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={{ width: 36, height: 36, borderRadius: 18 }} resizeMode="cover" />
          ) : (
            <Text className="text-base" style={{ fontFamily: TYPO.display700, color: GRAD.from }}>{(t.name || 'U')[0]}</Text>
          )}
        </View>
        <View className="flex-1">
          <Text className="text-white text-sm" style={{ fontFamily: TYPO.body700, fontSize: 12.5 }}>{t.name}</Text>
          <Text className="text-muted text-xs" style={{ fontFamily: TYPO.body400 }}>{[t.department || t.branch, t.year].filter(Boolean).join(', ')}</Text>
          {t.linkedin_url ? (
            <Text className="text-xs mt-0.5" style={{ fontFamily: FONTS.med, fontSize: 10, color: GRAD.from }} numberOfLines={1}>
              {t.linkedin_url}
            </Text>
          ) : null}
        </View>
        <View className="flex-row gap-0.5">
          {Array.from({ length: t.rating || 5 }).map((_, i) => (
            <Star key={i} size={11} color="#F59E0B" fill="#F59E0B" />
          ))}
        </View>
      </View>
    </View>
  );
}

function SpeakerCard({ sp, panel = false }: { sp: any; panel?: boolean }) {
  const accent = panel ? '#F472B6' : GRAD.from;
  const photoUri = sp.photo_url ? resolveImageUrl(sp.photo_url) : null;
  return (
    <View className="flex-1 min-w-[240px] bg-glass-subtle rounded-lg border border-glass-border p-4 gap-2.5" style={panel ? { borderColor: 'rgba(236,72,153,0.28)' } : undefined}>
      <View className="flex-row items-center gap-3">
        <View className="w-[52px] h-[52px] rounded-[26px] items-center justify-center" style={{ backgroundColor: accent + '22' }}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={{ width: 52, height: 52, borderRadius: 26 }} resizeMode="cover" />
          ) : (
            <Text className="text-xl" style={{ fontFamily: TYPO.display800, color: accent }}>{(sp.name || 'U')[0]}</Text>
          )}
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-white" style={{ fontFamily: TYPO.display700, fontSize: 15 }} numberOfLines={1}>{sp.name}</Text>
          <Text className="text-muted mt-px" style={{ fontFamily: TYPO.body400, fontSize: 12 }} numberOfLines={1}>
            {[sp.position, sp.company].filter(Boolean).join(' · ')}
          </Text>
          {sp.session_title ? (
            <Text className="text-dim mt-0.5" style={{ fontFamily: TYPO.body500, fontSize: 10.5 }} numberOfLines={1}>🎙 {sp.session_title}</Text>
          ) : null}
        </View>
      </View>
      {sp.bio ? <Text className="text-muted leading-[18px]" style={{ fontFamily: TYPO.body400, fontSize: 12 }} numberOfLines={3}>{sp.bio}</Text> : null}
      {(sp.linkedin_url || sp.twitter_url || sp.website_url) && (
        <View className="flex-row gap-1.5">
          {sp.linkedin_url ? (
            <Pressable onPress={() => Platform.OS === 'web' && window.open(sp.linkedin_url, '_blank')} className="w-7 h-7 rounded-[14px] border items-center justify-center bg-glass-subtle" style={{ borderColor: accent + '44' }}>
              <Link2 size={12} color={accent} />
            </Pressable>
          ) : null}
          {sp.twitter_url ? (
            <Pressable onPress={() => Platform.OS === 'web' && window.open(sp.twitter_url, '_blank')} className="w-7 h-7 rounded-[14px] border items-center justify-center bg-glass-subtle" style={{ borderColor: accent + '44' }}>
              <Globe size={12} color={accent} />
            </Pressable>
          ) : null}
          {sp.website_url ? (
            <Pressable onPress={() => Platform.OS === 'web' && window.open(sp.website_url, '_blank')} className="w-7 h-7 rounded-[14px] border items-center justify-center bg-glass-subtle" style={{ borderColor: accent + '44' }}>
              <ExternalLink size={12} color={accent} />
            </Pressable>
          ) : null}
        </View>
      )}
      {panel && (
        <View className="flex-row items-center gap-[5px] self-start px-2 py-[3px] rounded-[9px] border" style={{ backgroundColor: 'rgba(236,72,153,0.12)', borderColor: 'rgba(236,72,153,0.35)' }}>
          <PanelTop size={10} color="#F472B6" />
          <Text className="font-body-bold text-[9.5px] tracking-wider" style={{ color: '#F472B6', letterSpacing: 0.4 }}>PANEL MEMBER</Text>
        </View>
      )}
    </View>
  );
}

function CategoryCard({ c }: { c: any }) {
  const color = c.color || GRAD.from;
  const IconMap: Record<string, any> = {
    brain: Zap, leaf: Target, landmark: Building2, bus: Users, heartpulse: Award,
    'graduation-cap': BookOpen, default: Zap,
  };
  const Icon = IconMap[c.icon] || IconMap.default;
  return (
    <View className="flex-row items-center gap-3 bg-[rgba(255,255,255,0.03)] rounded-xl border p-3.5 min-w-[240px] flex-1" style={{ borderColor: color + '33' }}>
      <View className="w-[38px] h-[38px] rounded-[10px] items-center justify-center" style={{ backgroundColor: color + '1A' }}>
        <Icon size={18} color={color} />
      </View>
      <View className="flex-1 gap-[3px]">
        <Text className="text-white" style={{ fontFamily: TYPO.display700, fontSize: 13.5 }}>{c.name}</Text>
        {c.description ? <Text className="text-muted text-xs leading-4" style={{ fontFamily: TYPO.body400, fontSize: 11.5 }} numberOfLines={2}>{c.description}</Text> : null}
      </View>
    </View>
  );
}

function ScheduleRow({ it }: { it: any }) {
  const type = it.session_type || 'session';
  const badgeColMap: Record<string, any> = {
    keynote: { bg: 'rgba(124,58,237,0.15)', text: '#A78BFA', label: 'KEYNOTE' },
    panel: { bg: 'rgba(236,72,153,0.14)', text: '#F472B6', label: 'PANEL' },
    workshop: { bg: 'rgba(16,185,129,0.13)', text: '#34D399', label: 'WORKSHOP' },
    activity: { bg: 'rgba(245,158,11,0.13)', text: '#FBBF24', label: 'ACTIVITY' },
    break: { bg: 'rgba(148,163,184,0.13)', text: '#94A3B8', label: 'BREAK' },
    session: { bg: 'rgba(99,102,241,0.13)', text: '#A5B4FC', label: 'SESSION' },
  };
  const b = badgeColMap[type] || badgeColMap.session;
  return (
    <View className="flex-row items-start gap-3 py-2.5">
      <View className="w-[84px] items-end pt-0.5">
        <Text className="text-purple-light font-body-bold text-sm">{it.time || '—'}</Text>
      </View>
      <View className="w-2.5 h-2.5 rounded-full mt-[5px]" style={{ backgroundColor: GRAD.from, borderWidth: 2, borderColor: GRAD.from + '44' }} />
      <View className="flex-1 gap-[3px]">
        <View className="flex-row items-center gap-2 flex-wrap">
          <Text className="text-white" style={{ fontFamily: TYPO.display700, fontSize: 13.5 }}>{it.title}</Text>
          <View className="px-[7px] py-0.5 rounded-md" style={{ backgroundColor: b.bg }}>
            <Text className="font-body-bold text-[9px] tracking-wider" style={{ color: b.text, letterSpacing: 0.4 }}>{b.label}</Text>
          </View>
        </View>
        {it.description ? <Text className="text-muted leading-[17px]" style={{ fontFamily: TYPO.body400, fontSize: 12 }}>{it.description}</Text> : null}
        {it.speaker_names && it.speaker_names.length > 0 ? (
          <Text className="text-dim" style={{ fontFamily: TYPO.body500, fontSize: 11 }}>Speakers: {it.speaker_names.join(', ')}</Text>
        ) : null}
      </View>
    </View>
  );
}

function PanelCard({ p }: { p: any }) {
  return (
    <View className="flex-1 min-w-[260px] bg-[rgba(236,72,153,0.05)] rounded-lg border border-[rgba(236,72,153,0.22)] p-4 gap-1">
      <View className="flex-row items-center gap-2 mb-1.5">
        <PanelTop size={15} color="#F472B6" />
        <Text className="text-white flex-1" style={{ fontFamily: TYPO.display700, fontSize: 14 }}>{p.topic}</Text>
      </View>
      {p.description ? <Text className="text-muted leading-[18px]" style={{ fontFamily: TYPO.body400, fontSize: 12 }}>{p.description}</Text> : null}
      {p.panelists && p.panelists.length > 0 && (
        <View className="gap-1 mt-1">
          {p.panelists.filter(Boolean).map((name: string, i: number) => (
            <View key={i} className="flex-row items-center gap-1.5">
              <CheckCircle2 size={11} color="#F472B6" />
              <Text className="text-white/80" style={{ fontFamily: TYPO.body500, fontSize: 12 }}>{name}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function FaqItem({ f, open, onToggle }: { f: any; open: boolean; onToggle: () => void }) {
  return (
    <View className="bg-[rgba(255,255,255,0.03)] rounded-xl border border-glass-border overflow-hidden" style={open ? { borderColor: 'rgba(16,185,129,0.35)' } : undefined}>
      <Pressable onPress={onToggle} className="flex-row items-center gap-2.5 px-3.5 py-[13px]">
        <HelpCircle size={15} color="#34D399" />
        <Text className="flex-1 text-white" style={{ fontFamily: TYPO.display700, fontSize: 13 }}>{f.question}</Text>
        <ChevronDown size={15} color={PALETTE.muted} style={open ? { transform: [{ rotate: '180deg' }] } : undefined} />
      </Pressable>
      {open && <Text className="text-muted px-3.5 pb-3.5 leading-[19px]" style={{ fontFamily: TYPO.body400, fontSize: 12.5 }}>{f.answer}</Text>}
    </View>
  );
}

function SectionHeading({ icon, title, tint }: { icon: any; title: string; tint?: string }) {
  const Icon = icon;
  const t = tint || GRAD.from;
  return (
    <View className="flex-row items-center gap-2.5 mb-4">
      <View className="w-[34px] h-[34px] rounded-[10px] items-center justify-center" style={{ backgroundColor: t + '1F' }}>
        <Icon size={16} color={t} />
      </View>
      <Text className="text-white text-xl" style={{ fontFamily: TYPO.display800 }}>{title}</Text>
    </View>
  );
}

function GalleryCell({ img, onPress, style }: { img: any; onPress: () => void; style: any }) {
  return (
    <Pressable onPress={onPress} className="rounded-[10px] overflow-hidden bg-[rgba(255,255,255,0.03)]" style={style}>
      {img?.url ? (
        <Image source={{ uri: resolveImageUrl(img.url) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : (
        <View className="absolute inset-0 bg-[rgba(99,102,241,0.12)] items-center justify-center">
          <ZoomIn size={24} color={PALETTE.dim} />
        </View>
      )}
    </Pressable>
  );
}

export function EchoShowcaseView({ slug, onBack }: { slug?: string; onBack?: () => void }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 860;
  const [data, setData] = useState<any>(DEFAULT_SHOWCASE);
  const [loading, setLoading] = useState(true);
  const [lbOpen, setLbOpen] = useState(false);
  const [lbIndex, setLbIndex] = useState(0);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const sections = (data?.sections && typeof data.sections === 'object') ? data.sections : {};

  const gallery: any[] = data?.gallery || [];

  const showSection = (key: string) => sections[key] !== false;

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const resolve = async () => {
      try {
        let targetSlug = slug;
        if (targetSlug === 'vnrvjit' || targetSlug === 'vnr' || targetSlug === 'vnr-vjit') {
          targetSlug = 'vnr-vjiet';
        }
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
      } finally {
        if (mounted) setLoading(false);
      }
    };
    resolve();
    return () => { mounted = false; };
  }, [slug]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center py-20">
        <ActivityIndicator size="large" color={GRAD.from} />
        <Text className="text-muted font-body-semibold text-sm mt-3" style={{ fontFamily: FONTS.med }}>
          Loading showcase…
        </Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View className="flex-1 items-center justify-center py-20 gap-2">
        <Calendar size={32} color={PALETTE.dim} />
        <Text className="text-white text-lg" style={{ fontFamily: FONTS.semibold }}>
          Showcase not found
        </Text>
        <Text className="text-muted font-body-semibold text-sm text-center max-w-[320px]" style={{ fontFamily: FONTS.med }}>
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
    <View className="flex-1">
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
            onShare={() => setShareModalOpen(true)}
          />
        </FadeInView>
      )}

      {showSection('hero') && !(data?.hero_banners?.length > 0) && (
      <FadeInView delay={60}>
        <View className="flex-row justify-between items-center px-3 py-2 mb-[-44px] z-10 relative">
          <PressScale onPress={onBack || (() => {})}>
            <View className="flex-row items-center gap-1.5 h-8 px-2.5 rounded-2xl bg-black/50 border border-white/[0.15]">
              <ArrowLeft size={14} color="#fff" />
              <Text className="font-body-bold text-[11px] text-white">Back</Text>
            </View>
          </PressScale>
          <View className="flex-row gap-2">
            {showSection('registration') && (data?.registration?.enabled !== false) && (data?.event_status_badge !== 'Completed') && (
              <Pressable
                onPress={() => {
                  if (Platform.OS === 'web') {
                    window.location.assign(`/echo/${canonicalSlug}/register`);
                  } else {
                    router.push(`/echo/${canonicalSlug}/register` as any);
                  }
                }}
                className="rounded-[20px] overflow-hidden"
              >
                <LinearGradient colors={['#059669', '#047857']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-[20px]">
                  <Ticket size={13} color="#fff" />
                  <Text className="font-body-bold text-xs text-white">Register</Text>
                </LinearGradient>
              </Pressable>
            )}
            <PressScale onPress={() => setShareModalOpen(true)}>
              <View className="flex-row items-center gap-1.5 h-8 px-2.5 rounded-2xl bg-black/50 border border-white/[0.15]">
                <Share2 size={13} color="#fff" />
                <Text className="font-body-bold text-[11px] text-white">Share</Text>
              </View>
            </PressScale>
          </View>
        </View>
        <GlassCard className="mb-4 p-0 overflow-hidden">
          <View className="flex-row min-h-[240px]" style={!isWide ? { flexDirection: 'column' } : undefined}>
            <View className="flex-1 p-5 gap-2" style={!isWide ? { width: '100%' } : undefined}>
              <View className="flex-row items-center gap-2 flex-wrap">
                <View className="flex-row items-center gap-1.5 self-start px-2.5 py-[5px] rounded-[20px] border" style={{ backgroundColor: statusCol.bg, borderColor: statusCol.border }}>
                  <View className="w-[7px] h-[7px] rounded-full" style={{ backgroundColor: statusCol.dot }} />
                  <Text className="font-body-bold text-[10px] tracking-wider" style={{ color: statusCol.text, letterSpacing: 0.8 }}>
                    {statusKey.toUpperCase()}
                  </Text>
                </View>
                {data?.organizer_name ? (
                  <Text className="text-dim tracking-widest uppercase text-[10px]" style={{ fontFamily: TYPO.body500, letterSpacing: 1.6 }}>{data.organizer_name.toUpperCase()}</Text>
                ) : null}
              </View>
              <Text className="text-white leading-[34px]" style={{ fontFamily: TYPO.display800, fontSize: 26 }} numberOfLines={3}>
                {data?.title?.split(' ').slice(0, -1).join(' ')}{' '}
                <Text style={{ color: GRAD.from }}>{data?.title?.split(' ').slice(-1)[0]}</Text>
              </Text>
              {data?.subtitle ? <Text className="text-muted" style={{ fontFamily: TYPO.body600, fontSize: 14 }}>{data.subtitle}</Text> : null}
              {data?.description ? <Text className="text-muted text-sm leading-[19px]" style={{ fontFamily: TYPO.body400, fontSize: 12.5 }} numberOfLines={4}>{data.description}</Text> : null}
              {data?.registration?.deadline ? (
                <View className="flex-row items-center gap-1.5 self-start bg-amber/15 border border-amber/35 px-2.5 py-[5px] rounded-full">
                  <Clock size={11} color="#FBBF24" />
                  <Text className="text-amber-light font-body-semibold text-[11px]">Registration closes: {data.registration.deadline}</Text>
                </View>
              ) : null}
              <View className="gap-1.5 mt-1">
                {data?.date ? (
                  <View className="flex-row items-center gap-1.5"><Calendar size={13} color={PALETTE.muted} /><Text className="text-muted" style={{ fontFamily: TYPO.body500, fontSize: 12 }}>{data.end_date && data.end_date !== data.date ? `${data.date} – ${data.end_date}` : data.date}</Text></View>
                ) : null}
                {data?.time ? (
                  <View className="flex-row items-center gap-1.5"><Clock size={13} color={PALETTE.muted} /><Text className="text-muted" style={{ fontFamily: TYPO.body500, fontSize: 12 }}>{data.time}</Text></View>
                ) : null}
                {data?.venue ? (
                  <View className="flex-row items-center gap-1.5"><MapPin size={13} color={PALETTE.muted} /><Text className="text-muted" style={{ fontFamily: TYPO.body500, fontSize: 12 }}>{data.venue}</Text></View>
                ) : null}
                {data?.prize_pool?.total ? (
                  <View className="flex-row items-center gap-1.5"><Trophy size={13} color="#F59E0B" /><Text className="text-muted" style={{ fontFamily: TYPO.body500, fontSize: 12 }}>Prize Pool: {data.prize_pool.total}</Text></View>
                ) : null}
              </View>
            </View>
            {isWide && (
              <View className="w-[280px]">
                {data?.hero_image_url ? (
                  <EchoImg source={{ uri: resolveImageUrl(data.hero_image_url) }} className="w-full h-full rounded-tr-lg rounded-br-lg" resizeMode="cover" fallbackLabel={data?.title || 'Event'} />
                ) : (
                  <LinearGradient
                    colors={['rgba(123,61,191,0.35)', 'rgba(95,37,159,0.55)', 'rgba(30,10,80,0.80)']}
                    className="w-full h-full rounded-tr-lg rounded-br-lg"
                  >
                    <View className="items-center justify-center flex-1 gap-3">
                      <Text className="text-white text-2xl text-center" style={{ fontFamily: TYPO.display800 }}>{data?.title}</Text>
                      <Text className="text-white/70 text-sm text-center" style={{ fontFamily: TYPO.body500 }}>{data?.subtitle}</Text>
                    </View>
                  </LinearGradient>
                )}
              </View>
            )}
          </View>
        </GlassCard>
      </FadeInView>
      )}

      {showSection('stats') && stats.length > 0 && (
      <FadeInView delay={120}>
        <View className="flex-row gap-2 flex-wrap mb-3.5">
          {stats.map((stat, i) => <StatCard key={i} stat={stat} />)}
        </View>
      </FadeInView>
      )}

      {showSection('about') && (data?.description || highlights.length > 0 || data?.organizer_name) && (
      <FadeInView delay={160}>
        <View className="flex-row gap-3 mb-3.5" style={!isWide ? { flexDirection: 'column' } : undefined}>
          {((data?.description) || highlights.length > 0) && (
          <GlassCard className="flex-[2] min-w-0" style={!isWide ? { width: '100%' } : undefined} padding={22}>
            <Text className="text-white mb-2.5" style={{ fontFamily: TYPO.display700, fontSize: 15 }}>About the Event</Text>
            <Text className="text-muted text-sm leading-5" style={{ fontFamily: TYPO.body400, fontSize: 12.5 }}>{data?.description || ''}</Text>
            {highlights.length > 0 && (
            <View style={s.highlightRow}>
              {highlights.map((h, i) => <HighlightCard key={i} h={h} index={i} isLast={i === highlights.length - 1} />)}
            </View>
            )}
          </GlassCard>
          )}
          {data?.organizer_name && (
          <GlassCard className="flex min-w-0" style={!isWide ? { width: '100%' } : undefined} padding={22}>
            <Text className="text-white mb-2.5" style={{ fontFamily: TYPO.display700, fontSize: 15 }}>Event Organized By</Text>
            <View className="flex-row items-center gap-2.5">
              <View className="w-10 h-10 rounded-[10px] bg-purple-soft items-center justify-center">
                {data?.organizer_logo_url ? (
                  <Image source={{ uri: resolveImageUrl(data.organizer_logo_url) }} style={{ width: 38, height: 38, borderRadius: 10 }} resizeMode="contain" />
                ) : (
                  <Text className="text-base" style={{ fontFamily: TYPO.display800, color: GRAD.from }}>
                    {(data?.organizer_name || 'EV').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                  </Text>
                )}
              </View>
              <View className="flex-1 gap-0.5 min-w-0">
                <Text className="text-white" style={{ fontFamily: TYPO.display700, fontSize: 13 }}>{data?.organizer_name || 'Event Organizers'}</Text>
                <Text className="text-muted text-xs" style={{ fontFamily: TYPO.body400 }}>{data?.college || data?.venue || ''}</Text>
              </View>
            </View>
            {showSection('partners') && partners.length > 0 && (
              <>
                <Text className="text-white mt-4 mb-2" style={{ fontFamily: TYPO.display700, fontSize: 12 }}>In Association With</Text>
                <View className="flex-row flex-wrap gap-2">
                  {partners.map((p, i) => (
                    <View key={i} className="px-2.5 py-1.5 bg-glass-subtle rounded-[8px] border border-glass-border">
                      {p.logo_url ? (
                        <Image source={{ uri: resolveImageUrl(p.logo_url) }} style={{ width: 28, height: 28 }} resizeMode="contain" />
                      ) : (
                        <Text className="text-text text-xs" style={{ fontFamily: TYPO.body700 }}>{p.name}</Text>
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

      {showSection('gallery') && (
      <FadeInView delay={200}>
        <View className="flex-row items-center justify-between mb-2.5">
          <Text className="text-white" style={{ fontFamily: TYPO.display700, fontSize: 15 }}>Moments from the Event</Text>
          {gallery.length > 0 && (
            <Pressable onPress={() => { setLbIndex(0); setLbOpen(true); }}>
              <Text className="font-body-semibold text-xs" style={{ color: GRAD.from }}>View all photos →</Text>
            </Pressable>
          )}
        </View>
        {gallery.length === 0 ? (
          <GlassCard className="p-8 items-center">
            <ZoomIn size={28} color={PALETTE.dim} />
            <Text className="text-muted font-body-semibold text-sm mt-2.5" style={{ fontFamily: FONTS.med }}>
              No photos yet. Upload gallery photos via Admin CMS.
            </Text>
          </GlassCard>
        ) : (
          <View className="grid gap-2 mb-3.5" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gridTemplateRows: 'auto auto' } as any}>
            <GalleryCell img={gallery[0]} onPress={() => { setLbIndex(0); setLbOpen(true); }} style={{ gridRow: '1 / 3', height: 260 } as any} />
            <GalleryCell img={gallery[1]} onPress={() => { setLbIndex(1); setLbOpen(true); }} style={{ height: 125 }} />
            <GalleryCell img={gallery[2]} onPress={() => { setLbIndex(2); setLbOpen(true); }} style={{ height: 125 }} />
            <GalleryCell img={gallery[3]} onPress={() => { setLbIndex(3); setLbOpen(true); }} style={{ height: 125 }} />
            <GalleryCell img={gallery[4]} onPress={() => { setLbIndex(4); setLbOpen(true); }} style={{ height: 125 }} />
            {gallery.length > 5 && (
              <Pressable onPress={() => { setLbIndex(5); setLbOpen(true); }} className="rounded-[10px] overflow-hidden bg-[rgba(123,61,191,0.18)] border border-[rgba(123,61,191,0.30)] items-center justify-center h-[110px]">
                <Text className="text-white text-2xl" style={{ fontFamily: TYPO.display800 }}>+{gallery.length - 5}</Text>
                <Text className="text-muted text-[10px]" style={{ fontFamily: TYPO.body500 }}>More Photos</Text>
              </Pressable>
            )}
          </View>
        )}
      </FadeInView>
      )}

      {lbOpen && gallery.length > 0 && (
        <Lightbox images={gallery} startIndex={lbIndex} onClose={() => setLbOpen(false)} />
      )}

      {showSection('testimonials') && testimonials.length > 0 && (
        <FadeInView delay={240}>
          <View className="flex-row items-center justify-between mb-2.5">
            <Text className="text-white" style={{ fontFamily: TYPO.display700, fontSize: 15 }}>What People Are Saying</Text>
            <Text className="font-body-semibold text-xs" style={{ color: GRAD.from }}>View all testimonials →</Text>
          </View>
          <View className="flex-row gap-3 mb-3.5" style={!isWide ? { flexDirection: 'column' } : undefined}>
            {testimonials.slice(0, 3).map((t, i) => <TestimonialCard key={i} t={t} />)}
          </View>
        </FadeInView>
      )}

      {showSection('timeline') && timeline.length > 0 && (
        <FadeInView delay={280}>
          <Text className="text-white mb-4" style={{ fontFamily: TYPO.display700, fontSize: 15 }}>Event Highlights</Text>
          <View className="flex-row gap-0 items-start mb-3.5 flex-wrap" style={!isWide ? { flexDirection: 'column', gap: 0 } : undefined}>
            {timeline.map((item, i) => {
              const IconMap: Record<string, any> = { star: Star, users: Users, code: Zap, network: Network, default: Zap };
              const Icon = IconMap[item.icon] || IconMap.default;
              return (
                <View key={i} className="flex-1 min-w-[80px] items-center relative" style={!isWide ? { flexDirection: 'row', gap: 12, paddingVertical: 10 } : undefined}>
                  <View className="w-[38px] h-[38px] rounded-[19px] bg-[rgba(123,61,191,0.18)] border border-[rgba(123,61,191,0.35)] items-center justify-center mb-2"><Icon size={18} color={GRAD.from} /></View>
                  <View className="items-center gap-0.5 px-1">
                    <Text className="text-white text-xs text-center" style={{ fontFamily: TYPO.display700 }}>{item.title}</Text>
                    <Text className="text-muted text-[10px] text-center" style={{ fontFamily: TYPO.body400 }}>{item.description}</Text>
                  </View>
                  {isWide && i < timeline.length - 1 && (
                    <View className="absolute top-[18px] right-0 left-[55%] h-px bg-[rgba(123,61,191,0.30)]" />
                  )}
                </View>
              );
            })}
          </View>
        </FadeInView>
      )}

      {showSection('speakers') && data?.speakers && data.speakers.some((sp: any) => sp.visible !== false) && (
        <FadeInView delay={300}>
          <View className="mb-4">
            <SectionHeading icon={Mic2} title="Meet our speakers" tint={GRAD.from} />
          </View>
          <View className="flex-row flex-wrap gap-3 mb-4" style={!isWide ? { flexDirection: 'column' } : undefined}>
            {(data.speakers || []).filter((sp: any) => sp.visible !== false && !sp.is_panel_member).map((sp: any, i: number) => (
              <SpeakerCard key={i} sp={sp} />
            ))}
          </View>
        </FadeInView>
      )}

      {showSection('speakers') && data?.speakers && data.speakers.some((sp: any) => sp.visible !== false && sp.is_panel_member) && (
        <FadeInView delay={310}>
          <View className="mb-4">
            <SectionHeading icon={PanelTop} title="Panel Members" tint="#F472B6" />
          </View>
          <View className="flex-row flex-wrap gap-3 mb-4" style={!isWide ? { flexDirection: 'column' } : undefined}>
            {(data.speakers || []).filter((sp: any) => sp.visible !== false && sp.is_panel_member).map((sp: any, i: number) => (
              <SpeakerCard key={i} sp={sp} panel />
            ))}
          </View>
        </FadeInView>
      )}

      {showSection('categories') && data?.categories && data.categories.length > 0 && (
        <FadeInView delay={320}>
          <View className="mb-4">
            <SectionHeading icon={Zap} title="Problem categories" tint={GRAD.from} />
          </View>
          <View className="flex-row flex-wrap gap-2.5 mb-4">
            {data.categories.map((c: any, i: number) => <CategoryCard key={i} c={c} />)}
          </View>
        </FadeInView>
      )}

      {showSection('schedule') && data?.schedule && data.schedule.length > 0 && (
        <FadeInView delay={330}>
          <View className="mb-4">
            <SectionHeading icon={Calendar} title="Schedule" tint={GRAD.from} />
          </View>
          <GlassCard className="p-1.5 mb-4">
            {data.schedule.map((it: any, i: number) => (
              <ScheduleRow key={i} it={it} />
            ))}
          </GlassCard>
        </FadeInView>
      )}

      {showSection('panels') && data?.panels && data.panels.length > 0 && (
        <FadeInView delay={340}>
          <View className="mb-4">
            <SectionHeading icon={PanelTop} title="Panel discussions" tint="#F472B6" />
          </View>
          <View className="flex-row flex-wrap gap-3 mb-4" style={!isWide ? { flexDirection: 'column' } : undefined}>
            {data.panels.map((p: any, i: number) => <PanelCard key={i} p={p} />)}
          </View>
        </FadeInView>
      )}

      {(showSection('about') && (data?.eligibility || data?.prize_pool || data?.team_composition)) && (
        <FadeInView delay={345}>
          <View className="flex-row flex-wrap gap-3 mb-4">
            {data?.eligibility && (
              <GlassCard className="flex min-w-[220px] gap-2" style={!isWide ? { width: '100%' } : undefined} padding={18}>
                <View className="flex-row items-center gap-[7px]">
                  <Users size={15} color={GRAD.from} />
                  <Text className="text-white" style={{ fontFamily: TYPO.display700, fontSize: 14 }}>Who can participate</Text>
                </View>
                <Text className="text-muted text-sm leading-[19px]" style={{ fontFamily: TYPO.body400, fontSize: 12.5 }}>{data.eligibility}</Text>
              </GlassCard>
            )}
            {data?.team_composition && (
              <GlassCard className="flex min-w-[220px] gap-2" style={!isWide ? { width: '100%' } : undefined} padding={18}>
                <View className="flex-row items-center gap-[7px]">
                  <Users size={15} color={GRAD.from} />
                  <Text className="text-white" style={{ fontFamily: TYPO.display700, fontSize: 14 }}>Team composition</Text>
                </View>
                <Text className="text-muted text-sm leading-[19px]" style={{ fontFamily: TYPO.body400, fontSize: 12.5 }}>{data.team_composition}</Text>
              </GlassCard>
            )}
            {data?.prize_pool && (data.prize_pool.total || data.prize_pool.first) && (
              <GlassCard className="flex min-w-[220px] gap-2" style={!isWide ? { width: '100%' } : undefined} padding={18}>
                <View className="flex-row items-center gap-[7px]">
                  <Trophy size={15} color="#F59E0B" />
                  <Text className="text-white" style={{ fontFamily: TYPO.display700, fontSize: 14 }}>Prize pool</Text>
                </View>
                {data.prize_pool.total ? <Text className="text-amber-light mb-1.5" style={{ fontFamily: TYPO.display700, fontSize: 14 }}>{data.prize_pool.total}</Text> : null}
                <View className="gap-[3px]">
                  {data.prize_pool.first ? <Text className="text-muted text-sm leading-[19px]" style={{ fontFamily: TYPO.body400, fontSize: 12.5 }}>🥇 {data.prize_pool.first}</Text> : null}
                  {data.prize_pool.second ? <Text className="text-muted text-sm leading-[19px]" style={{ fontFamily: TYPO.body400, fontSize: 12.5 }}>🥈 {data.prize_pool.second}</Text> : null}
                  {data.prize_pool.third ? <Text className="text-muted text-sm leading-[19px]" style={{ fontFamily: TYPO.body400, fontSize: 12.5 }}>🥉 {data.prize_pool.third}</Text> : null}
                </View>
                {(data.prize_pool.other_prizes || []).filter(Boolean).length > 0 && (
                  <Text className="text-muted text-sm leading-[19px] mt-1.5" style={{ fontFamily: TYPO.body400, fontSize: 12.5 }}>+ {data.prize_pool.other_prizes.join(', ')}</Text>
                )}
              </GlassCard>
            )}
          </View>
        </FadeInView>
      )}

      {showSection('faqs') && data?.faqs && data.faqs.length > 0 && (
        <FadeInView delay={350}>
          <View className="mb-4">
            <SectionHeading icon={HelpCircle} title="Frequently asked questions" tint="#10B981" />
          </View>
          <View className="gap-2.5 mb-4">
            {data.faqs.map((f: any, i: number) => (
              <FaqItem
                key={i}
                f={f}
                open={faqOpen === i}
                onToggle={() => setFaqOpen(faqOpen === i ? null : i)}
              />
            ))}
          </View>
        </FadeInView>
      )}

      {/* ── SPONSORS ────────────────────────────────────────────────────── */}
      {showSection('sponsors') && (
        <FadeInView delay={300}>
          <View style={{ marginBottom: 18 }}>
            <SectionHeading icon={Building2} title="Event Sponsors & Industry Partners" tint="#A855F7" />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 26 }}>
            {(data?.sponsors && data.sponsors.length > 0 ? data.sponsors : [
              { name: 'Deloitte', tier: 'TITLE SPONSOR', description: 'Global Leader in Strategy & Tech Innovation' },
              { name: 'Featherless AI', tier: 'PLATINUM PARTNER', description: 'Decentralized Serverless LLM Inference' },
              { name: 'VNR VJIET Alumni Assoc.', tier: 'HOST CHAPTER', description: 'Campus Chapter & Ecosystem Host' },
              { name: 'Garuda Vigilance', tier: 'CYBERSECURITY PARTNER', description: 'Advanced Cloud Defense & Forensics' },
            ]).map((sp: any, i: number) => (
              <GlassCard key={i} style={{ flex: 1, minWidth: 220, padding: 22, alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 150 }}>
                {sp.logo_url ? (
                  <Image source={{ uri: resolveImageUrl(sp.logo_url) }} style={{ width: 140, height: 48 }} resizeMode="contain" />
                ) : (
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(168,85,247,0.18)', borderWidth: 1, borderColor: 'rgba(192,132,252,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 2 }}>
                    <Building2 size={24} color="#C084FC" />
                  </View>
                )}
                <Text style={{ fontFamily: TYPO.display800, fontSize: 15, color: '#fff', textAlign: 'center', letterSpacing: -0.3 }}>{sp.name}</Text>
                {sp.description ? (
                  <Text style={{ fontFamily: TYPO.body400, fontSize: 11, color: PALETTE.muted, textAlign: 'center', lineHeight: 16 }} numberOfLines={2}>{sp.description}</Text>
                ) : null}
                <View style={{ backgroundColor: 'rgba(123,61,191,0.25)', borderWidth: 1, borderColor: 'rgba(192,132,252,0.4)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, marginTop: 4 }}>
                  <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 10, color: '#D8B4FE', letterSpacing: 0.6 }}>{sp.tier || 'ECOSYSTEM PARTNER'}</Text>
                </View>
              </GlassCard>
            ))}
          </View>
        </FadeInView>
      )}

      {/* ── DOWNLOADS & RESOURCES ────────────────────────────────────────── */}
      {showSection('downloads') && (
        <FadeInView delay={310}>
          <View style={{ marginBottom: 18 }}>
            <SectionHeading icon={FileText} title="Official Resources & Downloads" tint="#38BDF8" />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 26 }}>
            {(data?.downloads && data.downloads.length > 0 ? data.downloads : [
              { title: 'Event Handbook & Schedule', description: 'Minute-by-minute itinerary, venue floor maps, lab allocations & helpline numbers', file_size: '4.2 MB · PDF', file_url: '#' },
              { title: 'Hackathon Rulebook & Guidelines', description: 'Judging criteria, submission formats, tech stack policies and academic integrity rules', file_size: '1.8 MB · PDF', file_url: '#' },
              { title: 'Problem Statements & Track Briefs', description: 'Comprehensive challenge briefs for AI Copilots, FinTech, Web3 and Smart Campus tracks', file_size: '2.4 MB · PDF', file_url: '#' },
              { title: 'Starter Kits & Sample Datasets', description: 'GitHub starter templates, pre-configured sandbox APIs, sample CSV datasets and SDK docs', file_size: '12.5 MB · ZIP', file_url: '#' },
              { title: 'Pitch Deck & Presentation Template', description: 'Official 5-minute final round slide deck template (.pptx) formatted for jury review', file_size: '3.1 MB · PPTX', file_url: '#' },
            ]).map((dl: any, i: number) => (
              <GlassCard key={i} style={{ flex: 1, minWidth: 260, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(56,189,248,0.15)', borderWidth: 1, borderColor: 'rgba(56,189,248,0.3)', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={22} color="#38BDF8" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: TYPO.display700, fontSize: 14, color: '#fff', letterSpacing: -0.2 }}>{dl.title}</Text>
                  {dl.description ? <Text style={{ fontFamily: TYPO.body400, fontSize: 11.5, color: PALETTE.muted, lineHeight: 16, marginTop: 2 }}>{dl.description}</Text> : null}
                  {dl.file_size ? <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 10.5, color: '#38BDF8', marginTop: 4 }}>{dl.file_size}</Text> : null}
                </View>
                <Pressable
                  onPress={() => {
                    if (dl.file_url && dl.file_url !== '#') {
                      if (Platform.OS === 'web') window.open(dl.file_url, '_blank');
                    } else {
                      toast.show({ title: 'Resource Access', message: `Opening ${dl.title}`, type: 'info' });
                    }
                  }}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Download size={16} color="#38BDF8" />
                </Pressable>
              </GlassCard>
            ))}
          </View>
        </FadeInView>
      )}

      {showSection('cta') && (data?.cta_title || data?.cta_subtitle || data?.cta_button_text) && (
      <FadeInView delay={320}>
        <LinearGradient
          colors={['rgba(123,61,191,0.25)', 'rgba(95,37,159,0.40)']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          className="flex-row items-center gap-3.5 rounded-lg p-4 mb-3.5 border border-[rgba(123,61,191,0.25)]"
          style={!isWide ? { flexDirection: 'column', alignItems: 'stretch' } : undefined}
        >
          <View className="flex-row items-center gap-3.5 flex-1" style={!isWide ? { flexDirection: 'column', alignItems: 'flex-start' } : undefined}>
            <View className="w-11 h-11 rounded-[22px] bg-[rgba(123,61,191,0.20)] items-center justify-center">
              <Calendar size={22} color={GRAD.from} />
            </View>
            <View className="flex-1 gap-1">
              <Text className="text-white" style={{ fontFamily: TYPO.display800, fontSize: 15 }}>{data?.cta_title || ''}</Text>
              <Text className="text-muted text-xs" style={{ fontFamily: TYPO.body400 }}>{data?.cta_subtitle || ''}</Text>
            </View>
          </View>
          <LinearGradient colors={[GRAD.from, GRAD.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="px-4 py-2.5 rounded-xl" style={!isWide ? { alignSelf: 'stretch', alignItems: 'center', marginTop: 4 } : undefined}>
            <Text className="font-body-bold text-xs text-white">{data?.cta_button_text || 'Learn More'}</Text>
          </LinearGradient>
        </LinearGradient>
      </FadeInView>
      )}

      {shareModalOpen && (
        <Modal transparent animationType="fade" onRequestClose={() => setShareModalOpen(false)}>
          <Pressable className="flex-1 bg-black/75 items-center justify-center p-5" onPress={() => setShareModalOpen(false)}>
            <Pressable className="w-full max-w-[420px] bg-[#0d1326] rounded-[18px] border border-glass-border p-5 gap-3" onPress={(e) => e.stopPropagation()}>
              <View className="flex-row items-center justify-between border-b border-white/[0.08] pb-3">
                <Text className="text-purple-light" style={{ fontFamily: TYPO.display700, fontSize: 13, letterSpacing: 0.8 }}>SHARE EVENT</Text>
                <Pressable onPress={() => setShareModalOpen(false)} className="p-1">
                  <X size={18} color="#fff" />
                </Pressable>
              </View>

              <Text className="text-muted font-body-semibold text-sm leading-[18px]" style={{ fontFamily: FONTS.med }}>
                Share <Text className="text-white font-body-bold">{data?.title || 'SNIST Hackwave 3.0'}</Text> with your friends & teammates:
              </Text>

              <View className="gap-2.5 mt-2">
                <Pressable
                  onPress={() => {
                    const url = typeof window !== 'undefined' ? window.location.href : 'http://localhost:8081/echo/snist';
                    const text = encodeURIComponent(`🚀 Join ${data?.title || 'SNIST Hackwave 3.0'} — National Level AI Hackathon!\n\nRegister now: ${url}`);
                    const waUrl = `https://api.whatsapp.com/send?text=${text}`;
                    if (Platform.OS === 'web' && typeof window !== 'undefined') window.open(waUrl, '_blank');
                    else Linking.openURL(waUrl);
                    setShareModalOpen(false);
                  }}
                  className="flex-row items-center gap-3 px-4 py-3 rounded-xl border"
                  style={{ backgroundColor: 'rgba(37,211,102,0.15)', borderColor: 'rgba(37,211,102,0.4)' }}
                >
                  <Text style={{ fontSize: 18 }}>🟢</Text>
                  <Text className="font-body-semibold text-base flex-1" style={{ color: '#25D366' }}>Share on WhatsApp</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    const url = typeof window !== 'undefined' ? window.location.href : 'http://localhost:8081/echo/snist';
                    const text = encodeURIComponent(`🚀 Join ${data?.title || 'SNIST Hackwave 3.0'} — National Level AI Hackathon!`);
                    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${text}`;
                    if (Platform.OS === 'web' && typeof window !== 'undefined') window.open(tgUrl, '_blank');
                    else Linking.openURL(tgUrl);
                    setShareModalOpen(false);
                  }}
                  className="flex-row items-center gap-3 px-4 py-3 rounded-xl border"
                  style={{ backgroundColor: 'rgba(0,136,204,0.15)', borderColor: 'rgba(0,136,204,0.4)' }}
                >
                  <Text style={{ fontSize: 18 }}>✈️</Text>
                  <Text className="font-body-semibold text-base flex-1" style={{ color: '#38BDF8' }}>Share on Telegram</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    const url = typeof window !== 'undefined' ? window.location.href : 'http://localhost:8081/echo/snist';
                    if (typeof window !== 'undefined' && navigator.clipboard) {
                      navigator.clipboard.writeText(url);
                      toast.success('Event link copied to clipboard!');
                    }
                    setShareModalOpen(false);
                  }}
                  className="flex-row items-center gap-3 px-4 py-3 rounded-xl border"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)' }}
                >
                  <Link2 size={16} color="#A78BFA" />
                  <Text className="font-body-semibold text-base text-white flex-1">Copy Event Link</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}
