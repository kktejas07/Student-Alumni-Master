/**
 * UsersListPage — reusable for Colleges/Students/Mentors/Alumni.
 * Filters by role, supports search, opens detail SlidePanel on row click.
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { Search, ChevronRight, Building2, GraduationCap, Briefcase, Users, Plus } from 'lucide-react-native';
import { request } from '@/src/models/services/api';
import { AdminLayout } from './AdminLayout';
import { GlassCard, StatusChip, ActionButton } from './primitives';
import { UserEditorPanel } from './UserEditorPanel';
import { ADMIN_THEME as T } from './theme';

interface Props {
  role: 'student' | 'mentor' | 'alumni' | 'college';
  pageTitle: string;
  pageSubtitle: string;
}

export default function UsersListPage({ role, pageTitle, pageSubtitle }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [panelMode, setPanelMode] = useState<'view' | 'edit' | 'create'>('view');
  const [pendingCount, setPendingCount] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await request<{ items: any[]; total: number }>(
          `/admin/users?role=${role}&q=${encodeURIComponent(q)}`,
        );
        setItems(r.items || []);
      } finally { setLoading(false); }
    }, q ? 350 : 0);
    return () => clearTimeout(t);
  }, [q, role, reloadKey]);

  const reloadList = useCallback(() => setReloadKey((k) => k + 1), []);
  const openCreate = useCallback(() => {
    setSelected(null);
    setPanelMode('create');
  }, []);
  const openRow = useCallback((u: any) => {
    setSelected(u);
    setPanelMode('view');
  }, []);
  const closePanel = useCallback(() => {
    setSelected(null);
    setPanelMode('view');
  }, []);

  // Approvals badge
  useEffect(() => {
    (async () => {
      try {
        const r = await request<{ counts: any }>('/admin/approvals?status=pending');
        setPendingCount((r.counts || {}).pending || 0);
      } catch {}
    })();
  }, []);

  const cols = useMemo(() => {
    if (role === 'college')  return ['Institution', 'City · State', 'Alumni', 'Placement', 'Joined', ''];
    if (role === 'mentor')   return ['Mentor', 'Title', 'Category', 'Sessions', 'Rating', ''];
    if (role === 'alumni')   return ['Name', 'Employer', 'Role', 'Mentor?', 'Joined', ''];
    return ['Student', 'Institution', 'Stream', 'Course', 'Joined', ''];
  }, [role]);

  const gridCols = '2fr 1.5fr 1fr 0.8fr 0.8fr auto';

  return (
    <AdminLayout title={pageTitle} subtitle={pageSubtitle} pendingCount={pendingCount}
      rightAction={
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Text style={{ color: T.textMute, fontFamily: 'DMSans_500Medium', fontSize: 12 }}>
            Total: {items.length}
          </Text>
          <ActionButton
            label={`New ${role === 'college' ? 'College' : role}`}
            icon={Plus} onPress={openCreate} testID={`admin-${role}-new-btn`}
          />
        </View>
      }
    >
      {/* Search */}
      <View style={styles.toolbar}>
        <View style={styles.searchWrap}>
          <Search size={14} color="rgba(255,255,255,0.45)" />
          <TextInput
            value={q} onChangeText={setQ}
            placeholder={`Search ${role}s by name, email, institution\u2026`}
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={styles.searchInput}
            testID={`admin-${role}-search`}
          />
        </View>
      </View>

      <GlassCard padding={0}>
        <View style={[styles.tableHead, { gridTemplateColumns: gridCols } as any]}>
          {cols.map((c, i) => <Text key={i} style={styles.th}>{c}</Text>)}
        </View>
        {loading && (
          <View style={{ padding: 60, alignItems: 'center' }}>
            <ActivityIndicator color={T.light} />
          </View>
        )}
        {!loading && items.length === 0 && (
          <View style={{ padding: 50, alignItems: 'center' }}>
            <Text style={{ color: T.textMute, fontFamily: 'DMSans_500Medium' }}>No {role}s found.</Text>
          </View>
        )}
        {!loading && items.map((u) => (
          <Pressable
            key={u.id}
            onPress={() => openRow(u)}
            testID={`admin-row-${u.id}`}
            style={({ hovered }: any) => [
              styles.tableRow, { gridTemplateColumns: gridCols } as any,
              hovered && { backgroundColor: 'rgba(245,158,11,0.06)' },
            ]}
          >
            {/* Col 1 — primary */}
            <View style={styles.cellPrimary}>
              <View style={styles.avatar}>
                {role === 'college'  && <Building2 size={14} color={T.light} />}
                {role === 'mentor'   && <Briefcase size={14} color={T.light} />}
                {role === 'alumni'   && <Users size={14} color={T.light} />}
                {role === 'student'  && <GraduationCap size={14} color={T.light} />}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.name} numberOfLines={1}>{u.name}</Text>
                <Text style={styles.email} numberOfLines={1}>{u.email}</Text>
              </View>
            </View>
            {/* Col 2 */}
            <Text style={styles.td} numberOfLines={1}>
              {role === 'college'
                ? `${u.city || '-'} \u00B7 ${u.state || '-'}`
                : role === 'mentor'
                ? `${u.mentor_title || '-'} @ ${u.mentor_org || '-'}`
                : role === 'alumni'
                ? (u.alumni_employer || '\u2014')
                : (u.institution || '\u2014')}
            </Text>
            {/* Col 3 */}
            <Text style={styles.td} numberOfLines={1}>
              {role === 'college'
                ? (u.alumni_count || 0)
                : role === 'mentor'
                ? (u.mentor_category ? u.mentor_category.replace(/_/g, ' ') : '\u2014')
                : role === 'alumni'
                ? (u.alumni_role || '\u2014')
                : (u.stream ? u.stream.toUpperCase() : '\u2014')}
            </Text>
            {/* Col 4 */}
            <View>
              {role === 'college' && (
                <Text style={styles.td}>{u.placement_rate ? `${Math.round(u.placement_rate * 100)}%` : '\u2014'}</Text>
              )}
              {role === 'mentor'  && <Text style={styles.td}>{u.mentor_sessions || 0}</Text>}
              {role === 'alumni'  && (
                <StatusChip
                  label={u.alumni_wants_to_mentor ? 'Yes' : 'No'}
                  tone={u.alumni_wants_to_mentor ? 'good' : 'neutral'}
                />
              )}
              {role === 'student' && <Text style={styles.td}>{u.course || '\u2014'}</Text>}
            </View>
            {/* Col 5 */}
            <Text style={styles.td} numberOfLines={1}>
              {role === 'mentor' ? (u.mentor_rating ? `\u2B50 ${u.mentor_rating}` : '\u2014') : new Date(u.created_at).toLocaleDateString()}
            </Text>
            {/* Col 6 */}
            <ChevronRight size={14} color="rgba(255,255,255,0.35)" />
          </Pressable>
        ))}
      </GlassCard>

      {/* Detail panel — view/edit/create with badges + CRUD */}
      <UserEditorPanel
        open={!!selected || panelMode === 'create'}
        mode={panelMode}
        role={role}
        user={selected}
        onClose={closePanel}
        onChanged={reloadList}
      />
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, height: 40, borderRadius: 10, flex: 1,
    backgroundColor: T.glass, borderColor: T.border, borderWidth: 1,
  },
  searchInput: {
    flex: 1, color: T.text, fontFamily: 'DMSans_500Medium', fontSize: 13,
    ...({ outlineStyle: 'none' } as any),
  },
  tableHead: {
    paddingHorizontal: 18, paddingVertical: 12,
    borderBottomColor: T.border, borderBottomWidth: 1,
    ...({ display: 'grid', alignItems: 'center', gap: 14 } as any),
  },
  tableRow: {
    paddingHorizontal: 18, paddingVertical: 13,
    borderBottomColor: 'rgba(245,158,11,0.06)', borderBottomWidth: 1,
    ...({ display: 'grid', alignItems: 'center', gap: 14, cursor: 'pointer' } as any),
  },
  th: { color: 'rgba(255,255,255,0.32)', fontFamily: 'DMSans_700Bold', fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  td: { color: 'rgba(255,255,255,0.78)', fontFamily: 'DMSans_500Medium', fontSize: 12.5 },
  cellPrimary: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  avatar: { width: 32, height: 32, borderRadius: 9, backgroundColor: T.glassMd, borderColor: T.borderMd, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  name: { color: T.text, fontFamily: 'DMSans_700Bold', fontSize: 13 },
  email: { color: 'rgba(255,255,255,0.42)', fontFamily: 'DMSans_400Regular', fontSize: 11, marginTop: 2 },
  panelTopRow: { flexDirection: 'row', gap: 14, alignItems: 'center', paddingBottom: 12, borderBottomColor: T.border, borderBottomWidth: 1 },
  panelAvatar: {
    width: 56, height: 56, borderRadius: 14,
    backgroundColor: T.glassMd, borderColor: T.borderMd, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  panelAvatarText: { color: T.light, fontFamily: 'DMSans_700Bold', fontSize: 16, letterSpacing: 0.5 },
});
