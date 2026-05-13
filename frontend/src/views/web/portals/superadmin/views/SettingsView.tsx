/**
 * SettingsView — Super Admin Settings.
 *
 * Sections:
 *   • General toggles                      (existing)
 *   • Roles & Permissions  (NEW — list + Create / Edit / Delete with modal)
 *   • Marketplace          (NEW — install/uninstall integrations)
 *   • Integrations status                  (existing, simplified)
 *   • Security                             (existing)
 *   • Notifications                        (existing)
 *
 * Backend endpoints used:
 *   GET    /api/admin/roles
 *   POST   /api/admin/roles
 *   PATCH  /api/admin/roles/{id}
 *   DELETE /api/admin/roles/{id}
 *   GET    /api/admin/permissions
 *   GET    /api/marketplace/tools
 *   POST   /api/marketplace/install
 *   DELETE /api/marketplace/tools/{tool_id}
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, Switch, Platform, Modal,
  TextInput, ScrollView, ActivityIndicator,
} from 'react-native';
import {
  Settings as SettingsIcon, Shield, UserCog, Plug, Bell, Lock, Plus,
  Pencil, Trash2, Check, X, Store, Download,
} from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SAC, FONTS } from '../tokens';
import { Badge } from '../atoms';
import { request } from '@/src/models/services/api';

// ─── Types ────────────────────────────────────────────────────────
type Role = {
  id: string; key: string; name: string; description: string;
  is_system: boolean; permissions: string[]; user_count: number;
  created_at: string;
};
type Permission = { id: string; group: string; label: string };
type PermissionGroup = { group: string; items: Permission[] };
type Tool = {
  id: string; name: string; category: string; icon: string; tint: string;
  description: string; auth_type: string; popular?: boolean;
  installed: boolean; status?: string | null; installed_at?: string | null;
};

// ─── Static fallback for non-CRUD sections ───────────────────────
const STATIC = [
  { id: 'general', title: 'General', icon: SettingsIcon, items: [
    { k:'platform_name',  label:'Platform name',     val:'Student Alumni',         kind:'text' },
    { k:'support_email',  label:'Support email',     val:'support@studentalumni.app', kind:'text' },
    { k:'default_currency',label:'Default currency', val:'INR (₹)',                 kind:'text' },
    { k:'maintenance',    label:'Maintenance mode',  val: false,                    kind:'toggle' },
  ]},
  { id: 'security', title: 'Security', icon: Shield, items: [
    { k:'2fa',          label:'Require 2FA for super admins', val: true,  kind:'toggle' },
    { k:'session_ttl',  label:'Session timeout (minutes)',    val:'30',   kind:'text' },
    { k:'audit_log',    label:'Verbose audit log',             val: true,  kind:'toggle' },
    { k:'pwd_strength', label:'Strong password policy',        val: true,  kind:'toggle' },
  ]},
  { id: 'notifications', title: 'Notifications', icon: Bell, items: [
    { k:'daily_digest', label:'Daily digest email',                val: true,  kind:'toggle' },
    { k:'approval_pings',label:'Slack ping for new approvals',     val: true,  kind:'toggle' },
    { k:'risk_alerts',  label:'AI risk alerts (Claude)',           val: true,  kind:'toggle' },
  ]},
];

// ─── Toast (auto-save confirmation) ──────────────────────────────
function Toast({ text, visible }: { text: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <Animated.View entering={FadeIn.duration(180)} style={s.toast}>
      <Check size={12} color={SAC.green} />
      <Text style={s.toastText}>{text}</Text>
    </Animated.View>
  );
}

export function SettingsView() {
  const [, force] = useState(0);

  // Roles
  const [roles, setRoles] = useState<Role[]>([]);
  const [permGroups, setPermGroups] = useState<PermissionGroup[]>([]);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [creatingRole, setCreatingRole] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<Role | null>(null);

  // Marketplace
  const [toolGroups, setToolGroups] = useState<{ category: string; items: Tool[] }[]>([]);
  const [marketStats, setMarketStats] = useState({ installed: 0, available: 0 });
  const [toolFilter, setToolFilter] = useState('All');
  const [busyToolId, setBusyToolId] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState({ visible: false, text: 'Saved' });
  const flashToast = (text = 'Saved') => {
    setToast({ visible: true, text });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 1400);
  };

  const loadRoles = useCallback(async () => {
    try {
      const r = await request<{ roles: Role[] }>('/admin/roles');
      setRoles(r?.roles || []);
    } catch {}
  }, []);
  const loadPerms = useCallback(async () => {
    try {
      const r = await request<{ groups: PermissionGroup[] }>('/admin/permissions');
      setPermGroups(r?.groups || []);
    } catch {}
  }, []);
  const loadTools = useCallback(async () => {
    try {
      const r = await request<any>('/marketplace/tools');
      setToolGroups(r?.groups || []);
      setMarketStats({ installed: r?.installed_count || 0, available: r?.available_count || 0 });
    } catch {}
  }, []);

  useEffect(() => { loadRoles(); loadPerms(); loadTools(); }, [loadRoles, loadPerms, loadTools]);

  const installTool = async (toolId: string) => {
    setBusyToolId(toolId);
    try {
      await request('/marketplace/install', { method: 'POST', body: { tool_id: toolId } });
      flashToast(`Installed`);
      await loadTools();
    } catch (e: any) { flashToast(`Install failed`); }
    finally { setBusyToolId(null); }
  };
  const uninstallTool = async (toolId: string) => {
    setBusyToolId(toolId);
    try {
      await request(`/marketplace/tools/${toolId}`, { method: 'DELETE' });
      flashToast(`Disconnected`);
      await loadTools();
    } catch (e: any) { flashToast(`Disconnect failed`); }
    finally { setBusyToolId(null); }
  };

  const onToggle = (sectionIdx: number, itemIdx: number) => {
    const it: any = STATIC[sectionIdx].items[itemIdx];
    it.val = !it.val;
    force((x) => x + 1);
    flashToast('Saved');
  };

  const filteredToolGroups = toolFilter === 'All'
    ? toolGroups
    : toolGroups.filter((g) => g.category === toolFilter);
  const categories = ['All', ...toolGroups.map((g) => g.category)];

  return (
    <View style={{ gap: 14 }}>
      {/* ── Roles & Permissions (NEW) ──────────────── */}
      <View style={s.card}>
        <View style={s.cardHeadRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={s.cardIcon}><UserCog size={14} color={SAC.accent} /></View>
            <View>
              <Text style={s.cardTitle}>Roles & Permissions</Text>
              <Text style={s.cardSub}>{roles.length} roles • Fine-grained access control</Text>
            </View>
          </View>
          <Pressable onPress={() => setCreatingRole(true)} style={({ hovered }: any) => [s.primaryBtn, hovered && Platform.OS === 'web' ? { opacity: 0.9 } as any : null]}>
            <Plus size={14} color="#fff" />
            <Text style={s.primaryBtnText}>Create New Role</Text>
          </Pressable>
        </View>
        <View style={{ marginTop: 16, gap: 10 }}>
          {roles.length === 0 && (
            <View style={s.emptyBox}>
              <ActivityIndicator color={SAC.primary} size="small" />
              <Text style={s.emptyText}>Loading roles…</Text>
            </View>
          )}
          {roles.map((role) => (
            <Animated.View key={role.id} entering={FadeInDown.duration(160)} style={s.roleRow}>
              <View style={s.roleIcon}>
                <MaterialCommunityIcons
                  name={role.is_system ? 'shield-check' : 'shield-account-outline'}
                  size={18}
                  color={role.is_system ? SAC.accent : SAC.green}
                />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={s.roleName} numberOfLines={1}>{role.name}</Text>
                  {role.is_system && (
                    <View style={s.sysPill}><Text style={s.sysPillText}>SYSTEM</Text></View>
                  )}
                </View>
                <Text style={s.roleDesc} numberOfLines={1}>{role.description || '—'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 }}>
                  <Text style={s.roleStat}>{role.permissions.length} permissions</Text>
                  <Text style={s.roleStat}>•  {role.user_count} users</Text>
                </View>
              </View>
              {!role.is_system && (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Pressable onPress={() => setEditingRole(role)} style={s.iconBtn} accessibilityLabel="Edit role">
                    <Pencil size={13} color={SAC.muted} />
                  </Pressable>
                  <Pressable onPress={() => setDeleteCandidate(role)} style={[s.iconBtn, { borderColor: 'rgba(239,68,68,0.30)' }]} accessibilityLabel="Delete role">
                    <Trash2 size={13} color={SAC.red} />
                  </Pressable>
                </View>
              )}
            </Animated.View>
          ))}
        </View>
      </View>

      {/* ── Marketplace (NEW) ──────────────────────── */}
      <View style={s.card}>
        <View style={s.cardHeadRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={s.cardIcon}><Store size={14} color={SAC.accent} /></View>
            <View>
              <Text style={s.cardTitle}>Marketplace</Text>
              <Text style={s.cardSub}>{marketStats.installed} of {marketStats.available} tools connected</Text>
            </View>
          </View>
        </View>
        {/* Category filter pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          {categories.map((c) => {
            const active = c === toolFilter;
            return (
              <Pressable key={c} onPress={() => setToolFilter(c)} style={[s.catPill, active && s.catPillActive]}>
                <Text style={[s.catPillText, active && { color: '#fff' }]}>{c}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ marginTop: 14, gap: 14 }}>
          {filteredToolGroups.length === 0 && (
            <View style={s.emptyBox}><ActivityIndicator color={SAC.primary} size="small" /><Text style={s.emptyText}>Loading marketplace…</Text></View>
          )}
          {filteredToolGroups.map((g) => (
            <View key={g.category}>
              {toolFilter === 'All' && (
                <Text style={s.catLabel}>{g.category.toUpperCase()}</Text>
              )}
              <View style={s.toolGrid}>
                {g.items.map((t) => (
                  <ToolCard
                    key={t.id}
                    tool={t}
                    busy={busyToolId === t.id}
                    onInstall={() => installTool(t.id)}
                    onUninstall={() => uninstallTool(t.id)}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* ── Static existing sections ───────────────── */}
      {STATIC.map((sec, si) => {
        const Icon = sec.icon;
        return (
          <View key={sec.id} style={s.card}>
            <View style={s.cardHead}>
              <View style={s.cardIcon}><Icon size={14} color={SAC.accent} /></View>
              <Text style={s.cardTitle}>{sec.title}</Text>
            </View>
            <View style={{ marginTop: 12 }}>
              {sec.items.map((it: any, ii: number) => (
                <View key={it.k} style={s.row}>
                  <Text numberOfLines={1} style={s.label}>{it.label}</Text>
                  {it.kind === 'toggle' && (
                    <Switch
                      value={!!it.val}
                      onValueChange={() => onToggle(si, ii)}
                      trackColor={{ false: 'rgba(255,255,255,0.10)', true: SAC.primary }}
                      thumbColor={it.val ? '#fff' : '#ccc'}
                      {...(Platform.OS === 'web' ? ({ activeThumbColor: '#fff' } as any) : {})}
                    />
                  )}
                  {it.kind === 'text' && <Text style={s.valueText}>{it.val}</Text>}
                </View>
              ))}
            </View>
          </View>
        );
      })}

      {/* ── Modals ─────────────────────────────────── */}
      <RoleModal
        visible={creatingRole || !!editingRole}
        role={editingRole}
        permissionGroups={permGroups}
        onClose={() => { setCreatingRole(false); setEditingRole(null); }}
        onSaved={() => { flashToast(editingRole ? 'Role updated' : 'Role created'); setCreatingRole(false); setEditingRole(null); loadRoles(); }}
      />
      <ConfirmDeleteModal
        role={deleteCandidate}
        onClose={() => setDeleteCandidate(null)}
        onDeleted={() => { flashToast('Role deleted'); setDeleteCandidate(null); loadRoles(); }}
      />
      <Toast text={toast.text} visible={toast.visible} />
    </View>
  );
}

