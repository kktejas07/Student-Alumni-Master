/**
 * SponsorStrip + DashboardFooter — shared cross-portal components.
 *
 * Used on:
 *   - Landing page (below the feature pillars section, and inside the footer)
 *   - Every dashboard footer (Student / Alumni / College / Mentor / Super Admin)
 *
 * Pulls live data from GET /api/landing/partners — falls back to a clean
 * empty state if no partners exist (we hide the strip in that case).
 *
 * Theme: FinTax360 Jewel-glass. Logos are rendered onto navy with white-tint
 * fallback if no inverted variant exists.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';

import { request, resolveImageUrl } from '@/src/models/services/api';
import { GlassCard, Kicker } from '@/src/views/web/portals/student/glass';
import { PALETTE, TYPO } from '@/src/views/web/portals/student/tokens';

export type Partner = {
  id: string;
  name: string;
  category: 'college' | 'company' | 'sponsor';
  logo_url: string;
  logo_white_url?: string | null;
  display_order: number;
  is_active: boolean;
};

// ─────────────────────────────────────────────────────────────────────────
// usePartners — fetch + cache across the page lifetime
// ─────────────────────────────────────────────────────────────────────────
let _cached: Partner[] | null = null;
let _cachePromise: Promise<Partner[]> | null = null;

async function fetchPartners(): Promise<Partner[]> {
  if (_cached) return _cached;
  if (_cachePromise) return _cachePromise;
  _cachePromise = (async () => {
    try {
      const res = await request<{ items: Partner[] }>('/landing/partners');
      _cached = res?.items || [];
      return _cached;
    } catch {
      _cached = [];
      return [];
    } finally {
      _cachePromise = null;
    }
  })();
  return _cachePromise;
}

export function usePartners() {
  const [partners, setPartners] = useState<Partner[] | null>(_cached);
  const [loading, setLoading] = useState(!_cached);
  useEffect(() => {
    let cancelled = false;
    if (!_cached) {
      fetchPartners().then((p) => {
        if (!cancelled) {
          setPartners(p);
          setLoading(false);
        }
      });
    }
    return () => { cancelled = true; };
  }, []);
  return { partners: partners || [], loading };
}

// ─────────────────────────────────────────────────────────────────────────
// <SponsorStrip /> — horizontal logo strip with category grouping
// ─────────────────────────────────────────────────────────────────────────
export function SponsorStrip({
  variant = 'section',   // 'section' (big landing block) | 'footer' (compact row)
}: {
  variant?: 'section' | 'footer';
}) {
  const { partners, loading } = usePartners();

  // Hide entirely when no active partners
  if (!loading && partners.length === 0) return null;

  // Group by category for the section variant
  const grouped = {
    college: partners.filter((p) => p.category === 'college'),
    company: partners.filter((p) => p.category === 'company'),
    sponsor: partners.filter((p) => p.category === 'sponsor'),
  };
  const hasGrouping = (grouped.college.length > 0 ? 1 : 0)
                    + (grouped.company.length > 0 ? 1 : 0)
                    + (grouped.sponsor.length > 0 ? 1 : 0) > 1;

  if (variant === 'footer') {
    // Tight one-line strip used inside DashboardFooter
    return (
      <View style={s.footerStrip}>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonLogo key={i} h={28} w={84} />)
          : partners.map((p) => <LogoTile key={p.id} partner={p} h={28} dark />)
        }
      </View>
    );
  }

  // Big landing section
  return (
    <View style={{ paddingHorizontal: 20, marginTop: 60, marginBottom: 20 }}>
      <View style={{ maxWidth: 1280, width: '100%', alignSelf: 'center' }}>
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <Kicker color="rgba(167,139,250,0.85)">Sponsored Collaboration Partners</Kicker>
          <Text style={s.sectionTitle}>Built with partners who believe in students</Text>
        </View>

        <GlassCard radius={20} padding={32}>
          {loading ? (
            <View style={s.row}>
              {Array.from({ length: 8 }).map((_, i) => <SkeletonLogo key={i} h={40} w={120} />)}
            </View>
          ) : hasGrouping ? (
            <View style={{ gap: 28 }}>
              {grouped.college.length > 0 && (
                <Group title="Academic Partners" tone={PALETTE.violet}>
                  {grouped.college.map((p) => <LogoTile key={p.id} partner={p} h={44} />)}
                </Group>
              )}
              {grouped.company.length > 0 && (
                <Group title="Collaboration" tone="#3B82F6">
                  {grouped.company.map((p) => <LogoTile key={p.id} partner={p} h={44} />)}
                </Group>
              )}
              {grouped.sponsor.length > 0 && (
                <Group title="Sponsors" tone="#F59E0B">
                  {grouped.sponsor.map((p) => <LogoTile key={p.id} partner={p} h={44} />)}
                </Group>
              )}
            </View>
          ) : (
            <View style={s.row}>
              {partners.map((p) => <LogoTile key={p.id} partner={p} h={44} />)}
            </View>
          )}
        </GlassCard>
      </View>
    </View>
  );
}

function Group({ title, tone, children }: { title: string; tone: string; children: React.ReactNode }) {
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <View style={{ width: 6, height: 6, borderRadius: 9999, backgroundColor: tone }} />
        <Text style={s.groupTitle}>{title}</Text>
      </View>
      <View style={s.row}>{children}</View>
    </View>
  );
}

function LogoTile({ partner, h = 44, dark = false }: { partner: Partner; h?: number; dark?: boolean }) {
  const src = partner.logo_white_url || partner.logo_url;
  // If only color logo exists, brightness-invert to make it visible on navy
  const needsInvert = !partner.logo_white_url && Platform.OS === 'web';
  return (
    <View style={[s.logoTile, dark && { paddingHorizontal: 10, paddingVertical: 6 }]}>
      <Image
        source={{ uri: resolveImageUrl(src) }}
        style={[
          { height: h, width: h * 2.6, resizeMode: 'contain' },
          needsInvert ? ({ filter: 'brightness(0) invert(1)' } as any) : undefined,
        ]}
        accessibilityLabel={partner.name}
      />
    </View>
  );
}

function SkeletonLogo({ h, w }: { h: number; w: number }) {
  return <View style={{ height: h, width: w, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.06)' }} />;
}

// ─────────────────────────────────────────────────────────────────────────
// <DashboardFooter /> — used inside every portal shell (bottom strip)
// ─────────────────────────────────────────────────────────────────────────
export function DashboardFooter({ portal }: { portal: 'student' | 'alumni' | 'college' | 'mentor' | 'super_admin' }) {
  const router = useRouter();
  const year = new Date().getFullYear();

  return (
    <View style={s.dashFoot}>
      <View style={{ maxWidth: 1280, width: '100%', alignSelf: 'center' }}>
        <View style={s.dashFootRow}>
          <Text style={s.dashFootCopy}>© {year} StudentAlumni · All rights reserved</Text>
          <View style={{ flexDirection: 'row', gap: 18, flexWrap: 'wrap' }}>
            <Pressable onPress={() => router.push('/policy/privacy')}>
              <Text style={s.dashFootLink}>Privacy Policy</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/policy/terms')}>
              <Text style={s.dashFootLink}>Terms of Service</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/policy/cookies')}>
              <Text style={s.dashFootLink}>Cookies</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  sectionTitle: {
    color: '#fff',
    fontFamily: TYPO.display700,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
    marginTop: 8,
    textAlign: 'center',
  },
  groupTitle: { color: 'rgba(255,255,255,0.85)', fontFamily: TYPO.body700, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase' as any },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 28, alignItems: 'center', justifyContent: 'center' },
  logoTile: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  footerStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  // dashboard footer
  dashFoot: {
    paddingHorizontal: 22, paddingVertical: 18,
    backgroundColor: 'rgba(10,15,30,0.55)',
    borderTopWidth: 1, borderTopColor: PALETTE.glassBorder,
    marginTop: 32,
  },
  dashFootDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  dashFootRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  dashFootCopy: { color: 'rgba(255,255,255,0.45)', fontFamily: TYPO.body500, fontSize: 12 },
  dashFootLink: { color: 'rgba(255,255,255,0.72)', fontFamily: TYPO.body600, fontSize: 12.5 },
});
