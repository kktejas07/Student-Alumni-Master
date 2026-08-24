/**
 * Toast — Glass toast/snackbar system.
 * Migrated to NativeWind className.
 */
import {
  createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState,
} from 'react';
import {
  View, Text, Animated, Easing, Platform, Pressable, useWindowDimensions,
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
    return { show: () => {}, success: () => {}, error: () => {}, info: () => {}, warning: () => {}, pending: () => {} };
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
      className="z-[2147483000] gap-2.5"
      style={compact ? { alignItems: 'stretch' } : { alignItems: 'flex-end' }}
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
      Animated.timing(slide, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 240, useNativeDriver: true }),
    ]).start();
  }, [slide, opacity]);

  const palette = palettes[toast.variant] || palettes.info;
  const Icon = palette.Icon;

  return (
    <Animated.View
      className={`rounded-[14px] overflow-hidden border border-white/[0.12] ${compact ? 'w-full' : 'w-[380px] max-w-full'}`}
      style={{
        opacity,
        transform: compact ? [{ translateY: slide }] : [{ translateX: slide }],
        ...(isWeb ? { boxShadow: '0 12px 32px rgba(0,0,0,0.45)', backdropFilter: 'blur(18px)' } : {}),
      }}
    >
      <View className="absolute inset-0" style={{ backgroundColor: palette.bg }} />
      <View className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: palette.accent }} />

      <View className="flex-row items-center gap-3 px-4 py-3 pl-[18px]">
        <View className="w-8 h-8 rounded-[9px] items-center justify-center" style={{ backgroundColor: palette.iconBg }}>
          <Icon size={16} color={palette.iconColor} />
        </View>
        <View className="flex-1">
          <Text className="text-white font-bold text-[13.5px] tracking-tight" numberOfLines={2}>{toast.title}</Text>
          {!!toast.message && <Text className="text-white/72 font-body text-[12.5px] mt-0.5 leading-[17px]" numberOfLines={3}>{toast.message}</Text>}
        </View>
        <Pressable
          onPress={onDismiss}
          hitSlop={8}
          accessibilityLabel="Dismiss notification"
          className="w-7 h-7 rounded-2xl items-center justify-center bg-white/[0.06] opacity-75"
          style={isWeb ? { cursor: 'pointer', transitionDuration: '160ms' } : undefined}
        >
          <X size={15} color="rgba(255,255,255,0.8)" />
        </Pressable>
      </View>

      <View className="h-[3px] bg-white/[0.08]">
        <ProgressFill color={palette.accent} />
      </View>
    </Animated.View>
  );
}

const isWeb = Platform.OS === 'web';

function ProgressFill({ color }: { color: string }) {
  const w = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: 0, duration: TOAST_MS, easing: Easing.linear, useNativeDriver: false }).start();
  }, [w]);
  const widthInterpolated = w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) as any;
  return <Animated.View className="h-full" style={{ backgroundColor: color, width: widthInterpolated }} />;
}

const palettes: Record<Variant, { Icon: any; accent: string; iconBg: string; iconColor: string; bg: string }> = {
  success: { Icon: Check, accent: '#10B981', iconBg: 'rgba(16,185,129,0.22)', iconColor: '#86EFAC', bg: 'rgba(12,18,28,0.94)' },
  error: { Icon: AlertTriangle, accent: '#EF4444', iconBg: 'rgba(239,68,68,0.22)', iconColor: '#FCA5A5', bg: 'rgba(18,10,14,0.94)' },
  warning: { Icon: AlertTriangle, accent: '#F59E0B', iconBg: 'rgba(245,158,11,0.22)', iconColor: '#FCD34D', bg: 'rgba(18,14,8,0.94)' },
  info: { Icon: Info, accent: '#A78BFA', iconBg: 'rgba(124,58,237,0.22)', iconColor: '#C4B5FD', bg: 'rgba(14,10,24,0.94)' },
  pending: { Icon: Loader, accent: '#FB923C', iconBg: 'rgba(251,146,60,0.22)', iconColor: '#FDBA74', bg: 'rgba(18,12,8,0.94)' },
};
