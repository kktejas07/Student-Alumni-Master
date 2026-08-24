/**
 * SlidePanel — right-side drawer for detail views & compose forms.
 */
import { ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Modal, Platform } from 'react-native';
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
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          onPress={(e: any) => e.stopPropagation && e.stopPropagation()}
          style={[styles.panel, { width }]}
        >
          <View style={styles.header}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.title} numberOfLines={1}>{title}</Text>
              {!!subtitle && <Text style={styles.sub} numberOfLines={1}>{subtitle}</Text>}
            </View>
            <Pressable onPress={onClose} hitSlop={8} testID="slide-panel-close">
              <X size={18} color="rgba(255,255,255,0.55)" />
            </Pressable>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, paddingBottom: 30 }}>
            {children}
          </ScrollView>
          {footer && <View style={styles.footer}>{footer}</View>}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function PanelField({ label, value }: { label: string; value: any }) {
  if (value == null || value === '') return null;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{String(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    flexDirection: 'row', justifyContent: 'flex-end',
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(6px)' } as any) : {}),
  },
  panel: {
    height: '100%' as any,
    backgroundColor: 'rgba(13,8,0,0.97)',
    borderLeftColor: T.borderMd, borderLeftWidth: 1,
    flexDirection: 'column',
    boxShadow: '-10px 0px 40px rgba(0,0,0,0.55)',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingVertical: 16,
    borderBottomColor: T.border, borderBottomWidth: 1,
  },
  title: { color: T.text, fontFamily: 'DMSans_700Bold', fontSize: 16, letterSpacing: -0.2 },
  sub: { color: T.textMute, fontFamily: 'DMSans_400Regular', fontSize: 11.5, marginTop: 3 },
  footer: {
    flexDirection: 'row', gap: 8, padding: 14,
    borderTopColor: T.border, borderTopWidth: 1,
    backgroundColor: 'rgba(13,8,0,0.7)',
  },
  field: { paddingVertical: 8, borderBottomColor: 'rgba(245,158,11,0.08)', borderBottomWidth: 1 },
  fieldLabel: { color: T.textMute, fontFamily: 'DMSans_500Medium', fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  fieldValue: { color: T.text, fontFamily: 'DMSans_500Medium', fontSize: 13, marginTop: 4, lineHeight: 18 },
});
