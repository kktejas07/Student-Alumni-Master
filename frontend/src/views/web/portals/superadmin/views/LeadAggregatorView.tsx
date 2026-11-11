/**
 * Super Admin Portal — Lead Aggregator view.
 * Wraps the shared LeadAggregatorDashboard with the portal's Apple-kit header.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Target } from 'lucide-react-native';
import { SAC, useSAC, FONTS, resolveColors, pristineOf } from '../tokens';
import { Card, IconBox, GRAD } from '../applekit';
import { LeadAggregatorDashboard } from '@/src/views/web/LeadAggregatorDashboard';

export function LeadAggregatorView() {
  const T = useSAC();
  Object.assign(s, resolveColors(pristineOf(s), T));

  return (
    <View style={{ gap: 14 }}>
      <Card>
        <View style={s.headRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <IconBox><Target size={14} color={GRAD.to} /></IconBox>
            <View>
              <Text style={s.title}>Lead Aggregator</Text>
              <Text style={s.sub}>Universal 27-domain lead engine · scoring, dedup, fraud & campus growth</Text>
            </View>
          </View>
        </View>
      </Card>
      <LeadAggregatorDashboard />
    </View>
  );
}

const s = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  title: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 15 },
  sub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 },
});
