import React, { memo } from 'react';
import {View, Text} from "react-native";

interface Props {
  label: string;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  icon?: React.ReactNode;
}

export const InfoChip = memo(function InfoChip({
  label,
  color = 'rgba(238,240,255,0.5)',
  backgroundColor = 'rgba(255,255,255,0.06)',
  borderColor = 'rgba(255,255,255,0.08)',
  icon,
}: Props) {
  return (
    <View className="flex-row items-center gap-1 px-1 py-1 rounded-lg border" style={{ backgroundColor, borderColor }}>
      {icon}
      <Text className="font-body-bold text-sm" style={{ color }}>{label}</Text>
    </View>
  );
});
