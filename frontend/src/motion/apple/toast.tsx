// @ts-nocheck
/**
 * Apple HIG Toast Provider — stacked, swipe-to-dismiss, auto-progress bar.
 *
 * Usage:
 *   <ThemeProvider>
 *     <ToastProvider>
 *       {children}
 *     </ToastProvider>
 *   </ThemeProvider>
 *
 *   const toast = useAppleToast();
 *   toast.success('Saved', 'Changes were applied successfully.');
 *   toast.error('Network', 'Could not reach the server.');
 *   toast.info('Heads up', 'A new version is available.');
 *
 * Per spec:
 *   - Enter: translateY(20px→0) + opacity 0→1 + scale 0.95→1, 300ms ease-spring
 *   - Stack: new toast pushes existing toasts up with spring-soft
 *   - Auto-dismiss progress: thin bar at bottom shrinks linearly over 5s
 *   - Swipe-to-dismiss on touch (translateX off-screen + fade)
 *   - Position: phone → top full-width, tablet+ → bottom-right max 400px
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, withDelay, Easing as REasing,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/theme/ThemeContext';
import { useBreakpoint } from '@/src/theme/breakpoints';
import { SP, RADII, FONT_FAMILY } from '@/src/theme/apple';
import { useReducedMotion } from '@/src/views/web/portals/student/motion';
import { SPRING, DUR } from './tokens';

type Variant = 'success' | 'error' | 'info' | 'warning';
type Toast = { id: string; variant: Variant; title: string; body?: string; duration: number };

type Ctx = {
  push: (variant: Variant, title: string, body?: string, duration?: number) => void;
  success: (title: string, body?: string, duration?: number) => void;
  error:   (title: string, body?: string, duration?: number) => void;
  info:    (title: string, body?: string, duration?: number) => void;
  warning: (title: string, body?: string, duration?: number) => void;
};

const ToastCtx = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const push = useCallback((variant: Variant, title: string, body?: string, duration = 5000) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setItems((arr) => [...arr, { id, variant, title, body, duration }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setItems((arr) => arr.filter((t) => t.id !== id));
  }, []);

  const ctx: Ctx = {
    push,
    success: (t, b, d) => push('success', t, b, d),
    error:   (t, b, d) => push('error',   t, b, d),
    info:    (t, b, d) => push('info',    t, b, d),
    warning: (t, b, d) => push('warning', t, b, d),
  };

  return (
    <ToastCtx.Provider value={ctx}>
      {children}
      <ToastStack items={items} onDismiss={dismiss} />
    </ToastCtx.Provider>
  );
}

export function useAppleToast(): Ctx {
  const ctx = useContext(ToastCtx);
  if (!ctx) {
    return {
      push: () => {}, success: () => {}, error: () => {}, info: () => {}, warning: () => {},
    };
  }
  return ctx;
}

function ToastStack({ items, onDismiss }: { items: Toast[]; onDismiss: (id: string) => void }) {
  const bp = useBreakpoint();
  // Web desktop/tablet: always bottom-right. Phone-width web: full-width bottom.
  const compact = Platform.OS === 'web'
    ? (typeof window !== 'undefined' ? window.innerWidth < 640 : bp.isPhone)
    : bp.isPhone;

  const node = (
    <View
      pointerEvents="box-none"
      style={[
        {
          padding: SP.base,
          alignItems: compact ? 'stretch' : 'flex-end',
          justifyContent: 'flex-end',
          ...(Platform.OS === 'web'
            ? ({
                position: 'fixed',
                top: 'auto',
                left: compact ? 16 : 'auto',
                right: 24,
                bottom: 24,
                zIndex: 2147483000,
                width: compact ? 'auto' : 400,
                maxWidth: compact ? 'calc(100vw - 32px)' : 400,
              } as any)
            : StyleSheet.absoluteFillObject),
        },
      ]}
    >
      <View style={{ gap: SP.sm, width: compact ? '100%' : '100%' }}>
        {items.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
        ))}
      </View>
    </View>
  );

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const ReactDOM = require('react-dom');
    return ReactDOM.createPortal(node, document.body);
  }
  return node;
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const { theme } = useTheme();
  const reduced = useReducedMotion();
  const v = useSharedValue(0);
  const swipe = useSharedValue(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    // Enter
    v.value = reduced ? 1 : withSpring(1, SPRING.soft);
    // Auto-dismiss timer + shrinking progress bar (100% → 0%)
    progress.value = 1;
    progress.value = withTiming(0, { duration: toast.duration, easing: REasing.linear });
    const t = setTimeout(() => {
      v.value = reduced ? 0 : withTiming(0, { duration: DUR.base, easing: REasing.bezier(0.4, 0, 1, 1) });
      setTimeout(onDismiss, DUR.base);
    }, toast.duration);
    return () => clearTimeout(t);
  }, [v, progress, reduced, toast.duration, onDismiss]);

  const aWrap = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [
      { translateY: (1 - v.value) * 20 },
      { translateX: swipe.value },
      { scale: 0.95 + v.value * 0.05 },
    ],
  }));
  const aProgress = useAnimatedStyle(() => ({ width: `${Math.max(0, progress.value) * 100}%` as any }));

  const palette: Record<Variant, { bg: string; tint: string; icon: any; iconBg: string }> = {
    success: { bg: theme.bgElevated, tint: theme.green,  icon: 'check-circle',          iconBg: theme.green  + '22' },
    error:   { bg: theme.bgElevated, tint: theme.red,    icon: 'alert-circle',          iconBg: theme.red    + '22' },
    info:    { bg: theme.bgElevated, tint: theme.blue,   icon: 'information',            iconBg: theme.blue   + '22' },
    warning: { bg: theme.bgElevated, tint: theme.orange, icon: 'alert',                  iconBg: theme.orange + '22' },
  };
  const p = palette[toast.variant];

  return (
    <Animated.View style={[aWrap]}>
      <Pressable
        onPress={onDismiss}
        accessibilityRole="alert"
        accessibilityLabel={`${toast.variant} toast: ${toast.title}${toast.body ? `. ${toast.body}` : ''}`}
        style={{
          flexDirection: 'row', alignItems: 'flex-start', gap: SP.md,
          padding: SP.base, paddingBottom: SP.lg, borderRadius: RADII.modal,
          backgroundColor: p.bg, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.hairline,
          ...(Platform.OS === 'web' ? ({
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.10)',
            backdropFilter: 'blur(20px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
          } as any) : { ...theme.shadow.lg }),
          overflow: 'hidden',
        }}
      >
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: p.iconBg, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
          <MaterialCommunityIcons name={p.icon} size={16} color={p.tint} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text, fontFamily: FONT_FAMILY, fontSize: 14, fontWeight: '600', letterSpacing: -0.01 }}>{toast.title}</Text>
          {!!toast.body && (
            <Text style={{ color: theme.textSec, fontFamily: FONT_FAMILY, fontSize: 12.5, fontWeight: '500', marginTop: 2, lineHeight: 17 }}>
              {toast.body}
            </Text>
          )}
        </View>
        {/* Auto-dismiss progress bar */}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, backgroundColor: theme.hairline }}>
          <Animated.View style={[{ height: 2, backgroundColor: p.tint, opacity: 0.7 }, aProgress]} />
        </View>
      </Pressable>
    </Animated.View>
  );
}
