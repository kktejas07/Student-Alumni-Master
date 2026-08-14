/**
 * /styleguide — live demo of every Apple HIG primitive in light & dark.
 *
 * Public route (no auth). Visit at /styleguide to verify the new design
 * system before applying it page-by-page across the app.
 *
 * Sections:
 *   1. Theme switch (light · dark · system) — persists via AsyncStorage
 *   2. Typography scale (display → caption)
 *   3. Color palette (brand + Apple semantic)
 *   4. Buttons — every variant × every size × loading state
 *   5. Cards — default, glass, interactive
 *   6. Tabs — animated underline
 *   7. SegmentedControl — sliding pill
 *   8. Modal — responsive (bottom sheet on phone, centered on tablet+)
 *   9. Sheet — right / left / bottom drawers
 *  10. GlassTopbar — gains blur on scroll
 *  11. Responsive viewport indicator
 *
 * Resize the browser window or rotate device to verify the whole system
 * reacts at xs/sm/md/lg/xl/2xl/3xl.
 */
import React, { useState, useRef } from 'react';
import { View, ScrollView, StyleSheet, Pressable, NativeSyntheticEvent, NativeScrollEvent, Platform, useWindowDimensions } from 'react-native';
import { ThemeProvider, useTheme } from '@/src/theme/ThemeContext';
import { SP, RADII, BRAND, APPLE_SEMANTIC } from '@/src/theme/apple';
import { useBreakpoint } from '@/src/theme/breakpoints';
import {
  AppleText, Card, Button, Modal, Sheet, Tabs, SegmentedControl, GlassTopbar, ScrollReveal,
} from '@/src/motion/apple/components';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';

export default function StyleguideRoute() {
  if (Platform.OS === 'web') return <Redirect href="/welcome" />;
  return (
    <ThemeProvider>
      <Styleguide />
    </ThemeProvider>
  );
}

