/**
 * SlidePanel — right-side drawer for detail views & compose forms.
 */
import { ReactNode } from 'react';
import { View, Text, Pressable, ScrollView, Modal, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import { ADMIN_THEME as T } from './theme';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  width?: number;
  children: ReactNode;
  footer?: ReactNode;
}

export function SlidePanel({ open, onClose, title, subtitle, width = 440, children, footer }: Props) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 flex-row justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.55)', ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(6px)' } as any) : {}) }} onPress={onClose}>
        <Pressable
          onPress={(e: any) => e.stopPropagation && e.stopPropagation()}
          className="flex-col"
          style={{ width, height: '100%', backgroundColor: 'rgba(13,8,0,0.97)', borderLeftColor: T.borderMd, borderLeftWidth: 1, boxShadow: '-10px 0px 40px rgba(0,0,0,0.55)' }}
        >
          <View className="flex-row items-center gap-3" style={{ paddingHorizontal: 18, paddingVertical: 16, borderBottomColor: T.border, borderBottomWidth: 1 }}>
            <View className="flex-1">
              <Text className="text-text font-body-bold text-lg" style={{ letterSpacing: -0.2 }} numberOfLines={1}>{title}</Text>
              {!!subtitle && <Text className="text-muted" style={{ fontFamily: 'DMSans_400Regular', fontSize: 11.5, marginTop: 3 }} numberOfLines={1}>{subtitle}</Text>}
            </View>
            <Pressable onPress={onClose} hitSlop={8} testID="slide-panel-close">
              <X size={18} color="rgba(255,255,255,0.55)" />
            </Pressable>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, paddingBottom: 30 }}>
            {children}
          </ScrollView>
          {footer && <View className="flex-row gap-2" style={{ padding: 14, borderTopColor: T.border, borderTopWidth: 1, backgroundColor: 'rgba(13,8,0,0.7)' }}>{footer}</View>}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function PanelField({ label, value }: { label: string; value: any }) {
  if (value == null || value === '') return null;
  return (
    <View className="py-2" style={{ borderBottomColor: 'rgba(245,158,11,0.08)', borderBottomWidth: 1 }}>
      <Text style={{ color: T.textMute, fontFamily: 'DMSans_500Medium', fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</Text>
      <Text className="text-text text-sm" style={{ fontFamily: 'DMSans_500Medium', marginTop: 4, lineHeight: 18 }}>{String(value)}</Text>
    </View>
  );
}
