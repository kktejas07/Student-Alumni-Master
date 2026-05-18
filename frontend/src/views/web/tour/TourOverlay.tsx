/**
 * <TourOverlay /> — renders the spotlight + tooltip for the active tour.
 *
 * Mounted ONCE in app/_layout.tsx so it covers every portal. It uses the
 * tour state from <TourProvider /> and positions a tooltip next to the
 * targeted DOM element (web only).
 *
 * It uses an SVG mask (rect minus rounded rect) to dim the page and
 * highlight the target with a clean cutout.
 */
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Dimensions } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Sparkles, X, ArrowRight, ArrowLeft, Check } from 'lucide-react-native';
import { useTour } from './TourProvider';
import { TOURS } from './tours.config';

type Rect = { x: number; y: number; w: number; h: number };

const PADDING = 10;
const BORDER_RADIUS = 14;

function measureTarget(selector: string): Rect | null {
  if (Platform.OS !== 'web') return null;
  // Accept both the legacy [data-tour-id="..."] form and the new #id form.
  let el: HTMLElement | null = document.querySelector(selector) as HTMLElement | null;
  if (!el && selector.startsWith('[data-tour-id="')) {
    // Fall back to id selector for the same key, since RN Web doesn't forward
    // unknown HTML attributes on View / Pressable — we now use nativeID.
    const m = selector.match(/^\[data-tour-id="([^"]+)"\]$/);
    if (m) {
      const id = m[1];
      el = (document.getElementById(id) || document.querySelector('#' + id)) as HTMLElement | null;
    }
  }
  if (!el) return null;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const r = el.getBoundingClientRect();
  // Skip if hidden or off-screen with zero size
  if (r.width === 0 && r.height === 0) return null;
  return {
    x: Math.max(0, r.left - PADDING),
    y: Math.max(0, r.top - PADDING),
    w: r.width + PADDING * 2,
    h: r.height + PADDING * 2,
  };
}

