/**
 * Modal — centred dialog (sheet on phones) with scrim, title row and footer.
 */
import React from 'react';
import { View, Modal as RNModal, Pressable, ScrollView, type StyleProp, type ViewStyle } from 'react-native';
import { X } from 'lucide-react-native';
import { useBreakpoint } from '@/src/theme/breakpoints';
import { usePortalTheme, RADIUS, SPACE, web } from './theme';
import { Txt, IconButton } from './primitives';

export function Modal({
  visible, onClose, title, subtitle, children, footer, width = 560, style, scroll = true, testID,
}: {
  visible: boolean; onClose: () => void; title?: string; subtitle?: string; children?: React.ReactNode; footer?: React.ReactNode;
  width?: number; style?: StyleProp<ViewStyle>; scroll?: boolean; testID?: string;
}) {
  const t = usePortalTheme();
  const bp = useBreakpoint();
  const phone = bp.isPhone;
  const Body: any = scroll ? ScrollView : View;
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} accessibilityLabel="Close dialog" style={{ flex: 1, backgroundColor: t.scrim, justifyContent: phone ? 'flex-end' : 'center', alignItems: 'center', padding: phone ? 0 : SPACE.lg }}>
        <Pressable onPress={() => {}} testID={testID} style={[
          { width: phone ? '100%' : Math.min(width, bp.width - SPACE.lg * 2), maxHeight: phone ? '92%' : '90%', backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderHi,
            borderRadius: RADIUS.modal, borderBottomLeftRadius: phone ? 0 : RADIUS.modal, borderBottomRightRadius: phone ? 0 : RADIUS.modal, overflow: 'hidden' },
          web({ boxShadow: t.shadow, cursor: 'default' }), style,
        ]}>
          {(title || subtitle) && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md, padding: SPACE.lg, paddingBottom: SPACE.md, borderBottomWidth: 1, borderBottomColor: t.border }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                {title && <Txt variant="heading">{title}</Txt>}
                {subtitle && <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>{subtitle}</Txt>}
              </View>
              <IconButton Icon={X} size={32} onPress={onClose} accessibilityLabel="Close" />
            </View>
          )}
          <Body style={{ flexShrink: 1 }} contentContainerStyle={scroll ? { padding: SPACE.lg } : undefined}>
            {scroll ? children : <View style={{ padding: SPACE.lg }}>{children}</View>}
          </Body>
          {footer && (
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: SPACE.sm, padding: SPACE.base, borderTopWidth: 1, borderTopColor: t.border, backgroundColor: t.surface2 }}>
              {footer}
            </View>
          )}
        </Pressable>
      </Pressable>
    </RNModal>
  );
}
