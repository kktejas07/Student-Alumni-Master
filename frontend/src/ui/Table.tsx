/**
 * Table — token-driven data table with header, zebra rows, hover, empty and
 * loading states. Horizontal scroll on narrow viewports.
 */
import React from 'react';
import { View, Text, Pressable, ScrollView, type StyleProp, type ViewStyle } from 'react-native';
import { usePortalTheme, RADIUS, SPACE, web } from './theme';
import { EmptyState, SkeletonRows } from './primitives';

export type Column<Row> = {
  key: string;
  title: string;
  width?: number;
  flex?: number;
  align?: 'left' | 'right' | 'center';
  render?: (row: Row, index: number) => React.ReactNode;
};

export function Table<Row extends Record<string, any>>({
  columns, rows, keyField = 'id', loading, emptyTitle = 'Nothing here yet', emptyBody, onRowPress, style, minWidth = 640, dense,
}: {
  columns: Column<Row>[]; rows: Row[]; keyField?: string; loading?: boolean; emptyTitle?: string; emptyBody?: string;
  onRowPress?: (row: Row) => void; style?: StyleProp<ViewStyle>; minWidth?: number; dense?: boolean;
}) {
  const t = usePortalTheme();
  const padV = dense ? 8 : 12;
  const cellStyle = (c: Column<Row>) => ({
    width: c.width, flex: c.width ? undefined : (c.flex ?? 1), minWidth: 0,
    paddingHorizontal: SPACE.md, paddingVertical: padV,
    alignItems: (c.align === 'right' ? 'flex-end' : c.align === 'center' ? 'center' : 'flex-start') as ViewStyle['alignItems'],
  });

  if (loading) return <SkeletonRows rows={5} height={dense ? 36 : 44} />;
  if (!rows.length) return <EmptyState title={emptyTitle} body={emptyBody} compact />;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }} style={style}>
      <View style={{ flex: 1, minWidth, borderWidth: 1, borderColor: t.border, borderRadius: RADIUS.lg, overflow: 'hidden', backgroundColor: t.surface }}>
        <View style={{ flexDirection: 'row', backgroundColor: t.surface2, borderBottomWidth: 1, borderBottomColor: t.border }}>
          {columns.map((c) => (
            <View key={c.key} style={cellStyle(c)}>
              <Text style={{ fontFamily: t.typo.body700, fontSize: 10.5, letterSpacing: 0.8, textTransform: 'uppercase', color: t.textMuted }} numberOfLines={1}>{c.title}</Text>
            </View>
          ))}
        </View>
        {rows.map((row, i) => {
          const content = columns.map((c) => (
            <View key={c.key} style={cellStyle(c)}>
              {c.render ? c.render(row, i) : (
                <Text style={{ fontFamily: t.typo.body500, fontSize: 13, color: t.text }} numberOfLines={2}>{row[c.key] == null ? '—' : String(row[c.key])}</Text>
              )}
            </View>
          ));
          const rowBase: ViewStyle = { flexDirection: 'row', alignItems: 'center', borderBottomWidth: i === rows.length - 1 ? 0 : 1, borderBottomColor: t.border, backgroundColor: i % 2 ? t.hover : 'transparent' };
          const k = String(row[keyField] ?? i);
          return onRowPress ? (
            <Pressable key={k} onPress={() => onRowPress(row)} accessibilityRole="button"
              style={({ hovered }: any) => [rowBase, hovered && { backgroundColor: t.accentSoft }, web({ cursor: 'pointer' })]}>
              {content}
            </Pressable>
          ) : <View key={k} style={rowBase}>{content}</View>;
        })}
      </View>
    </ScrollView>
  );
}
