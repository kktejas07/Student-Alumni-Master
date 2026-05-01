/**
 * Toast — Glass + Gradient toast/snackbar system.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.success('Account created');
 *   toast.error('Something went wrong');
 *   toast.info('Heads up');
 *
 * Mount <ToastProvider> once near the top of the app tree (root layout).
 * On web, toasts appear top-right; on native they slide from the top.
 */
import {
  createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState,
} from 'react';
import {
  View, Text, StyleSheet, Animated, Easing, Platform, Pressable, useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, X, AlertTriangle, Info } from 'lucide-react-native';

type Variant = 'success' | 'error' | 'info' | 'warning';
type Toast = { id: string; variant: Variant; title: string; message?: string };

type ToastApi = {
  show: (variant: Variant, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
};

const ToastCtx = createContext<ToastApi | null>(null);

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
    setToasts((cur) => [...cur, { id, variant, title, message }]);
    // auto-dismiss after 3.6s
    setTimeout(() => remove(id), 3600);
  }, [remove]);

  const api: ToastApi = {
    show,
    success: (t, m) => show('success', t, m),
    error: (t, m) => show('error', t, m),
    info: (t, m) => show('info', t, m),
    warning: (t, m) => show('warning', t, m),
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
  // Compact phones get full-width centered top toasts; tablets/desktop get top-right stack.
  const stackRight = isWeb && width >= 700;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.viewport,
        stackRight ? styles.viewportRight : styles.viewportTop,
      ]}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} stackRight={stackRight} />
      ))}
    </View>
  );
}

function ToastItem({ toast, onDismiss, stackRight }: { toast: Toast; onDismiss: () => void; stackRight: boolean }) {
  const slide = useRef(new Animated.Value(stackRight ? 60 : -40)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [slide, opacity]);

  const palette = palettes[toast.variant];
  const Icon = palette.Icon;

  return (
    <Animated.View
      style={[
        styles.toastShell,
        {
          opacity,
          transform: stackRight ? [{ translateX: slide }] : [{ translateY: slide }],
        },
      ]}
    >
      {/* Gradient backdrop */}
      <LinearGradient
        colors={palette.gradient as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Glass overlay */}
      <View style={styles.glassOverlay} />
      {/* Left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: palette.accent }]} />

      {/* Content */}
      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: palette.iconBg }]}>
          <Icon size={18} color={palette.iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={2}>{toast.title}</Text>
          {!!toast.message && <Text style={styles.message} numberOfLines={3}>{toast.message}</Text>}
        </View>
        <Pressable
          onPress={onDismiss}
          hitSlop={8}
          style={({ hovered }: any) => [styles.closeBtn, hovered && { opacity: 1 }]}
        >
          <X size={16} color="rgba(255,255,255,0.8)" />
        </Pressable>
      </View>

      {/* Bottom progress strip */}
      <View style={styles.progressTrack}>
        <ProgressFill color={palette.accent} />
      </View>
    </Animated.View>
  );
}

function ProgressFill({ color }: { color: string }) {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: 1, duration: 3500, easing: Easing.linear, useNativeDriver: false }).start();
  }, [w]);
  const widthInterpolated = w.interpolate({ inputRange: [0, 1], outputRange: ['100%', '0%'] }) as any;
  return <Animated.View style={[styles.progressFill, { backgroundColor: color, width: widthInterpolated }]} />;
}

// ─── palettes ────────────────────────────────────────────────────────────────
const palettes: Record<Variant, {
  Icon: any;
  gradient: string[];
  accent: string;
  iconBg: string;
  iconColor: string;
}> = {
  success: {
    Icon: Check,
    gradient: ['rgba(16,185,129,0.45)', 'rgba(5,150,105,0.25)', 'rgba(20,12,40,0.85)'],
    accent: '#10B981',
    iconBg: 'rgba(16,185,129,0.25)',
    iconColor: '#86EFAC',
  },
  error: {
    Icon: AlertTriangle,
    gradient: ['rgba(220,38,38,0.45)', 'rgba(190,18,60,0.28)', 'rgba(20,12,40,0.85)'],
    accent: '#EF4444',
    iconBg: 'rgba(239,68,68,0.25)',
    iconColor: '#FCA5A5',
  },
  warning: {
    Icon: AlertTriangle,
    gradient: ['rgba(245,158,11,0.4)', 'rgba(217,119,6,0.25)', 'rgba(20,12,40,0.85)'],
    accent: '#F59E0B',
    iconBg: 'rgba(245,158,11,0.25)',
    iconColor: '#FCD34D',
  },
  info: {
    Icon: Info,
    gradient: ['rgba(124,58,237,0.45)', 'rgba(91,33,182,0.28)', 'rgba(20,12,40,0.85)'],
    accent: '#A78BFA',
    iconBg: 'rgba(124,58,237,0.25)',
    iconColor: '#C4B5FD',
  },
};

const styles = StyleSheet.create({
  viewport: {
    position: 'absolute',
    zIndex: 9999,
    gap: 10,
    pointerEvents: 'box-none',
  },
  viewportTop: {
    top: 16,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  viewportRight: {
    top: 24,
    right: 24,
    alignItems: 'flex-end',
  },
  toastShell: {
    width: 380,
    maxWidth: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    boxShadow: '0px 12px 24px rgba(0,0,0,0.45)',
    ...({ backdropFilter: 'blur(18px)' } as any),
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,12,40,0.45)',
  },
  accentBar: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    paddingLeft: 22,
  },
  iconWrap: {
    width: 36, height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
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
    opacity: 0.7,
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  progressFill: {
    height: '100%',
  },
});
