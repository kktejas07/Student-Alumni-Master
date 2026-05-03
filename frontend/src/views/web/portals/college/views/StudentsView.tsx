/**
 * StudentsView — College Phase 3 Roster.
 * Live filters (dept, year, status, search) + pagination + status pills.
 */
import React, { useState } from 'react';
import {
  View, Text, Pressable, TextInput, StyleSheet, Platform, ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CC, FONTS } from '../tokens';
import { Av, Badge } from '../atoms';
import { usePortalData } from '@/src/lib/portalApi';

type Student = {
  id: string; name: string; initials: string; email: string;
  dept: string; year: string; cgpa: number; attendance: number;
  status: string; color: string;
  placed?: boolean; company?: string | null; package_lpa?: number | null;
};
type Filter = { id: string; label: string };
type Resp = {
  items: Student[]; total: number; page: number;
  page_size: number; pages: number;
  filters: { departments: Filter[]; years: Filter[]; statuses: Filter[] };
};

const FALLBACK: Resp = {
  items: [], total: 0, page: 1, page_size: 20, pages: 0,
  filters: { departments: [], years: [], statuses: [] },
};

const statusBadge = (st: string) =>
  st === 'at_risk' ? { label: 'At-risk', color: 'red' as const }
  : st === 'top'   ? { label: 'Top 5%', color: 'green' as const }
                    : { label: 'On track', color: 'blue' as const };