function Styleguide() {
  const { theme, mode, setMode, isDark } = useTheme();
  const bp = useBreakpoint();
  const [scrolled, setScrolled] = useState(false);
  const [tab, setTab] = useState('overview');
  const [seg, setSeg] = useState<'day' | 'week' | 'month'>('week');
  const [modalOpen, setModalOpen] = useState(false);
  const [sheetSide, setSheetSide] = useState<'right' | 'left' | 'bottom' | null>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrolled(e.nativeEvent.contentOffset.y > 8);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Sticky glass topbar */}
      <GlassTopbar scrolled={scrolled}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm, flex: 1 }}>
          <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}>
            <AppleText variant="caption" style={{ color: '#fff', fontWeight: '700' }}>SA</AppleText>
          </View>
          <AppleText variant="bodyStrong">Styleguide</AppleText>
          <View style={{ flex: 1 }} />
          <SegmentedControl<'light' | 'dark' | 'system'>
            options={[
              { id: 'light', label: 'Light' },
              { id: 'dark', label: 'Dark' },
              { id: 'system', label: 'Auto' },
            ]}
            value={mode}
            onChange={setMode}
          />
        </View>
      </GlassTopbar>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: bp.isPhone ? SP.base : SP.xxl, paddingTop: SP.lg, paddingBottom: SP.giga, gap: SP.xl }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Header / responsive indicator */}
        <ScrollReveal>
          <View style={{ marginTop: SP.base, marginBottom: SP.md }}>
            <AppleText variant="display">Apple Design System</AppleText>
            <AppleText variant="body" tone="secondary" style={{ marginTop: SP.sm }}>
              7 primitives · light + dark · responsive · reduced-motion safe
            </AppleText>
            <View style={{ flexDirection: 'row', gap: SP.sm, marginTop: SP.md, flexWrap: 'wrap' }}>
              <Pill label={`Breakpoint: ${bp.bp}`} tint={theme.primary} />
              <Pill label={`${Math.round(bp.width)}×${Math.round(bp.height)}`} tint={theme.blue} />
              <Pill label={isDark ? 'Dark' : 'Light'} tint={theme.purple} />
            </View>
          </View>
        </ScrollReveal>

        {/* 2. Typography */}
        <Section title="Typography">
          <Card>
            <View style={{ gap: SP.md }}>
              <AppleText variant="display">Display 34</AppleText>
              <AppleText variant="h1">Heading 1 · 28</AppleText>
              <AppleText variant="h2">Heading 2 · 22</AppleText>
              <AppleText variant="h3">Heading 3 · 17</AppleText>
              <AppleText variant="body">Body — the quick brown fox jumps over the lazy dog. 15</AppleText>
              <AppleText variant="bodyStrong">Body Strong — the quick brown fox jumps. 15/600</AppleText>
              <AppleText variant="caption" tone="secondary">Caption · 12</AppleText>
            </View>
          </Card>
        </Section>

        {/* 3. Color palette */}
        <Section title="Colors">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.md }}>
            <Swatch color={theme.primary} label="Brand" hex={theme.primary} />
            <Swatch color={theme.blue} label="Blue" hex={theme.blue} />
            <Swatch color={theme.green} label="Green" hex={theme.green} />
            <Swatch color={theme.red} label="Red" hex={theme.red} />
            <Swatch color={theme.orange} label="Orange" hex={theme.orange} />
            <Swatch color={theme.purple} label="Purple" hex={theme.purple} />
            <Swatch color={theme.pink} label="Pink" hex={theme.pink} />
            <Swatch color={theme.yellow} label="Yellow" hex={theme.yellow} />
          </View>
        </Section>

        {/* 4. Buttons */}
        <Section title="Buttons">
          <Card>
            <AppleText variant="caption" tone="secondary" style={{ marginBottom: SP.md }}>VARIANTS</AppleText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm, marginBottom: SP.lg }}>
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
            </View>
            <AppleText variant="caption" tone="secondary" style={{ marginBottom: SP.md }}>SIZES</AppleText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SP.sm, marginBottom: SP.lg }}>
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </View>
            <AppleText variant="caption" tone="secondary" style={{ marginBottom: SP.md }}>STATES</AppleText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm }}>
              <Button loading>Saving…</Button>
              <Button disabled>Disabled</Button>
              <Button leftIcon={<MaterialCommunityIcons name="cloud-upload-outline" size={16} color="#fff" />}>Upload</Button>
              <Button rightIcon={<MaterialCommunityIcons name="arrow-right" size={16} color="#fff" />}>Continue</Button>
            </View>
          </Card>
        </Section>

        {/* 5. Cards */}
        <Section title="Cards">
          <View style={{ flexDirection: bp.atLeast('md') ? 'row' : 'column', gap: SP.md, flexWrap: 'wrap' }}>
            <View style={{ flex: bp.atLeast('md') ? 1 : undefined, minWidth: bp.atLeast('md') ? 240 : undefined }}>
              <Card>
                <AppleText variant="bodyStrong">Default Card</AppleText>
                <AppleText variant="caption" tone="secondary" style={{ marginTop: SP.xs }}>
                  Hover to lift, hairline border, theme-aware shadow.
                </AppleText>
              </Card>
            </View>
            <View style={{ flex: bp.atLeast('md') ? 1 : undefined, minWidth: bp.atLeast('md') ? 240 : undefined }}>
              <Card glass>
                <AppleText variant="bodyStrong">Glass Card</AppleText>
                <AppleText variant="caption" tone="secondary" style={{ marginTop: SP.xs }}>
                  Translucent background with backdrop blur.
                </AppleText>
              </Card>
            </View>
            <View style={{ flex: bp.atLeast('md') ? 1 : undefined, minWidth: bp.atLeast('md') ? 240 : undefined }}>
              <Card onPress={() => setModalOpen(true)}>
                <AppleText variant="bodyStrong">Interactive Card</AppleText>
                <AppleText variant="caption" tone="secondary" style={{ marginTop: SP.xs }}>
                  Tap me — opens a modal.
                </AppleText>
              </Card>
            </View>
          </View>
        </Section>

        {/* 6. Tabs */}
        <Section title="Tabs">
          <Card>
            <Tabs
              tabs={[
                { id: 'overview', label: 'Overview' },
                { id: 'analytics', label: 'Analytics' },
                { id: 'reports', label: 'Reports' },
                { id: 'settings', label: 'Settings' },
              ]}
              value={tab}
              onChange={setTab}
            />
            <AppleText variant="body" tone="secondary" style={{ marginTop: SP.lg }}>
              Currently viewing: <AppleText tone="primary" variant="bodyStrong">{tab}</AppleText>
            </AppleText>
          </Card>
        </Section>

        {/* 7. SegmentedControl */}
        <Section title="Segmented Control">
          <Card>
            <View style={{ gap: SP.md }}>
              <SegmentedControl<'day' | 'week' | 'month'>
                options={[
                  { id: 'day', label: 'Day' },
                  { id: 'week', label: 'Week' },
                  { id: 'month', label: 'Month' },
                ]}
                value={seg}
                onChange={setSeg}
              />
              <SegmentedControl<'day' | 'week' | 'month'>
                options={[
                  { id: 'day', label: 'Day' },
                  { id: 'week', label: 'Week' },
                  { id: 'month', label: 'Month' },
                ]}
                value={seg}
                onChange={setSeg}
                fullWidth
              />
              <AppleText variant="caption" tone="secondary">
                Selected: <AppleText tone="accent" variant="bodyStrong">{seg}</AppleText>
              </AppleText>
            </View>
          </Card>
        </Section>

        {/* 8. Modal + 9. Sheet triggers */}
        <Section title="Modals & Sheets">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm }}>
            <Button onPress={() => setModalOpen(true)}>Open Modal</Button>
            <Button variant="secondary" onPress={() => setSheetSide('right')}>Right Sheet</Button>
            <Button variant="secondary" onPress={() => setSheetSide('left')}>Left Sheet</Button>
            <Button variant="secondary" onPress={() => setSheetSide('bottom')}>Bottom Sheet</Button>
          </View>
          <AppleText variant="caption" tone="secondary" style={{ marginTop: SP.md }}>
            Modal auto-switches to bottom-sheet on phone. Sheets fade backdrop & spring open.
          </AppleText>
        </Section>

        {/* 10. Responsive grid demo */}
        <Section title="Responsive Grid">
          <View style={{
            flexDirection: 'row', flexWrap: 'wrap',
            gap: bp.isPhone ? SP.md : SP.base,
            marginHorizontal: -SP.xs,
          }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => {
              const cols = bp.bp === 'xs' ? 1 : bp.bp === 'sm' ? 2 : bp.atLeast('xl') ? 4 : bp.atLeast('lg') ? 3 : 2;
              const flexBasis = `${100 / cols - 1}%` as any;
              return (
                <View key={n} style={{ flexBasis, minWidth: 0 }}>
                  <Card>
                    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', marginBottom: SP.sm }}>
                      <MaterialCommunityIcons name="square-rounded" size={18} color="#fff" />
                    </View>
                    <AppleText variant="bodyStrong">Tile {n}</AppleText>
                    <AppleText variant="caption" tone="secondary" style={{ marginTop: SP.xs }}>
                      {cols} column{cols > 1 ? 's' : ''} at {bp.bp}
                    </AppleText>
                  </Card>
                </View>
              );
            })}
          </View>
        </Section>

        {/* Footer */}
        <View style={{ alignItems: 'center', marginTop: SP.xl }}>
          <AppleText variant="caption" tone="tertiary">
            Resize the window — primitives reflow at every breakpoint.
          </AppleText>
        </View>
      </ScrollView>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <AppleText variant="h2">Confirm action?</AppleText>
        <AppleText variant="body" tone="secondary" style={{ marginTop: SP.sm, marginBottom: SP.lg }}>
          Modal uses scale + fade with blurred backdrop on tablet+.
          On phone it slides from the bottom with a drag handle.
        </AppleText>
        <View style={{ flexDirection: 'row', gap: SP.sm, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onPress={() => setModalOpen(false)}>Cancel</Button>
          <Button onPress={() => setModalOpen(false)}>Confirm</Button>
        </View>
      </Modal>

      {/* Sheets */}
      <Sheet open={!!sheetSide} side={sheetSide || 'right'} onClose={() => setSheetSide(null)}>
        <AppleText variant="h2">
          {sheetSide === 'bottom' ? 'Bottom sheet' : sheetSide === 'left' ? 'Left drawer' : 'Right drawer'}
        </AppleText>
        <AppleText variant="body" tone="secondary" style={{ marginTop: SP.sm }}>
          Slides in with spring snap. Tap the backdrop to dismiss.
        </AppleText>
        <View style={{ marginTop: SP.lg, gap: SP.sm }}>
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <AppleText variant="bodyStrong">Item {i}</AppleText>
              <AppleText variant="caption" tone="secondary">Sample row inside the sheet.</AppleText>
            </Card>
          ))}
        </View>
      </Sheet>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <ScrollReveal>
      <View style={{ gap: SP.md }}>
        <AppleText variant="h3" tone="secondary" style={{ textTransform: 'uppercase', letterSpacing: 0.6, fontSize: 11 }}>
          {title}
        </AppleText>
        {children}
      </View>
    </ScrollReveal>
  );
}

function Pill({ label, tint }: { label: string; tint: string }) {
  return (
    <View style={{
      paddingHorizontal: SP.md, paddingVertical: 5, borderRadius: 999,
      backgroundColor: tint + '22', borderWidth: 1, borderColor: tint + '55',
    }}>
      <AppleText variant="caption" style={{ color: tint, fontWeight: '600' }}>{label}</AppleText>
    </View>
  );
}

function Swatch({ color, label, hex }: { color: string; label: string; hex: string }) {
  return (
    <View style={{ alignItems: 'center', width: 88 }}>
      <View style={{ width: 64, height: 64, borderRadius: RADII.lg, backgroundColor: color, marginBottom: SP.sm }} />
      <AppleText variant="bodyStrong">{label}</AppleText>
      <AppleText variant="caption" tone="secondary">{hex}</AppleText>
    </View>
  );
}
