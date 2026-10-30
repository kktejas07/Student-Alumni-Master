/**
 * Toast — Glass toast/snackbar system.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.success('Account created');
 *   toast.error('Something went wrong');
 *   toast.info('Heads up');
 *   toast.pending('Sending…');
 *
 * Mount <ToastProvider> once near the top of the app tree (root layout).
 * Position: bottom-right on desktop/tablet; full-width bottom on compact phones.
 * Auto-dismiss: 5s with a shrinking progress bar.
 */
import React, {
  createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState,
} from 'react';
import {
  View, Text, StyleSheet, Animated, Easing, Platform, Pressable, useWindowDimensions,
} from 'react-native';
import { Check, X, AlertTriangle, Info, Loader } from 'lucide-react-native';

type Variant = 'success' | 'error' | 'info' | 'warning' | 'pending';
type Toast = { id: string; variant: Variant; title: string; message?: string };

type ToastApi = {
  show: (variant: Variant, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  pending: (title: string, message?: string) => void;
};

const ToastCtx = createContext<ToastApi | null>(null);
const TOAST_MS = 5000;

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) {
    // Safe no-op fallback so screens never crash if provider is missing.
    return {
      show: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
      warning: () => {},
      pending: () => {},
    };
  }
  return ctx;
}

let _id = 0;
const nextId = () => `toast-${Date.now()}-${++_id}`;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((variant: Variant, title: string, message?: string) => {
    const id = nextId();
    setToasts((cur) => [...cur.slice(-2), { id, variant, title, message }]);
    setTimeout(() => remove(id), TOAST_MS);
  }, [remove]);

  const api: ToastApi = {
    show,
    success: (t, m) => show('success', t, m),
    error: (t, m) => show('error', t, m),
    info: (t, m) => show('info', t, m),
    warning: (t, m) => show('warning', t, m),
    pending: (t, m) => show('pending', t, m),
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={remove} />
    </ToastCtx.Provider>
  );
}

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const compact = isWeb ? width < 640 : width < 480;

  const node = (
    <View
      pointerEvents="box-none"
      style={[
        styles.viewport,
        compact ? styles.viewportCompact : styles.viewportRight,
        isWeb && ({
          position: 'fixed',
          top: 'auto',
          left: compact ? 16 : 'auto',
          right: 24,
          bottom: 24,
          zIndex: 2147483000,
          width: compact ? 'auto' : undefined,
          maxWidth: compact ? 'calc(100vw - 32px)' : undefined,
        } as any),
      ]}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} compact={compact} />
      ))}
    </View>
  );

  if (isWeb && typeof document !== 'undefined') {
    const ReactDOM = require('react-dom');
    return ReactDOM.createPortal(node, document.body);
  }
  return node;
}

function ToastItem({ toast, onDismiss, compact }: { toast: Toast; onDismiss: () => void; compact: boolean }) {
  const slide = useRef(new Animated.Value(compact ? 40 : 60)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(opacity, { toValue: 1, duration: 240, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, [slide, opacity]);

  const palette = palettes[toast.variant] || palettes.info;
  const Icon = palette.Icon;

  return (
    <Animated.View
      style={[
        styles.toastShell,
        compact && styles.toastShellCompact,
        {
          opacity,
          transform: compact ? [{ translateY: slide }] : [{ translateX: slide }],
        },
      ]}
    >
      <View style={[styles.surface, { backgroundColor: palette.bg, borderColor: palette.border }]} />
      <View style={[styles.accentBar, { backgroundColor: palette.accent }]} />

      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: palette.iconBg }]}>
          <Icon size={16} color={palette.iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={2}>{toast.title}</Text>
          {!!toast.message && <Text style={styles.message} numberOfLines={3}>{toast.message}</Text>}
        </View>
        <Pressable
          onPress={onDismiss}
          hitSlop={8}
          accessibilityLabel="Dismiss notification"
          style={({ hovered }: any) => [styles.closeBtn, hovered && { opacity: 1 }]}
        >
          <X size={15} color="rgba(255,255,255,0.8)" />
        </Pressable>
      </View>

      <View style={styles.progressTrack}>
        <ProgressFill color={palette.accent} />
      </View>
    </Animated.View>
  );
}

function ProgressFill({ color }: { color: string }) {
  const w = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(w, {
      toValue: 0,
      duration: TOAST_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  }, [w]);
  const widthInterpolated = w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) as any;
  return <Animated.View style={[styles.progressFill, { backgroundColor: color, width: widthInterpolated }]} />;
}

const palettes: Record<Variant, {
  Icon: any;
  accent: string;
  iconBg: string;
  iconColor: string;
  border: string;
  bg: string;
}> = {
  success: {
    Icon: Check,
    accent: '#10B981',
    iconBg: 'rgba(16,185,129,0.22)',
    iconColor: '#86EFAC',
    border: 'rgba(16,185,129,0.35)',
    bg: 'rgba(12, 18, 28, 0.94)',
  },
  error: {
    Icon: AlertTriangle,
    accent: '#EF4444',
    iconBg: 'rgba(239,68,68,0.22)',
    iconColor: '#FCA5A5',
    border: 'rgba(239,68,68,0.4)',
    bg: 'rgba(18, 10, 14, 0.94)',
  },
  warning: {
    Icon: AlertTriangle,
    accent: '#F59E0B',
    iconBg: 'rgba(245,158,11,0.22)',
    iconColor: '#FCD34D',
    border: 'rgba(245,158,11,0.4)',
    bg: 'rgba(18, 14, 8, 0.94)',
  },
  info: {
    Icon: Info,
    accent: '#A78BFA',
    iconBg: 'rgba(124,58,237,0.22)',
    iconColor: '#C4B5FD',
    border: 'rgba(167,139,250,0.4)',
    bg: 'rgba(14, 10, 24, 0.94)',
  },
  pending: {
    Icon: Loader,
    accent: '#FB923C',
    iconBg: 'rgba(251,146,60,0.22)',
    iconColor: '#FDBA74',
    border: 'rgba(251,146,60,0.4)',
    bg: 'rgba(18, 12, 8, 0.94)',
  },
};

const styles = StyleSheet.create({
  viewport: {
    zIndex: 2147483000,
    gap: 10,
    pointerEvents: 'box-none',
  },
  viewportCompact: {
    alignItems: 'stretch',
  },
  viewportRight: {
    alignItems: 'flex-end',
  },
  toastShell: {
    width: 380,
    maxWidth: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
          backdropFilter: 'blur(18px)',
        } as any)
      : {}),
  },
  toastShellCompact: {
    width: '100%' as any,
  },
  surface: {
    ...StyleSheet.absoluteFillObject,
  },
  accentBar: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    paddingLeft: 18,
  },
  iconWrap: {
    width: 32, height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontFamily: 'DMSans_700Bold',
    fontSize: 13.5,
    letterSpacing: -0.2,
  },
  message: {
    color: 'rgba(255,255,255,0.72)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 12.5,
    marginTop: 3,
    lineHeight: 17,
  },
  closeBtn: {
    width: 28, height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    opacity: 0.75,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}),
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  progressFill: {
    height: '100%',
  },
});
