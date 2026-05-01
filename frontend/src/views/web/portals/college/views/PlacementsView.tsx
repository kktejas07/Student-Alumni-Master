import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { CC, FONTS } from '../tokens';
import { Av, Badge } from '../atoms';
import { usePortalData } from '@/src/lib/portalApi';

const FALLBACK = { stages: { shortlisted: [] as any[], interviewing: [] as any[], offered: [] as any[], joined: [] as any[] } };

const COLUMNS = [
  { id:'shortlisted',  label:'Shortlisted',  color:'#A78BFA' },
  { id:'interviewing', label:'Interviewing', color:'#FBBF24' },
  { id:'offered',      label:'Offered',      color:'#22C55E' },
  { id:'joined',       label:'Joined',       color:'#22D3EE' },
];

export function PlacementsView() {
  const { data } = usePortalData<typeof FALLBACK>('/college/placements', FALLBACK);
  const PIPELINE = data?.stages || FALLBACK.stages;
  const { width } = useWindowDimensions();
  const stack = width < 1100;
  return (
    <View style={{ flexDirection: stack ? 'column' : 'row', gap: 12 }}>
      {COLUMNS.map((col) => {
        const items = (PIPELINE as any)[col.id];
        return (
          <View key={col.id} style={[s.col, !stack && { flex: 1 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <View style={[s.dot, { backgroundColor: col.color }]} />
              <Text style={s.colTitle}>{col.label}</Text>
              <View style={s.count}><Text style={s.countText}>{items.length}</Text></View>
            </View>
            <View style={{ gap: 8 }}>
              {items.map((p: any) => (
                <View key={p.id} style={s.cardItem}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Av initials={p.initials} size={32} color={p.color} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={s.itemName}>{p.name}</Text>
                      <Text numberOfLines={1} style={s.itemMeta}>{p.role}</Text>
                    </View>
                  </View>
                  <Text style={s.itemCompany}>{p.company}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}
const s = StyleSheet.create({
  col: { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: CC.border, borderWidth: 1, borderRadius: 14, padding: 14, minHeight: 320 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  colTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 13 },
  count: { backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 7, paddingVertical: 1, borderRadius: 6 },
  countText: { color: CC.muted, fontFamily: FONTS.xbold, fontSize: 10 },
  cardItem: { backgroundColor: CC.card, borderColor: CC.border, borderWidth: 1, borderRadius: 10, padding: 10 },
  itemName: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12 },
  itemMeta: { color: CC.muted, fontFamily: FONTS.med, fontSize: 10.5 },
  itemCompany: { color: CC.accentBright, fontFamily: FONTS.bold, fontSize: 11, marginTop: 8 },
});