export function StudentsView() {
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('all');
  const [year, setYear] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({
    q, dept, year, status, page: String(page), page_size: '20',
  }).toString();
  const { data } = usePortalData<Resp>(`/college/students?${params}`,
                                         FALLBACK, 60_000);
  const list = (data?.items) || [];
  const filters = data?.filters || FALLBACK.filters;

  return (
    <View style={{ gap: 14 }}>
      {/* Tool row */}
      <View style={s.toolRow}>
        <View style={s.searchBox}>
          <MaterialCommunityIcons name="magnify" size={14} color={CC.dim} />
          <TextInput value={q} onChangeText={(v) => { setQ(v); setPage(1); }}
            placeholder="Search by name, email, ID…"
            placeholderTextColor={CC.dim} style={s.searchInput} />
        </View>
        <View style={{ flex: 1 }} />
        <Pressable style={s.cta}>
          <MaterialCommunityIcons name="plus" size={14} color="#fff" />
          <Text style={s.ctaText}>Add Student</Text>
        </Pressable>
        <Pressable style={s.exportBtn}>
          <MaterialCommunityIcons name="download" size={14} color={CC.muted} />
          <Text style={s.exportBtnText}>Export CSV</Text>
        </Pressable>
      </View>

      {/* Filters */}
      <View style={s.filterRow}>
        <FilterPills label="Dept" value={dept}
          onChange={(v) => { setDept(v); setPage(1); }}
          options={[{ id: 'all', label: 'All' }, ...filters.departments]} />
        <FilterPills label="Year" value={year}
          onChange={(v) => { setYear(v); setPage(1); }}
          options={[{ id: 'all', label: 'All' }, ...filters.years]} />
        <FilterPills label="Status" value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          options={[{ id: 'all', label: 'All' }, ...filters.statuses]} />
        <View style={{ flex: 1 }} />
        <Text style={s.totalText}>{(data?.total || 0).toLocaleString('en-IN')} students</Text>
      </View>

      {/* Table */}
      <View style={s.table}>
        <View style={s.tableHead}>
          <Text style={[s.th, { flex: 2 }]}>Student</Text>
          <Text style={[s.th, { flex: 1 }]}>Dept</Text>
          <Text style={[s.th, { flex: 1 }]}>Year</Text>
          <Text style={[s.th, { flex: 1 }]}>CGPA</Text>
          <Text style={[s.th, { flex: 1 }]}>Attendance</Text>
          <Text style={[s.th, { flex: 1.2 }]}>Status</Text>
          <Text style={[s.th, { flex: 1.4 }]}>Placement</Text>
          <Text style={[s.th, { width: 32 }]}> </Text>
        </View>
        {list.length === 0 ? (
          <View style={s.emptyRow}>
            <MaterialCommunityIcons name="account-search" size={28} color={CC.dim} />
            <Text style={s.emptyText}>No students match these filters</Text>
          </View>
        ) : list.map((st) => {
          const b = statusBadge(st.status);
          return (
            <View key={st.id} style={s.row}>
              <View style={[{ flex: 2, flexDirection: 'row',
                              alignItems: 'center', gap: 10 }]}>
                <Av initials={st.initials} size={32} color={st.color} />
                <View>
                  <Text style={s.cellName}>{st.name}</Text>
                  <Text style={s.cellSub}>{st.id} · {st.email}</Text>
                </View>
              </View>
              <Text style={[s.cell, { flex: 1 }]}>{st.dept}</Text>
              <Text style={[s.cell, { flex: 1 }]}>{st.year}</Text>
              <Text style={[s.cell, { flex: 1, color: '#fff',
                                       fontFamily: FONTS.bold }]}>
                {st.cgpa}
              </Text>
              <Text style={[s.cell, { flex: 1,
                                       color: st.attendance < 70 ? CC.red : '#fff' }]}>
                {st.attendance}%
              </Text>
              <View style={{ flex: 1.2 }}>
                <Badge label={b.label} color={b.color} />
              </View>
              <View style={{ flex: 1.4 }}>
                {st.placed ? (
                  <View style={s.placedBox}>
                    <MaterialCommunityIcons name="briefcase-check"
                      size={11} color="#86EFAC" />
                    <Text style={s.placedText} numberOfLines={1}>
                      {st.company} · ₹{st.package_lpa} LPA
                    </Text>
                  </View>
                ) : (
                  <Text style={s.unplaced}>—</Text>
                )}
              </View>
              <Pressable style={[{ width: 32, alignItems: 'center' }]}>
                <MaterialCommunityIcons name="dots-horizontal"
                  size={16} color={CC.muted} />
              </Pressable>
            </View>
          );
        })}
      </View>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <View style={s.pagination}>
          <Pressable disabled={page <= 1} onPress={() => setPage(p => Math.max(1, p - 1))}
            style={[s.pageBtn, page <= 1 && { opacity: 0.4 }]}>
            <MaterialCommunityIcons name="chevron-left" size={14} color="#fff" />
            <Text style={s.pageBtnText}>Prev</Text>
          </Pressable>
          <Text style={s.pageInfo}>
            Page {data.page} of {data.pages}
          </Text>
          <Pressable disabled={page >= data.pages}
            onPress={() => setPage(p => Math.min(data.pages, p + 1))}
            style={[s.pageBtn, page >= data.pages && { opacity: 0.4 }]}>
            <Text style={s.pageBtnText}>Next</Text>
            <MaterialCommunityIcons name="chevron-right" size={14} color="#fff" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

function FilterPills({ label, value, onChange, options }:
  { label: string; value: string; onChange: (v: string) => void;
    options: Filter[] }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={s.filterLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 4 }}>
        {options.map((o) => {
          const active = value === o.id;
          return (
            <Pressable key={o.id} onPress={() => onChange(o.id)}
              style={[s.pill, active && {
                backgroundColor: 'rgba(167,139,250,0.18)',
                borderColor: 'rgba(167,139,250,0.50)' }]}>
              <Text style={[s.pillText,
                active && { color: '#C4B5FD' }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  toolRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8,
    width: 280, height: 36, paddingHorizontal: 11, borderRadius: 10,
    backgroundColor: CC.card, borderColor: CC.border, borderWidth: 1 },
  searchInput: { flex: 1, color: '#fff', fontFamily: FONTS.med, fontSize: 12.5,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, height: 36, borderRadius: 10,
    backgroundColor: CC.primary },
  ctaText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: CC.border, borderWidth: 1 },
  exportBtnText: { color: CC.muted, fontFamily: FONTS.bold, fontSize: 11.5 },

  filterRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 14 },
  filterLabel: { color: CC.muted, fontFamily: FONTS.xbold,
    fontSize: 9.5, letterSpacing: 1, textTransform: 'uppercase' },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: CC.border, borderWidth: 1 },
  pillText: { color: CC.muted, fontFamily: FONTS.bold, fontSize: 11 },
  totalText: { color: CC.muted, fontFamily: FONTS.bold, fontSize: 11.5,
    alignSelf: 'flex-end' },

  table: { borderRadius: 12, overflow: 'hidden',
    borderColor: CC.border, borderWidth: 1 },
  tableHead: { flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 9, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: CC.border,
    backgroundColor: 'rgba(255,255,255,0.04)' },
  th: { color: CC.muted, fontFamily: FONTS.xbold, fontSize: 10.5,
    letterSpacing: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 11, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: CC.border,
    backgroundColor: CC.card },
  cellName: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 },
  cellSub: { color: CC.dim, fontFamily: FONTS.med, fontSize: 10.5, marginTop: 1 },
  cell: { color: CC.muted, fontFamily: FONTS.med, fontSize: 12 },
  placedBox: { flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5,
    backgroundColor: 'rgba(16,185,129,0.10)',
    borderColor: 'rgba(16,185,129,0.35)', borderWidth: 1 },
  placedText: { color: '#86EFAC', fontFamily: FONTS.bold, fontSize: 10.5, flex: 1 },
  unplaced: { color: CC.dim, fontFamily: FONTS.bold, fontSize: 11 },

  emptyRow: { paddingVertical: 30, alignItems: 'center', gap: 8,
    backgroundColor: CC.card },
  emptyText: { color: CC.muted, fontFamily: FONTS.bold, fontSize: 12 },

  pagination: { flexDirection: 'row', alignItems: 'center', gap: 14,
    justifyContent: 'flex-end' },
  pageBtn: { flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, height: 32, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: CC.border, borderWidth: 1 },
  pageBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 11.5 },
  pageInfo: { color: CC.muted, fontFamily: FONTS.bold, fontSize: 12 },
});
