/**
 * KpiTile — Apple HIG composite for a metric card with count-up animation.
 *
 * Drop-in replacement for the inline KPI tiles on the Student Dashboard.
 * On first paint (or value change), the number animates from its prior
 * value with an Apple-spec ease-out curve over 800ms.
 *
 * Usage:
 *   <KpiTile
 *     icon="briefcase-outline"
 *     label="Applications"
 *     value={42}
 *     suffix=""
 *     delta="+5"
 *     deltaTone="positive"
 *     accent="#0071E3"
 *   />
 */
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/src/theme/ThemeContext';
import { useBreakpoint } from '@/src/theme/breakpoints';
import { SP, RADII, FONT_FAMILY } from '@/src/theme/apple';
import { AnimatedCounter } from '@/src/views/web/portals/student/motion';

export function KpiTile({
  icon, label, value, prefix = '', suffix = '',
  delta, deltaTone = 'neutral', accent,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  delta?: string;
  deltaTone?: 'positive' | 'negative' | 'neutral';
  accent?: string;
}) {
  const { theme } = useTheme();
  const bp = useBreakpoint();
  const tint = accent || theme.primary;

  const deltaColor = deltaTone === 'positive' ? theme.green
                   : deltaTone === 'negative' ? theme.red
                   : theme.textSec;

  return (
    <View
      style={{
        flex: bp.isPhone ? undefined : 1,
        minWidth: bp.atLeast('xl') ? 200 : bp.atLeast('lg') ? 180 : bp.atLeast('md') ? 160 : '47%',
        padding: bp.isPhone ? SP.base : SP.lg,
        borderRadius: bp.isPhone ? RADII.lg : RADII.card,
        backgroundColor: theme.bgElevated,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.hairline,
        ...(Platform.OS === 'web' ? ({
          boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)',
          transitionProperty: 'box-shadow, background-color',
          transitionDuration: '200ms',
        } as any) : theme.shadow.sm),
      }}
    >
      <View style={{
        width: 36, height: 36, borderRadius: RADII.md,
        backgroundColor: tint + '18', alignItems: 'center', justifyContent: 'center',
        marginBottom: SP.md,
      }}>
        <MaterialCommunityIcons name={icon} size={18} color={tint} />
      </View>
      <Text style={{ color: theme.textSec, fontFamily: FONT_FAMILY, fontSize: 11, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: SP.sm, marginTop: 4 }}>
        <AnimatedCounter
          value={value}
          prefix={prefix}
          suffix={suffix}
          duration={800}
          style={{ color: theme.text, fontFamily: FONT_FAMILY, fontSize: 24, fontWeight: '700', letterSpacing: -0.5 }}
        />
        {!!delta && (
          <Text style={{ color: deltaColor, fontFamily: FONT_FAMILY, fontSize: 12, fontWeight: '600' }}>
            {delta}
          </Text>
        )}
      </View>
    </View>
  );
}
