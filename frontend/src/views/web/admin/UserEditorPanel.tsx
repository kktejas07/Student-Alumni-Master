/**
 * UserEditorPanel — slide-out panel for VIEW / EDIT / CREATE / DELETE on a user.
 * Shows badges, all profile fields, and admin actions.
 */
import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, ActivityIndicator, Pressable, Platform } from 'react-native';
import { Edit3, Trash2, Save, X as CloseX, Link2 as Linkedin, AlertTriangle } from 'lucide-react-native';
import { request } from '@/src/models/services/api';
import { SlidePanel } from './SlidePanel';
import { StatusChip, ActionButton } from './primitives';
import { BadgeStack, type Badge } from '@/src/views/web/Badges';
import { ADMIN_THEME as T } from './theme';

type Mode = 'view' | 'edit' | 'create';
type Role = 'student' | 'mentor' | 'alumni' | 'college';

interface Props {
  open: boolean;
  mode: Mode;
  role: Role;
  user: any | null;       // existing user when mode=view/edit, null for create
  onClose: () => void;
  onChanged: () => void;  // parent re-fetches list
}

const FIELD_DEFS: Record<Role, Array<{ key: string; label: string; section?: string }>> = {
  college: [
    { key: 'full_name', label: 'Institution Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'college_profile.city', label: 'City' },
    { key: 'college_profile.state', label: 'State' },
    { key: 'college_profile.alumni_count', label: 'Alumni Count' },
    { key: 'college_profile.placement_rate', label: 'Placement Rate (0-1)' },
    { key: 'college_profile.website', label: 'Website' },
  ],
  student: [
    { key: 'full_name', label: 'Full Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'career_path', label: 'Career Path' },
    { key: 'school_info.institution_name', label: 'Institution' },
    { key: 'school_info.city', label: 'City' },
    { key: 'school_info.state', label: 'State' },
    { key: 'school_info.branch_or_stream', label: 'Stream' },
    { key: 'school_info.current_course', label: 'Course' },
    { key: 'school_info.graduation_year', label: 'Graduation Year' },
    { key: 'linkedin_url', label: 'LinkedIn URL' },
  ],
  mentor: [
    { key: 'full_name', label: 'Full Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'mentor_profile.job_title', label: 'Job Title' },
    { key: 'mentor_profile.organization', label: 'Organization' },
    { key: 'mentor_profile.category', label: 'Category' },
    { key: 'mentor_profile.years_of_experience', label: 'Years of Experience' },
    { key: 'mentor_profile.rating', label: 'Rating' },
    { key: 'mentor_profile.sessions', label: 'Sessions Hosted' },
    { key: 'mentor_profile.linkedin_url', label: 'LinkedIn URL' },
  ],
  alumni: [
    { key: 'full_name', label: 'Full Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'alumni_info.alumni_employer', label: 'Employer' },
    { key: 'alumni_info.alumni_role', label: 'Role' },
    { key: 'alumni_info.graduation_year', label: 'Graduation Year' },
    { key: 'alumni_info.alumni_wants_to_mentor', label: 'Wants to Mentor (true/false)' },
    { key: 'alumni_info.alumni_linkedin_url', label: 'LinkedIn URL' },
  ],
};

// Map flat list-item fields → nested editor field paths
function flatToForm(role: Role, u: any): Record<string, string> {
  const out: Record<string, string> = {};
  if (!u) return out;
  const get = (path: string) => {
    const [a, b] = path.split('.');
    if (!b) return u[a];
    return (u[a] || {})[b];
  };
  // The list endpoint returns a flat shape, so map back to nested form keys
  const flatLookup: Record<string, string> = {
    'school_info.institution_name': u.institution,
    'school_info.city': u.city,
    'school_info.state': u.state,
    'school_info.branch_or_stream': u.stream,
    'school_info.current_course': u.course,
    'school_info.graduation_year': u.graduation_year,
    'mentor_profile.job_title': u.mentor_title,
    'mentor_profile.organization': u.mentor_org,
    'mentor_profile.category': u.mentor_category,
    'mentor_profile.rating': u.mentor_rating,
    'mentor_profile.sessions': u.mentor_sessions,
    'mentor_profile.years_of_experience': u.years_of_experience,
    'mentor_profile.linkedin_url': u.linkedin_url,
    'alumni_info.alumni_employer': u.alumni_employer,
    'alumni_info.alumni_role': u.alumni_role,
    'alumni_info.alumni_wants_to_mentor': u.alumni_wants_to_mentor,
    'alumni_info.alumni_linkedin_url': u.linkedin_url,
    'college_profile.city': u.city,
    'college_profile.state': u.state,
    'college_profile.alumni_count': u.alumni_count,
    'college_profile.placement_rate': u.placement_rate,
  };
  FIELD_DEFS[role].forEach((f) => {
    const v = flatLookup[f.key] ?? get(f.key);
    out[f.key] = v == null ? '' : String(v);
  });
  return out;
}

function buildPayload(role: Role, form: Record<string, string>): any {
  const result: any = {};
  Object.entries(form).forEach(([k, v]) => {
    if (v === '' || v == null) return;
    let val: any = v;
    // numeric coercion
    if (/(_count|_year|sessions|rating|placement_rate|years_of_experience)$/.test(k)) {
      const n = Number(v);
      if (!Number.isNaN(n)) val = n;
    }
    if (k.endsWith('wants_to_mentor')) {
      val = v === 'true' || v === 'yes' || v === '1';
    }
    if (!k.includes('.')) {
      result[k] = val;
    } else {
      const [a, b] = k.split('.');
      result[a] = result[a] || {};
      result[a][b] = val;
    }
  });
  return result;
}

export function UserEditorPanel({ open, mode: initMode, role, user, onClose, onChanged }: Props) {
  const [mode, setMode] = useState<Mode>(initMode);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [tempPwd, setTempPwd] = useState<string | null>(null);

  // Reset state when panel opens
  useEffect(() => {
    if (!open) return;
    setMode(initMode);
    setError(null);
    setConfirmDel(false);
    setTempPwd(null);
    setForm(flatToForm(role, user));
    setBadges([]);
    if (user?.id && initMode !== 'create') {
      // Fetch fresh badges for this user
      request<{ badges: Badge[] }>(`/users/${user.id}/badges`, { auth: false } as any)
        .then((r) => setBadges(r.badges || []))
        .catch(() => setBadges(user.badges || []));
    }
  }, [open, initMode, role, user]);

  const fieldDefs = useMemo(() => FIELD_DEFS[role], [role]);

  const setField = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = buildPayload(role, form);
      if (mode === 'create') {
        payload.role = role;
        const r = await request<any>('/admin/users', {
          method: 'POST',
          body: payload,
        } as any);
        setTempPwd(r?.temp_password || null);
        onChanged();
        setMode('view');
      } else if (mode === 'edit' && user?.id) {
        await request(`/admin/users/${user.id}`, {
          method: 'PATCH',
          body: payload,
        } as any);
        onChanged();
        setMode('view');
      }
    } catch (e: any) {
      setError(e.message || 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!user?.id) return;
    setBusy(true);
    setError(null);
    try {
      await request(`/admin/users/${user.id}`, { method: 'DELETE' } as any);
      onChanged();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const title =
    mode === 'create' ? `New ${role === 'college' ? 'College' : role.charAt(0).toUpperCase() + role.slice(1)}`
    : (user?.name || 'User');
  const subtitle = mode === 'create' ? 'Fill in the details below' : (user?.email || '');

  const isEditing = mode === 'edit' || mode === 'create';

  const footer = (
    <>
      {mode === 'view' && (
        <>
          <ActionButton label="Delete" icon={Trash2} variant="danger"
            onPress={() => setConfirmDel(true)} testID="user-delete-btn"
          />
          <View style={{ flex: 1 }} />
          <ActionButton label="Edit" icon={Edit3} onPress={() => setMode('edit')} testID="user-edit-btn" />
        </>
      )}
      {(mode === 'edit' || mode === 'create') && (
        <>
          <ActionButton label="Cancel" variant="ghost"
            onPress={() => mode === 'create' ? onClose() : setMode('view')}
          />
          <View style={{ flex: 1 }} />
          <ActionButton label={busy ? 'Saving…' : (mode === 'create' ? 'Create' : 'Save')}
            icon={Save} onPress={submit} testID="user-save-btn"
          />
        </>
      )}
    </>
  );

  return (
    <SlidePanel open={open} onClose={onClose} title={title} subtitle={subtitle} footer={footer} width={480}>
      {/* Confirm delete inline overlay */}
      {confirmDel && (
        <View style={styles.confirmBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} color={T.bad} />
            <Text style={styles.confirmTitle}>Delete this user?</Text>
          </View>
          <Text style={styles.confirmBody}>
            This permanently removes their account, badges, and history. This cannot be undone.
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <ActionButton label="Cancel" variant="ghost" onPress={() => setConfirmDel(false)} />
            <ActionButton label={busy ? 'Deleting…' : 'Yes, delete'} variant="danger"
              icon={Trash2} onPress={remove} testID="user-confirm-delete-btn"
            />
          </View>
        </View>
      )}

      {tempPwd && (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Account created</Text>
          <Text style={styles.noticeBody}>
            Temporary password: <Text style={{ color: T.light, fontFamily: 'DMSans_700Bold' }}>{tempPwd}</Text>
          </Text>
        </View>
      )}

      {/* Header chips for view mode */}
      {mode !== 'create' && user && (
        <View style={styles.headerChips}>
          {user.email_verified && <StatusChip label="Verified" tone="good" />}
          {user.two_fa_enabled && <StatusChip label="2FA" tone="warn" />}
          <StatusChip label={user.role || role} tone="neutral" />
        </View>
      )}

      {/* Badges section */}
      {mode !== 'create' && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Badges</Text>
          {badges.length === 0 ? (
            <Text style={styles.empty}>No badges yet.</Text>
          ) : (
            <BadgeStack badges={badges} max={20} compact size="sm" />
          )}
        </View>
      )}

      {/* Field rows */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{mode === 'create' ? 'Profile' : 'Profile Information'}</Text>
        {fieldDefs.map((f) => (
          <View key={f.key} style={styles.field}>
            <Text style={styles.fieldLabel}>{f.label}</Text>
            {isEditing ? (
              <TextInput
                value={form[f.key] || ''}
                onChangeText={(v) => setField(f.key, v)}
                style={styles.input}
                placeholder={f.label}
                placeholderTextColor="rgba(255,255,255,0.30)"
                testID={`user-input-${f.key}`}
              />
            ) : (
              <Text style={styles.fieldValue}>
                {form[f.key] ? form[f.key] : <Text style={{ color: T.textFaint }}>—</Text>}
              </Text>
            )}
          </View>
        ))}
      </View>

      {/* Read-only meta in view mode */}
      {mode === 'view' && user && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Meta</Text>
          {user.id && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>User ID</Text>
              <Text style={[styles.fieldValue, { fontFamily: 'DMSans_500Medium', fontSize: 12 }]}>
                {user.id}
              </Text>
            </View>
          )}
          {user.created_at && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Joined</Text>
              <Text style={styles.fieldValue}>{new Date(user.created_at).toLocaleString()}</Text>
            </View>
          )}
          {user.linkedin_url && (
            <View style={{ marginTop: 10 }}>
              <ActionButton
                label="Open LinkedIn" icon={Linkedin} variant="ghost"
                onPress={() => Platform.OS === 'web' && (window as any).open(user.linkedin_url, '_blank')}
              />
            </View>
          )}
        </View>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </SlidePanel>
  );
}

const styles = StyleSheet.create({
  headerChips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 14 },
  section: {
    marginTop: 4, marginBottom: 14,
    borderTopColor: 'rgba(245,158,11,0.10)', borderTopWidth: 1, paddingTop: 14,
  },
  sectionLabel: {
    color: T.light, fontFamily: 'DMSans_700Bold',
    fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10,
  },
  field: { paddingVertical: 8 },
  fieldLabel: {
    color: T.textMute, fontFamily: 'DMSans_500Medium',
    fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 4,
  },
  fieldValue: { color: T.text, fontFamily: 'DMSans_500Medium', fontSize: 13, lineHeight: 18 },
  input: {
    paddingHorizontal: 12, paddingVertical: 9,
    backgroundColor: T.glass, borderColor: T.borderMd, borderWidth: 1, borderRadius: 9,
    color: T.text, fontFamily: 'DMSans_500Medium', fontSize: 13,
    ...({ outlineStyle: 'none' } as any),
  },
  empty: { color: T.textMute, fontFamily: 'DMSans_400Regular', fontSize: 12 },
  confirmBox: {
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderColor: 'rgba(239,68,68,0.40)', borderWidth: 1,
    padding: 14, borderRadius: 12, marginBottom: 14,
  },
  confirmTitle: { color: T.text, fontFamily: 'DMSans_700Bold', fontSize: 14 },
  confirmBody: { color: T.textDim, fontFamily: 'DMSans_400Regular', fontSize: 12, marginTop: 6, lineHeight: 18 },
  notice: {
    backgroundColor: 'rgba(16,185,129,0.10)',
    borderColor: 'rgba(16,185,129,0.40)', borderWidth: 1,
    padding: 12, borderRadius: 10, marginBottom: 14,
  },
  noticeTitle: { color: '#10B981', fontFamily: 'DMSans_700Bold', fontSize: 12 },
  noticeBody: { color: T.textDim, fontFamily: 'DMSans_500Medium', fontSize: 12, marginTop: 4 },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderColor: 'rgba(239,68,68,0.40)', borderWidth: 1,
    padding: 10, borderRadius: 9, marginTop: 14,
  },
  errorText: { color: '#FCA5A5', fontFamily: 'DMSans_500Medium', fontSize: 12 },
});
