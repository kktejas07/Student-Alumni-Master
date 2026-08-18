// @ts-nocheck
/**
 * Super Admin → Imports view.
 *
 * Bulk-upload users from XLSX/XLS/CSV with automatic categorization into
 * Student / Master's / Alumni / Mentor.  Once committed, records flow
 * into the existing Students / Alumni / Mentors directory views.
 *
 * Tabs: Upload · Add Manually · History · Browse
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput, ScrollView, Platform, Modal,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import {
  Upload, UserPlus, History, Users, FileSpreadsheet, X, Check, AlertTriangle,
  CheckCircle2, ChevronRight, Sparkles, GraduationCap, UserCheck, Briefcase,
  Mail, Phone, MapPin, Building2, Calendar, ExternalLink, Trash2,
  Pencil, Eye, EyeOff, RefreshCw, Filter, Download, FileText, Globe,
  Square, SquareCheck, CheckSquare, ShieldCheck, LayoutGrid, Send, Tag, FileDown,
} from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
import {
  GRAD, GradientButton, SecondaryButton, Card, IconBox, SectionLabel,
  TopTabs, SearchField, StatusPill, GradientPill, Toast, useToast, EmptyState,
  LoadingBox,
} from '../applekit';
import { request, tokenStore } from '@/src/models/services/api';
import * as Linking from 'expo-linking';
import { ProfileCard, ProfileCardSkeleton } from './ProfileCard';
import type { ProfileCardCategory, ProfileCardStatus } from './ProfileCard';
import { useSubTab } from '@/src/views/web/portals/portalUrl';

/* ────────────────────────────────────────────────────────────────────
 * Category palette (per the spec)
 * ────────────────────────────────────────────────────────────────── */
const CAT = {
  student: { color: '#3B82F6', label: 'Student',  icon: GraduationCap },
  masters: { color: '#A78BFA', label: "Master's", icon: Briefcase },
  alumni:  { color: '#10B981', label: 'Alumni',   icon: UserCheck },
  mentor:  { color: '#F59E0B', label: 'Mentor',   icon: Sparkles },
} as const;
type CatKey = keyof typeof CAT;

function CategoryBadge({ cat, small }: { cat: CatKey; small?: boolean }) {
  const c = CAT[cat] || CAT.student;
  const Icon = c.icon;
  return (
    <View style={[
      s.catBadge,
      { backgroundColor: c.color + '22', borderColor: c.color + '55' },
      small && { paddingHorizontal: 7, paddingVertical: 2.5 },
    ]}>
      <Icon size={small ? 10 : 11} color={c.color} />
      <Text style={[s.catBadgeText, { color: c.color, fontSize: small ? 10 : 11 }]}>{c.label}</Text>
    </View>
  );
}

/* ────────────────────────────────────────────────────────────────── */
type TabId = 'upload' | 'manual' | 'history' | 'browse';

