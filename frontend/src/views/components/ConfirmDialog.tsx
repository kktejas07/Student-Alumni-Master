/**
 * In-app confirm dialog — replaces native window.confirm / Alert.alert.
 *
 * Usage:
 *   const { confirm } = useConfirm();
 *   const ok = await confirm({
 *     title: 'Delete event',
 *     message: 'This cannot be undone.',
 *     confirmText: 'Delete',
 *     danger: true,
 *   });
 *   if (!ok) return;
 */
import React, { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Modal } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};

type ConfirmApi = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
};

const ConfirmCtx = createContext<ConfirmApi | null>(null);

export function useConfirm(): ConfirmApi {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) {
    return {
      confirm: async (opts) => {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          return window.confirm(`${opts.title}\n\n${opts.message}`);
        }
        return true;
      },
    };
  }
  return ctx;
}

type Pending = ConfirmOptions & { resolve: (v: boolean) => void };

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...opts, resolve });
    });
  }, []);

  const close = (value: boolean) => {
    pending?.resolve(value);
    setPending(null);
  };

  const node = pending ? (
    <View style={styles.overlay} pointerEvents="auto">
      <Pressable style={StyleSheet.absoluteFill} onPress={() => close(false)} />
      <View
        accessibilityRole="alert"
        style={[styles.card, pending.danger && styles.cardDanger]}
      >
        <View style={[styles.iconWrap, pending.danger ? styles.iconDanger : styles.iconWarn]}>
          <AlertTriangle size={18} color={pending.danger ? '#FCA5A5' : '#FCD34D'} />
        </View>
        <Text style={styles.title}>{pending.title}</Text>
        <Text style={styles.message}>{pending.message}</Text>
        <View style={styles.actions}>
          <Pressable onPress={() => close(false)} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>{pending.cancelText || 'Cancel'}</Text>
          </Pressable>
          <Pressable
            onPress={() => close(true)}
            style={[styles.okBtn, pending.danger && styles.okBtnDanger]}
          >
            <Text style={styles.okText}>{pending.confirmText || 'Confirm'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  ) : null;

  let overlay: React.ReactNode = null;
  if (pending) {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const ReactDOM = require('react-dom');
      overlay = ReactDOM.createPortal(node, document.body);
    } else {
      overlay = (
        <Modal transparent animationType="fade" visible onRequestClose={() => close(false)}>
          {node}
        </Modal>
      );
    }
  }

  return (
    <ConfirmCtx.Provider value={{ confirm }}>
      {children}
      {overlay}
    </ConfirmCtx.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...(Platform.OS === 'web'
      ? { position: 'fixed' as any, inset: 0, zIndex: 2147483640 }
      : { ...StyleSheet.absoluteFillObject }),
    backgroundColor: 'rgba(6, 8, 18, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: 420,
    maxWidth: '100%',
    borderRadius: 16,
    padding: 20,
    backgroundColor: 'rgba(16, 18, 32, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
          backdropFilter: 'blur(18px)',
        } as any)
      : {}),
  },
  cardDanger: {
    borderColor: 'rgba(239,68,68,0.35)',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconDanger: { backgroundColor: 'rgba(239,68,68,0.16)' },
  iconWarn: { backgroundColor: 'rgba(245,158,11,0.16)' },
  title: {
    color: '#fff',
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  message: {
    color: 'rgba(255,255,255,0.72)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 13.5,
    lineHeight: 20,
    marginBottom: 18,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  cancelText: {
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
  },
  okBtn: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  okBtnDanger: {
    backgroundColor: '#DC2626',
  },
  okText: {
    color: '#fff',
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
  },
});
