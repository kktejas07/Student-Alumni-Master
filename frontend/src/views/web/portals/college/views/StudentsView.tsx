import { getBaseUrl } from '@/src/lib/env';
import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, TextInput, Platform, ScrollView, Modal, DeviceEventEmitter,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CC } from '../tokens';
import { Av, Badge } from '../atoms';
import { usePortalData, postPortal, putPortal } from '@/src/lib/portalApi';
import { useToast } from '@/src/views/components';

const DEPTS = ['CSE', 'ECE', 'ME', 'EEE', 'Civil', 'Chem', 'MBA'];
const YEARS = ['1st', '2nd', '3rd', '4th', 'Final'];

function SimpleSelect({ label, value, options, onChange }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View className={`relative ${open ? 'z-[100]' : 'z-[1]'}`}>
      <Text className="text-muted font-display-bold text-[10.5px] tracking-wider uppercase mb-[2px]">{label}</Text>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        className="bg-[rgba(255,255,255,0.04)] border border-glass-border rounded-lg px-3 h-[38px] flex-row items-center justify-between">
        <Text className="text-text font-body text-[12.5px]">{value}</Text>
        <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={14} color="#aaa" />
      </Pressable>
      {open && (
        <View className="absolute top-full left-0 right-0 bg-[#0d1320] border border-[rgba(255,255,255,0.14)] rounded-lg z-[999] overflow-hidden"
          style={Platform.OS === 'web' ? { boxShadow: '0 8px 24px rgba(0,0,0,0.6)' } as any : { elevation: 10 }}>
          {options.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => { onChange(opt); setOpen(false); }}
              className={`px-3 py-[9px] ${value === opt ? 'bg-[rgba(167,139,250,0.18)]' : ''}`}
              style={Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}}>
              <Text className={`font-body text-[12.5px] ${value === opt ? 'text-text' : 'text-[#aaa]'}`}>{opt}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

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

  const toast = useToast();
  const [confirmModal, setConfirmModal] = useState<{ visible: boolean; title: string; message: string; actionText: string; actionColor?: string; onConfirm: () => void } | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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
            name: nameVal, email: emailVal, dept: deptVal, year: yearVal,
            cgpa: parseFloat(cgpaVal) || 0.0, attendance: parseInt(attendanceVal, 10) || 0,
          }
        });
        toast.success('Student Updated', 'The student record has been updated successfully.');
      } else {
        await postPortal('/college/students', {
          body: {
            name: nameVal, email: emailVal, dept: deptVal, year: yearVal,
            cgpa: parseFloat(cgpaVal) || 0.0, attendance: parseInt(attendanceVal, 10) || 0,
          }
        });
        toast.success('Student Added', 'The new student has been added to the roster.');
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
      toast.error('Error', 'Failed to save student.');
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
        toast.success('Export ready', 'Students CSV downloaded.');
      } else {
        toast.error('Export failed', 'Could not download the CSV.');
      }
    } catch (e: any) {
      toast.error('Export failed', e?.message || 'Please try again.');
    } finally { setExporting(false); }
  };

  const doClear = async () => {
    if (isBusy) return;
    setConfirmModal({
      visible: true, title: 'Clear All Students',
      message: 'Are you sure you want to clear all students? This action cannot be undone.',
      actionText: 'Clear All', actionColor: '#EF4444',
      onConfirm: async () => {
        setConfirmModal(null);
        setClearing(true);
        try {
          const base = getBaseUrl();
          const { tokenStore } = await import('@/src/models/services/api');
          const token = await tokenStore.getAccess();
          const resp = await fetch(`${base}/api/college/students/clear`, {
            method: 'DELETE',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (resp.ok) { toast.success('Success', 'Cleared all students successfully'); refresh(); }
          else { toast.error('Error', 'Failed to clear students'); }
        } catch { toast.error('Error', 'Clear error'); } finally { setClearing(false); }
      }
    });
  };

  const doBulkDelete = async () => {
    if (isBusy || selectedIds.size === 0) return;
    setConfirmModal({
      visible: true, title: 'Delete Selected',
      message: `Are you sure you want to delete ${selectedIds.size} selected students?`,
      actionText: 'Delete', actionColor: '#EF4444',
      onConfirm: async () => {
        setConfirmModal(null);
        setClearing(true);
        try {
          const base = getBaseUrl();
          const { tokenStore } = await import('@/src/models/services/api');
          const token = await tokenStore.getAccess();
          const resp = await fetch(`${base}/api/college/students/bulk-delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ ids: Array.from(selectedIds) })
          });
          if (resp.ok) { toast.success('Success', 'Deleted selected students successfully'); setSelectedIds(new Set()); refresh(); }
          else { toast.error('Error', 'Failed to delete selected students'); }
        } catch { toast.error('Error', 'Delete error'); } finally { setClearing(false); }
      }
    });
  };

  const doUpload = () => {
    if (isBusy || Platform.OS !== 'web') return;
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
        if (resp.ok) { toast.success('Upload Successful', 'Student data has been securely added to your roster.'); refresh(); }
        else { toast.error('Upload Failed', 'Could not process the uploaded file.'); }
      } catch { toast.error('Error', 'Upload error'); } finally { setUploading(false); }
    };
    input.click();
  };

  return (
    <View className="gap-[14px]">
      <View className="flex-row gap-[10px] items-center">
        <View className="flex-row items-center gap-2 w-[280px] h-9 px-[11px] rounded-[10px] bg-glass-soft border border-glass-border">
          <MaterialCommunityIcons name="magnify" size={14} color={CC.dim} />
          <TextInput value={q} onChangeText={(v) => { setQ(v); setPage(1); }}
            placeholder="Search by name, email, ID…" placeholderTextColor={CC.dim}
            className="flex-1 text-text font-body text-[12.5px]"
            style={Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}} />
        </View>
        <View className="flex-1" />
        {selectedIds.size > 0 && (
          <Pressable className="flex-row gap-[6px] items-center px-3 h-9 rounded-[10px] bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] mr-2" onPress={doBulkDelete} disabled={isBusy}>
            <MaterialCommunityIcons name="delete" size={14} color="#EF4444" />
            <Text className="text-[#EF4444] font-body-bold text-[11.5px]">Delete Selected ({selectedIds.size})</Text>
          </Pressable>
        )}
        <Pressable className="flex-row gap-[6px] items-center px-3 h-9 rounded-[10px] bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)]" onPress={doClear} disabled={isBusy}>
          <MaterialCommunityIcons name="delete" size={14} color="#EF4444" />
          <Text className="text-[#EF4444] font-body-bold text-[11.5px]">{clearing ? 'Clearing…' : 'Clear All'}</Text>
        </Pressable>
        <Pressable className="flex-row gap-[6px] items-center px-3 h-9 rounded-[10px] bg-[rgba(255,255,255,0.04)] border border-glass-border" onPress={doExport} disabled={exporting || isBusy}>
          <MaterialCommunityIcons name={exporting ? "loading" : "download"} size={14} color={CC.muted} />
          <Text className="text-muted font-body-bold text-[11.5px]">{exporting ? 'Exporting…' : 'Export'}</Text>
        </Pressable>
        <Pressable className="flex-row gap-[6px] items-center px-3 h-9 rounded-[10px] bg-[#3B82F6]" onPress={doUpload} disabled={isBusy}>
          <MaterialCommunityIcons name="upload" size={14} color="#fff" />
          <Text className="text-text font-body-bold text-[11.5px]">{uploading ? 'Uploading…' : 'Upload CSV / XLSX'}</Text>
        </Pressable>
        <Pressable className="flex-row gap-[6px] items-center px-[14px] h-9 rounded-[10px] bg-violet" onPress={() => {
          setEditingStudent(null); setNameVal(''); setEmailVal('');
          setDeptVal('CSE'); setYearVal('1st'); setCgpaVal('8.0'); setAttendanceVal('85');
          setModalVisible(true);
        }} disabled={isBusy}>
          <MaterialCommunityIcons name="plus" size={14} color="#fff" />
          <Text className="text-text font-display-bold text-xs">Add Student</Text>
        </Pressable>
      </View>

      <View className="flex-row items-end gap-[14px]">
        <FilterPills label="Dept" value={dept}
          onChange={(v) => { setDept(v); setPage(1); }}
          options={[{ id: 'all', label: 'All' }, ...filters.departments]} />
        <FilterPills label="Year" value={year}
          onChange={(v) => { setYear(v); setPage(1); }}
          options={[{ id: 'all', label: 'All' }, ...filters.years]} />
        <FilterPills label="Status" value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          options={[{ id: 'all', label: 'All' }, ...filters.statuses]} />
        <View className="flex-1" />
        <Text className="text-muted font-body-bold text-[11.5px] self-end">{(data?.total || 0).toLocaleString('en-IN')} students</Text>
      </View>

      <View className="rounded-xl overflow-hidden border border-glass-border">
        <View className="flex-row items-center gap-[10px] py-[9px] px-[14px] border-b border-glass-border bg-[rgba(255,255,255,0.04)]">
          <Pressable className="w-8 items-center justify-center"
            onPress={() => {
              if (selectedIds.size === list.length && list.length > 0) setSelectedIds(new Set());
              else setSelectedIds(new Set(list.map(s => s.id)));
            }}>
            <MaterialCommunityIcons
              name={list.length > 0 && selectedIds.size === list.length ? "checkbox-marked" : "checkbox-blank-outline"}
              size={18}
              color={list.length > 0 && selectedIds.size === list.length ? CC.primary : CC.dim} />
          </Pressable>
          <Text className="text-muted font-display-bold text-[10.5px] tracking-widest w-10 text-center">S.No</Text>
          <Text className="text-muted font-display-bold text-[10.5px] tracking-widest flex-[2]">Student</Text>
          <Text className="text-muted font-display-bold text-[10.5px] tracking-widest flex-1">Dept</Text>
          <Text className="text-muted font-display-bold text-[10.5px] tracking-widest flex-1">Year</Text>
          <Text className="text-muted font-display-bold text-[10.5px] tracking-widest flex-1">CGPA</Text>
          <Text className="text-muted font-display-bold text-[10.5px] tracking-widest flex-1">Attendance</Text>
          <Text className="text-muted font-display-bold text-[10.5px] tracking-widest flex-[1.2]">Status</Text>
          <Text className="text-muted font-display-bold text-[10.5px] tracking-widest flex-[1.4]">Placement</Text>
          <Text className="text-muted font-display-bold text-[10.5px] tracking-widest w-8"> </Text>
        </View>
        {list.length === 0 ? (
          <View className="py-[30px] items-center gap-2 bg-glass-soft">
            <MaterialCommunityIcons name="account-search" size={28} color={CC.dim} />
            <Text className="text-muted font-body-bold text-xs">No students match these filters</Text>
          </View>
        ) : list.map((st, index) => {
          const b = statusBadge(st.status);
          const sno = (page - 1) * 20 + index + 1;
          return (
            <View key={st.id} className="flex-row items-center gap-[10px] py-[11px] px-[14px] border-b border-glass-border bg-glass-soft">
              <Pressable className="w-8 items-center justify-center"
                onPress={() => {
                  const newSet = new Set(selectedIds);
                  if (newSet.has(st.id)) newSet.delete(st.id);
                  else newSet.add(st.id);
                  setSelectedIds(newSet);
                }}>
                <MaterialCommunityIcons
                  name={selectedIds.has(st.id) ? "checkbox-marked" : "checkbox-blank-outline"}
                  size={18}
                  color={selectedIds.has(st.id) ? CC.primary : CC.dim} />
              </Pressable>
              <Text className="text-dim font-body text-xs w-10 text-center">{sno}</Text>
              <View className="flex-[2] flex-row items-center gap-[10px]">
                <Av initials={st.initials} size={32} color={st.color} />
                <View>
                  <Text className="text-text font-body-bold text-[12.5px]">{st.name}</Text>
                  <Text className="text-dim font-body text-[10.5px] mt-[2px]">{st.id} · {st.email}</Text>
                </View>
              </View>
              <Text className="text-muted font-body text-xs flex-1">{st.dept}</Text>
              <Text className="text-muted font-body text-xs flex-1">{st.year}</Text>
              <Text className="text-text font-body-bold text-xs flex-1">{st.cgpa}</Text>
              <Text className="font-body text-xs flex-1" style={{ color: st.attendance < 70 ? CC.red : '#fff' }}>
                {st.attendance}%
              </Text>
              <View className="flex-[1.2]">
                <Badge label={b.label} color={b.color} />
              </View>
              <View className="flex-[1.4]">
                {st.placed ? (
                  <View className="flex-row items-center gap-1 px-2 py-1 rounded-[5px] bg-[rgba(16,185,129,0.10)] border border-[rgba(16,185,129,0.35)]">
                    <MaterialCommunityIcons name="briefcase-check" size={11} color="#86EFAC" />
                    <Text className="text-[#86EFAC] font-body-bold text-[10.5px] flex-1" numberOfLines={1}>
                      {st.company} · ₹{st.package_lpa} LPA
                    </Text>
                  </View>
                ) : (
                  <Text className="text-dim font-body-bold text-[11px]">—</Text>
                )}
              </View>
              <Pressable className="w-8 items-center" onPress={() => {
                setEditingStudent(st); setNameVal(st.name); setEmailVal(st.email);
                setDeptVal(st.dept); setYearVal(st.year);
                setCgpaVal(String(st.cgpa)); setAttendanceVal(String(st.attendance));
                setModalVisible(true);
              }}>
                <MaterialCommunityIcons name="pencil" size={16} color={CC.muted} />
              </Pressable>
            </View>
          );
        })}
      </View>

      {data && data.pages > 1 && (
        <View className="flex-row items-center gap-[14px] justify-end">
          <Pressable disabled={page <= 1} onPress={() => setPage(p => Math.max(1, p - 1))}
            className={`flex-row items-center gap-1 px-3 h-8 rounded-lg bg-[rgba(255,255,255,0.04)] border border-glass-border ${page <= 1 ? 'opacity-40' : ''}`}>
            <MaterialCommunityIcons name="chevron-left" size={14} color="#fff" />
            <Text className="text-text font-body-bold text-[11.5px]">Prev</Text>
          </Pressable>
          <Text className="text-muted font-body-bold text-xs">
            Page {data.page} of {data.pages}
          </Text>
          <Pressable disabled={page >= data.pages}
            onPress={() => setPage(p => Math.min(data.pages, p + 1))}
            className={`flex-row items-center gap-1 px-3 h-8 rounded-lg bg-[rgba(255,255,255,0.04)] border border-glass-border ${page >= data.pages ? 'opacity-40' : ''}`}>
            <Text className="text-text font-body-bold text-[11.5px]">Next</Text>
            <MaterialCommunityIcons name="chevron-right" size={14} color="#fff" />
          </Pressable>
        </View>
      )}

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View className="flex-1 bg-[rgba(5,7,16,0.50)] justify-center items-center p-5"
          style={Platform.OS === 'web' ? { backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' } as any : {}}>
          <View className="bg-[rgba(9,13,22,0.80)] border border-[rgba(255,255,255,0.12)] rounded-2xl p-5 w-full max-w-[460px] gap-[14px]"
            style={Platform.OS === 'web' ? { boxShadow: '0 18px 40px rgba(0,0,0,0.85)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)' } as any : {}}>
            <View className="flex-row justify-between items-center mb-[6px]">
              <Text className="text-text font-body-bold text-[16px]">{editingStudent ? 'Edit Student' : 'Add New Student'}</Text>
              <Pressable onPress={() => setModalVisible(false)} className="p-1">
                <MaterialCommunityIcons name="close" size={16} color="#fff" />
              </Pressable>
            </View>

            <View className="flex-1 gap-[5px]">
              <Text className="text-muted font-body-bold text-[10.5px] uppercase tracking-wider mb-[2px]">Full Name</Text>
              <TextInput className="bg-[rgba(255,255,255,0.04)] border border-glass-border rounded-lg px-3 h-[38px] text-text font-body text-[12.5px]"
                style={Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}}
                placeholder="e.g. Rahul Sharma" placeholderTextColor={CC.dim} value={nameVal} onChangeText={setNameVal} />
            </View>

            <View className="flex-1 gap-[5px]">
              <Text className="text-muted font-body-bold text-[10.5px] uppercase tracking-wider mb-[2px]">Email Address</Text>
              <TextInput className="bg-[rgba(255,255,255,0.04)] border border-glass-border rounded-lg px-3 h-[38px] text-text font-body text-[12.5px]"
                style={Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}}
                placeholder="e.g. rahul@college.edu" placeholderTextColor={CC.dim} value={emailVal} onChangeText={setEmailVal}
                keyboardType="email-address" autoCapitalize="none" />
            </View>

            <View className="flex-row gap-[10px]">
              <View className="flex-1 gap-[5px] z-[10]">
                <SimpleSelect label="Department" value={deptVal} options={DEPTS} onChange={setDeptVal} />
              </View>
              <View className="flex-1 gap-[5px] z-[9]">
                <SimpleSelect label="Year" value={yearVal} options={YEARS} onChange={setYearVal} />
              </View>
            </View>

            <View className="flex-row gap-[10px]">
              <View className="flex-1 gap-[5px]">
                <Text className="text-muted font-body-bold text-[10.5px] uppercase tracking-wider mb-[2px]">CGPA</Text>
                <TextInput className="bg-[rgba(255,255,255,0.04)] border border-glass-border rounded-lg px-3 h-[38px] text-text font-body text-[12.5px]"
                  style={Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}}
                  placeholder="e.g. 8.5" placeholderTextColor={CC.dim} value={cgpaVal} onChangeText={setCgpaVal} keyboardType="numeric" />
              </View>
              <View className="flex-1 gap-[5px]">
                <Text className="text-muted font-body-bold text-[10.5px] uppercase tracking-wider mb-[2px]">Attendance %</Text>
                <TextInput className="bg-[rgba(255,255,255,0.04)] border border-glass-border rounded-lg px-3 h-[38px] text-text font-body text-[12.5px]"
                  style={Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}}
                  placeholder="e.g. 85" placeholderTextColor={CC.dim} value={attendanceVal} onChangeText={setAttendanceVal} keyboardType="numeric" />
              </View>
            </View>

            <View className="flex-row justify-end gap-[10px] mt-2">
              <Pressable className="px-4 h-[38px] rounded-lg justify-center items-center border border-glass-border" onPress={() => setModalVisible(false)}>
                <Text className="text-muted font-body-bold text-xs">Cancel</Text>
              </Pressable>
              <Pressable className="px-4 h-[38px] rounded-lg bg-violet justify-center items-center" onPress={handleSaveStudent} disabled={submitting}>
                <Text className="text-text font-body-bold text-xs">
                  {submitting ? 'Saving…' : editingStudent ? 'Save Changes' : 'Add Student'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {confirmModal && confirmModal.visible && (
        <Modal transparent animationType="fade" visible={true} onRequestClose={() => setConfirmModal(null)}>
          <View className="flex-1 bg-[rgba(5,7,16,0.50)] justify-center items-center p-5"
            style={Platform.OS === 'web' ? { backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' } as any : {}}>
            <View className="bg-[rgba(9,13,22,0.80)] border border-[rgba(255,255,255,0.12)] rounded-2xl p-5 w-full max-w-[380px] gap-[10px]"
              style={Platform.OS === 'web' ? { boxShadow: '0 18px 40px rgba(0,0,0,0.85)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)' } as any : {}}>
              <View className="flex-row justify-between items-center">
                <Text className="text-text font-body-bold text-[16px]">{confirmModal.title}</Text>
                <Pressable onPress={() => setConfirmModal(null)}>
                  <MaterialCommunityIcons name="close" size={20} color={CC.dim} />
                </Pressable>
              </View>
              <Text className="text-muted font-body text-[13.5px] mb-4 mt-1 leading-5">
                {confirmModal.message}
              </Text>
              <View className="flex-row justify-end gap-[10px]">
                <Pressable onPress={() => setConfirmModal(null)} className="px-4 h-[38px] rounded-lg justify-center items-center border border-glass-border">
                  <Text className="text-text font-body-bold text-[12.5px]">Cancel</Text>
                </Pressable>
                <Pressable onPress={confirmModal.onConfirm} className="px-4 h-[38px] rounded-lg justify-center items-center" style={{ backgroundColor: confirmModal.actionColor || CC.primary }}>
                  <Text className="text-text font-body-bold text-[12.5px]">{confirmModal.actionText}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

function FilterPills({ label, value, onChange, options }:
  { label: string; value: string; onChange: (v: string) => void;
    options: Filter[] }) {
  return (
    <View className="gap-1">
      <Text className="text-muted font-display-bold text-[9.5px] tracking-widest uppercase">{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 4 }}>
        {options.map((o) => {
          const active = value === o.id;
          return (
            <Pressable key={o.id} onPress={() => onChange(o.id)}
              className={`px-[10px] py-[5px] rounded-full border ${active ? 'bg-[rgba(167,139,250,0.18)] border-[rgba(167,139,250,0.50)]' : 'bg-[rgba(255,255,255,0.04)] border-glass-border'}`}>
              <Text className={`font-body-bold text-[11px] ${active ? 'text-[#C4B5FD]' : 'text-muted'}`}>{o.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