export function ImportsView({ sub, onSub }: { sub?: string; onSub?: (s: string) => void }) {
  const [tab, setTab] = useSubTab<TabId>(['browse', 'upload', 'manual', 'history'], 'browse', { sub, onSub });
  const { toast, flash, hide } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);

  const loadStats = useCallback(async () => {
    try {
      const r = await request<any>('/admin/users/list?limit=1');
      setStats(r);
    } catch {}
  }, []);

  useEffect(() => { loadStats(); }, [loadStats, refreshKey]);

  const tabs = [
    { id: 'browse',  label: 'Contacts Database', icon: Users },
    { id: 'upload',  label: 'Bulk Upload',       icon: Upload },
    { id: 'manual',  label: 'Add Manually',      icon: UserPlus },
    { id: 'history', label: 'Upload History',    icon: History },
  ] as const;

  const counts = stats?.counts || {};

  return (
    <View style={{ gap: 14 }}>
      <Card>
        <View style={s.headRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <IconBox size={38}><Users size={18} color={GRAD.to} /></IconBox>
            <View>
              <Text style={s.title}>Contacts & Imports Database</Text>
              <Text style={s.sub}>
                Browse platform directory contacts with SA-IDs, account statuses, and data completeness.
                Upload spreadsheets or add users manually with automatic role & profile classification.
              </Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Stats Row */}
      <View style={s.statsRow}>
        <View style={s.statCard}>
          <View style={[s.statIcon, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
            <Users size={18} color="#3B82F6" />
          </View>
          <View>
            <Text style={s.statValue}>{counts.all || 0}</Text>
            <Text style={s.statLabel}>Total Users</Text>
          </View>
        </View>
        <View style={s.statCard}>
          <View style={[s.statIcon, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
            <GraduationCap size={18} color="#10B981" />
          </View>
          <View>
            <Text style={s.statValue}>{counts.student || 0}</Text>
            <Text style={s.statLabel}>Students</Text>
          </View>
        </View>
        <View style={s.statCard}>
          <View style={[s.statIcon, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
            <Sparkles size={18} color="#F59E0B" />
          </View>
          <View>
            <Text style={s.statValue}>{counts.mentor || 0}</Text>
            <Text style={s.statLabel}>Mentors</Text>
          </View>
        </View>
        <View style={s.statCard}>
          <View style={[s.statIcon, { backgroundColor: 'rgba(139,92,246,0.15)' }]}>
            <UserCheck size={18} color="#8B5CF6" />
          </View>
          <View>
            <Text style={s.statValue}>{counts.alumni || 0}</Text>
            <Text style={s.statLabel}>Alumni</Text>
          </View>
        </View>
        <View style={s.statCard}>
          <View style={[s.statIcon, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
            <AlertTriangle size={18} color="#EF4444" />
          </View>
          <View>
            <Text style={s.statValue}>{counts.pending_approval || 0}</Text>
            <Text style={s.statLabel}>Pending</Text>
          </View>
        </View>
      </View>

      <TopTabs<TabId> tabs={tabs as any} active={tab} onChange={setTab} />

      {tab === 'browse'  && <BrowseTab onOpen={setProfileId} onAction={flash} key={refreshKey} />}
      {tab === 'upload'  && <UploadTab onSaved={flash} onSwitchTab={setTab} bump={() => setRefreshKey((k) => k + 1)} />}
      {tab === 'manual'  && <ManualTab onSaved={flash} />}
      {tab === 'history' && <HistoryTab key={refreshKey} />}

      <ProfilePanel userId={profileId} onClose={() => setProfileId(null)} onSaved={() => { flash('Profile updated'); setRefreshKey((k) => k + 1); }} />

      <Toast text={toast.text} visible={toast.visible} kind={toast.kind} onDismiss={hide} />
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  UPLOAD TAB
 * ══════════════════════════════════════════════════════════════════ */
function UploadTab({ onSaved, onSwitchTab, bump }: { onSaved: (s?: string) => void; onSwitchTab: (t: TabId) => void; bump: () => void; }) {
  const fileRef = useRef<any>(null);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<any>(null);
  const [skipInvalid, setSkipInvalid] = useState(true);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [currentFileIdx, setCurrentFileIdx] = useState(0);
  const [importResults, setImportResults] = useState<any[]>([]);

  // Web-only file picker hookup
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = fileRef.current;
    if (!el) return;
    const handler = async (e: any) => {
      const newFiles = Array.from(e.target.files || []) as File[];
      if (newFiles.length > 0) {
        setFiles(prev => [...prev, ...newFiles]);
      }
    };
    el.addEventListener('change', handler);
    return () => el.removeEventListener('change', handler);
  }, []);

  const uploadFile = async (file: File) => {
    setError(null); setBusy(true); setData(null); setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const base = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || '';
      const token = (await tokenStore.getAccess()) || '';
      const resp = await fetch(base + '/api/admin/imports/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      });
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(`Upload failed (${resp.status}): ${t}`);
      }
      const json = await resp.json();
      setData(json);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally { setBusy(false); }
  };

  const uploadAllFiles = async () => {
    if (files.length === 0) return;
    setBusy(true); setError(null); setImportResults([]); setData(null); setResult(null);
    const results = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setCurrentFileIdx(i);
      try {
        const form = new FormData();
        form.append('file', file);
        const base = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || '';
        const token = (await tokenStore.getAccess()) || '';
        const resp = await fetch(base + '/api/admin/imports/upload', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: form,
        });
        if (!resp.ok) {
          const t = await resp.text();
          results.push({ file: file.name, error: `Upload failed: ${t}` });
          continue;
        }
        const json = await resp.json();
        
        // Auto-commit this file
        const commitResp = await request<any>('/admin/imports/commit', {
          method: 'POST',
          body: { cache_id: json.cache_id, mapping: json.auto_mapping, skip_invalid: skipInvalid },
        });
        results.push({ file: file.name, ...commitResp });
      } catch (e: any) {
        results.push({ file: file.name, error: String(e?.message || e) });
      }
    }
    
    setImportResults(results);
    setFiles([]);
    setBusy(false);
    onSaved(`Imported ${results.length} files`);
    bump();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearFiles = () => {
    setFiles([]);
    setImportResults([]);
    setData(null);
    setResult(null);
  };

  const onPick = () => {
    if (Platform.OS === 'web' && fileRef.current) {
      fileRef.current.click();
    }
  };

  // Web drag/drop bindings
  const dropProps = Platform.OS === 'web' ? {
    onDragOver: (e: any) => { e.preventDefault(); setDragOver(true); },
    onDragLeave: () => setDragOver(false),
    onDrop: async (e: any) => {
      e.preventDefault();
      setDragOver(false);
      const newFiles = Array.from(e.dataTransfer?.files || []) as File[];
      if (newFiles.length > 0) {
        setFiles(prev => [...prev, ...newFiles]);
      }
    },
  } : {};

  const commit = async () => {
    if (!data?.cache_id) return;
    setCommitting(true); setError(null);
    try {
      const json = await request<any>('/admin/imports/commit', {
        method: 'POST',
        body: { cache_id: data.cache_id, mapping: data.auto_mapping, skip_invalid: skipInvalid },
      });
      setResult(json);
      onSaved(`Imported ${json.added + json.updated} profiles`);
      bump();
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally { setCommitting(false); }
  };

  return (
    <View style={{ gap: 14 }}>
      {/* Drop zone */}
      {!data && !result && importResults.length === 0 && (
        <View
          // @ts-ignore web-only
          {...dropProps}
          style={[s.dropZone, dragOver && { borderColor: GRAD.to, backgroundColor: 'rgba(245,158,11,0.06)' }]}
        >
          <LinearGradient colors={GRAD.soft} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.dropIcon}>
            <Upload size={22} color={GRAD.to} />
          </LinearGradient>
          <Text style={s.dropTitle}>Drop your spreadsheet or contacts file here</Text>
          <Text style={s.dropSub}>Supports .xlsx, .xls, .csv, .pdf, .docx · max 500 MB</Text>
          <GradientButton onPress={onPick}>
            <FileSpreadsheet size={13} color="#fff" />
            <Text style={s.btnText}>Choose files</Text>
          </GradientButton>
          {Platform.OS === 'web' && (
            // @ts-ignore native input
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword" style={{ display: 'none' }} />
          )}
          {busy && <View style={{ marginTop: 12 }}><ActivityIndicator color={GRAD.to} /></View>}
          {error && <Text style={[s.err, { marginTop: 12 }]}>{error}</Text>}
        </View>
      )}

      {/* File list for batch import */}
      {files.length > 0 && !data && !result && importResults.length === 0 && (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={s.fileName}>{files.length} file{files.length > 1 ? 's' : ''} selected</Text>
            <Pressable onPress={clearFiles} style={s.clearBtn}>
              <Text style={s.clearBtnText}>Clear all</Text>
            </Pressable>
          </View>
          <View style={{ gap: 8 }}>
            {files.map((f, i) => (
              <View key={i} style={s.fileRow}>
                <FileSpreadsheet size={16} color={GRAD.to} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text numberOfLines={1} style={s.fileName}>{f.name}</Text>
                  <Text style={s.muted}>{(f.size / 1024).toFixed(1)} KB</Text>
                </View>
                {busy && currentFileIdx === i && <ActivityIndicator size="small" color={GRAD.to} />}
                <Pressable onPress={() => removeFile(i)} style={s.removeFileBtn}>
                  <X size={14} color="#F87171" />
                </Pressable>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <GradientButton onPress={uploadAllFiles} disabled={busy} style={{ flex: 1 }}>
              {busy ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Upload size={13} color="#fff" />
                  <Text style={s.btnText}>Import All ({files.length} files)</Text>
                </>
              )}
            </GradientButton>
            <SecondaryButton onPress={clearFiles}>
              <Text style={s.secText}>Cancel</Text>
            </SecondaryButton>
          </View>
        </Card>
      )}

      {/* Import results */}
      {importResults.length > 0 && (
        <Card>
          <Text style={s.fileName}>Import Results</Text>
          <View style={{ gap: 8, marginTop: 12 }}>
            {importResults.map((r, i) => (
              <View key={i} style={s.fileRow}>
                {r.error ? (
                  <AlertTriangle size={16} color="#F87171" />
                ) : (
                  <CheckCircle2 size={16} color="#10B981" />
                )}
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text numberOfLines={1} style={s.fileName}>{r.file}</Text>
                  <Text style={s.muted}>
                    {r.error || `${r.added || 0} added, ${r.updated || 0} updated, ${r.skipped || 0} skipped`}
                  </Text>
                </View>
              </View>
            ))}
          </View>
          <SecondaryButton onPress={clearFiles} style={{ marginTop: 12 }}>
            <Text style={s.secText}>Import More</Text>
          </SecondaryButton>
        </Card>
      )}

      {/* Preview + commit */}
      {data && !result && (
        <Animated.View entering={FadeIn.duration(180)} style={{ gap: 14 }}>
          {/* Summary banner */}
          <Card>
            <View style={s.summaryRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <FileSpreadsheet size={18} color={GRAD.to} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.fileName} numberOfLines={1}>{data.filename}</Text>
                  <Text style={s.muted}>{data.total_rows} rows · {Object.keys(data.auto_mapping || {}).length} columns auto-mapped</Text>
                </View>
              </View>
              <SecondaryButton size="sm" onPress={() => { setData(null); setResult(null); }}>
                <RefreshCw size={11} color={SAC.muted} />
                <Text style={s.secText}>Replace file</Text>
              </SecondaryButton>
            </View>

            <View style={s.summaryStats}>
              <SumStat label="Total"      value={data.total_rows} tint="#fff" />
              <SumStat label="Student"    value={data.summary.student || 0} tint={CAT.student.color} />
              <SumStat label="Master's"   value={data.summary.masters || 0} tint={CAT.masters.color} />
              <SumStat label="Alumni"     value={data.summary.alumni || 0}  tint={CAT.alumni.color}  />
              <SumStat label="Mentor"     value={data.summary.mentor || 0}  tint={CAT.mentor.color}  />
              <SumStat label="Errors"     value={data.summary.errors || 0}  tint={SAC.red} />
              <SumStat label="Review"     value={data.summary.needs_review || 0} tint="#FBBF24" />
            </View>

            {/* Pre-Flight Ingestion Quality Report */}
            {data.preflight && (
              <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ShieldCheck size={14} color="#22C55E" />
                    <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 0.5 }}>PRE-FLIGHT INGESTION IMPACT</Text>
                  </View>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5, backgroundColor: 'rgba(34,197,94,0.14)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' }}>
                    <Text style={{ color: '#86EFAC', fontFamily: FONTS.bold, fontSize: 10 }}>Ready to Commit</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                  <View style={{ flex: 1, minWidth: 120, padding: 10, borderRadius: 8, backgroundColor: 'rgba(34,197,94,0.08)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' }}>
                    <Text style={{ color: '#86EFAC', fontFamily: FONTS.xbold, fontSize: 16 }}>+{data.preflight.new_count}</Text>
                    <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 10 }}>New Profiles to Create</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 120, padding: 10, borderRadius: 8, backgroundColor: 'rgba(59,130,246,0.08)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)' }}>
                    <Text style={{ color: '#93C5FD', fontFamily: FONTS.xbold, fontSize: 16 }}>~{data.preflight.update_count}</Text>
                    <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 10 }}>Existing to Merge/Update</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 120, padding: 10, borderRadius: 8, backgroundColor: data.preflight.invalid_count > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: data.preflight.invalid_count > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)' }}>
                    <Text style={{ color: data.preflight.invalid_count > 0 ? '#FCA5A5' : SAC.muted, fontFamily: FONTS.xbold, fontSize: 16 }}>{data.preflight.invalid_count}</Text>
                    <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 10 }}>Invalid/Filtered Rows</Text>
                  </View>
                </View>
              </View>
            )}
          </Card>

          {/* Column mapping */}
          <Card>
            <SectionLabel>COLUMN MAPPING</SectionLabel>
            <Text style={[s.muted, { marginTop: 4 }]}>Detected columns → target fields. Re-map with the dropdowns if headers differ.</Text>
            <View style={{ marginTop: 14, gap: 6 }}>
              {(data.headers || []).map((h: string) => {
                const target = data.auto_mapping?.[h] || '';
                return (
                  <View key={h} style={s.mapRow}>
                    <Text style={s.mapSrc} numberOfLines={1}>{h || '—'}</Text>
                    <ChevronRight size={11} color={SAC.dim} />
                    {target ? (
                      <GradientPill label={target} />
                    ) : (
                      <View style={s.mapUnused}><Text style={s.mapUnusedText}>not mapped</Text></View>
                    )}
                  </View>
                );
              })}
            </View>
          </Card>

          {/* Row preview */}
          <Card padded={false}>
            <View style={{ padding: 18, paddingBottom: 4 }}>
              <SectionLabel>PREVIEW · first {(data.preview || []).length} rows</SectionLabel>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View>
                <View style={s.tableHead}>
                  <Text style={[s.th, { width: 50 }]}>Row</Text>
                  <Text style={[s.th, { width: 100 }]}>Category</Text>
                  <Text style={[s.th, { width: 200 }]}>Name</Text>
                  <Text style={[s.th, { width: 240 }]}>Email</Text>
                  <Text style={[s.th, { width: 200 }]}>College</Text>
                  <Text style={[s.th, { width: 160 }]}>Degree</Text>
                  <Text style={[s.th, { width: 80 }]}>Exp (yr)</Text>
                  <Text style={[s.th, { width: 240 }]}>Rule fired</Text>
                  <Text style={[s.th, { width: 180 }]}>Validation</Text>
                </View>
                {(data.preview || []).slice(0, 30).map((p: any, i: number) => {
                  const hasErr = (p.errors || []).length > 0;
                  return (
                    <View key={i} style={[s.tableRow, hasErr && s.tableRowErr]}>
                      <Text style={[s.td, { width: 50, color: SAC.dim }]}>{p.row}</Text>
                      <View style={{ width: 100 }}>{p.category && <CategoryBadge cat={p.category} small />}</View>
                      <Text numberOfLines={1} style={[s.td, { width: 200 }]}>{p.full_name || '—'}</Text>
                      <Text numberOfLines={1} style={[s.td, { width: 240, color: SAC.muted }]}>{p.email || '—'}</Text>
                      <Text numberOfLines={1} style={[s.td, { width: 200, color: SAC.muted }]}>{p.college || '—'}</Text>
                      <Text numberOfLines={1} style={[s.td, { width: 160, color: SAC.muted }]}>{p.degree || '—'}</Text>
                      <Text style={[s.td, { width: 80 }]}>{(p.experience_years ?? 0).toString()}</Text>
                      <Text numberOfLines={1} style={[s.td, { width: 240, color: SAC.muted }]}>{p.category_rule || '—'}</Text>
                      <View style={{ width: 180 }}>
                        {hasErr ? (
                          <StatusPill kind="danger" label={(p.errors || []).join(', ')} />
                        ) : (
                          <StatusPill kind="success" label="OK" dot />
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
            {(data.preview || []).length > 30 && (
              <Text style={[s.muted, { padding: 14, textAlign: 'center' }]}>
                + {(data.preview || []).length - 30} more rows in preview · all {data.total_rows} rows will be processed on commit
              </Text>
            )}
          </Card>

          {/* Commit footer */}
          <Card>
            <View style={s.commitRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.commitTitle}>Ready to import</Text>
                <Text style={s.muted}>
                  Duplicate emails will be updated (not duplicated). LinkedIn URL is used as a fallback key.
                </Text>
                <Pressable onPress={() => setSkipInvalid(!skipInvalid)} style={s.checkRow}>
                  <View style={[s.checkBox, skipInvalid && { backgroundColor: GRAD.to, borderColor: GRAD.to }]}>
                    {skipInvalid && <Check size={11} color="#fff" />}
                  </View>
                  <Text style={s.checkLabel}>Skip invalid rows (recommended)</Text>
                </Pressable>
              </View>
              <GradientButton onPress={commit} loading={committing}>
                <CheckCircle2 size={14} color="#fff" />
                <Text style={s.btnText}>Import {data.total_rows} rows</Text>
              </GradientButton>
            </View>
            {error && <Text style={[s.err, { marginTop: 8 }]}>{error}</Text>}
          </Card>
        </Animated.View>
      )}

      {/* Result modal */}
      <Modal visible={!!result} transparent animationType="fade" onRequestClose={() => setResult(null)}>
        <View style={s.modalBg}>
          <Animated.View entering={FadeInDown.duration(220)} style={s.modalCard}>
            <LinearGradient colors={GRAD.soft} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.modalHero}>
              <IconBox size={40}><CheckCircle2 size={20} color={SAC.green} /></IconBox>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle}>Import complete</Text>
                <Text style={s.muted}>
                  {result?.added} added · {result?.updated} updated · {result?.skipped} skipped
                </Text>
              </View>
              <Pressable onPress={() => setResult(null)}><X size={16} color={SAC.muted} /></Pressable>
            </LinearGradient>

            <View style={{ padding: 18, gap: 14 }}>
              <View style={s.resultGrid}>
                {(['student', 'masters', 'alumni', 'mentor'] as CatKey[]).map((c) => (
                  <View key={c} style={s.resultTile}>
                    <CategoryBadge cat={c} />
                    <Text style={[s.kpiVal, { color: CAT[c].color }]}>{result?.by_category?.[c] || 0}</Text>
                  </View>
                ))}
              </View>

              {(result?.skipped_rows || []).length > 0 && (
                <View>
                  <Text style={s.modalLabel}>Skipped rows ({(result?.skipped_rows || []).length})</Text>
                  <ScrollView style={{ maxHeight: 140, marginTop: 6 }}>
                    {(result?.skipped_rows || []).slice(0, 30).map((sr: any, i: number) => (
                      <View key={i} style={s.skipRow}>
                        <Text style={s.muted}>Row {sr.row}{sr.email ? ` · ${sr.email}` : ''}</Text>
                        <Text style={[s.muted, { color: '#FCA5A5', flex: 1, textAlign: 'right' }]}>{sr.reason}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                <SecondaryButton onPress={() => { setResult(null); setData(null); }}>
                  <Text style={s.secText}>Upload another</Text>
                </SecondaryButton>
                <GradientButton onPress={() => { setResult(null); setData(null); onSwitchTab('browse'); }}>
                  <Users size={13} color="#fff" />
                  <Text style={s.btnText}>View imported users</Text>
                </GradientButton>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

function SumStat({ label, value, tint }: { label: string; value: number; tint: string }) {
  return (
    <View style={s.sumStat}>
      <Text style={[s.sumVal, { color: tint }]}>{value}</Text>
      <Text style={s.sumLabel}>{label}</Text>
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  MANUAL ADD TAB — live category preview
 * ══════════════════════════════════════════════════════════════════ */
function ManualTab({ onSaved }: { onSaved: (s?: string) => void }) {
  const [form, setForm] = useState<any>({
    first_name: '', last_name: '', email: '', phone: '', linkedin_url: '',
    college: '', degree: '', graduation_year: '', designation: '', company: '',
    experience_years_raw: '', position_start_date: '', location: '', headline: '',
  });
  const [preview, setPreview] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced category preview
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!form.email && !form.degree && !form.designation && !form.headline) {
        setPreview(null); return;
      }
      try {
        const r = await request<any>('/admin/imports/preview-category', { method: 'POST', body: form });
        setPreview(r);
      } catch {}
    }, 350);
    return () => clearTimeout(t);
  }, [form]);

  const update = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const r = await request<any>('/admin/imports/manual', { method: 'POST', body: form });
      onSaved(`${r.action === 'added' ? 'Added' : 'Updated'} as ${r.category}`);
      // reset
      setForm({
        first_name: '', last_name: '', email: '', phone: '', linkedin_url: '',
        college: '', degree: '', graduation_year: '', designation: '', company: '',
        experience_years_raw: '', position_start_date: '', location: '', headline: '',
      });
      setPreview(null);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally { setBusy(false); }
  };

  return (
    <View style={s.manualGrid}>
      <View style={{ flex: 2, minWidth: 360 }}>
        <Card>
          <SectionLabel>BASIC DETAILS</SectionLabel>
          <View style={s.formGrid}>
            <FormField label="First name" value={form.first_name} onChange={(v) => update('first_name', v)} />
            <FormField label="Last name"  value={form.last_name}  onChange={(v) => update('last_name', v)} />
            <FormField label="Email *"    value={form.email}      onChange={(v) => update('email', v)} keyboardType="email-address" />
            <FormField label="Phone"      value={form.phone}      onChange={(v) => update('phone', v)} keyboardType="phone-pad" />
            <FormField label="LinkedIn URL" value={form.linkedin_url} onChange={(v) => update('linkedin_url', v)} full />
            <FormField label="Location"   value={form.location}   onChange={(v) => update('location', v)} />
            <FormField label="Headline"   value={form.headline}   onChange={(v) => update('headline', v)} full />
          </View>

          <SectionLabel style={{ marginTop: 18 }}>EDUCATION</SectionLabel>
          <View style={s.formGrid}>
            <FormField label="College / Institution" value={form.college} onChange={(v) => update('college', v)} full />
            <FormField label="Degree"           value={form.degree}          onChange={(v) => update('degree', v)} full
              placeholder="e.g. Bachelor of Technology, MBA, M.Sc Data Science" />
            <FormField label="Graduation year"  value={form.graduation_year} onChange={(v) => update('graduation_year', v)} keyboardType="numeric" />
          </View>

          <SectionLabel style={{ marginTop: 18 }}>EXPERIENCE</SectionLabel>
          <View style={s.formGrid}>
            <FormField label="Current title / Designation" value={form.designation} onChange={(v) => update('designation', v)} full />
            <FormField label="Current company"  value={form.company}  onChange={(v) => update('company', v)} />
            <FormField label="Years of experience"  value={form.experience_years_raw} onChange={(v) => update('experience_years_raw', v)}
              placeholder="3.5" />
            <FormField label="Position start date" value={form.position_start_date} onChange={(v) => update('position_start_date', v)}
              placeholder="YYYY-MM-DD" full />
          </View>

          {error && <Text style={[s.err, { marginTop: 12 }]}>{error}</Text>}

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
            <GradientButton onPress={submit} loading={busy} disabled={!form.email}>
              <UserPlus size={13} color="#fff" />
              <Text style={s.btnText}>Add user</Text>
            </GradientButton>
          </View>
        </Card>
      </View>

      <View style={{ flex: 1, minWidth: 280 }}>
        <Card style={{ position: 'sticky' as any, top: 20 }}>
          <SectionLabel>LIVE CATEGORY PREVIEW</SectionLabel>
          {preview ? (
            <Animated.View entering={FadeIn.duration(180)} style={{ marginTop: 14, gap: 12 }}>
              <View style={{ alignItems: 'center', gap: 10, paddingVertical: 10 }}>
                <CategoryBadge cat={preview.category} />
                <Text style={[s.previewBigVal, { color: CAT[preview.category as CatKey]?.color || '#fff' }]}>
                  → {CAT[preview.category as CatKey]?.label}
                </Text>
              </View>
              <View style={s.previewRule}>
                <Sparkles size={11} color={GRAD.to} />
                <Text style={s.previewRuleText}>{preview.rule}</Text>
              </View>
              <View style={{ gap: 6 }}>
                <PreviewRow label="Experience" value={`${preview.experience_years} yrs (${preview.experience_source})`} />
                <PreviewRow label="Profile status" value={preview.profile_status}
                  pill={preview.profile_status === 'complete' ? 'success' : preview.profile_status === 'partial' ? 'warn' : 'danger'} />
                <PreviewRow label="Role"     value={preview.role} />
                {preview.needs_review && (
                  <View style={s.warnBox}>
                    <AlertTriangle size={12} color="#FBBF24" />
                    <Text style={[s.muted, { color: '#FBBF24' }]}>Needs review · incomplete profile</Text>
                  </View>
                )}
              </View>
            </Animated.View>
          ) : (
            <View style={{ marginTop: 14, gap: 6, alignItems: 'center', paddingVertical: 20 }}>
              <Sparkles size={20} color={SAC.dim} />
              <Text style={[s.muted, { textAlign: 'center' }]}>
                Start typing email + degree + experience{'\n'}to see the live category prediction.
              </Text>
            </View>
          )}
        </Card>
      </View>
    </View>
  );
}

function FormField({ label, value, onChange, placeholder, full, keyboardType }: any) {
  return (
    <View style={[s.formField, full && { flexBasis: '100%' }]}>
      <Text style={s.formLabel}>{label}</Text>
      <TextInput
        value={value} onChangeText={onChange}
        placeholder={placeholder} placeholderTextColor={SAC.dim}
        keyboardType={keyboardType}
        autoCapitalize="none" autoCorrect={false}
        style={s.formInput}
      />
    </View>
  );
}

function PreviewRow({ label, value, pill }: { label: string; value: string; pill?: 'success' | 'warn' | 'danger' }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={s.previewLbl}>{label}</Text>
      {pill ? <StatusPill kind={pill} label={value} /> : <Text style={s.previewVal}>{value}</Text>}
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  BROWSE TAB — list imported users as Spreadsheet Data Grid or Cards
 * ══════════════════════════════════════════════════════════════════ */
function BrowseTab({ onOpen, onAction }: { onOpen: (id: string) => void; onAction: (text: string) => void }) {
  const [cat, setCat] = useState<'all' | CatKey>('all');
  const [accountFilter, setAccountFilter] = useState<'all' | 'registered' | 'unregistered' | 'complete'>('all');
  const [q, setQ] = useState('');
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'spreadsheet' | 'grid'>('spreadsheet');
  /* Bulk selection */
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = useCallback(async (pageNum = page, limit = perPage) => {
    setBusy(true);
    try {
      const r = await request<any>(`/admin/users/list?category=${cat}&account_filter=${accountFilter}&q=${encodeURIComponent(q)}&limit=200`);
      setData(r);
    } catch (e: any) {
      if (/401|Not authenticated/i.test(String(e?.message || ''))) {
        await new Promise((r) => setTimeout(r, 600));
        try {
          const r = await request<any>(`/admin/users/list?category=${cat}&account_filter=${accountFilter}&q=${encodeURIComponent(q)}&limit=200`);
          setData(r);
          return;
        } catch {}
      }
      console.warn('Imports browse load failed', e);
      setData({ items: [], total: 0, counts: {} });
    } finally { setBusy(false); }
  }, [cat, accountFilter, q]);
  useEffect(() => { load(); }, [load]);
  
  const totalPages = data ? Math.ceil((data.total || 0) / perPage) : 1;

  const counts = data?.counts || {};
  const totalDisplay = counts.all ?? 0;
  const studentsDisplay = counts.student ?? 0;
  const mentorsDisplay = counts.mentor ?? 0;
  const alumniDisplay = counts.alumni ?? 0;
  const mastersDisplay = counts.masters ?? 0;
  const pendingCount = counts.pending_approval ?? 0;
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingCell, setSavingCell] = useState(false);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const registeredCount = counts.registered ?? 0;
  const nonUserCount = Math.max(0, totalDisplay - registeredCount);

  const tabs = [
    { id: 'all',     label: 'All',       count: totalDisplay },
    { id: 'student', label: 'Student',   count: studentsDisplay },
    { id: 'masters', label: "Master's",  count: mastersDisplay },
    { id: 'alumni',  label: 'Alumni',    count: alumniDisplay },
    { id: 'mentor',  label: 'Mentor',    count: mentorsDisplay },
  ] as const;

  const items = useMemo(() => {
    let list = data?.items || [];
    if (showPendingOnly) list = list.filter((u: any) => !u.approved);
    return list;
  }, [data, showPendingOnly]);

  const approve = async (id: string) => {
    try {
      await request(`/admin/users/profile/${id}/approve`, { method: 'POST' });
      onAction('Approved profile');
      setData((d: any) => d ? { ...d, items: d.items.map((u: any) => u.id === id ? { ...u, approved: true, is_new: false } : u) } : d);
    } catch { onAction('Failed to approve'); }
  };

  const remove = async (id: string) => {
    try {
      await request(`/admin/users/profile/${id}`, { method: 'DELETE' });
      onAction('Profile removed · archived');
      setData((d: any) => d ? { ...d, items: d.items.filter((u: any) => u.id !== id) } : d);
    } catch { onAction('Failed to remove'); }
  };

  const inviteSingle = async (id: string, email: string) => {
    if (!email) { onAction('No email address for this contact'); return; }
    try {
      await request('/admin/users/bulk/invite', { method: 'POST', body: { user_ids: [id] } });
      onAction(`Invitation sent to ${email}`);
      setData((d: any) => d ? { ...d, items: d.items.map((u: any) => u.id === id ? { ...u, invite_status: 'sent', invite_sent_at: new Date().toISOString() } : u) } : d);
    } catch { onAction('Failed to send invite'); }
  };

  /* ── Inline Cell Editing ── */
  const startInlineEdit = (id: string, field: string, currentVal: any) => {
    setEditingCell({ id, field });
    setEditValue(String(currentVal || ''));
  };

  const saveInlineEdit = async () => {
    if (!editingCell) return;
    const { id, field } = editingCell;
    const val = editValue.trim();
    setSavingCell(true);
    try {
      await request('/admin/users/inline-update', {
        method: 'POST',
        body: { user_id: id, field, value: val },
      });
      setData((d: any) => d ? {
        ...d,
        items: d.items.map((u: any) => u.id === id ? { ...u, [field]: val } : u)
      } : d);
      onAction(`Updated ${field.replace('_', ' ')}`);
    } catch (e: any) {
      onAction('Failed to update field');
    } finally {
      setSavingCell(false);
      setEditingCell(null);
    }
  };

  /* ── Filtered CSV Export ── */
  const exportFilteredCsv = () => {
    if (!items || items.length === 0) {
      onAction('No items to export');
      return;
    }
    const headers = ['SA ID', 'Name', 'Email', 'Phone', 'Category', 'Account Status', 'Company', 'Role', 'College', 'Degree', 'Grad Year', 'Location', 'Experience (Yrs)', 'Completeness %', 'LinkedIn'];
    const rows = items.map((u: any) => [
      `"${(u.sa_id || '').replace(/"/g, '""')}"`,
      `"${(u.name || '').replace(/"/g, '""')}"`,
      `"${(u.email || '').replace(/"/g, '""')}"`,
      `"${(u.phone || '').replace(/"/g, '""')}"`,
      `"${(u.category || '').replace(/"/g, '""')}"`,
      `"${(u.is_registered ? 'Registered' : 'Imported').replace(/"/g, '""')}"`,
      `"${(u.company || '').replace(/"/g, '""')}"`,
      `"${(u.designation || '').replace(/"/g, '""')}"`,
      `"${(u.college || '').replace(/"/g, '""')}"`,
      `"${(u.degree || '').replace(/"/g, '""')}"`,
      `"${(u.graduation_year || '').toString().replace(/"/g, '""')}"`,
      `"${(u.location || '').replace(/"/g, '""')}"`,
      `"${(u.experience_years != null ? u.experience_years : '').toString().replace(/"/g, '""')}"`,
      `"${(u.completeness_score || 0).toString()}%"`,
      `"${(u.linkedin_url || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    if (Platform.OS === 'web') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Contacts_Export_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      onAction(`Exported ${items.length} records to CSV`);
    }
  };

  /* ── Bulk-action helpers ── */
  const toggleSelect = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }));
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const allSelected = items.length > 0 && selectedIds.length === items.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected({});
    } else {
      const all: Record<string, boolean> = {};
      items.forEach((u: any) => { all[u.id] = true; });
      setSelected(all);
    }
  };

  const clearSelection = () => setSelected({});

  const bulkApprove = async () => {
    if (selectedIds.length === 0) return;
    setBulkBusy(true);
    try {
      const res = await request<any>('/admin/users/bulk/approve', { method: 'POST', body: { user_ids: selectedIds } });
      onAction(`Approved ${res.modified_count} users`);
      clearSelection();
      setSelectMode(false);
      await load();
    } catch { onAction('Bulk approve failed'); }
    finally { setBulkBusy(false); }
  };

  const bulkInvite = async () => {
    if (selectedIds.length === 0) return;
    setBulkBusy(true);
    try {
      const res = await request<any>('/admin/users/bulk/invite', { method: 'POST', body: { user_ids: selectedIds } });
      onAction(`Dispatched ${res.sent_count} invitation emails`);
      clearSelection();
      setSelectMode(false);
      await load();
    } catch { onAction('Bulk invite failed'); }
    finally { setBulkBusy(false); }
  };

  const bulkPushToTalent = async () => {
    if (selectedIds.length === 0) return;
    setBulkBusy(true);
    try {
      const res = await request<any>('/admin/users/bulk/push-to-talent', { method: 'POST', body: { user_ids: selectedIds } });
      onAction(`Bridged ${res.synced_count} contacts into Talent Pool`);
      clearSelection();
      setSelectMode(false);
    } catch { onAction('Push to talent pool failed'); }
    finally { setBulkBusy(false); }
  };

  const bulkApplyTag = async () => {
    if (selectedIds.length === 0 || !tagInput.trim()) return;
    setBulkBusy(true);
    try {
      const res = await request<any>('/admin/users/bulk/tag', {
        method: 'POST',
        body: { user_ids: selectedIds, tag: tagInput.trim(), action: 'add' }
      });
      onAction(`Tagged ${res.modified_count} profiles with "${res.tag}"`);
      setTagModalOpen(false);
      setTagInput('');
      clearSelection();
      setSelectMode(false);
      await load();
    } catch { onAction('Bulk tag failed'); }
    finally { setBulkBusy(false); }
  };

  const bulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkBusy(true);
    try {
      await request('/admin/users/bulk/delete', { method: 'POST', body: { user_ids: selectedIds, permanent: false } });
      onAction(`Archived ${selectedIds.length} profiles`);
      clearSelection();
      setSelectMode(false);
      await load();
    } catch { onAction('Bulk delete failed'); }
    finally { setBulkBusy(false); }
  };

  return (
    <View style={{ gap: 12 }}>
      {/* Metric Summary KPI Tiles */}
      <View style={s.summaryStats}>
        <View style={s.sumStat}>
          <Text style={[s.sumVal, { color: '#fff' }]}>{totalDisplay.toLocaleString()}</Text>
          <Text style={s.sumLabel}>TOTAL CONTACTS</Text>
        </View>
        <View style={s.sumStat}>
          <Text style={[s.sumVal, { color: '#22C55E' }]}>{registeredCount.toLocaleString()}</Text>
          <Text style={s.sumLabel}>REGISTERED USERS</Text>
        </View>
        <View style={s.sumStat}>
          <Text style={[s.sumVal, { color: '#94A3B8' }]}>{nonUserCount.toLocaleString()}</Text>
          <Text style={s.sumLabel}>PROSPECTS / NON-USERS</Text>
        </View>
        <View style={s.sumStat}>
          <Text style={[s.sumVal, { color: CAT.student.color }]}>{studentsDisplay.toLocaleString()}</Text>
          <Text style={s.sumLabel}>STUDENTS</Text>
        </View>
        <View style={s.sumStat}>
          <Text style={[s.sumVal, { color: CAT.mentor.color }]}>{mentorsDisplay.toLocaleString()}</Text>
          <Text style={s.sumLabel}>MENTORS</Text>
        </View>
        <View style={s.sumStat}>
          <Text style={[s.sumVal, { color: CAT.alumni.color }]}>{alumniDisplay.toLocaleString()}</Text>
          <Text style={s.sumLabel}>ALUMNI</Text>
        </View>
      </View>

      <Card>
        {/* Top Header: Categories & Actions */}
        <View style={s.browseHead}>
          <TopTabs<'all' | CatKey> tabs={tabs as any} active={cat} onChange={(c) => setCat(c as any)} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <SearchField value={q} onChange={setQ} placeholder="Search name, email, college, SA-ID…" width={240} />
            
            {/* View Mode Toggle: Spreadsheet vs Grid */}
            <View style={{ flexDirection: 'row', backgroundColor: SAC.cardSolid, borderRadius: 8, padding: 3, borderWidth: 1, borderColor: SAC.border }}>
              <Pressable
                onPress={() => setViewMode('spreadsheet')}
                style={[s.viewModeBtn, viewMode === 'spreadsheet' && { backgroundColor: GRAD.to }]}
              >
                <FileSpreadsheet size={13} color={viewMode === 'spreadsheet' ? '#fff' : SAC.muted} />
                <Text style={[s.viewModeBtnText, viewMode === 'spreadsheet' && { color: '#fff' }]}>Grid</Text>
              </Pressable>
              <Pressable
                onPress={() => setViewMode('grid')}
                style={[s.viewModeBtn, viewMode === 'grid' && { backgroundColor: GRAD.to }]}
              >
                <LayoutGrid size={13} color={viewMode === 'grid' ? '#fff' : SAC.muted} />
                <Text style={[s.viewModeBtnText, viewMode === 'grid' && { color: '#fff' }]}>Cards</Text>
              </Pressable>
            </View>

            {/* Export CSV Button */}
            <Pressable
              onPress={exportFilteredCsv}
              style={[s.toggleBtn, { backgroundColor: 'rgba(255,255,255,0.06)' }]}
            >
              <FileDown size={12} color="#fff" />
              <Text style={[s.toggleBtnText, { color: '#fff' }]}>Export</Text>
            </Pressable>

            <Pressable
              onPress={() => { setSelectMode(!selectMode); if (selectMode) clearSelection(); }}
              style={[s.toggleBtn, selectMode && { borderColor: GRAD.to, backgroundColor: 'rgba(245,158,11,0.10)' }]}
            >
              <CheckSquare size={11} color={selectMode ? GRAD.to : SAC.muted} />
              <Text style={[s.toggleBtnText, selectMode && { color: GRAD.to }]}>
                {selectMode ? 'Cancel' : 'Select'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Account Status Filter Bar (Registered vs Prospects vs Complete info) */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
          <Text style={[s.sumLabel, { fontSize: 10, marginRight: 4 }]}>SEGREGATION:</Text>
          
          <Pressable
            onPress={() => setAccountFilter('all')}
            style={[s.toggleBtn, accountFilter === 'all' && { borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.12)' }]}
          >
            <Text style={[s.toggleBtnText, accountFilter === 'all' && { color: '#fff', fontFamily: FONTS.bold }]}>
              All Contacts ({totalDisplay})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setAccountFilter('registered')}
            style={[s.toggleBtn, accountFilter === 'registered' && { borderColor: '#22C55E', backgroundColor: 'rgba(34,197,94,0.14)' }]}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E', marginRight: 4 }} />
            <Text style={[s.toggleBtnText, accountFilter === 'registered' && { color: '#86EFAC', fontFamily: FONTS.bold }]}>
              Registered Users ({registeredCount})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setAccountFilter('unregistered')}
            style={[s.toggleBtn, accountFilter === 'unregistered' && { borderColor: '#94A3B8', backgroundColor: 'rgba(148,163,184,0.14)' }]}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#94A3B8', marginRight: 4 }} />
            <Text style={[s.toggleBtnText, accountFilter === 'unregistered' && { color: '#CBD5E1', fontFamily: FONTS.bold }]}>
              Non-Users / Prospects ({nonUserCount})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setAccountFilter('complete')}
            style={[s.toggleBtn, accountFilter === 'complete' && { borderColor: '#A78BFA', backgroundColor: 'rgba(167,139,250,0.14)' }]}
          >
            <Sparkles size={11} color="#C4B5FD" style={{ marginRight: 4 }} />
            <Text style={[s.toggleBtnText, accountFilter === 'complete' && { color: '#DDD6FE', fontFamily: FONTS.bold }]}>
              Complete Profiles
            </Text>
          </Pressable>

          {pendingCount > 0 && (
            <Pressable
              onPress={() => setShowPendingOnly(!showPendingOnly)}
              style={[s.toggleBtn, showPendingOnly && { borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.14)' }]}
            >
              <Filter size={11} color="#FBBF24" style={{ marginRight: 4 }} />
              <Text style={[s.toggleBtnText, { color: '#FBBF24' }]}>
                Pending Review ({pendingCount})
              </Text>
            </Pressable>
          )}
        </View>
      </Card>

      {busy && !data ? (
        <View style={s.cardGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={s.gridCell}><ProfileCardSkeleton /></View>
          ))}
        </View>
      ) : (items || []).length === 0 ? (
        <EmptyState
          icon={Users}
          title="No contacts found"
          sub={q ? 'No results match your search.' : 'Upload a spreadsheet or add users manually to populate this database.'}
        />
      ) : viewMode === 'spreadsheet' ? (
        /* Unified Spreadsheet Data Grid View with Inline Editing & Quick Invites */
        <Card padded={false}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View>
              <View style={s.tableHead}>
                <Pressable onPress={toggleSelectAll} style={{ width: 36, justifyContent: 'center' }}>
                  {allSelected ? <SquareCheck size={16} color={GRAD.to} /> : <Square size={16} color="rgba(255,255,255,0.4)" />}
                </Pressable>
                <Text style={[s.th, { width: 100 }]}>SA-ID</Text>
                <Text style={[s.th, { width: 120 }]}>ACCOUNT</Text>
                <Text style={[s.th, { width: 100 }]}>TAGS</Text>
                <Text style={[s.th, { width: 110 }]}>DATA QUALITY</Text>
                <Text style={[s.th, { width: 210 }]}>NAME & EMAIL</Text>
                <Text style={[s.th, { width: 100 }]}>CATEGORY</Text>
                <Text style={[s.th, { width: 170 }]}>JOB ROLE ✎</Text>
                <Text style={[s.th, { width: 150 }]}>COMPANY ✎</Text>
                <Text style={[s.th, { width: 120 }]}>LOCATION ✎</Text>
                <Text style={[s.th, { width: 130 }]}>PHONE ✎</Text>
                <Text style={[s.th, { width: 90 }]}>LINKEDIN</Text>
                <Text style={[s.th, { width: 170 }]}>COLLEGE & DEGREE</Text>
                <Text style={[s.th, { width: 70 }]}>EXP</Text>
                <Text style={[s.th, { width: 90 }]}>STATUS</Text>
                <Text style={[s.th, { width: 160 }]}>ACTIONS & INVITE</Text>
              </View>

              {items.map((u: any) => {
                const isSelected = !!selected[u.id];
                const saId = u.sa_id || `SA-${u.id.slice(-6).toUpperCase()}`;
                const isRegistered = !!u.is_registered;
                const score = u.completeness_score ?? (isRegistered ? 85 : 50);
                const isInvited = !!u.invite_sent_at || u.invite_status === 'sent';

                return (
                  <Pressable
                    key={u.id}
                    onPress={() => selectMode ? toggleSelect(u.id) : onOpen(u.id)}
                    style={({ hovered }: any) => [
                      s.tableRow,
                      hovered && { backgroundColor: 'rgba(255,255,255,0.03)' },
                      isSelected && { backgroundColor: 'rgba(245,158,11,0.08)' },
                    ]}
                  >
                    {/* Select Checkbox */}
                    <Pressable
                      onPress={(e) => { e.stopPropagation(); toggleSelect(u.id); }}
                      style={{ width: 36, justifyContent: 'center' }}
                    >
                      {isSelected
                        ? <SquareCheck size={16} color={GRAD.to} />
                        : <Square size={16} color="rgba(255,255,255,0.4)" />}
                    </Pressable>

                    {/* SA-ID */}
                    <View style={{ width: 100, justifyContent: 'center' }}>
                      <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', alignSelf: 'flex-start' }}>
                        <Text style={{ color: '#FBBF24', fontFamily: FONTS.bold, fontSize: 10 }}>{saId}</Text>
                      </View>
                    </View>

                    {/* Account Status */}
                    <View style={{ width: 120, justifyContent: 'center' }}>
                      {isRegistered ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: 'rgba(34,197,94,0.12)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', alignSelf: 'flex-start' }}>
                          <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#22C55E' }} />
                          <Text style={{ color: '#86EFAC', fontFamily: FONTS.bold, fontSize: 9.5 }}>Registered</Text>
                        </View>
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: 'rgba(148,163,184,0.12)', borderWidth: 1, borderColor: 'rgba(148,163,184,0.25)', alignSelf: 'flex-start' }}>
                          <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#94A3B8' }} />
                          <Text style={{ color: '#CBD5E1', fontFamily: FONTS.med, fontSize: 9.5 }}>Imported</Text>
                        </View>
                      )}
                    </View>

                    {/* Tags */}
                    <View style={{ width: 100, justifyContent: 'center', flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                      {(u.tags || []).slice(0, 1).map((t: string) => (
                        <View key={t} style={{ paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 4, backgroundColor: 'rgba(168,85,247,0.12)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)' }}>
                          <Text style={{ color: '#D8B4FE', fontFamily: FONTS.bold, fontSize: 9 }}>{t}</Text>
                        </View>
                      ))}
                      {(!u.tags || u.tags.length === 0) && <Text style={{ color: SAC.dim, fontSize: 10 }}>—</Text>}
                    </View>

                    {/* Completeness Score */}
                    <View style={{ width: 110, justifyContent: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                          <View style={{ width: `${score}%`, height: '100%', backgroundColor: score >= 80 ? '#22C55E' : score >= 50 ? '#F59E0B' : '#64748B' }} />
                        </View>
                        <Text style={{ color: score >= 80 ? '#86EFAC' : score >= 50 ? '#FCD34D' : '#94A3B8', fontFamily: FONTS.bold, fontSize: 9.5 }}>
                          {score}%
                        </Text>
                      </View>
                    </View>
                    
                    {/* Name & Avatar */}
                    <View style={{ width: 210, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <LinearGradient
                        colors={[GRAD.from, GRAD.to]}
                        style={{ width: 26, height: 26, borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 10 }}>
                          {(u.first_name?.[0] || u.name?.[0] || 'U').toUpperCase()}
                        </Text>
                      </LinearGradient>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 11.5 }}>
                          {u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || '—'}
                        </Text>
                        <Text numberOfLines={1} style={{ color: SAC.dim, fontFamily: FONTS.med, fontSize: 10 }}>
                          {u.email || u.id.slice(-6)}
                        </Text>
                      </View>
                    </View>

                    {/* Category */}
                    <View style={{ width: 100, justifyContent: 'center' }}>
                      <CategoryBadge cat={u.category || 'student'} small />
                    </View>

                    {/* Inline Editable: Job Title / Role */}
                    <View style={{ width: 170, justifyContent: 'center' }}>
                      {editingCell?.id === u.id && editingCell.field === 'designation' ? (
                        <TextInput
                          value={editValue}
                          onChangeText={setEditValue}
                          onBlur={saveInlineEdit}
                          onSubmitEditing={saveInlineEdit}
                          autoFocus
                          style={[s.inlineInput, { width: 160 }]}
                        />
                      ) : (
                        <Pressable
                          onPress={(e) => { e.stopPropagation(); startInlineEdit(u.id, 'designation', u.designation || u.headline); }}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        >
                          <Text numberOfLines={1} style={[s.td, { width: 150 }]}>
                            {u.designation || u.headline || '—'}
                          </Text>
                        </Pressable>
                      )}
                    </View>

                    {/* Inline Editable: Company */}
                    <View style={{ width: 150, justifyContent: 'center' }}>
                      {editingCell?.id === u.id && editingCell.field === 'company' ? (
                        <TextInput
                          value={editValue}
                          onChangeText={setEditValue}
                          onBlur={saveInlineEdit}
                          onSubmitEditing={saveInlineEdit}
                          autoFocus
                          style={[s.inlineInput, { width: 140 }]}
                        />
                      ) : (
                        <Pressable
                          onPress={(e) => { e.stopPropagation(); startInlineEdit(u.id, 'company', u.company); }}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        >
                          <Text numberOfLines={1} style={[s.td, { width: 135, color: SAC.muted }]}>
                            {u.company || '—'}
                          </Text>
                        </Pressable>
                      )}
                    </View>

                    {/* Inline Editable: Location */}
                    <View style={{ width: 120, justifyContent: 'center' }}>
                      {editingCell?.id === u.id && editingCell.field === 'location' ? (
                        <TextInput
                          value={editValue}
                          onChangeText={setEditValue}
                          onBlur={saveInlineEdit}
                          onSubmitEditing={saveInlineEdit}
                          autoFocus
                          style={[s.inlineInput, { width: 110 }]}
                        />
                      ) : (
                        <Pressable
                          onPress={(e) => { e.stopPropagation(); startInlineEdit(u.id, 'location', u.location); }}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        >
                          <Text numberOfLines={1} style={[s.td, { width: 110, color: SAC.muted }]}>
                            {u.location || '—'}
                          </Text>
                        </Pressable>
                      )}
                    </View>

                    {/* Inline Editable: Phone */}
                    <View style={{ width: 130, justifyContent: 'center' }}>
                      {editingCell?.id === u.id && editingCell.field === 'phone' ? (
                        <TextInput
                          value={editValue}
                          onChangeText={setEditValue}
                          onBlur={saveInlineEdit}
                          onSubmitEditing={saveInlineEdit}
                          autoFocus
                          style={[s.inlineInput, { width: 120 }]}
                        />
                      ) : (
                        <Pressable
                          onPress={(e) => { e.stopPropagation(); startInlineEdit(u.id, 'phone', u.phone); }}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        >
                          <Text numberOfLines={1} style={[s.td, { width: 120, color: SAC.muted }]}>
                            {u.phone || '—'}
                          </Text>
                        </Pressable>
                      )}
                    </View>

                    {/* LinkedIn */}
                    <View style={{ width: 90, justifyContent: 'center' }}>
                      {u.linkedin_url ? (
                        <Pressable
                          onPress={(e) => { e.stopPropagation(); Platform.OS === 'web' ? (window as any).open(u.linkedin_url, '_blank') : Linking.openURL(u.linkedin_url!); }}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
                        >
                          <ExternalLink size={10} color="#60A5FA" />
                          <Text style={{ color: '#60A5FA', fontFamily: FONTS.med, fontSize: 10.5 }}>Profile</Text>
                        </Pressable>
                      ) : (
                        <Text style={{ color: SAC.dim, fontFamily: FONTS.med, fontSize: 10.5 }}>—</Text>
                      )}
                    </View>

                    {/* College & Degree */}
                    <View style={{ width: 170 }}>
                      <Text numberOfLines={1} style={[s.td, { width: 170, color: '#fff', fontSize: 10.5 }]}>
                        {u.college || '—'}
                      </Text>
                      {u.degree && (
                        <Text numberOfLines={1} style={{ color: SAC.dim, fontFamily: FONTS.med, fontSize: 9.5 }}>
                          {u.degree}{u.graduation_year ? ` · ${u.graduation_year}` : ''}
                        </Text>
                      )}
                    </View>

                    {/* Experience */}
                    <Text style={[s.td, { width: 70, color: SAC.muted }]}>
                      {u.experience_years != null ? `${u.experience_years}y` : '—'}
                    </Text>

                    {/* Status */}
                    <View style={{ width: 90, justifyContent: 'center' }}>
                      <StatusPill status={u.approved ? 'active' : 'pending'} />
                    </View>

                    {/* Actions & Invite */}
                    <View style={{ width: 160, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Pressable
                        onPress={(e) => { e.stopPropagation(); onOpen(u.id); }}
                        style={{ paddingHorizontal: 5, paddingVertical: 2.5, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.06)' }}
                      >
                        <Text style={{ color: '#fff', fontSize: 10, fontFamily: FONTS.bold }}>View</Text>
                      </Pressable>
                      {!u.approved ? (
                        <Pressable
                          onPress={(e) => { e.stopPropagation(); approve(u.id); }}
                          style={{ paddingHorizontal: 5, paddingVertical: 2.5, borderRadius: 4, backgroundColor: 'rgba(34,197,94,0.12)' }}
                        >
                          <Text style={{ color: '#22C55E', fontSize: 10, fontFamily: FONTS.bold }}>Approve</Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          onPress={(e) => { e.stopPropagation(); remove(u.id); }}
                          style={{ paddingHorizontal: 5, paddingVertical: 2.5, borderRadius: 4, backgroundColor: 'rgba(239,68,68,0.1)' }}
                        >
                          <Text style={{ color: '#EF4444', fontSize: 10, fontFamily: FONTS.bold }}>Remove</Text>
                        </Pressable>
                      )}
                      {/* Invite Button */}
                      {u.email ? (
                        <Pressable
                          onPress={(e) => { e.stopPropagation(); inviteSingle(u.id, u.email); }}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 5, paddingVertical: 2.5, borderRadius: 4, backgroundColor: isInvited ? 'rgba(99,102,241,0.14)' : 'rgba(245,158,11,0.12)' }}
                        >
                          <Send size={9} color={isInvited ? '#A5B4FC' : '#FBBF24'} />
                          <Text style={{ color: isInvited ? '#A5B4FC' : '#FBBF24', fontSize: 9.5, fontFamily: FONTS.bold }}>
                            {isInvited ? 'Resend' : 'Invite'}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          <Text style={[s.selectAllText, { textAlign: 'center', paddingVertical: 8 }]}>
            Showing {items.length} contacts of {totalDisplay} · Double-click cells marked with ✎ to edit inline · Horizontal scroll for full columns
          </Text>
        </Card>
      ) : (
        /* Grid Cards View */
        <>
          <View style={s.cardGrid}>
            {items.map((u: any) => (
              <View key={u.id} style={s.gridCell}>
                <View style={selectMode && selected[u.id] ? s.selectedHalo : null}>
                <ProfileCard
                  user={{
                    id: u.id,
                    firstName: u.first_name || (u.name || '').split(' ')[0] || '',
                    lastName:  u.last_name  || (u.name || '').split(' ').slice(1).join(' ') || '',
                    status: u.approved ? 'active' : 'inactive',
                    degree: u.degree || '',
                    institution: u.college || '',
                    batchYear: u.graduation_year || undefined,
                    category: (u.category as ProfileCardCategory) || 'student',
                    isNew: !!u.is_new,
                    approved: !!u.approved,
                  }}
                  goals={u.designation ? [
                    u.company ? `Working as ${u.designation} @ ${u.company}` : `Build career as ${u.designation}`,
                  ] : (u.category === 'student' ? ['Grow into a strong professional', 'Find the right first role'] : undefined)}
                  progress={u.experience_years != null ? {
                    percent: Math.min(100, Math.round(((u.experience_years || 0) / 4) * 100)),
                    sessionsCompleted: 0,
                    sessionsTotal: 0,
                  } : undefined}
                  tags={u.tags || []}
                  socials={{ linkedinUrl: u.linkedin_url || undefined }}
                  onViewProfile={selectMode ? (id) => toggleSelect(id) : onOpen}
                  onApprove={selectMode ? undefined : approve}
                  onRemove={selectMode ? undefined : remove}
                />
                </View>
                {selectMode && (
                  <Pressable onPress={() => toggleSelect(u.id)} style={s.selectBox}>
                    {selected[u.id]
                      ? <SquareCheck size={20} color={GRAD.to} fill="rgba(245,158,11,0.18)" />
                      : <Square size={20} color="rgba(255,255,255,0.6)" />}
                  </Pressable>
                )}
              </View>
            ))}
          </View>
          
          {/* Pagination */}
          <View style={s.paginationRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={s.muted}>Show</Text>
              {[10, 25, 50].map(n => (
                <Pressable
                  key={n}
                  onPress={() => { setPerPage(n); setPage(1); }}
                  style={[s.perPageBtn, perPage === n && s.perPageBtnActive]}
                >
                  <Text style={[s.perPageText, perPage === n && s.perPageTextActive]}>{n}</Text>
                </Pressable>
              ))}
              <Text style={s.muted}>per page</Text>
            </View>
            <Text style={s.muted}>
              Showing {((page - 1) * perPage) + 1}–{Math.min(page * perPage, data?.total || 0)} of {data?.total || 0}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Pressable
                onPress={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                style={[s.pageBtn, page <= 1 && s.pageBtnDisabled]}
              >
                <Text style={s.pageBtnText}>Prev</Text>
              </Pressable>
              <Pressable
                onPress={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                style={[s.pageBtn, page >= totalPages && s.pageBtnDisabled]}
              >
                <Text style={s.pageBtnText}>Next</Text>
              </Pressable>
            </View>
          </View>
        </>
      )}

      {/* Floating bulk-action bar */}
      {selectedIds.length > 0 && (
        <Animated.View entering={FadeInDown.duration(200)} style={s.bulkBar}>
          <Text style={s.bulkText}>{selectedIds.length} selected</Text>
          <Pressable onPress={toggleSelectAll} style={s.bulkLinkBtn}>
            <Text style={s.bulkLink}>{allSelected ? 'Deselect all' : `Select all (${items.length})`}</Text>
          </Pressable>
          <View style={{ flex: 1 }} />
          <SecondaryButton onPress={bulkApprove} disabled={bulkBusy}>
            <ShieldCheck size={12} color={SAC.muted} /><Text style={s.secText}>{bulkBusy ? '…' : 'Approve'}</Text>
          </SecondaryButton>
          <SecondaryButton onPress={() => setTagModalOpen(true)} disabled={bulkBusy}>
            <Tag size={12} color={SAC.muted} /><Text style={s.secText}>Add Tag</Text>
          </SecondaryButton>
          <SecondaryButton onPress={bulkInvite} disabled={bulkBusy}>
            <Send size={12} color="#93C5FD" /><Text style={[s.secText, { color: '#93C5FD' }]}>Send Invites</Text>
          </SecondaryButton>
          <SecondaryButton onPress={bulkPushToTalent} disabled={bulkBusy}>
            <Sparkles size={12} color="#FBBF24" /><Text style={[s.secText, { color: '#FBBF24' }]}>To Talent Pool</Text>
          </SecondaryButton>
          <SecondaryButton danger onPress={bulkDelete} disabled={bulkBusy}>
            <Trash2 size={12} color={'#FCA5A5'} /><Text style={[s.secText, { color: '#FCA5A5' }]}>Delete</Text>
          </SecondaryButton>
          <Pressable onPress={clearSelection} style={s.bulkClose}>
            <X size={13} color="#fff" />
          </Pressable>
        </Animated.View>
      )}

      {/* Tag Modal */}
      <Modal visible={tagModalOpen} transparent animationType="fade" onRequestClose={() => setTagModalOpen(false)}>
        <View style={s.modalBg}>
          <Animated.View entering={FadeInDown.duration(200)} style={[s.modalCard, { maxWidth: 420 }]}>
            <View style={s.modalHero}>
              <IconBox size={36}><Tag size={18} color={GRAD.to} /></IconBox>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle}>Tag Selected Profiles</Text>
                <Text style={s.muted}>Applying tag to {selectedIds.length} candidate record(s)</Text>
              </View>
              <Pressable onPress={() => setTagModalOpen(false)}><X size={16} color={SAC.muted} /></Pressable>
            </View>
            <View style={{ padding: 18, gap: 14 }}>
              <View>
                <Text style={s.modalLabel}>TAG NAME (e.g. Batch 2025, VIP, Bengaluru Chapter)</Text>
                <TextInput
                  value={tagInput}
                  onChangeText={setTagInput}
                  placeholder="Enter tag name…"
                  placeholderTextColor={SAC.dim}
                  style={s.textInput}
                />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                <SecondaryButton onPress={() => setTagModalOpen(false)}><Text style={s.secText}>Cancel</Text></SecondaryButton>
                <GradientButton onPress={bulkApplyTag} disabled={!tagInput.trim() || bulkBusy}>
                  <Text style={s.btnText}>{bulkBusy ? 'Applying…' : 'Apply Tag'}</Text>
                </GradientButton>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  HISTORY TAB — past import runs
 * ══════════════════════════════════════════════════════════════════ */
function HistoryTab() {
  const [runs, setRuns] = useState<any[] | null>(null);
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try { const r = await request<any>('/admin/imports/runs'); setRuns(r?.runs || []); } catch {}
    })();
  }, []);

  if (!runs) return <LoadingBox />;
  if (runs.length === 0) {
    return <EmptyState icon={History} title="No imports yet" sub="Your first uploaded file will appear here with a full breakdown of added/updated/skipped rows." />;
  }

  return (
    <View style={{ gap: 10 }}>
      {runs.map((r) => (
        <Pressable key={r.id} onPress={async () => {
          try { setDetail(await request<any>(`/admin/imports/runs/${r.id}`)); } catch {}
        }} style={({ hovered }: any) => [
          s.runCard,
          hovered && Platform.OS === 'web' && { borderColor: GRAD.ring, backgroundColor: 'rgba(245,158,11,0.04)' },
        ]}>
          <IconBox size={36}><FileText size={16} color={GRAD.to} /></IconBox>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.userName} numberOfLines={1}>{r.filename || 'Import'}</Text>
            <Text style={s.muted}>
              {new Date(r.at).toLocaleString()} · by {r.by_name || 'admin'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              <StatusPill kind="success" label={`+${r.added} added`} />
              <StatusPill kind="info"    label={`${r.updated} updated`} />
              {r.skipped > 0 && <StatusPill kind="warn" label={`${r.skipped} skipped`} />}
              {(['student', 'masters', 'alumni', 'mentor'] as CatKey[]).map((c) => r.by_category?.[c] ? (
                <View key={c} style={[s.miniPill, { borderColor: CAT[c].color + '55', backgroundColor: CAT[c].color + '15' }]}>
                  <Text style={[s.miniPillText, { color: CAT[c].color }]}>{CAT[c].label} {r.by_category[c]}</Text>
                </View>
              ) : null)}
            </View>
          </View>
          <ChevronRight size={14} color={SAC.dim} />
        </Pressable>
      ))}

      {/* Detail modal */}
      <Modal visible={!!detail} transparent animationType="fade" onRequestClose={() => setDetail(null)}>
        <View style={s.modalBg}>
          <Animated.View entering={FadeInDown.duration(220)} style={s.modalCard}>
            <View style={s.modalHero}>
              <IconBox size={40}><FileText size={20} color={GRAD.to} /></IconBox>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle}>{detail?.filename}</Text>
                <Text style={s.muted}>{detail && new Date(detail.at).toLocaleString()}</Text>
              </View>
              <Pressable onPress={() => setDetail(null)}><X size={16} color={SAC.muted} /></Pressable>
            </View>
            <View style={{ padding: 18, gap: 10 }}>
              <View style={s.resultGrid}>
                <View style={s.resultTile}><Text style={s.miniLabel}>ADDED</Text><Text style={[s.kpiVal, { color: SAC.green }]}>{detail?.added}</Text></View>
                <View style={s.resultTile}><Text style={s.miniLabel}>UPDATED</Text><Text style={[s.kpiVal, { color: '#93C5FD' }]}>{detail?.updated}</Text></View>
                <View style={s.resultTile}><Text style={s.miniLabel}>SKIPPED</Text><Text style={[s.kpiVal, { color: '#FBBF24' }]}>{detail?.skipped}</Text></View>
                <View style={s.resultTile}><Text style={s.miniLabel}>TOTAL</Text><Text style={[s.kpiVal, { color: '#fff' }]}>{detail?.total}</Text></View>
              </View>
              {(detail?.skipped_rows || []).length > 0 && (
                <View>
                  <Text style={s.modalLabel}>Skipped rows</Text>
                  <ScrollView style={{ maxHeight: 200 }}>
                    {(detail?.skipped_rows || []).map((sr: any, i: number) => (
                      <View key={i} style={s.skipRow}>
                        <Text style={s.muted}>Row {sr.row}{sr.email ? ` · ${sr.email}` : ''}</Text>
                        <Text style={[s.muted, { color: '#FCA5A5', flex: 1, textAlign: 'right' }]} numberOfLines={1}>{sr.reason}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  PROFILE DETAIL PANEL (side-drawer modal)
 * ══════════════════════════════════════════════════════════════════ */
function ProfilePanel({ userId, onClose, onSaved }: { userId: string | null; onClose: () => void; onSaved: () => void }) {
  const [data, setData] = useState<any>(null);
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState<any>({});
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    if (!userId) { setData(null); setEdit(false); return; }
    (async () => {
      try {
        const r = await request<any>(`/admin/users/profile/${userId}`);
        setData(r); setDraft({});
      } catch {}
    })();
  }, [userId]);

  if (!userId) return null;

  const save = async () => {
    try {
      await request(`/admin/users/profile/${userId}`, { method: 'PATCH', body: draft });
      const r = await request<any>(`/admin/users/profile/${userId}`);
      setData(r); setEdit(false); setDraft({});
      onSaved();
    } catch {}
  };

  const del = async () => {
    try { await request(`/admin/users/profile/${userId}`, { method: 'DELETE' }); onClose(); onSaved(); } catch {}
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalBg}>
        <Animated.View entering={FadeInDown.duration(220)} style={[s.modalCard, { maxWidth: 540 }]}>
          {!data ? <View style={{ padding: 60 }}><LoadingBox /></View> : (
            <>
              {/* Header */}
              <LinearGradient colors={GRAD.soft} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.modalHero}>
                <View style={[s.avatarLg, { borderColor: (CAT[data.category as CatKey]?.color || GRAD.to) + '88' }]}>
                  <Text style={[s.avatarLgText, { color: CAT[data.category as CatKey]?.color || GRAD.to }]}>
                    {(data.full_name || '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.modalTitle} numberOfLines={1}>{data.full_name || '—'}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    <CategoryBadge cat={data.category as CatKey} />
                    {data.profile_status && <StatusPill kind={data.profile_status === 'complete' ? 'success' : data.profile_status === 'partial' ? 'warn' : 'danger'} label={data.profile_status} />}
                  </View>
                  {!!data.designation && <Text style={[s.muted, { marginTop: 4 }]}>{data.designation}{data.company ? ` @ ${data.company}` : ''}</Text>}
                </View>
                <Pressable onPress={onClose}><X size={16} color={SAC.muted} /></Pressable>
              </LinearGradient>

              <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ padding: 20, gap: 16 }}>
                {/* Education */}
                <View>
                  <SectionLabel>EDUCATION</SectionLabel>
                  <View style={{ marginTop: 8, gap: 8 }}>
                    {!edit ? (
                      <DetailRow Icon={GraduationCap} label="College"        value={data.college || '—'} />
                    ) : (
                      <EditRow label="College" value={draft.college ?? data.college} onChange={(v) => setDraft({ ...draft, college: v })} />
                    )}
                    {!edit ? (
                      <DetailRow Icon={FileText} label="Degree"          value={data.degree || '—'} />
                    ) : (
                      <EditRow label="Degree" value={draft.degree ?? data.degree} onChange={(v) => setDraft({ ...draft, degree: v })} />
                    )}
                    <DetailRow Icon={Calendar} label="Graduation year"  value={data.graduation_year ? String(data.graduation_year) : '—'} />
                  </View>
                </View>

                {/* Experience */}
                <View>
                  <SectionLabel>EXPERIENCE</SectionLabel>
                  <View style={{ marginTop: 8, gap: 8 }}>
                    {!edit ? (
                      <DetailRow Icon={Briefcase} label="Designation" value={data.designation || '—'} />
                    ) : (
                      <EditRow label="Designation" value={draft.designation ?? data.designation} onChange={(v) => setDraft({ ...draft, designation: v })} />
                    )}
                    {!edit ? (
                      <DetailRow Icon={Building2} label="Company"     value={data.company || '—'} />
                    ) : (
                      <EditRow label="Company" value={draft.company ?? data.company} onChange={(v) => setDraft({ ...draft, company: v })} />
                    )}
                    <DetailRow Icon={Sparkles} label="Years of experience" value={`${data.experience_years ?? 0} yrs`} />
                  </View>
                </View>

                {/* Contact */}
                <View>
                  <SectionLabel>CONTACT</SectionLabel>
                  <View style={{ marginTop: 8, gap: 8 }}>
                    <LinkRow Icon={Mail}     label="Email"        value={data.email}        href={data.email ? `mailto:${data.email}` : undefined} />
                    <LinkRow Icon={Phone}    label="Phone"        value={data.phone || '—'} href={data.phone ? `tel:${data.phone}` : undefined} />
                    <LinkRow Icon={ExternalLink} label="LinkedIn"     value={data.linkedin_url || '—'} href={data.linkedin_url} />
                    <DetailRow Icon={MapPin} label="Location"     value={data.location || '—'} />
                  </View>
                </View>

                {/* Meta */}
                <View>
                  <SectionLabel>META</SectionLabel>
                  <View style={{ marginTop: 8, gap: 8 }}>
                    <DetailRow Icon={Sparkles}  label="Categorization rule" value={data.category_rule || '—'} />
                    {edit ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={s.detailLabel}>Re-categorize</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          {(['student', 'masters', 'alumni', 'mentor'] as CatKey[]).map((c) => (
                            <Pressable key={c} onPress={() => setDraft({ ...draft, category: c })}
                              style={[s.catPick, (draft.category || data.category) === c && { borderColor: CAT[c].color, backgroundColor: CAT[c].color + '22' }]}>
                              <CategoryBadge cat={c} small />
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    ) : null}
                    {data.created_at && <DetailRow Icon={Calendar} label="Created" value={new Date(data.created_at).toLocaleString()} />}
                  </View>
                </View>

                {/* Actions */}
                <View style={s.actionsRow}>
                  {!edit ? (
                    <>
                      {data.email ? (
                        <SecondaryButton onPress={async () => {
                          try {
                            await request('/admin/users/bulk/invite', { method: 'POST', body: { user_ids: [userId] } });
                            onSaved();
                          } catch {}
                        }}>
                          <Send size={12} color="#93C5FD" />
                          <Text style={[s.secText, { color: '#93C5FD' }]}>Send Invite</Text>
                        </SecondaryButton>
                      ) : null}
                      <SecondaryButton onPress={async () => {
                        try {
                          await request('/admin/users/bulk/push-to-talent', { method: 'POST', body: { user_ids: [userId] } });
                          onSaved();
                        } catch {}
                      }}>
                        <Sparkles size={12} color="#FBBF24" />
                        <Text style={[s.secText, { color: '#FBBF24' }]}>To Talent Pool</Text>
                      </SecondaryButton>
                      <SecondaryButton onPress={() => setEdit(true)}>
                        <Pencil size={12} color={SAC.muted} />
                        <Text style={s.secText}>Edit</Text>
                      </SecondaryButton>
                      <SecondaryButton danger onPress={() => setConfirmDel(true)}>
                        <Trash2 size={12} color={'#FCA5A5'} />
                        <Text style={[s.secText, { color: '#FCA5A5' }]}>Delete</Text>
                      </SecondaryButton>
                    </>
                  ) : (
                    <>
                      <SecondaryButton onPress={() => { setEdit(false); setDraft({}); }}>
                        <Text style={s.secText}>Cancel</Text>
                      </SecondaryButton>
                      <GradientButton onPress={save}>
                        <Check size={13} color="#fff" />
                        <Text style={s.btnText}>Save changes</Text>
                      </GradientButton>
                    </>
                  )}
                </View>

                {confirmDel && (
                  <View style={[s.warnBox, { borderColor: SAC.red, backgroundColor: 'rgba(239,68,68,0.08)' }]}>
                    <AlertTriangle size={13} color={'#FCA5A5'} />
                    <Text style={[s.muted, { color: '#FCA5A5', flex: 1 }]}>
                      Permanently delete this profile?
                    </Text>
                    <SecondaryButton size="sm" onPress={() => setConfirmDel(false)}>
                      <Text style={s.secText}>No</Text>
                    </SecondaryButton>
                    <Pressable onPress={del} style={s.destructiveBtn}>
                      <Text style={s.btnText}>Yes, delete</Text>
                    </Pressable>
                  </View>
                )}
              </ScrollView>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

function DetailRow({ Icon, label, value }: { Icon: any; label: string; value: string }) {
  return (
    <View style={s.detailRow}>
      <Icon size={13} color={SAC.muted} />
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function LinkRow({ Icon, label, value, href }: { Icon: any; label: string; value: string; href?: string }) {
  const open = () => { if (href) Linking.openURL(href).catch(() => {}); };
  return (
    <Pressable onPress={href ? open : undefined} style={s.detailRow}>
      <Icon size={13} color={SAC.muted} />
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={[s.detailValue, href && { color: GRAD.to, textDecorationLine: 'underline' }]} numberOfLines={1}>{value}</Text>
      {href && <ExternalLink size={11} color={GRAD.to} />}
    </Pressable>
  );
}

function EditRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Text style={[s.detailLabel, { width: 120 }]}>{label}</Text>
      <TextInput
        value={value || ''} onChangeText={onChange}
        placeholderTextColor={SAC.dim}
        style={s.formInput}
      />
    </View>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Styles
 * ────────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 16 },
  sub:   { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4, lineHeight: 17, maxWidth: 720 },
  muted: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 2 },
  err: { color: '#FCA5A5', fontFamily: FONTS.bold, fontSize: 12 },
  
  // Stats row
  statsRow: {
    flexDirection: 'row', gap: 10, flexWrap: 'wrap',
  },
  statCard: {
    flex: 1, minWidth: 120, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: SAC.cardSolid, borderRadius: 12, borderWidth: 1, borderColor: SAC.border,
    padding: 12,
  },
  statIcon: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  statValue: { fontFamily: FONTS.xbold, fontSize: 18, color: '#fff' },
  statLabel: { fontFamily: FONTS.med, fontSize: 11, color: SAC.muted, marginTop: 2 },

  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 3.5, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start',
  },
  catBadgeText: { fontFamily: FONTS.xbold, letterSpacing: 0.3 },

  // Upload
  dropZone: {
    backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 14,
    borderStyle: 'dashed', padding: 40, alignItems: 'center', gap: 10,
    ...(Platform.OS === 'web' ? ({ transitionDuration: '150ms' } as any) : {}),
  },
  dropIcon: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dropTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 15, marginTop: 6 },
  dropSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12 },

  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fileName: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 14 },
  summaryStats: {
    flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap',
  },
  sumStat: {
    flex: 1, minWidth: 80, paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: SAC.cardSolid, borderRadius: 10, borderColor: SAC.border, borderWidth: 1,
    alignItems: 'center', gap: 2,
  },
  sumVal: { fontFamily: FONTS.xbold, fontSize: 18 },
  sumLabel: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 10.5, letterSpacing: 0.4 },

  mapRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  mapSrc: { color: SAC.text, fontFamily: FONTS.med, fontSize: 12, width: 220,
    ...(Platform.OS === 'web' ? ({ fontFamily: '"JetBrains Mono", "SF Mono", monospace' } as any) : {}) },
  mapUnused: { backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1, borderColor: SAC.border },
  mapUnusedText: { color: SAC.dim, fontFamily: FONTS.bold, fontSize: 10.5 },

  tableHead: {
    flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.03)', borderBottomWidth: 1, borderBottomColor: SAC.border,
  },
  th: { color: SAC.muted, fontFamily: FONTS.xbold, fontSize: 10.5, letterSpacing: 1.2, paddingRight: 10 },
  tableRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: SAC.border,
  },
  tableRowErr: { backgroundColor: 'rgba(239,68,68,0.04)' },
  td: { color: '#fff', fontFamily: FONTS.med, fontSize: 11.5, paddingRight: 10 },

  commitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  commitTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 13 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  checkBox: { width: 16, height: 16, borderRadius: 5, borderWidth: 1.4, borderColor: SAC.border2, alignItems: 'center', justifyContent: 'center' },
  checkLabel: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 11.5 },

  // Manual
  manualGrid: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' as any },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  formField: { flex: 1, minWidth: 180, gap: 6 },
  formLabel: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11.5 },
  formInput: {
    color: '#fff', fontFamily: FONTS.med, fontSize: 13,
    backgroundColor: SAC.cardSolid, borderRadius: 9, borderWidth: 1, borderColor: SAC.border,
    paddingHorizontal: 12, paddingVertical: 10,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  previewBigVal: { fontFamily: FONTS.xbold, fontSize: 18 },
  previewRule: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 9, backgroundColor: 'rgba(245,158,11,0.08)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)' },
  previewRuleText: { color: GRAD.to, fontFamily: FONTS.xbold, fontSize: 11.5, flex: 1 },
  previewLbl: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11.5 },
  previewVal: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12 },
  warnBox: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 8, backgroundColor: 'rgba(251,191,36,0.08)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.30)' },

  // Browse
  browseHead: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' },
  cardGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 16,
    ...(Platform.OS === 'web' ? ({ display: 'grid' as any, gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' as any, gap: 16 } as any) : {}),
  },
  gridCell: { minWidth: 320, flexBasis: 320, flexGrow: 1 },
  viewModeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '150ms' } as any) : {}),
  },
  viewModeBtnText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11 },
  toggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7,
    borderWidth: 1, borderColor: SAC.border, backgroundColor: SAC.cardSolid,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  toggleBtnText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11 },
  
  // File list
  fileRow: {
    flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8,
    backgroundColor: SAC.cardSolid, borderWidth: 1, borderColor: SAC.border,
  },
  clearBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.1)',
  },
  clearBtnText: { color: '#F87171', fontFamily: FONTS.bold, fontSize: 11 },
  removeFileBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(239,68,68,0.1)', alignItems: 'center', justifyContent: 'center',
  },
  
  // Pagination
  paginationRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: SAC.border,
    flexWrap: 'wrap', gap: 10,
  },
  perPageBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6,
    borderWidth: 1, borderColor: SAC.border, backgroundColor: SAC.cardSolid,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
  perPageBtnActive: {
    borderColor: GRAD.from, backgroundColor: 'rgba(124,58,237,0.15)',
  },
  perPageText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11 },
  perPageTextActive: { color: '#C4B5FD' },
  pageBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: SAC.border, backgroundColor: SAC.cardSolid,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12 },

  /* selection mode */
  selectBox: {
    position: 'absolute', top: 14, left: 14, width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', zIndex: 12,
    backgroundColor: 'rgba(0,0,0,0.55)', borderColor: 'rgba(251,146,60,0.25)', borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  selectedHalo: {
    height: '100%',
    borderRadius: 22, borderWidth: 2, borderColor: GRAD.to,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 0 0 4px rgba(251,146,60,0.18)' } as any) : {}),
  },
  bulkBar: {
    position: 'absolute', bottom: 18, left: 0, right: 0,
    marginHorizontal: 'auto', maxWidth: 880,
    flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap',
    paddingHorizontal: 18, paddingVertical: 12,
    backgroundColor: '#1A0E04', borderColor: 'rgba(251,146,60,0.45)', borderWidth: 1,
    borderRadius: 14,
    ...(Platform.OS === 'web' ? ({
      boxShadow: '0 18px 50px rgba(0,0,0,0.65), 0 0 0 4px rgba(251,146,60,0.10)',
      position: 'sticky' as any, bottom: 18,
    } as any) : {}),
  },
  bulkText:   { color: '#fff',  fontFamily: FONTS.xbold, fontSize: 13 },
  bulkLinkBtn:{ ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  bulkLink:   { color: GRAD.to, fontFamily: FONTS.bold,  fontSize: 12 },
  bulkClose: {
    width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  secText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 },
  userRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 11, paddingHorizontal: 14,
    backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 12,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '150ms' } as any) : {}),
  },
  avatar: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarInit: { fontFamily: FONTS.xbold, fontSize: 12.5 },
  userName: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 13 },

  // History
  runCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 12,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '150ms' } as any) : {}),
  },
  miniPill: { paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 999, borderWidth: 1 },
  miniPillText: { fontFamily: FONTS.xbold, fontSize: 9.5, letterSpacing: 0.3 },
  miniLabel: { color: SAC.muted, fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 1.4 },
  kpiVal: { fontFamily: FONTS.xbold, fontSize: 22, marginTop: 4 },

  // Modal
  modalBg: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(8px)' } as any) : {}),
  },
  modalCard: {
    width: '100%', maxWidth: 720, maxHeight: '92%',
    backgroundColor: SAC.bg2, borderRadius: 16, borderWidth: 1, borderColor: SAC.border2,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 24px 60px rgba(0,0,0,0.7)' } as any) : {}),
  },
  modalHero: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 18, borderBottomWidth: 1, borderBottomColor: SAC.border,
  },
  modalTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 15 },
  modalLabel: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 },

  resultGrid: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  resultTile: { flex: 1, minWidth: 100, padding: 12, borderRadius: 10, backgroundColor: SAC.cardSolid, borderWidth: 1, borderColor: SAC.border, alignItems: 'center', gap: 2 },
  skipRow: { flexDirection: 'row', gap: 10, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: SAC.border },

  // Profile panel
  avatarLg: { width: 56, height: 56, borderRadius: 14, borderWidth: 1.5, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  avatarLgText: { fontFamily: FONTS.xbold, fontSize: 18 },

  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailLabel: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11.5, width: 130 },
  detailValue: { color: '#fff', fontFamily: FONTS.med, fontSize: 12.5, flex: 1 },
  catPick: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: SAC.border, marginRight: 6, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },

  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  destructiveBtn: { backgroundColor: SAC.red, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },

  btnText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 },
  secText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 },
  inlineInput: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderColor: GRAD.to,
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
    color: '#fff',
    fontSize: 11,
    fontFamily: FONTS.med,
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: SAC.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 13,
    fontFamily: FONTS.med,
    marginTop: 6,
  },
});
