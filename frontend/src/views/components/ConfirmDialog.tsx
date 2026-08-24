/**
 * In-app confirm dialog — replaces native window.confirm / Alert.alert.
 * Migrated to NativeWind className.
 */
import React, { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { View, Text, Pressable, Platform, Modal } from 'react-native';
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
    <View
      className="items-center justify-center p-5"
      style={
        Platform.OS === 'web'
          ? { position: 'fixed', inset: 0, zIndex: 2147483640, backgroundColor: 'rgba(6,8,18,0.72)' }
          : { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(6,8,18,0.72)' }
      }
      pointerEvents="auto"
    >
      <Pressable className="absolute inset-0" onPress={() => close(false)} />
      <View
        accessibilityRole="alert"
        className={`w-[420px] max-w-full rounded-2xl p-5 border border-white/[0.12] ${
          pending.danger ? 'border-red-500/35' : ''
        }`}
        style={
          Platform.OS === 'web'
            ? { backgroundColor: 'rgba(16,18,32,0.98)', boxShadow: '0 24px 64px rgba(0,0,0,0.55)', backdropFilter: 'blur(18px)' }
            : { backgroundColor: 'rgba(16,18,32,0.98)' }
        }
      >
        <View className={`w-9 h-9 rounded-[10px] items-center justify-center mb-3 ${
          pending.danger ? 'bg-red-500/[0.16]' : 'bg-amber-500/[0.16]'
        }`}>
          <AlertTriangle size={18} color={pending.danger ? '#FCA5A5' : '#FCD34D'} />
        </View>
        <Text className="text-white font-bold text-lg tracking-tight mb-1.5">{pending.title}</Text>
        <Text className="text-white/72 font-body text-[13.5px] leading-5 mb-4">{pending.message}</Text>
        <View className="flex-row justify-end gap-2">
          <Pressable
            onPress={() => close(false)}
            className="px-3.5 h-9 rounded-[10px] items-center justify-center border border-white/[0.12] bg-white/[0.04]"
            style={Platform.OS === 'web' ? { cursor: 'pointer' } : undefined}
          >
            <Text className="text-white/80 font-semibold text-[13px]">{pending.cancelText || 'Cancel'}</Text>
          </Pressable>
          <Pressable
            onPress={() => close(true)}
            className={`px-4 h-9 rounded-[10px] items-center justify-center ${
              pending.danger ? 'bg-red-600' : 'bg-purple-600'
            }`}
            style={Platform.OS === 'web' ? { cursor: 'pointer' } : undefined}
          >
            <Text className="text-white font-bold text-[13px]">{pending.confirmText || 'Confirm'}</Text>
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

// Need StyleSheet for absoluteFillObject on native
import { StyleSheet } from 'react-native';
