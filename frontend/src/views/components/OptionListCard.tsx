import React from 'react';
import { View, Text, Pressable, Platform, ScrollView } from 'react-native';
import { Check, Edit3 } from 'lucide-react-native';
import { useRoleTheme } from '@/src/views/auth/RoleTheme';

export type OptionItem = { value: string; label: string; hint?: string };

export function OptionListCard({
  headerLabel,
  options,
  selectedValue,
  onSelect,
  showOther = true,
  otherLabel = 'Other (type your own)',
  onSelectOther,
  emptyLabel = 'No matches',
  loading = false,
  width,
  style,
  maxHeight,
}: {
  headerLabel?: string;
  options: OptionItem[];
  selectedValue?: string;
  onSelect: (v: OptionItem) => void;
  showOther?: boolean;
  otherLabel?: string;
  onSelectOther?: () => void;
  emptyLabel?: string;
  loading?: boolean;
  width?: number | string;
  style?: any;
  maxHeight?: number;
}) {
  const { primary } = useRoleTheme();
  return (
    <View
      className="rounded-[18px] py-3.5 px-3 bg-white border border-gray-200"
      style={{
        ...(Platform.OS === 'web' ? { userSelect: 'none', backgroundImage: 'none', boxShadow: '0px 10px 25px rgba(0,0,0,0.1)' } : { elevation: 12 }),
        ...(width ? { width: width as any } : null),
        ...style,
      }}
    >
      {headerLabel ? <Text className="text-gray-500 font-body-bold text-[11px] tracking-[1.4px] uppercase px-1.5 mb-2.5">{headerLabel}</Text> : null}
      {loading ? (
        <View className="py-[18px] items-center"><Text className="text-gray-400 font-body-semibold text-[13px]">Loading…</Text></View>
      ) : options.length === 0 && !showOther ? (
        <View className="py-[18px] items-center"><Text className="text-gray-400 font-body-semibold text-[13px]">{emptyLabel}</Text></View>
      ) : (
        <>
          <ScrollView className="max-h-[220px]" style={maxHeight != null ? { maxHeight } : undefined} nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
            {options.map((opt) => {
              const isSelected = opt.value === selectedValue;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => onSelect(opt)}
                  {...({
                    onMouseDown: Platform.OS === 'web' ? (e: any) => e.preventDefault() : undefined,
                  } as any)}
                  className="flex-row items-center justify-between px-4 py-3.5 rounded-xl mb-0.5"
                  style={Platform.OS === 'web' ? { cursor: 'pointer', transitionDuration: '120ms' } : undefined}
                  {...({
                    onMouseEnter: !isSelected ? undefined : undefined,
                    onMouseLeave: undefined,
                  } as any)}
                >
                  <Text
                    className="text-gray-900 font-body-semibold text-[14.5px] flex-1"
                    style={isSelected ? { color: '#FFF', fontFamily: 'DMSans_700Bold' } : undefined}
                    numberOfLines={1}
                  >
                    {opt.label}
                  </Text>
                  {isSelected ? <Check size={16} color="#FFFFFF" /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
          {showOther && (
            <>
              <View className="h-px bg-gray-100 my-1.5 mx-1" />
              <Pressable
                onPress={onSelectOther}
                {...({
                  onMouseDown: Platform.OS === 'web' ? (e: any) => e.preventDefault() : undefined,
                } as any)}
                className="flex-row items-center px-4 py-3.5 rounded-xl mb-0.5 justify-start"
                style={Platform.OS === 'web' ? { cursor: 'pointer', transitionDuration: '120ms' } : undefined}
              >
                <Edit3 size={14} color="rgba(255,255,255,0.78)" />
                <Text className="text-gray-900 font-body-semibold text-[14.5px] ml-2">
                  {otherLabel}
                </Text>
              </Pressable>
            </>
          )}
        </>
      )}
    </View>
  );
}