// ─── Tool card ────────────────────────────────────────────────────
function ToolCard({ tool, busy, onInstall, onUninstall }: {
  tool: Tool; busy: boolean; onInstall: () => void; onUninstall: () => void;
}) {
  return (
    <View style={s.toolCard}>
      <View style={[s.toolIcon, { backgroundColor: tool.tint + '22', borderColor: tool.tint + '44' }]}>
        <MaterialCommunityIcons name={tool.icon as any} size={20} color={tool.tint} />
      </View>
      <Text style={s.toolName} numberOfLines={1}>{tool.name}</Text>
      <Text style={s.toolDesc} numberOfLines={2}>{tool.description}</Text>
      <View style={{ flex: 1 }} />
      {tool.installed ? (
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
          <View style={s.connectedPill}>
            <View style={s.connectedDot} />
            <Text style={s.connectedPillText}>Connected</Text>
          </View>
          <Pressable onPress={onUninstall} disabled={busy} style={[s.toolBtnSec, busy && { opacity: 0.5 }]}>
            {busy ? <ActivityIndicator size="small" color={SAC.muted} /> : <Text style={s.toolBtnSecText}>Disconnect</Text>}
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={onInstall} disabled={busy} style={[s.toolBtn, busy && { opacity: 0.5 }]}>
          {busy ? <ActivityIndicator size="small" color="#fff" /> : (
            <>
              <Download size={12} color="#fff" />
              <Text style={s.toolBtnText}>Install</Text>
            </>
          )}
        </Pressable>
      )}
      {tool.popular && (
        <View style={s.popPill}>
          <Text style={s.popPillText}>POPULAR</Text>
        </View>
      )}
    </View>
  );
}