export function TourOverlay() {
  if (Platform.OS !== 'web') return null;

  const { active, stepIdx, next, back, skip, complete } = useTour();
  const [rect, setRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  const cfg = active ? TOURS[active] : null;
  const step = cfg && cfg.steps[stepIdx];
  const isLast = !!cfg && stepIdx === cfg.steps.length - 1;
  const accent = cfg?.accent || '#A78BFA';

  // Track viewport so we re-measure on resize
  useEffect(() => {
    if (!active) return;
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [active]);

  // Measure target every frame while the tour is showing this step. We poll
  // briefly because elements may mount slightly after the step changes.
  useLayoutEffect(() => {
    if (!step) { setRect(null); return; }
    let cancelled = false;
    let attempts = 0;
    const measure = () => {
      const r = measureTarget(step.target);
      if (cancelled) return;
      if (r) { setRect(r); return; }
      attempts += 1;
      if (attempts < 25) setTimeout(measure, 100); // ~2.5s grace
      else setRect(null);
    };
    measure();
    return () => { cancelled = true; };
  }, [step, active]);

  if (!active || !cfg || !step) return null;

  // Pick a tooltip position that fits in the viewport.
  const tt = computeTooltipPos(rect, viewport, step.placement);

  return (
    <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)} pointerEvents="box-none" style={s.root}>
      {/* SVG dimming layer with cutout */}
      <SpotlightSVG rect={rect} viewport={viewport} accent={accent} />

      {/* Tooltip */}
      <View pointerEvents="auto" style={[s.tipWrap, { left: tt.x, top: tt.y, maxWidth: tt.maxW }]}>
        <View style={[s.tip, { borderColor: accent + '99' }]}>
          <View style={[s.tipHead, { borderBottomColor: accent + '33' }]}>
            <View style={[s.tipBadge, { backgroundColor: accent + '22', borderColor: accent + '55' }]}>
              <Sparkles size={11} color={accent} />
              <Text style={[s.tipBadgeText, { color: accent }]}>
                Step {stepIdx + 1} of {cfg.steps.length}
              </Text>
            </View>
            <Pressable onPress={skip} style={s.tipClose}>
              <X size={13} color="rgba(255,255,255,0.55)" />
            </Pressable>
          </View>
          <Text style={s.tipTitle}>{step.title}</Text>
          <Text style={s.tipBody}>{step.body}</Text>
          <View style={s.tipFoot}>
            <Pressable onPress={skip} style={s.skipBtn}>
              <Text style={s.skipBtnText}>Skip tour</Text>
            </Pressable>
            <View style={{ flex: 1 }} />
            {stepIdx > 0 && (
              <Pressable onPress={back} style={s.ghostBtn}>
                <ArrowLeft size={12} color="rgba(255,255,255,0.78)" />
                <Text style={s.ghostBtnText}>Back</Text>
              </Pressable>
            )}
            <Pressable onPress={isLast ? complete : next}>
              <View style={[s.primaryBtn, { backgroundColor: accent }]}>
                {isLast ? <Check size={12} color="#fff" /> : <ArrowRight size={12} color="#fff" />}
                <Text style={s.primaryBtnText}>{isLast ? 'Done' : 'Next'}</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

function SpotlightSVG({ rect, viewport, accent }: { rect: Rect | null; viewport: { w: number; h: number }; accent: string }) {
  // We render the SVG via dangerouslySetInnerHTML on a web View. RN Web's
  // <View> is a div, so we just stuff an <svg> child. This avoids pulling
  // in react-native-svg purely for an overlay.
  //
  // SAFETY: The SVG is built exclusively from trusted numeric values (viewport
  // dimensions, rect coordinates from getBoundingClientRect, accent color hex).
  // No user-supplied strings are interpolated — the template literals use
  // only controlled integer and color data, so there is no XSS risk.
  const r = rect || { x: viewport.w / 2 - 60, y: viewport.h / 2 - 30, w: 120, h: 60 };
  const svg = `
    <svg width="${viewport.w}" height="${viewport.h}" viewBox="0 0 ${viewport.w} ${viewport.h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <mask id="hole">
          <rect width="${viewport.w}" height="${viewport.h}" fill="white" />
          <rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="${BORDER_RADIUS}" ry="${BORDER_RADIUS}" fill="black" />
        </mask>
      </defs>
      <rect width="${viewport.w}" height="${viewport.h}" fill="rgba(8,11,22,0.78)" mask="url(#hole)" />
      <rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="${BORDER_RADIUS}" ry="${BORDER_RADIUS}"
            fill="none" stroke="${accent}" stroke-width="2" opacity="0.95" />
    </svg>
  `;
  return (
    <View pointerEvents="none" style={s.svgLayer}>
      {/* @ts-ignore web-only — RN Web's View is a div */}
      <div
        style={{ width: viewport.w, height: viewport.h }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </View>
  );
}

function computeTooltipPos(
  rect: Rect | null,
  viewport: { w: number; h: number },
  placement?: 'top' | 'right' | 'bottom' | 'left' | 'center',
) {
  const TT_W = 360;
  const TT_H_EST = 220;
  const GAP = 14;
  const maxW = Math.min(TT_W, Math.max(280, viewport.w - 32));

  // Fallback when target couldn't be measured — center it
  if (!rect || placement === 'center') {
    return {
      x: Math.max(16, viewport.w / 2 - maxW / 2),
      y: Math.max(16, viewport.h / 2 - TT_H_EST / 2),
      maxW,
    };
  }

  let x = rect.x + rect.w + GAP; // default: right
  let y = rect.y;
  let p = placement || 'right';

  // Try preferred placement first
  const choose = (pl: typeof p): { x: number; y: number } => {
    switch (pl) {
      case 'right':  return { x: rect.x + rect.w + GAP, y: rect.y };
      case 'left':   return { x: rect.x - maxW - GAP, y: rect.y };
      case 'top':    return { x: rect.x, y: rect.y - TT_H_EST - GAP };
      case 'bottom': return { x: rect.x, y: rect.y + rect.h + GAP };
      default:       return { x: rect.x + rect.w + GAP, y: rect.y };
    }
  };

  const fits = (pos: { x: number; y: number }) => (
    pos.x >= 8 && pos.x + maxW <= viewport.w - 8 &&
    pos.y >= 8 && pos.y + TT_H_EST <= viewport.h - 8
  );

  const order: Array<typeof p> = [p, 'right', 'bottom', 'left', 'top'].filter((v, i, a) => a.indexOf(v) === i) as any;
  for (const pl of order) {
    const pos = choose(pl);
    if (fits(pos)) { x = pos.x; y = pos.y; break; }
  }

  // Final clamp
  x = Math.max(8, Math.min(x, viewport.w - maxW - 8));
  y = Math.max(8, Math.min(y, viewport.h - TT_H_EST - 8));
  return { x, y, maxW };
}

const s = StyleSheet.create({
  root: {
    position: 'absolute' as any,
    left: 0, top: 0, right: 0, bottom: 0,
    zIndex: 10_000,
    ...(Platform.OS === 'web' ? ({ position: 'fixed' as any } as any) : {}),
  },
  svgLayer: { position: 'absolute' as any, left: 0, top: 0 },
  tipWrap: { position: 'absolute' as any },
  tip: {
    backgroundColor: '#0F1426',
    borderRadius: 14, borderWidth: 1,
    padding: 16,
    ...(Platform.OS === 'web' ? ({
      boxShadow: '0 24px 56px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06) inset',
    } as any) : {}),
  },
  tipHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottomWidth: 1, marginBottom: 10 },
  tipBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 3.5, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start',
  },
  tipBadgeText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 10.5, letterSpacing: 0.4 },
  tipClose: { padding: 4, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  tipTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 15, letterSpacing: -0.3 },
  tipBody:  { color: 'rgba(255,255,255,0.78)', fontFamily: 'DMSans_500Medium', fontSize: 12.5, lineHeight: 18, marginTop: 6 },
  tipFoot:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  skipBtn:  { paddingHorizontal: 4, paddingVertical: 6, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  skipBtnText: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_700Bold', fontSize: 11.5 },
  ghostBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  ghostBtnText: { color: 'rgba(255,255,255,0.78)', fontFamily: 'DMSans_700Bold', fontSize: 11.5 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  primaryBtnText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 11.5 },
});
