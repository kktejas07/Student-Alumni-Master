/**
 * OptionListCard — Canonical option-list popover used by every dropdown /
 * autocomplete in the app (student / mentor / alumni / college).
 *
 * Visual spec (reference: Institution Type screenshot):
 *  • Outer card: deep gradient (#1A0E2E → #0A0512), 1px purple-glow border,
 *    rounded 18px, soft outer shadow.
 *  • Header label: uppercase, 11px, letter-spacing 1.4, muted-purple tint.
 *  • Each row: 14px vertical padding, 16px horizontal, full-width rounded 12px.
 *      - default: transparent, white 90% text.
 *      - hover:   bg = primary @ 22% alpha (lighter purple tint).
 *      - active:  bg = primary @ 100%, white text + ✓ check on right.
 *  • Optional bottom row "Other (type your own)" with edit icon.
 *
 * Theme-aware via RoleThemeContext — purple for student, gold for mentor,
 * orange for alumni, blue for college.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform, ScrollView } from 'react-native';
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
    <View style={[styles.card, width ? { width: width as any } : null, style]}>
      {headerLabel ? <Text style={styles.header}>{headerLabel}</Text> : null}
      {loading ? (
        <View style={styles.empty}><Text style={styles.emptyText}>Loading…</Text></View>
      ) : options.length === 0 && !showOther ? (
        <View style={styles.empty}><Text style={styles.emptyText}>{emptyLabel}</Text></View>
      ) : (
        <>
          <ScrollView style={[styles.scroll, maxHeight != null ? { maxHeight } : null]} nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
            {options.map((opt) => {
              const isSelected = opt.value === selectedValue;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => onSelect(opt)}
                  {...({
                    onMouseDown: Platform.OS === 'web' ? (e: any) => e.preventDefault() : undefined,
                  } as any)}
                  style={({ hovered, pressed }: any) => [
                    styles.row,
                    hovered && !isSelected && { backgroundColor: `${primary}33` },
                    pressed && !isSelected && { backgroundColor: `${primary}55` },
                    isSelected && { backgroundColor: primary },
                  ]}
                >
                  <Text style={[styles.rowText, isSelected && styles.rowTextActive]} numberOfLines={1}>
                    {opt.label}
                  </Text>
                  {isSelected ? <Check size={16} color="#FFFFFF" /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
          {showOther && (
            <>
              <View style={styles.divider} />
              <Pressable
                onPress={onSelectOther}
                {...({
                  onMouseDown: Platform.OS === 'web' ? (e: any) => e.preventDefault() : undefined,
                } as any)}
                style={({ hovered, pressed }: any) => [
                  styles.row,
                  styles.otherRow,
                  hovered && { backgroundColor: `${primary}33` },
                  pressed && { backgroundColor: `${primary}55` },
                ]}
              >
                <Edit3 size={14} color="rgba(255,255,255,0.78)" />
                <Text style={[styles.rowText, { color: '#111827', marginLeft: 8 }]}>
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

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...(Platform.OS === 'web'
      ? ({
          userSelect: 'none' as any,
          // Subtle inner gradient + purple outer glow per reference.
          backgroundImage: 'none' as any,
          boxShadow: '0px 10px 25px rgba(0,0,0,0.1)' as any,
        } as any)
      : { elevation: 12 }),
  },
  header: {
    color: '#6B7280',
    fontFamily: 'DMSans_700Bold',
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    paddingHorizontal: 6,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 2,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '120ms' } as any) : {}),
  },
  otherRow: {
    justifyContent: 'flex-start',
  },
  rowText: {
    color: '#111827',
    fontFamily: 'DMSans_500Medium',
    fontSize: 14.5,
    flex: 1,
  },
  rowTextActive: {
    color: '#FFFFFF',
    fontFamily: 'DMSans_700Bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 6,
    marginHorizontal: 4,
  },
  empty: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9CA3AF',
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },
  scroll: {
    maxHeight: 220,
  },
});
