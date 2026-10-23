/**
 * Mentor Portal — Earnings view.
 *
 * Data source: GET /api/mentor/earnings (backend/portals.py::get_mentor_earnings)
 *   { total_earned, available_withdraw, this_month, this_week, today,
 *     currency, formatted_total, formatted_available }
 *
 * The backend exposes no monthly series, transaction list, per-student
 * breakdown or withdrawal history for mentors, so this view shows only the
 * figures the API returns. Nothing here is sample data.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Wallet, IndianRupee, RefreshCw, Info } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MC, FONTS } from '../tokens';
import { usePortalData } from '@/src/lib/portalApi';

type MentorEarnings = {
  total_earned: number;
  available_withdraw: number;
  this_month: number;
  this_week: number;
  today: number;
  currency: string;
  formatted_total?: string;
  formatted_available?: string;
};

function formatInr(n: number | undefined | null): string {
  const v = Number(n) || 0;
  return `₹${v.toLocaleString('en-IN')}`;
}

export function EarningsView() {
  const { data, loading, error, refresh } = usePortalData<MentorEarnings | null>('/mentor/earnings', null, 60_000);

  const isLoading = loading && !data;
  const isError = !!error && !data;

  const totalEarned = data?.total_earned ?? 0;
  const available = data?.available_withdraw ?? 0;

  return (
    <View style={{ flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <View style={s.headerRow}>
        <View>
          <Text style={s.mainTitle}>Earnings</Text>
          <Text style={s.mainSubtitle}>Lifetime total and current balance</Text>
        </View>
        <Pressable onPress={refresh} style={s.refreshBtn} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color={MC.muted} />
          ) : (
            <RefreshCw size={13} color={MC.muted} />
          )}
          <Text style={s.refreshText}>Refresh</Text>
        </Pressable>
      </View>

      {/* Error state */}
      {isError && (
        <View style={[s.card, s.errorCard]}>
          <Text style={s.errorTitle}>Could not load earnings</Text>
          <Text style={s.errorText}>{error}</Text>
          <Pressable onPress={refresh} style={s.retryBtn}>
            <RefreshCw size={12} color="#FFFFFF" />
            <Text style={s.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* Loading state */}
      {isLoading && !isError && (
        <View style={[s.card, { alignItems: 'center', paddingVertical: 40, gap: 10 }]}>
          <ActivityIndicator size="small" color={MC.teal} />
          <Text style={s.stateText}>Loading your earnings...</Text>
        </View>
      )}

      {data && (
        <>
          {/* Total Earned */}
          <View style={s.totalEarnedCard}>
            <Text style={s.totalEarnedKicker}>TOTAL EARNED</Text>
            <Text style={s.totalEarnedValue}>{data.formatted_total || formatInr(totalEarned)}</Text>
            <Text style={s.totalEarnedSubtext}>
              {totalEarned > 0 ? 'Lifetime earnings credited to your mentor wallet' : 'No earnings credited yet'}
            </Text>

            <View style={s.metricGrid}>
              <View style={s.metricItem}>
                <Text style={s.metricItemLabel}>THIS MONTH</Text>
                <Text style={s.metricItemVal}>{formatInr(data.this_month)}</Text>
              </View>
              <View style={[s.metricItem, s.metricItemBorder]}>
                <Text style={s.metricItemLabel}>THIS WEEK</Text>
                <Text style={s.metricItemVal}>{formatInr(data.this_week)}</Text>
              </View>
              <View style={s.metricItem}>
                <Text style={s.metricItemLabel}>TODAY</Text>
                <Text style={s.metricItemVal}>{formatInr(data.today)}</Text>
              </View>
            </View>
          </View>

          {/* Available balance */}
          <LinearGradient
            colors={['rgba(20,184,166,0.15)', 'rgba(15,118,110,0.05)']}
            style={s.withdrawBanner}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <View style={s.iconBox}>
                <Wallet size={18} color={MC.teal} />
              </View>
              <Text style={s.withdrawKicker}>AVAILABLE BALANCE</Text>
            </View>
            <Text style={s.withdrawMainAmount}>{data.formatted_available || formatInr(available)}</Text>
            <Text style={s.withdrawSubtext}>
              {available > 0
                ? 'Balance available in your mentor wallet.'
                : 'No balance available for withdrawal.'}
            </Text>
          </LinearGradient>

          {/* What is not shown, and why */}
          <View style={s.infoCard}>
            <Info size={14} color={MC.muted} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={s.infoTitle}>Session-level details are not available yet</Text>
              <Text style={s.infoText}>
                Monthly trends, per-session transactions, per-student breakdowns and withdrawal history
                are not provided by the earnings service at the moment. Only the figures above are reported.
              </Text>
            </View>
          </View>
        </>
      )}

      {/* Empty state when the API returns nothing usable */}
      {!isLoading && !isError && !data && (
        <View style={[s.card, { alignItems: 'center', paddingVertical: 40, gap: 8 }]}>
          <IndianRupee size={36} color={MC.dim} />
          <Text style={s.cardTitle}>No earnings yet</Text>
          <Text style={s.stateText}>Earnings appear here once students complete paid sessions with you.</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  mainTitle: {
    color: '#FFFFFF',
    fontFamily: FONTS.xbold,
    fontSize: 22,
    letterSpacing: -0.5,
  },
  mainSubtitle: {
    color: MC.dim,
    fontFamily: FONTS.med,
    fontSize: 12,
    marginTop: 2,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.border,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  refreshText: {
    color: MC.muted,
    fontFamily: FONTS.semi,
    fontSize: 12,
  },
  card: {
    backgroundColor: MC.card,
    borderColor: MC.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontFamily: FONTS.xbold,
    fontSize: 15,
  },
  stateText: {
    color: MC.muted,
    fontFamily: FONTS.med,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  errorCard: {
    borderColor: 'rgba(239,68,68,0.35)',
    backgroundColor: 'rgba(239,68,68,0.06)',
    gap: 8,
  },
  errorTitle: {
    color: '#FCA5A5',
    fontFamily: FONTS.bold,
    fontSize: 14,
  },
  errorText: {
    color: MC.muted,
    fontFamily: FONTS.med,
    fontSize: 12.5,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0D9488',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 4,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  retryText: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
    fontSize: 12,
  },
  totalEarnedCard: {
    backgroundColor: MC.card,
    borderColor: MC.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  },
  totalEarnedKicker: {
    color: MC.dim,
    fontFamily: FONTS.xbold,
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  totalEarnedValue: {
    color: '#FFFFFF',
    fontFamily: FONTS.xbold,
    fontSize: 38,
    letterSpacing: -1,
    marginBottom: 4,
  },
  totalEarnedSubtext: {
    color: MC.muted,
    fontFamily: FONTS.semi,
    fontSize: 13.5,
    marginBottom: 20,
  },
  metricGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: MC.border,
    paddingTop: 16,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  metricItemBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: MC.border,
  },
  metricItemLabel: {
    color: MC.dim,
    fontFamily: FONTS.xbold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  metricItemVal: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
    fontSize: 16.5,
  },
  withdrawBanner: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.25)',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(20,184,166,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  withdrawKicker: {
    color: MC.muted,
    fontFamily: FONTS.xbold,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  withdrawMainAmount: {
    color: '#FFFFFF',
    fontFamily: FONTS.xbold,
    fontSize: 34,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  withdrawSubtext: {
    color: MC.muted,
    fontFamily: FONTS.semi,
    fontSize: 12.5,
  },
  infoCard: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: MC.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  infoTitle: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
    fontSize: 13,
    marginBottom: 2,
  },
  infoText: {
    color: MC.dim,
    fontFamily: FONTS.med,
    fontSize: 11.5,
    lineHeight: 17,
  },
});
