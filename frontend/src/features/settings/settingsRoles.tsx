// TAB 4 — Roles & Permissions (system + custom role CRUD, role drill-in panel) — split verbatim from SettingsView.tsx (audit Step 6c).
// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, Modal, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { Shield, Plus, Pencil, Trash2, Check, X, UsersIcon, ArrowLeft, Clock } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SAC, FONTS } from '@/src/views/web/portals/superadmin/tokens';
import { request } from '@/src/models/services/api';
import { GRAD_TO, GRAD_BG, Role, Permission, PermissionGroup } from './settingsTokens';
import { s } from './settingsStyles';
import { GradientButton, Loading } from './settingsWidgets';

/* ═════════════════════════════════════════════════════════════════
 * TAB 4 — Roles & Permissions
 * ═══════════════════════════════════════════════════════════════ */
export function RolesTab({ onSaved }: { onSaved: (s?: string) => void }) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [perms, setPerms] = useState<PermissionGroup[]>([]);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [del, setDel] = useState<Role | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [r, p] = await Promise.all([
        request<{ roles: Role[] }>('/admin/roles'),
        request<{ groups: PermissionGroup[] }>('/admin/permissions'),
      ]);
      setRoles(r?.roles || []); setPerms(p?.groups || []);
    } catch {}
  }, []);
  useEffect(() => { load(); }, [load]);

  // Map role keys → initials + tint
  const tintFor = (key: string) => {
    const palette: Record<string, string> = {
      super_admin:  '#FB923C', // orange
      platform_admin: '#3B82F6', // blue
      college_admin:'#10B981', // green
      support:      '#60A5FA', // purple
      mentor:       '#06B6D4', // cyan
    };
    return palette[key] || '#94A3B8';
  };
  const initials = (name: string) => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  // Drill-in mode
  if (selectedId) {
    return (
      <RoleDetailPanel
        roleId={selectedId}
        tintFor={tintFor}
        initials={initials}
        onBack={() => setSelectedId(null)}
        onEdit={(r) => { setSelectedId(null); setEditing(r); }}
        onSaved={onSaved}
      />
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(180)} style={{ gap: 14 }}>
      <View style={s.card}>
        <View style={s.cardHeadRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={s.iconBox}><Shield size={14} color={GRAD_TO} /></View>
            <View>
              <Text style={s.cardTitle}>Roles & Permissions</Text>
              <Text style={s.cardSub}>{roles.length} roles · Fine-grained access control</Text>
            </View>
          </View>
          <GradientButton onPress={() => setCreating(true)}>
            <Plus size={14} color="#fff" />
            <Text style={s.primaryBtnText}>Create New Role</Text>
          </GradientButton>
        </View>

        <View style={s.roleGrid}>
          {roles.map((r) => (
            <Animated.View key={r.id} entering={FadeInUp.duration(180)} style={s.roleCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[s.roleBadge, { backgroundColor: tintFor(r.key) + '22', borderColor: tintFor(r.key) + '66' }]}>
                  <Text style={[s.roleBadgeText, { color: tintFor(r.key) }]}>{initials(r.name)}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.roleName} numberOfLines={1}>{r.name}</Text>
                  <Text style={s.muted}>{r.user_count} user{r.user_count === 1 ? '' : 's'}</Text>
                </View>
                {r.is_system && (
                  <View style={s.sysPill}><Text style={s.sysPillText}>SYSTEM</Text></View>
                )}
              </View>
              <View style={{ gap: 6, marginTop: 12, marginBottom: 12 }}>
                {(r.permissions || []).slice(0, 4).map((p) => (
                  <View key={p} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Check size={11} color={GRAD_TO} />
                    <Text style={s.permLine}>{p.replace(/\./g, ' · ').replace(/_/g, ' ')}</Text>
                  </View>
                ))}
                {(r.permissions || []).length > 4 && (
                  <Text style={[s.muted, { fontSize: 10.5 }]}>+ {r.permissions.length - 4} more</Text>
                )}
              </View>
              <View style={{ flex: 1 }} />
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Pressable onPress={() => setSelectedId(r.id)} style={s.editBtnFull}>
                  <Text style={s.editBtnText}>View</Text>
                </Pressable>
                <Pressable onPress={() => setEditing(r)} style={s.editBtnFull}>
                  <Text style={s.editBtnText}>Edit</Text>
                </Pressable>
                {!r.is_system && (
                  <Pressable onPress={() => setDel(r)} style={s.iconDangerBtn}>
                    <Trash2 size={13} color={SAC.red} />
                  </Pressable>
                )}
              </View>
            </Animated.View>
          ))}
        </View>
      </View>

      <RoleModal
        visible={creating || !!editing}
        role={editing}
        permissionGroups={perms}
        onClose={() => { setCreating(false); setEditing(null); }}
        onSaved={() => { onSaved(editing ? 'Role updated' : 'Role created'); setCreating(false); setEditing(null); load(); }}
      />
      <DeleteRoleModal role={del} onClose={() => setDel(null)} onDeleted={() => { onSaved('Role deleted'); setDel(null); load(); }} />
    </Animated.View>
  );
}

