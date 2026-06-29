import { getBaseUrl } from '@/src/lib/env';
/**
 * StudentsView — College Phase 3 Roster.
 * Live filters (dept, year, status, search) + pagination + status pills.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, TextInput, StyleSheet, Platform, ScrollView, Modal, DeviceEventEmitter,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CC, FONTS } from '../tokens';
import { Av, Badge } from '../atoms';
import { usePortalData, postPortal, putPortal } from '@/src/lib/portalApi';

const DEPTS = ['CSE', 'ECE', 'ME', 'EEE', 'Civil', 'Chem', 'MBA'];
const YEARS = ['1st', '2nd', '3rd', '4th', 'Final'];

/** Lightweight inline select — avoids nested Modal z-index issues on web */
function SimpleSelect({ label, value, options, onChange }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ position: 'relative', zIndex: open ? 100 : 1 }}>
      <Text style={mst.label}>{label}</Text>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={[mst.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
      >
        <Text style={{ color: '#fff', fontFamily: FONTS.med, fontSize: 12.5 }}>{value}</Text>
        <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={14} color="#aaa" />
      </Pressable>
      {open && (
        <View style={ss.menu}>
          {options.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => { onChange(opt); setOpen(false); }}
              style={[ss.menuItem, value === opt && ss.menuItemActive]}
            >
              <Text style={[ss.menuText, value === opt && { color: '#fff' }]}>{opt}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const ss = StyleSheet.create({
  menu: {
    position: 'absolute',
    top: '100%' as any,
    left: 0, right: 0,
    backgroundColor: '#0d1320',
    borderColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderRadius: 8,
    zIndex: 999,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 8px 24px rgba(0,0,0,0.6)' } as any) : { elevation: 10 }),
  },
  menuItem: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  menuItemActive: { backgroundColor: 'rgba(167,139,250,0.18)' },
  menuText: { color: '#aaa', fontFamily: FONTS.med, fontSize: 12.5 },
});


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

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [nameVal, setNameVal] = useState('');
  const [emailVal, setEmailVal] = useState('');
  const [deptVal, setDeptVal] = useState('CSE');
  const [yearVal, setYearVal] = useState('1st');
  const [cgpaVal, setCgpaVal] = useState('8.0');
  const [attendanceVal, setAttendanceVal] = useState('85');
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const isBusy = submitting || clearing || uploading;

  const params = new URLSearchParams({
    q, dept, year, status, page: String(page), page_size: '20',
  }).toString();
  const { data, refresh } = usePortalData<Resp>(`/college/students?${params}`,
                                         FALLBACK, 60_000);
  const list = (data?.items) || [];
  const filters = data?.filters || FALLBACK.filters;

  useEffect(() => {
    DeviceEventEmitter.emit('scrollCollegePortalToTop');
  }, [page, dept, year, status]);

  const handleSaveStudent = async () => {
    if (isBusy || !nameVal.trim() || !emailVal.trim()) return;
    setSubmitting(true);
    try {
      if (editingStudent) {
        await putPortal(`/college/students/${editingStudent.id}`, {
          body: {
            name: nameVal,
            email: emailVal,
            dept: deptVal,
            year: yearVal,
            cgpa: parseFloat(cgpaVal) || 0.0,
            attendance: parseInt(attendanceVal, 10) || 0,
          }
        });
      } else {
        await postPortal('/college/students', {
          body: {
            name: nameVal,
            email: emailVal,
            dept: deptVal,
            year: yearVal,
            cgpa: parseFloat(cgpaVal) || 0.0,
            attendance: parseInt(attendanceVal, 10) || 0,
          }
        });
      }
      setModalVisible(false);
      setEditingStudent(null);
      setNameVal('');
      setEmailVal('');
      setDeptVal('CSE');
      setYearVal('1st');
      setCgpaVal('8.0');
      setAttendanceVal('85');
      refresh();
    } catch {
      // silent — keep modal open so user can retry
    } finally {
      setSubmitting(false);
    }
  };

  const doExport = async () => {
    setExporting(true);
    try {
      const base = getBaseUrl();
      const { tokenStore } = await import('@/src/models/services/api');
      const token = await tokenStore.getAccess();
      const exportParams = new URLSearchParams({ q, dept, year, status }).toString();
      const resp = await fetch(`${base}/api/college/students/export?${exportParams}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (resp.ok) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'students_export.csv';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch { /* silent */ } finally { setExporting(false); }
  };

  const doClear = async () => {
    if (isBusy) return;
    if (Platform.OS === 'web' && !window.confirm("Are you sure you want to clear all students?")) return;
    setClearing(true);
    try {
      const base = getBaseUrl();
      const { tokenStore } = await import('@/src/models/services/api');
      const token = await tokenStore.getAccess();
      const resp = await fetch(`${base}/api/college/students/clear`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (resp.ok) {
        refresh();
      } else {
        alert('Failed to clear students');
      }
    } catch { alert('Clear error'); } finally { setClearing(false); }
  };

  const doUpload = () => {
    if (isBusy) return;
    if (Platform.OS !== 'web') return; // File picker only web for now
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv, .xlsx';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const base = getBaseUrl();
        const { tokenStore } = await import('@/src/models/services/api');
        const token = await tokenStore.getAccess();
        const fd = new FormData();
        fd.append('file', file);
        const resp = await fetch(`${base}/api/college/students/upload`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        });
        if (resp.ok) {
          refresh();
        } else {
          alert('Failed to upload CSV');
        }
      } catch { alert('Upload error'); } finally { setUploading(false); }
    };
    input.click();
  };

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
        <Pressable style={s.clearBtn} onPress={doClear} disabled={isBusy}>
          <MaterialCommunityIcons name="delete" size={14} color="#EF4444" />
          <Text style={s.clearBtnText}>{clearing ? 'Clearing…' : 'Clear All'}</Text>
        </Pressable>
        <Pressable style={s.exportBtn} onPress={doExport} disabled={exporting || isBusy}>
          <MaterialCommunityIcons name={exporting ? "loading" : "download"} size={14} color={CC.muted} />
          <Text style={s.exportBtnText}>{exporting ? 'Exporting…' : 'Export'}</Text>
        </Pressable>
        <Pressable style={s.uploadBtn} onPress={doUpload} disabled={isBusy}>
          <MaterialCommunityIcons name="upload" size={14} color="#fff" />
          <Text style={s.uploadBtnText}>{uploading ? 'Uploading…' : 'Upload CSV / XLSX'}</Text>
        </Pressable>
        <Pressable style={s.cta} onPress={() => {
          setEditingStudent(null);
          setNameVal('');
          setEmailVal('');
          setDeptVal('CSE');
          setYearVal('1st');
          setCgpaVal('8.0');
          setAttendanceVal('85');
          setModalVisible(true);
        }} disabled={isBusy}>
          <MaterialCommunityIcons name="plus" size={14} color="#fff" />
          <Text style={s.ctaText}>Add Student</Text>
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
              <Pressable style={[{ width: 32, alignItems: 'center' }]} onPress={() => {
                setEditingStudent(st);
                setNameVal(st.name);
                setEmailVal(st.email);
                setDeptVal(st.dept);
                setYearVal(st.year);
                setCgpaVal(String(st.cgpa));
                setAttendanceVal(String(st.attendance));
                setModalVisible(true);
              }}>
                <MaterialCommunityIcons name="pencil"
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

      {/* Modal for adding a student */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={mst.overlay}>
          <View style={mst.modal}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={mst.title}>{editingStudent ? 'Edit Student' : 'Add New Student'}</Text>
              <Pressable onPress={() => setModalVisible(false)} style={{ padding: 4 }}>
                <MaterialCommunityIcons name="close" size={16} color="#fff" />
              </Pressable>
            </View>

            <View style={mst.field}>
              <Text style={mst.label}>Full Name</Text>
              <TextInput
                style={mst.input}
                placeholder="e.g. Rahul Sharma"
                placeholderTextColor={CC.dim}
                value={nameVal}
                onChangeText={setNameVal}
              />
            </View>

            <View style={mst.field}>
              <Text style={mst.label}>Email Address</Text>
              <TextInput
                style={mst.input}
                placeholder="e.g. rahul@college.edu"
                placeholderTextColor={CC.dim}
                value={emailVal}
                onChangeText={setEmailVal}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={[mst.row, { zIndex: 10 }]}>
              <View style={[mst.field, { zIndex: 10 }]}>
                <SimpleSelect
                  label="Department"
                  value={deptVal}
                  options={DEPTS}
                  onChange={setDeptVal}
                />
              </View>
              <View style={[mst.field, { zIndex: 9 }]}>
                <SimpleSelect
                  label="Year"
                  value={yearVal}
                  options={YEARS}
                  onChange={setYearVal}
                />
              </View>
            </View>

            <View style={mst.row}>
              <View style={mst.field}>
                <Text style={mst.label}>CGPA</Text>
                <TextInput
                  style={mst.input}
                  placeholder="e.g. 8.5"
                  placeholderTextColor={CC.dim}
                  value={cgpaVal}
                  onChangeText={setCgpaVal}
                  keyboardType="numeric"
                />
              </View>
              <View style={mst.field}>
                <Text style={mst.label}>Attendance %</Text>
                <TextInput
                  style={mst.input}
                  placeholder="e.g. 85"
                  placeholderTextColor={CC.dim}
                  value={attendanceVal}
                  onChangeText={setAttendanceVal}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={mst.actions}>
              <Pressable style={mst.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={{ color: CC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>Cancel</Text>
              </Pressable>
              <Pressable style={mst.submitBtn} onPress={handleSaveStudent} disabled={submitting}>
                <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12 }}>
                  {submitting ? 'Saving…' : editingStudent ? 'Save Changes' : 'Add Student'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)', borderWidth: 1 },
  clearBtnText: { color: '#EF4444', fontFamily: FONTS.bold, fontSize: 11.5 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, height: 36, borderRadius: 10,
    backgroundColor: '#3B82F6' },
  uploadBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 11.5 },

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

const mst = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 16, 0.50)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    ...(Platform.OS === 'web' ? ({
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
    } as any) : {}),
  },
  modal: {
    backgroundColor: 'rgba(9, 13, 22, 0.80)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 460,
    gap: 14,
    ...(Platform.OS === 'web' ? ({
      boxShadow: '0 18px 40px rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    } as any) : {}),
  },
  title: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  field: {
    flex: 1,
    gap: 5,
  },
  label: {
    color: CC.muted,
    fontFamily: FONTS.bold,
    fontSize: 10.5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: CC.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
    color: '#fff',
    fontFamily: FONTS.med,
    fontSize: 12.5,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CC.border,
  },
  submitBtn: {
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 8,
    backgroundColor: CC.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
