// @ts-nocheck
/**
 * /echo/admin/dashboard — Superadmin dashboard for tracking scans, coupons, and tickets.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Search, RefreshCw, CheckCircle, Ticket, MapPin, Download } from 'lucide-react-native';
import { AdminLayout } from '@/src/views/web/admin/AdminLayout';
import { api } from '@/src/models/services/api';

const SC = {
  bg: '#0F172A',
  card: 'rgba(30, 41, 59, 0.7)',
  cardBorder: 'rgba(255,255,255,0.1)',
  text: '#F8FAFC',
  muted: '#94A3B8',
  primary: '#8B5CF6',
  primaryHover: '#7C3AED',
  success: '#10B981',
  successBg: 'rgba(16,185,129,0.15)',
};

const FONTS = {
  reg: 'Inter-Regular',
  med: 'Inter-Medium',
  semi: 'Inter-SemiBold',
  bold: 'Inter-Bold',
  xbold: 'Inter-ExtraBold',
};

type RegItem = {
  id: string;
  full_name: string;
  email: string;
  status: string;
  registered_at: string;
  checked_in_at: string | null;
  scanned_lat: number | null;
  scanned_lng: number | null;
  ticket_issued: boolean;
  coupons: {
    session_name: string;
    coupon_code: string;
    used: boolean;
  }[];
  coupons_issued: number;
};

export default function EchoSuperadminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<RegItem[]>([]);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    try {
      const res = await api.adminEchoRegistrations();
      setData(res || []);
    } catch (err) {
      console.error('Failed to load registrations', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadData();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleExportCSV = async () => {
    try {
      const res = await api.request<string>('/admin/export-csv');
      if (typeof window !== 'undefined') {
        const blob = new Blob([res], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `echo_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (e) {
      alert("Export failed");
    }
  };

  const filteredData = data.filter(r => {
    const s = search.toLowerCase();
    return (r.full_name || '').toLowerCase().includes(s) || (r.email || '').toLowerCase().includes(s) || (r.id || '').toLowerCase().includes(s);
  });

  // Calculate Metrics
  const totalIssued = data.filter(d => d.ticket_issued).length;
  const totalCheckedIn = data.filter(d => d.checked_in_at).length;
  const totalCouponsIssued = data.reduce((sum, r) => sum + r.coupons_issued, 0);
  const totalCouponsUsed = data.reduce((sum, r) => sum + r.coupons.filter(c => c.used).length, 0);

  return (
    <AdminLayout title="Echo Event">
      <View style={s.root}>
        <LinearGradient colors={['#0F172A', '#1E1B4B', '#0F172A']} style={StyleSheet.absoluteFill} />

        <ScrollView contentContainerStyle={s.contentContainer}>
          {/* Header Section */}
          <View style={s.headerRow}>
          <Pressable onPress={() => router.push('/echo/admin/scan')} style={({ hovered }: any) => [s.backBtn, hovered && { opacity: 0.8 }]}>
            <ArrowLeft color={SC.text} size={20} />
            <Text style={s.backText}>Scanner</Text>
          </Pressable>
          <Text style={s.title}>Superadmin Dashboard</Text>
          <View style={{ flex: 1 }} />
          <Pressable onPress={handleExportCSV} style={({ hovered }: any) => [s.actionBtn, { marginRight: 12 }, hovered && { opacity: 0.8 }]}>
            <Download color={SC.text} size={16} />
            <Text style={s.actionBtnText}>Export CSV</Text>
          </Pressable>
          <Pressable onPress={handleRefresh} style={({ hovered }: any) => [s.actionBtn, hovered && { opacity: 0.8 }]}>
            <RefreshCw color={SC.text} size={16} style={refreshing ? { opacity: 0.5 } : {}} />
            <Text style={s.actionBtnText}>Refresh</Text>
          </Pressable>
        </View>

        {/* Metrics Grid */}
        <View style={s.metricsGrid}>
          <View style={s.metricCard}>
            <Text style={s.metricLabel}>Total Tickets</Text>
            <Text style={s.metricValue}>{loading ? '-' : totalIssued}</Text>
          </View>
          <View style={s.metricCard}>
            <Text style={s.metricLabel}>Event Check-Ins</Text>
            <Text style={[s.metricValue, { color: SC.success }]}>{loading ? '-' : totalCheckedIn}</Text>
          </View>
          <View style={s.metricCard}>
            <Text style={s.metricLabel}>Coupons Issued</Text>
            <Text style={s.metricValue}>{loading ? '-' : totalCouponsIssued}</Text>
          </View>
          <View style={s.metricCard}>
            <Text style={s.metricLabel}>Coupons Scanned</Text>
            <Text style={[s.metricValue, { color: '#F59E0B' }]}>{loading ? '-' : totalCouponsUsed}</Text>
          </View>
        </View>

        {/* Search */}
        <View style={s.searchContainer}>
          <Search color={SC.muted} size={20} />
          <TextInput
            style={s.searchInput}
            placeholder="Search by name, email, or registration ID..."
            placeholderTextColor={SC.muted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Table */}
        <View style={s.tableContainer}>
          <View style={s.tableHeader}>
            <Text style={[s.th, { flex: 2 }]}>Attendee</Text>
            <Text style={[s.th, { flex: 1 }]}>Status</Text>
            <Text style={[s.th, { flex: 1.5 }]}>Event Check-In</Text>
            <Text style={[s.th, { flex: 2 }]}>Session Coupons</Text>
          </View>

          {loading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator color={SC.primary} size="large" />
            </View>
          ) : filteredData.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ color: SC.muted, fontFamily: FONTS.med }}>No registrations found.</Text>
            </View>
          ) : (
            filteredData.map(reg => (
              <View key={reg.id} style={s.tr}>
                <View style={[s.td, { flex: 2 }]}>
                  <Text style={s.tdName}>{reg.full_name || 'Unknown'}</Text>
                  <Text style={s.tdEmail}>{reg.email}</Text>
                  <Text style={s.tdId}>ID: {reg.id}</Text>
                </View>
                
                <View style={[s.td, { flex: 1 }]}>
                  <View style={[s.badge, reg.ticket_issued ? s.badgeSuccess : s.badgeWarning]}>
                    <Text style={[s.badgeText, reg.ticket_issued ? s.badgeSuccessText : s.badgeWarningText]}>
                      {reg.ticket_issued ? 'Issued' : 'Pending'}
                    </Text>
                  </View>
                </View>

                <View style={[s.td, { flex: 1.5, justifyContent: 'center' }]}>
                  {reg.checked_in_at ? (
                    <View style={s.checkInBlock}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <CheckCircle size={14} color={SC.success} />
                        <Text style={s.checkInText}>
                          {new Date(reg.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                      {reg.scanned_lat && reg.scanned_lng && (
                        <Pressable
                          onPress={() => window.open(`https://www.google.com/maps/search/?api=1&query=${reg.scanned_lat},${reg.scanned_lng}`, '_blank')}
                          style={({ hovered }: any) => [{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }, hovered && { opacity: 0.8 }]}
                        >
                          <MapPin size={12} color="#A78BFA" />
                          <Text style={s.locationLink}>View Location</Text>
                        </Pressable>
                      )}
                    </View>
                  ) : (
                    <Text style={s.noCheckIn}>Not Checked In</Text>
                  )}
                </View>

                <View style={[s.td, { flex: 2, justifyContent: 'center' }]}>
                  {reg.coupons && reg.coupons.length > 0 ? (
                    <View style={s.couponsGrid}>
                      {reg.coupons.map((c, idx) => (
                        <View key={idx} style={[s.couponChip, c.used ? s.couponChipUsed : null]}>
                          <Ticket size={12} color={c.used ? SC.success : SC.muted} />
                          <Text style={[s.couponText, c.used ? s.couponTextUsed : null]} numberOfLines={1}>
                            {c.session_name}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={s.noCheckIn}>No Coupons</Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
        </ScrollView>
      </View>
    </AdminLayout>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SC.bg,
  },
  contentContainer: {
    paddingTop: 32,
    paddingHorizontal: 32,
    paddingBottom: 80,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 16,
    padding: 8,
  },
  backText: {
    color: SC.text,
    fontFamily: FONTS.med,
    fontSize: 14,
  },
  title: {
    color: SC.text,
    fontFamily: FONTS.xbold,
    fontSize: 28,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  actionBtnText: {
    color: SC.text,
    fontFamily: FONTS.semi,
    fontSize: 14,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
    ...(Platform.OS === 'web' && { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }),
  },
  metricCard: {
    backgroundColor: SC.card,
    borderWidth: 1,
    borderColor: SC.cardBorder,
    borderRadius: 16,
    padding: 20,
    flex: 1,
  },
  metricLabel: {
    color: SC.muted,
    fontFamily: FONTS.semi,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  metricValue: {
    color: SC.text,
    fontFamily: FONTS.xbold,
    fontSize: 32,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: SC.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: SC.text,
    fontFamily: FONTS.reg,
    fontSize: 16,
    outlineStyle: 'none',
  },
  tableContainer: {
    backgroundColor: SC.card,
    borderWidth: 1,
    borderColor: SC.cardBorder,
    borderRadius: 16,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderBottomWidth: 1,
    borderBottomColor: SC.cardBorder,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  th: {
    color: SC.muted,
    fontFamily: FONTS.semi,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tr: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  td: {
    justifyContent: 'center',
  },
  tdName: {
    color: SC.text,
    fontFamily: FONTS.semi,
    fontSize: 15,
    marginBottom: 2,
  },
  tdEmail: {
    color: SC.muted,
    fontFamily: FONTS.reg,
    fontSize: 13,
    marginBottom: 4,
  },
  tdId: {
    color: 'rgba(255,255,255,0.3)',
    fontFamily: 'monospace',
    fontSize: 11,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeSuccess: {
    backgroundColor: SC.successBg,
  },
  badgeSuccessText: {
    color: SC.success,
    fontFamily: FONTS.semi,
    fontSize: 12,
  },
  badgeWarning: {
    backgroundColor: 'rgba(245,158,11,0.1)',
  },
  badgeWarningText: {
    color: '#F59E0B',
    fontFamily: FONTS.semi,
    fontSize: 12,
  },
  checkInBlock: {
    alignItems: 'flex-start',
  },
  checkInText: {
    color: SC.success,
    fontFamily: FONTS.semi,
    fontSize: 14,
  },
  locationLink: {
    color: '#A78BFA',
    fontFamily: FONTS.semi,
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  noCheckIn: {
    color: 'rgba(255,255,255,0.3)',
    fontFamily: FONTS.med,
    fontSize: 13,
  },
  couponsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  couponChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  couponChipUsed: {
    backgroundColor: SC.successBg,
    borderColor: 'rgba(16,185,129,0.2)',
  },
  couponText: {
    color: SC.muted,
    fontFamily: FONTS.med,
    fontSize: 11,
  },
  couponTextUsed: {
    color: SC.success,
  },
});
