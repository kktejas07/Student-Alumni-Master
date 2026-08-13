/**
 * <AnnouncementPopup /> — centered modal popup shown on site visit.
 *
 * Fetches active promotions (placement=modal) + upcoming Echo showcases
 * from GET /api/promotions/popup. Dismiss state persisted in localStorage.
 * Web-only. Mounted globally in app/_layout.tsx.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, Modal, ScrollView, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Calendar, MapPin, Clock, Sparkles, ArrowRight } from 'lucide-react-native';
import { PALETTE, FONTS } from '@/src/views/web/portals/student/tokens';
import { api, resolveImageUrl } from '@/src/models/services/api';

interface PromoItem {
  id: string;
  title: string;
  body: string;
  cta_label?: string;
  cta_url?: string;
  badge?: string;
  tone: string;
  image_url?: string;
}

interface EventItem {
  id: string;
  title: string;
  slug: string;
  date: string;
  time: string;
  venue: string;
  hero_image_url?: string;
  subtitle: string;
}

const DISMISSED_KEY = 'sa.announce.dismissed.v1';

function readDismissed(): Record<string, number> {
  if (Platform.OS !== 'web') return {};
  try { return JSON.parse(window.localStorage.getItem(DISMISSED_KEY) || '{}') || {}; }
  catch { return {}; }
}
function writeDismissed(map: Record<string, number>) {
  if (Platform.OS !== 'web') return;
  try { window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(map)); } catch {}
}

const TONE_GRAD: Record<string, string[]> = {
  violet:  ['#A78BFA', '#7C3AED'],
  blue:    ['#60A5FA', '#3B82F6'],
  indigo:  ['#818CF8', '#6366F1'],
  teal:    ['#5EEAD4', '#14B8A6'],
  amber:   ['#FCD34D', '#F59E0B'],
  rose:    ['#FDA4AF', '#F43F5E'],
  emerald: ['#6EE7B7', '#10B981'],
};

export function AnnouncementPopup() {
  if (Platform.OS !== 'web') return null;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [promos, setPromos] = useState<PromoItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePromoIdx, setActivePromoIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const dismissed = readDismissed();

    // Check if all items have been dismissed
    const allDismissed = (items: PromoItem[]) =>
      items.length > 0 && items.every((p) => dismissed[p.id]);

    (async () => {
      try {
        const r = await fetch('/api/promotions/popup');
        if (!r.ok) return;
        const data = await r.json();
        if (cancelled) return;

        const promosData = data.promos || [];
        const eventsData = data.events || [];

        setPromos(promosData);
        setEvents(eventsData);

        // Show popup if there's content and not all dismissed
        if ((promosData.length > 0 && !allDismissed(promosData)) || eventsData.length > 0) {
          const t = setTimeout(() => setOpen(true), 1200);
          return () => clearTimeout(t);
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const onDismiss = useCallback(() => {
    const now = Date.now();
    const next: Record<string, number> = { ...readDismissed() };
    promos.forEach((p) => { next[p.id] = now; });
    writeDismissed(next);
    setOpen(false);
  }, [promos]);

  const onPromoCta = useCallback((url: string) => {
    if (!url) return;
    if (/^https?:\/\//.test(url)) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      onDismiss();
      router.push(url);
    }
  }, [onDismiss, router]);

  const onEventPress = useCallback((slug: string) => {
    onDismiss();
    router.push(`/echo/${slug}`);
  }, [onDismiss, router]);

  if (!open || loading) return null;
  if (promos.length === 0 && events.length === 0) return null;

  const activePromo = promos[activePromoIdx] || null;
  const grad = activePromo ? (TONE_GRAD[activePromo.tone] || TONE_GRAD.violet) : TONE_GRAD.violet;

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={s.backdrop}>
        <Animated.View entering={FadeIn.duration(280)} exiting={FadeOut.duration(180)} style={s.card}>
          {/* Header */}
          <View style={s.cardHeader}>
            <View style={s.headerLeft}>
              <Sparkles size={16} color="#A78BFA" />
              <Text style={s.headerTitle}>Stay Updated</Text>
            </View>
            <Pressable onPress={onDismiss} style={s.closeBtn}>
              <X size={16} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </View>

          <ScrollView style={s.scrollArea} contentContainerStyle={s.scrollContent}>
            {/* Announcement section */}
            {activePromo && (
              <View style={s.section}>
                {activePromo.badge && (
                  <View style={[s.badge, { backgroundColor: grad[0] + '22', borderColor: grad[0] + '44' }]}>
                    <Text style={[s.badgeText, { color: grad[0] }]}>{activePromo.badge}</Text>
                  </View>
                )}
                {activePromo.image_url ? (
                  <Image source={{ uri: resolveImageUrl(activePromo.image_url) }} style={s.promoImage} resizeMode="cover" />
                ) : null}
                <Text style={s.promoTitle}>{activePromo.title}</Text>
                {activePromo.body ? <Text style={s.promoBody}>{activePromo.body}</Text> : null}
                {activePromo.cta_url && (
                  <Pressable onPress={() => onPromoCta(activePromo.cta_url!)}>
                    <LinearGradient colors={grad as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.ctaBtn}>
                      <Text style={s.ctaBtnText}>{activePromo.cta_label || 'Learn More'}</Text>
                      <ArrowRight size={14} color="#fff" />
                    </LinearGradient>
                  </Pressable>
                )}
                {/* Promo dots */}
                {promos.length > 1 && (
                  <View style={s.dots}>
                    {promos.map((_, i) => (
                      <Pressable
                        key={i}
                        onPress={() => setActivePromoIdx(i)}
                        style={[s.dot, i === activePromoIdx && { backgroundColor: grad[0] }]}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Upcoming events section */}
            {events.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Upcoming Events</Text>
                {events.map((ev) => (
                  <Pressable key={ev.id} onPress={() => onEventPress(ev.slug)} style={s.eventCard}>
                    {ev.hero_image_url ? (
                      <Image source={{ uri: resolveImageUrl(ev.hero_image_url) }} style={s.eventImg} resizeMode="cover" />
                    ) : (
                      <View style={[s.eventImg, s.eventImgPlaceholder]}>
                        <Sparkles size={18} color="#A78BFA" />
                      </View>
                    )}
                    <View style={s.eventInfo}>
                      <Text style={s.eventTitle} numberOfLines={1}>{ev.title}</Text>
                      {ev.date ? (
                        <View style={s.eventMeta}>
                          <Calendar size={11} color={PALETTE.muted} />
                          <Text style={s.eventMetaText}>{ev.date}</Text>
                        </View>
                      ) : null}
                      {ev.venue ? (
                        <View style={s.eventMeta}>
                          <MapPin size={11} color={PALETTE.muted} />
                          <Text style={s.eventMetaText} numberOfLines={1}>{ev.venue}</Text>
                        </View>
                      ) : null}
                    </View>
                    <ArrowRight size={14} color="rgba(255,255,255,0.3)" />
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={s.cardFooter}>
            <Pressable onPress={onDismiss} style={s.dismissBtn}>
              <Text style={s.dismissBtnText}>Maybe Later</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '80vh',
    backgroundColor: 'rgba(15,20,40,0.97)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.18)',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 40px rgba(124,58,237,0.12)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#E5E7EB',
    fontFamily: FONTS.bold,
    fontSize: 14,
  },
  closeBtn: {
    padding: 4,
  },
  scrollArea: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: PALETTE.muted,
    fontFamily: FONTS.semi,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  promoImage: {
    width: '100%',
    height: 160,
    borderRadius: 10,
  },
  promoTitle: {
    color: '#F3F4F6',
    fontFamily: FONTS.bold,
    fontSize: 16,
    lineHeight: 22,
  },
  promoBody: {
    color: PALETTE.muted,
    fontFamily: FONTS.med,
    fontSize: 13,
    lineHeight: 19,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  ctaBtnText: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
  },
  eventImg: {
    width: 52,
    height: 52,
    borderRadius: 8,
  },
  eventImgPlaceholder: {
    backgroundColor: 'rgba(167,139,250,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventInfo: {
    flex: 1,
    gap: 3,
  },
  eventTitle: {
    color: '#E5E7EB',
    fontFamily: FONTS.semi,
    fontSize: 13,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventMetaText: {
    color: PALETTE.dim,
    fontFamily: FONTS.med,
    fontSize: 11,
  },
  cardFooter: {
    padding: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  dismissBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  dismissBtnText: {
    color: PALETTE.dim,
    fontFamily: FONTS.med,
    fontSize: 12,
  },
});