// ─── Role create/edit modal ─────────────────────────────────────
function RoleModal({ visible, role, permissionGroups, onClose, onSaved }: {
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
      setName(role?.name || '');
      setDescription(role?.description || '');
      setPermissions(new Set(role?.permissions || []));
      setError(null);
    }
  }, [visible, role]);

  const togglePerm = (id: string) => {
    setPermissions((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

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
          <View style={s.modalHead}>
            <Text style={s.modalTitle}>{isEdit ? 'Edit role' : 'Create new role'}</Text>
            <Pressable onPress={onClose} style={s.modalClose}><X size={16} color={SAC.muted} /></Pressable>
          </View>

          <ScrollView style={{ maxHeight: 560 }} contentContainerStyle={{ padding: 18, gap: 14 }}>
            <View>
              <Text style={s.fieldLabel}>Role name</Text>
              <TextInput
                value={name} onChangeText={setName}
                placeholder="e.g. Content Reviewer"
                placeholderTextColor={SAC.muted}
                style={s.input}
              />
            </View>
            <View>
              <Text style={s.fieldLabel}>Description</Text>
              <TextInput
                value={description} onChangeText={setDescription}
                placeholder="What can this role do? (optional)"
                placeholderTextColor={SAC.muted}
                style={[s.input, { minHeight: 64 }]}
                multiline
              />
            </View>

            <View>
              <Text style={s.fieldLabel}>Permissions ({permissions.size} selected)</Text>
              <View style={{ gap: 10, marginTop: 4 }}>
                {permissionGroups.map((g) => (
                  <View key={g.group} style={s.permGroup}>
                    <Text style={s.permGroupTitle}>{g.group.toUpperCase()}</Text>
                    <View style={{ gap: 4, marginTop: 6 }}>
                      {g.items.map((p) => {
                        const on = permissions.has(p.id);
                        return (
                          <Pressable key={p.id} onPress={() => togglePerm(p.id)} style={s.permRow}>
                            <View style={[s.checkbox, on && s.checkboxOn]}>
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
            <Pressable onPress={save} disabled={saving} style={[s.primaryBtn, saving && { opacity: 0.6 }]}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Check size={14} color="#fff" />
                  <Text style={s.primaryBtnText}>{isEdit ? 'Save changes' : 'Create role'}</Text>
                </>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Delete confirmation modal ──────────────────────────────────
function ConfirmDeleteModal({ role, onClose, onDeleted }: {
  role: Role | null; onClose: () => void; onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  if (!role) return null;
  const confirm = async () => {
    setBusy(true);
    try {
      await request(`/admin/roles/${role.id}`, { method: 'DELETE' });
      onDeleted();
    } finally { setBusy(false); }
  };
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <Animated.View entering={FadeInDown.duration(220)} style={[s.modalCard, { maxWidth: 440 }]}>
          <View style={s.modalHead}>
            <Text style={s.modalTitle}>Delete role?</Text>
            <Pressable onPress={onClose} style={s.modalClose}><X size={16} color={SAC.muted} /></Pressable>
          </View>
          <View style={{ padding: 18, gap: 12 }}>
            <Text style={{ color: SAC.text, fontFamily: FONTS.med, fontSize: 13.5, lineHeight: 19 }}>
              You're about to delete the role <Text style={{ color: SAC.accent, fontFamily: FONTS.xbold }}>{role.name}</Text>.
            </Text>
            <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, lineHeight: 17 }}>
              {role.user_count > 0
                ? `${role.user_count} user${role.user_count === 1 ? '' : 's'} currently have this role and will lose its permissions.`
                : 'No users currently have this role assigned.'}
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

// ─── Styles ────────────────────────────────────────────────────
const s = StyleSheet.create({
  card: { backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 14, padding: 18 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  cardIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: 'rgba(251,191,36,0.10)', borderColor: 'rgba(251,191,36,0.20)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 15 },
  cardSub:   { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: SAC.border, gap: 12 },
  label: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5, flex: 1, minWidth: 0 },
  valueText: { color: SAC.accentBright, fontFamily: FONTS.xbold, fontSize: 12 },

  emptyBox: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyText: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12 },

  // Role rows
  roleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: SAC.cardSolid, borderRadius: 10, borderWidth: 1, borderColor: SAC.border,
  },
  roleIcon: { width: 36, height: 36, borderRadius: 9, backgroundColor: 'rgba(251,191,36,0.10)', borderColor: 'rgba(251,191,36,0.20)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  roleName: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 13.5 },
  roleDesc: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 2 },
  roleStat: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 10.5 },
  sysPill: { backgroundColor: 'rgba(251,191,36,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  sysPillText: { color: SAC.accentBright, fontFamily: FONTS.xbold, fontSize: 8.5, letterSpacing: 0.8 },
  iconBtn: { width: 28, height: 28, borderRadius: 7, borderWidth: 1, borderColor: SAC.border, alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '150ms' } as any) : {}),
  },

  // Buttons
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9,
    backgroundColor: SAC.primary,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '150ms' } as any) : {}),
  },
  primaryBtnText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 },
  secondaryBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9,
    borderWidth: 1, borderColor: SAC.border, backgroundColor: 'transparent',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  secondaryBtnText: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 },
  destructiveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9,
    backgroundColor: SAC.red,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },

  // Marketplace
  catPill: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    backgroundColor: SAC.cardSolid, borderWidth: 1, borderColor: SAC.border,
    marginRight: 6,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  catPillActive: { backgroundColor: SAC.primary, borderColor: SAC.primary },
  catPillText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11 },
  catLabel: { color: SAC.dim, fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 1.4, marginBottom: 8 },
  toolGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  toolCard: {
    width: 220, minHeight: 170, padding: 12, borderRadius: 12,
    backgroundColor: SAC.cardSolid, borderWidth: 1, borderColor: SAC.border,
    position: 'relative',
    ...(Platform.OS === 'web' ? ({ transitionDuration: '150ms' } as any) : {}),
  },
  toolIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: 8 },
  toolName: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 13 },
  toolDesc: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 4, lineHeight: 15, minHeight: 30 },
  toolBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    marginTop: 10, paddingVertical: 7, borderRadius: 7, backgroundColor: SAC.primary,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  toolBtnText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 11.5 },
  toolBtnSec: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 7, borderRadius: 7, borderWidth: 1, borderColor: SAC.border,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  toolBtnSecText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11 },
  connectedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 6, borderRadius: 7,
    backgroundColor: 'rgba(16,185,129,0.12)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.30)',
  },
  connectedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: SAC.green },
  connectedPillText: { color: SAC.green, fontFamily: FONTS.xbold, fontSize: 10 },
  popPill: {
    position: 'absolute', top: 8, right: 8,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
    backgroundColor: 'rgba(251,191,36,0.20)',
  },
  popPillText: { color: SAC.accentBright, fontFamily: FONTS.xbold, fontSize: 8.5, letterSpacing: 0.6 },

  // Modal
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(6px)' } as any) : {}),
  },
  modalCard: {
    width: '100%', maxWidth: 640, maxHeight: '90%',
    backgroundColor: SAC.bg2, borderRadius: 16, borderWidth: 1, borderColor: SAC.border2,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 24px 60px rgba(0,0,0,0.6)' } as any) : {}),
  },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: SAC.border },
  modalTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 15 },
  modalClose: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  modalFooter: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: 8,
    padding: 14, borderTopWidth: 1, borderTopColor: SAC.border,
    backgroundColor: SAC.card,
    borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
  },
  fieldLabel: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 12, marginBottom: 6 },
  input: {
    color: SAC.text, fontFamily: FONTS.med, fontSize: 13,
    backgroundColor: SAC.cardSolid, borderRadius: 9, borderWidth: 1, borderColor: SAC.border,
    paddingHorizontal: 12, paddingVertical: 10,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  permGroup: { backgroundColor: SAC.cardSolid, borderRadius: 10, borderWidth: 1, borderColor: SAC.border, padding: 10 },
  permGroupTitle: { color: SAC.dim, fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 1.4 },
  permRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  checkbox: { width: 17, height: 17, borderRadius: 5, borderWidth: 1.4, borderColor: SAC.border2, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: SAC.primary, borderColor: SAC.primary },
  permLabel: { color: SAC.text, fontFamily: FONTS.med, fontSize: 12.5, flex: 1 },
  permId: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 10,
    ...(Platform.OS === 'web' ? ({ fontFamily: '"JetBrains Mono", "SF Mono", monospace' } as any) : {}),
  },
  errorText: { color: SAC.red, fontFamily: FONTS.bold, fontSize: 12 },

  // Toast
  toast: {
    position: 'absolute', bottom: 24, left: 0, right: 0,
    alignSelf: 'center', alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: 'rgba(16,185,129,0.15)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.30)',
    maxWidth: 200, alignContent: 'center',
  },
  toastText: { color: SAC.green, fontFamily: FONTS.xbold, fontSize: 11.5 },
});
