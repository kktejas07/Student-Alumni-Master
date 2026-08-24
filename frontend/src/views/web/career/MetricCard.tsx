import React, { memo } from 'react';
import {View, Text, Pressable, Platform} from "react-native";

interface Props {
  label: string;
  value: number | string;
  unit?: string;
  color: string;
  barValue?: number;
  subText: string;
  hintText?: string;
  trendText?: string;
  trendPositive?: boolean;
  onPress?: () => void;
  style?: any;
  iconElement?: React.ReactNode;
}

export const MetricCard = memo(function MetricCard({
  label, value, unit, color, subText, hintText, trendText, trendPositive = true,
  onPress, iconElement, style,
}: Props) {
  const Container: any = onPress ? Pressable : View;
  const containerProps = onPress
    ? {
        accessibilityRole: 'button' as const,
        onPress,
        style: ({ pressed, hovered }: any) => [
          style,
          (pressed || hovered) && Platform.OS === 'web'
            ? { backgroundColor: 'rgba(26, 30, 50, 0.90)', borderColor: 'rgba(129, 140, 248, 0.30)', boxShadow: '0 8px 30px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.10) inset', transform: 'translateY(-2px)', cursor: 'pointer' }
            : null,
        ],
      }
    : { style };

  return (
    <Container {...containerProps} className="bg-[rgba(18,22,35,0.75)] border border-[rgba(255,255,255,0.08)] rounded-xl min-h-[120px] overflow-hidden flex-col justify-between" style={Platform.OS === 'web' ? { boxShadow: '0 4px 20px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.06) inset', transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)', cursor: 'default' } : undefined}>
      <View className="p-4 gap-2">
        <View className="flex-row items-center gap-1">
          <View className="w-8 h-8 rounded-lg items-center justify-center border border-white/10 shrink-0" style={{ backgroundColor: color + '1A', borderColor: color + '33' }}>
            {iconElement ?? <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />}
          </View>
          <Text className="text-white/65 font-body-bold text-xs tracking-wider uppercase flex-1" numberOfLines={1}>{label}</Text>
        </View>

        <View className="flex-row items-baseline">
          <Text className="font-display-bold text-[28px] tracking-[-0.8px] leading-8 text-white">
            {value}
            {unit ? <Text className="font-body-bold text-base tracking-0 ml-0.5" style={{ color: 'rgba(238,240,255,0.5)' }}>{unit}</Text> : null}
          </Text>
        </View>

        <View className="flex-row items-center gap-1">
          {trendText ? (
            <Text className="font-body-bold text-xs" style={{ color: trendPositive ? '#34D399' : '#F87171' }}>
              {trendText}
            </Text>
          ) : (
            <Text className="text-white/50 font-body-semibold text-xs" style={{ color }} numberOfLines={1}>{subText}</Text>
          )}
          {hintText && !trendText ? (
            <Text className="font-body-semibold text-[11px] text-white/50" numberOfLines={1}>{hintText}</Text>
          ) : null}
        </View>
      </View>

      <View className="h-0.5 w-full opacity-60" style={{ backgroundColor: color + '50' }} />
    </Container>
  );
});