export function RoleModal({ visible, role, permissionGroups, onClose, onSaved }: {
  visible: boolean; role: Role | null; permissionGroups: PermissionGroup[];
  onClose: () => void; onSaved: () => void;
}) {
  // moved below RoleDetailPanel
  return <RoleModalImpl visible={visible} role={role} permissionGroups={permissionGroups} onClose={onClose} onSaved={onSaved} />;
}

/* ─── Role detail drill-in panel ────────────────────────────────────
 * Replaces the role grid in-place when a card's "View" is tapped.
 * Shows: full description, three stat tiles (Users / Permissions /
 * Type), grouped permission matrix with granted/missing checks, and
 * the list of users currently assigned to this role. */
export function RoleDetailPanel({ roleId, tintFor, initials, onBack, onEdit, onSaved }: {
  roleId: string;
  tintFor: (k: string) => string;
  initials: (n: string) => string;
  onBack: () => void;
  onEdit: (r: any) => void;
  onSaved: (s?: string) => void;
}) {
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setBusy(true); setErr('');
    try {
      const r = await request<any>(`/admin/roles/${roleId}`);
      setData(r);
    } catch (e: any) {
      setErr(e?.message || 'Could not load role');
    } finally {
      setBusy(false);
    }
  }, [roleId]);
  useEffect(() => { load(); }, [load]);

  if (busy) return <Loading />;
  if (err)  return <Text style={s.errorText}>{err}</Text>;
  if (!data) return null;

  const tint = tintFor(data.key);
  const totalPerms = (data.permission_groups || []).reduce(
    (n: number, g: any) => n + (g.permissions || []).length,
    0,
  );

  return (
    <Animated.View entering={FadeIn.duration(180)} style={{ gap: 14 }}>
      {/* Header */}
      <View style={s.roleDetailHead}>
        <Pressable onPress={onBack} style={s.roleDetailBack}>
          <ArrowLeft size={13} color={SAC.text} />
          <Text style={s.roleDetailBackText}>Back</Text>
        </Pressable>
        <View style={[s.roleBadge, { backgroundColor: tint + '22', borderColor: tint + '66' }]}>
          <Text style={[s.roleBadgeText, { color: tint }]}>{initials(data.name)}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.roleDetailTitle}>{data.name}</Text>
          <Text style={s.roleDetailSub}>{data.description || 'No description provided.'}</Text>
        </View>
        {!data.is_system && (
          <GradientButton onPress={() => onEdit(data)}>
            <Pencil size={13} color="#fff" />
            <Text style={s.primaryBtnText}>Edit role</Text>
          </GradientButton>
        )}
      </View>

      {/* Stat tiles */}
      <View style={s.roleStatRow}>
        <View style={s.roleStat}>
          <Text style={s.roleStatLabel}>USERS WITH THIS ROLE</Text>
          <Text style={s.roleStatValue}>{data.user_count || 0}</Text>
        </View>
        <View style={s.roleStat}>
          <Text style={s.roleStatLabel}>PERMISSIONS GRANTED</Text>
          <Text style={s.roleStatValue}>{(data.permissions || []).length} / {totalPerms}</Text>
        </View>
        <View style={s.roleStat}>
          <Text style={s.roleStatLabel}>TYPE</Text>
          <Text style={s.roleStatValue}>{data.is_system ? 'System' : 'Custom'}</Text>
        </View>
      </View>

      {/* Permission groups */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Permission matrix</Text>
        <Text style={s.cardSub}>Grouped view of every permission this role can access.</Text>
        <View style={{ gap: 12, marginTop: 14 }}>
          {(data.permission_groups || []).map((g: any) => (
            <View key={g.key} style={s.permGroup}>
              <Text style={s.permGroupTitle}>{g.label}</Text>
              <View style={{ gap: 4, marginTop: 8 }}>
                {(g.permissions || []).map((p: any) => (
                  <View key={p.key} style={s.permRow}>
                    <View style={[s.checkbox, p.granted && { backgroundColor: tint, borderColor: tint }]}>
                      {p.granted && <Check size={11} color="#fff" />}
                    </View>
                    <Text style={[s.permLabel, !p.granted && { color: SAC.muted }]}>{p.label}</Text>
                    <Text style={s.permId}>{p.key}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Users with this role */}
      <View style={s.card}>
        <View style={s.cardHeadRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={s.iconBox}><UsersIcon size={14} color={GRAD_TO} /></View>
            <View>
              <Text style={s.cardTitle}>Users with this role</Text>
              <Text style={s.cardSub}>{data.user_count || 0} user{data.user_count === 1 ? '' : 's'} assigned</Text>
            </View>
          </View>
        </View>
        {(!data.users || data.users.length === 0) ? (
          <Text style={[s.muted, { marginTop: 12 }]}>No users currently assigned to this role.</Text>
        ) : (
          <View style={{ gap: 8, marginTop: 12 }}>
            {data.users.map((u: any) => (
              <View key={u.id} style={s.roleUserRow}>
                <View style={s.roleUserAv}>
                  <Text style={{ color: '#FB923C', fontFamily: FONTS.xbold, fontSize: 11 }}>
                    {(u.name || u.email || '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.roleUserName} numberOfLines={1}>{u.name}</Text>
                  <Text style={s.roleUserMeta} numberOfLines={1}>{u.email}</Text>
                </View>
                {u.last_login && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Clock size={11} color={SAC.dim} />
                    <Text style={s.roleUserMeta}>{new Date(u.last_login).toLocaleDateString()}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

function RoleModalLegacy_unused_marker() { return null; }
export function RoleModalImpl({ visible, role, permissionGroups, onClose, onSaved }: {
  visible: boolean; role: Role | null; permissionGroups: PermissionGroup[];
  onClose: () => void; onSaved: () => void;
}) {
  const isEdit = !!role;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(role?.name || ''); setDescription(role?.description || '');
      setPermissions(new Set(role?.permissions || [])); setError(null);
    }
  }, [visible, role]);

  const togglePerm = (id: string) => setPermissions((prev) => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const save = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError(null);
    try {
      const body = { name: name.trim(), description: description.trim(), permissions: Array.from(permissions) };
      if (isEdit && role) {
        await request(`/admin/roles/${role.id}`, { method: 'PATCH', body });
      } else {
        await request('/admin/roles', { method: 'POST', body });
      }
      onSaved();
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <Animated.View entering={FadeInDown.duration(220)} style={s.modalCard}>
          <LinearGradient colors={GRAD_BG} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.modalHero}>
            <View style={[s.toolIcon, { width: 40, height: 40, backgroundColor: 'rgba(251,146,60,0.20)', borderColor: 'rgba(251,146,60,0.40)' }]}>
              <Shield size={20} color={GRAD_TO} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.modalTitle}>{isEdit ? 'Edit role' : 'Create new role'}</Text>
              <Text style={s.modalSub}>{isEdit ? 'Adjust permissions and metadata.' : 'Define a custom permission set for your team.'}</Text>
            </View>
            <Pressable onPress={onClose} style={s.modalClose}><X size={16} color={SAC.muted} /></Pressable>
          </LinearGradient>

          <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ padding: 20, gap: 14 }}>
            <View style={{ gap: 6 }}>
              <Text style={s.modalLabel}>Role name</Text>
              <TextInput
                value={name} onChangeText={setName}
                placeholder="e.g. Content Reviewer" placeholderTextColor={SAC.dim}
                style={s.input}
              />
            </View>
            <View style={{ gap: 6 }}>
              <Text style={s.modalLabel}>Description</Text>
              <TextInput
                value={description} onChangeText={setDescription}
                placeholder="What can this role do? (optional)" placeholderTextColor={SAC.dim}
                style={[s.input, { minHeight: 64 }]} multiline
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={s.modalLabel}>Permissions ({permissions.size} selected)</Text>
              <View style={{ gap: 10, marginTop: 4 }}>
                {permissionGroups.map((g) => (
                  <View key={g.group} style={s.permGroup}>
                    <Text style={s.permGroupTitle}>{g.group.toUpperCase()}</Text>
                    <View style={{ gap: 4, marginTop: 6 }}>
                      {g.items.map((p) => {
                        const on = permissions.has(p.id);
                        return (
                          <Pressable key={p.id} onPress={() => togglePerm(p.id)} style={s.permRow}>
                            <View style={[s.checkbox, on && { backgroundColor: GRAD_TO, borderColor: GRAD_TO }]}>
                              {on && <Check size={11} color="#fff" />}
                            </View>
                            <Text style={s.permLabel}>{p.label}</Text>
                            <Text style={s.permId}>{p.id}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {error && <Text style={s.errorText}>{error}</Text>}
          </ScrollView>

          <View style={s.modalFooter}>
            <Pressable onPress={onClose} style={s.secondaryBtn}>
              <Text style={s.secondaryBtnText}>Cancel</Text>
            </Pressable>
            <GradientButton onPress={save} loading={saving}>
              <Check size={14} color="#fff" />
              <Text style={s.primaryBtnText}>{isEdit ? 'Save changes' : 'Create role'}</Text>
            </GradientButton>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export function DeleteRoleModal({ role, onClose, onDeleted }: {
  role: Role | null; onClose: () => void; onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  if (!role) return null;
  const confirm = async () => {
    setBusy(true);
    try { await request(`/admin/roles/${role.id}`, { method: 'DELETE' }); onDeleted(); } finally { setBusy(false); }
  };
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <Animated.View entering={FadeInDown.duration(220)} style={[s.modalCard, { maxWidth: 440 }]}>
          <View style={s.modalHead}>
            <Text style={s.modalTitle}>Delete role?</Text>
            <Pressable onPress={onClose} style={s.modalClose}><X size={16} color={SAC.muted} /></Pressable>
          </View>
          <View style={{ padding: 20, gap: 10 }}>
            <Text style={s.modalLabel}>
              You're about to delete <Text style={{ color: SAC.text, fontFamily: FONTS.xbold }}>{role.name}</Text>.
            </Text>
            <Text style={s.muted}>
              {role.user_count > 0
                ? `${role.user_count} user${role.user_count === 1 ? '' : 's'} will lose its permissions.`
                : 'No users are assigned to this role.'}
            </Text>
          </View>
          <View style={s.modalFooter}>
            <Pressable onPress={onClose} style={s.secondaryBtn}>
              <Text style={s.secondaryBtnText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={confirm} disabled={busy} style={[s.destructiveBtn, busy && { opacity: 0.5 }]}>
              {busy ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Trash2 size={13} color="#fff" />
                  <Text style={s.primaryBtnText}>Delete role</Text>
                </>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
