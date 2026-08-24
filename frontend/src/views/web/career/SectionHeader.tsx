import React, { memo } from 'react';
import {View, Text} from "react-native";

interface Props {
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  accessibilityLabel?: string;
}

export const SectionHeader = memo(function SectionHeader({
  title, subtitle, rightElement, accessibilityLabel,
}: Props) {
  return (
    <View className="flex-row items-start justify-between gap-1 mb-5">
      <View className="flex-1 min-w-0">
        <Text
          className="text-white font-display-bold text-lg tracking-[-0.4px] leading-6"
          accessibilityRole="header"
          accessibilityLabel={accessibilityLabel ?? title}
        >
          {title}
        </Text>
        {subtitle ? <Text className="text-white/50 font-body-semibold text-[13px] mt-[5px] leading-[18px]">{subtitle}</Text> : null}
      </View>
      {rightElement ? <View className="shrink-0">{rightElement}</View> : null}
    </View>
  );
});
