/**
 * UsersListPage — reusable for Colleges/Students/Mentors/Alumni.
 * Filters by role, supports search, opens detail SlidePanel on row click.
 */
import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, Image } from 'react-native';
import { Search, ChevronRight, Mail, Building2, GraduationCap, Briefcase, Users, ShieldCheck, Linkedin, ExternalLink } from 'lucide-react-native';
import { request } from '@/src/models/services/api';
import { AdminLayout } from './AdminLayout';
import { GlassCard, StatusChip, ActionButton } from './primitives';
import { SlidePanel, PanelField } from './SlidePanel';
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
  const [pendingCount, setPendingCount] = useState(0);

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
  }, [q, role]);

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
      rightAction={<ActionButton label={`Total: ${items.length}`} variant="ghost" />}
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
            onPress={() => setSelected(u)}
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

      {/* Detail panel */}
      <SlidePanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name || ''}
        subtitle={selected?.email}
      >
        {selected && (
          <View>
            <View style={styles.panelTopRow}>
              <View style={styles.panelAvatar}>
                <Text style={styles.panelAvatarText}>{(selected.name || '?').slice(0, 2).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: T.text, fontFamily: 'DMSans_700Bold', fontSize: 16 }}>
                  {selected.name}
                </Text>
                <Text style={{ color: T.textMute, fontFamily: 'DMSans_400Regular', fontSize: 12, marginTop: 4 }}>
                  {selected.email}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                  {selected.email_verified && <StatusChip label="Verified" tone="good" />}
                  {selected.two_fa_enabled && <StatusChip label="2FA" tone="warn" />}
                  <StatusChip label={selected.role} tone="neutral" />
                </View>
              </View>
            </View>

            <PanelField label="User ID"     value={selected.id} />
            <PanelField label="Phone"       value={selected.phone} />
            <PanelField label="Career Path" value={selected.career_path} />
            <PanelField label="Institution" value={selected.institution} />
            <PanelField label="City"        value={selected.city} />
            <PanelField label="State"       value={selected.state} />
            <PanelField label="Stream"      value={selected.stream} />
            <PanelField label="Course"      value={selected.course} />
            <PanelField label="Graduation Year" value={selected.graduation_year} />
            <PanelField label="Mentor Title"    value={selected.mentor_title} />
            <PanelField label="Organization"    value={selected.mentor_org} />
            <PanelField label="Category"        value={selected.mentor_category} />
            <PanelField label="Sessions Hosted" value={selected.mentor_sessions} />
            <PanelField label="Rating"          value={selected.mentor_rating} />
            <PanelField label="Alumni Employer" value={selected.alumni_employer} />
            <PanelField label="Alumni Role"     value={selected.alumni_role} />
            <PanelField label="Wants to Mentor" value={selected.alumni_wants_to_mentor ? 'Yes' : 'No'} />
            <PanelField label="Alumni Network"  value={selected.alumni_count} />
            <PanelField label="Placement Rate"
              value={selected.placement_rate ? `${Math.round(selected.placement_rate * 100)}%` : null} />
            <PanelField label="Events Hosted"   value={selected.events_hosted} />
            <PanelField label="Joined"
              value={selected.created_at && new Date(selected.created_at).toLocaleString()} />
            {selected.linkedin_url && (
              <View style={{ marginTop: 12 }}>
                <ActionButton
                  label="Open LinkedIn"
                  icon={Linkedin}
                  variant="ghost"
                  onPress={() => (typeof window !== 'undefined') && window.open(selected.linkedin_url, '_blank')}
                />
              </View>
            )}
          </View>
        )}
      </SlidePanel>
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
