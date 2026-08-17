// @ts-nocheck
/**
 * Super Admin → Contacts Management view.
 *
 * Full contacts management system with:
 *   - Contact list with search, filters, pagination
 *   - CSV import with preview and validation
 *   - Contact lists/groups for targeting
 *   - Individual contact management
 *   - Integration with newsletter for list-based sending
 */
import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform, ActivityIndicator,
  TextInput, Modal, ScrollView, Image, Alert,
} from 'react-native';
import {
  Users, Upload, Search, Plus, Trash2, X, Check, Mail, Phone,
  User, Tag, Filter, RefreshCw, Download, ChevronDown, ChevronUp,
  Edit3, Save, AlertCircle, CheckCircle, FileText, List,
} from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
import {
  GRAD, GradientButton, SecondaryButton, Card, IconBox, SectionLabel,
  StatusPill, Toast, useToast, KpiTile, SearchField,
} from '../applekit';
import { api } from '@/src/models/services/api';
import { useConfirm } from '@/src/views/components';

type Contact = {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  tags: string[];
  lists: string[];
  notes: string;
  subscribed: boolean;
  created_at: string;
  updated_at: string;
};

type ContactList = {
  _id?: string;
  id?: string;
  name: string;
  description: string;
  color: string;
  contact_count: number;
  created_at: string;
};

const PER_PAGE = 50;

const SOURCE_COLORS: Record<string, string> = {
  manual: '#10B981',
  csv: '#3B82F6',
  import: '#8B5CF6',
  echo: '#F59E0B',
  newsletter: '#EC4899',
  website: '#06B6D4',
};

export function ContactsView() {
  const { toast, flash, hide } = useToast();
  const { confirm } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showImport, setShowImport] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState<Contact | null>(null);
  const [lists, setLists] = useState<ContactList[]>([]);
  const [stats, setStats] = useState<any>(null);

  const apiBase = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || '';

  const authToken = async () => {
    const { tokenStore } = await import('@/src/models/services/api');
    const token = await tokenStore.getAccess();
    return token || '';
  };

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(PER_PAGE),
      });
      if (q) params.set('q', q);
      if (sourceFilter) params.set('source', sourceFilter);

      const token = await authToken();
      const res = await fetch(`${apiBase}/api/admin/contacts?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setContacts(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (e: any) {
      flash(e?.message || 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [page, q, sourceFilter, flash]);

  const loadLists = useCallback(async () => {
    try {
      const token = await authToken();
      const res = await fetch(`${apiBase}/api/admin/contact-lists`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setLists(data.items || []);
    } catch {}
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const token = await authToken();
      const res = await fetch(`${apiBase}/api/admin/contacts/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setStats(data);
    } catch {}
  }, []);

  useEffect(() => {
    loadContacts();
    loadLists();
    loadStats();
  }, [loadContacts, loadLists, loadStats]);

  const deleteContact = async (id: string) => {
    const ok = await confirm({
      title: 'Delete contact',
      message: 'This contact will be permanently removed.',
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      const token = await authToken();
      await fetch(`${apiBase}/api/admin/contacts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      flash('Contact deleted');
      loadContacts();
      loadStats();
    } catch (e: any) {
      flash(e?.message || 'Failed to delete');
    }
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    const ok = await confirm({
      title: `Delete ${selected.size} contacts?`,
      message: 'This action cannot be undone.',
      confirmText: 'Delete all',
      danger: true,
    });
    if (!ok) return;
    try {
      const token = await authToken();
      await fetch(`${apiBase}/api/admin/contacts/bulk`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      flash(`${selected.size} contacts deleted`);
      setSelected(new Set());
      loadContacts();
      loadStats();
    } catch (e: any) {
      flash(e?.message || 'Failed to delete');
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === contacts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(contacts.map(c => c._id || c.id || '')));
    }
  };

  const fmtDate = (iso?: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <View style={{ gap: 14 }}>
      <Toast text={toast.text} visible={toast.visible} kind={toast.kind} onDismiss={hide} />

      {/* Header + Stats */}
      <Card>
        <View style={st.headRow}>
          <IconBox size={38}><Users size={18} color={GRAD.to} /></IconBox>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.title}>Contacts</Text>
            <Text style={st.sub}>
              Manage your contact lists, import from CSV, and send targeted newsletters.
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <SecondaryButton onPress={() => setShowImport(true)}>
              <Upload size={12} color={SAC.muted} />
              <Text style={st.secText}>Import CSV</Text>
            </SecondaryButton>
            <GradientButton onPress={() => setShowAdd(true)} size="sm">
              <Plus size={14} color="#fff" />
              <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12 }}>Add Contact</Text>
            </GradientButton>
          </View>
        </View>
      </Card>

      {/* KPIs */}
      <View style={st.kpiRow}>
        <KpiTile Icon={Users} label="Total Contacts" value={String(stats?.total || 0)} />
        <KpiTile Icon={CheckCircle} label="Subscribed" value={String(stats?.subscribed || 0)} />
        <KpiTile Icon={AlertCircle} label="Unsubscribed" value={String(stats?.unsubscribed || 0)} />
        <KpiTile Icon={List} label="Lists" value={String(stats?.lists || 0)} />
      </View>

      {/* Search + Filters */}
      <Card>
        <View style={st.cardHead}>
          <SectionLabel>SEARCH & FILTER</SectionLabel>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <SearchField value={q} onChange={setQ} placeholder="Search name, email, phone…" width={280} />
            <Pressable onPress={() => { setPage(1); loadContacts(); }} style={st.searchGo}>
              <Text style={st.secText}>Apply</Text>
            </Pressable>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {['', 'manual', 'csv', 'echo', 'newsletter', 'website'].map(s => (
            <Pressable
              key={s}
              onPress={() => { setSourceFilter(s); setPage(1); }}
              style={[st.filterPill, sourceFilter === s && st.filterPillActive]}
            >
              <Text style={[st.filterPillText, sourceFilter === s && st.filterPillTextActive]}>
                {s || 'All'}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <Card style={{ backgroundColor: 'rgba(124,58,237,0.08)' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: '#C4B5FD' }}>
              {selected.size} selected
            </Text>
            <Pressable onPress={bulkDelete} style={st.bulkDeleteBtn}>
              <Trash2 size={12} color="#F87171" />
              <Text style={{ color: '#F87171', fontFamily: FONTS.bold, fontSize: 12 }}>Delete</Text>
            </Pressable>
          </View>
        </Card>
      )}

      {/* Contacts Table */}
      <Card style={{ overflow: 'hidden' }}>
        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={GRAD.from} />
          </View>
        ) : contacts.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center', gap: 10 }}>
            <IconBox size={46}><Users size={18} color={GRAD.to} /></IconBox>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: SAC.text }}>No contacts found</Text>
            <Text style={{ fontFamily: FONTS.med, fontSize: 12.5, color: SAC.muted, textAlign: 'center', maxWidth: 320 }}>
              Import contacts from CSV or add them manually.
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth: 900 }}>
              {/* Header */}
              <View style={st.tableHeader}>
                <Pressable onPress={selectAll} style={{ width: 36, alignItems: 'center' }}>
                  <View style={[st.checkbox, selected.size === contacts.length && st.checkboxChecked]}>
                    {selected.size === contacts.length && <Check size={12} color="#fff" />}
                  </View>
                </Pressable>
                <Text style={[st.headerCell, { width: 200 }]}>CONTACT</Text>
                <Text style={[st.headerCell, { width: 180 }]}>PHONE</Text>
                <Text style={[st.headerCell, { width: 100 }]}>SOURCE</Text>
                <Text style={[st.headerCell, { width: 150 }]}>LISTS</Text>
                <Text style={[st.headerCell, { width: 100 }]}>STATUS</Text>
                <Text style={[st.headerCell, { width: 120 }]}>ADDED</Text>
                <Text style={[st.headerCell, { width: 100, textAlign: 'center' }]}>ACTIONS</Text>
              </View>

              {/* Rows */}
              {contacts.map((c) => {
                const id = c._id || c.id || '';
                const isSelected = selected.has(id);
                return (
                  <View key={id} style={[st.tableRow, isSelected && st.tableRowSelected]}>
                    <Pressable onPress={() => toggleSelect(id)} style={{ width: 36, alignItems: 'center' }}>
                      <View style={[st.checkbox, isSelected && st.checkboxChecked]}>
                        {isSelected && <Check size={12} color="#fff" />}
                      </View>
                    </Pressable>
                    <View style={{ width: 200, minWidth: 0 }}>
                      <Text numberOfLines={1} style={st.cellBold}>{c.name || '—'}</Text>
                      <Text numberOfLines={1} style={st.cellDim}>{c.email}</Text>
                    </View>
                    <Text style={[st.cell, { width: 180 }]}>{c.phone || '—'}</Text>
                    <View style={{ width: 100 }}>
                      <View style={[st.sourceBadge, { backgroundColor: `${SOURCE_COLORS[c.source] || '#6B7280'}20`, borderColor: `${SOURCE_COLORS[c.source] || '#6B7280'}40` }]}>
                        <Text style={[st.sourceText, { color: SOURCE_COLORS[c.source] || '#9CA3AF' }]}>{c.source}</Text>
                      </View>
                    </View>
                    <View style={{ width: 150 }}>
                      {(c.lists || []).length > 0 ? (
                        <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                          {(c.lists || []).slice(0, 2).map((l, i) => (
                            <View key={i} style={st.listBadge}>
                              <Text style={st.listBadgeText}>{l}</Text>
                            </View>
                          ))}
                          {(c.lists || []).length > 2 && (
                            <Text style={st.moreText}>+{(c.lists || []).length - 2}</Text>
                          )}
                        </View>
                      ) : (
                        <Text style={st.cellDim}>—</Text>
                      )}
                    </View>
                    <View style={{ width: 100 }}>
                      <StatusPill
                        kind={c.subscribed ? 'success' : 'neutral'}
                        label={c.subscribed ? 'Active' : 'Inactive'}
                      />
                    </View>
                    <Text style={[st.cell, { width: 120 }]}>{fmtDate(c.created_at)}</Text>
                    <View style={{ width: 100, flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
                      <Pressable onPress={() => setShowEdit(c)} style={st.actionBtn}>
                        <Edit3 size={14} color="#818CF8" />
                      </Pressable>
                      <Pressable onPress={() => deleteContact(id)} style={[st.actionBtn, { borderColor: 'rgba(239,68,68,0.3)' }]}>
                        <Trash2 size={14} color="#F87171" />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* Pagination */}
        {total > PER_PAGE && (
          <View style={st.pagination}>
            <Text style={st.paginationText}>
              Showing {((page - 1) * PER_PAGE) + 1}–{Math.min(page * PER_PAGE, total)} of {total}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Pressable
                onPress={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                style={[st.pageBtn, page === 1 && st.pageBtnDisabled]}
              >
                <Text style={st.pageBtnText}>Prev</Text>
              </Pressable>
              <Pressable
                onPress={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                style={[st.pageBtn, page === totalPages && st.pageBtnDisabled]}
              >
                <Text style={st.pageBtnText}>Next</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Card>

      {/* Import Modal */}
      {showImport && (
        <ImportModal
          visible={showImport}
          onClose={() => setShowImport(false)}
          onImported={() => { loadContacts(); loadStats(); }}
        />
      )}

      {/* Add Modal */}
      {showAdd && (
        <AddEditModal
          visible={showAdd}
          lists={lists}
          onClose={() => setShowAdd(false)}
          onSave={() => { loadContacts(); loadStats(); }}
        />
      )}

      {/* Edit Modal */}
      {showEdit && (
        <AddEditModal
          visible={true}
          contact={showEdit}
          lists={lists}
          onClose={() => setShowEdit(null)}
          onSave={() => { loadContacts(); loadStats(); }}
        />
      )}
    </View>
  );
}

// ── Import Modal ──────────────────────────────────────────────────────────────

function ImportModal({ visible, onClose, onImported }: { visible: boolean; onClose: () => void; onImported: () => void }) {
  const { toast, flash, hide } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [tags, setTags] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileRef = useRef<any>(null);
  const apiBase = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || '';

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tags', tags);

      const { tokenStore } = await import('@/src/models/services/api');
      const token = await tokenStore.getAccess();

      const res = await fetch(`${apiBase}/api/admin/contacts/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Import failed');

      setResult(data);
      flash(`Imported ${data.imported} contacts`);
      onImported();
    } catch (e: any) {
      flash(e?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleFileChange = (e: any) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.modalOverlay}>
        <View style={st.modalBox}>
          <View style={st.modalHeader}>
            <Text style={st.modalTitle}>Import Contacts from CSV</Text>
            <Pressable onPress={onClose} style={st.modalCloseBtn}><X size={18} color={SAC.muted} /></Pressable>
          </View>

          <View style={{ padding: 20, gap: 16 }}>
            {!result ? (
              <>
                <View style={st.uploadArea}>
                  <Upload size={32} color={GRAD.from} />
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: SAC.text, marginTop: 8 }}>
                    Select CSV file
                  </Text>
                  <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted, marginTop: 4 }}>
                    Columns: name, email, phone (email required)
                  </Text>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    style={{ marginTop: 12 }}
                  />
                  {file && (
                    <Text style={{ fontFamily: FONTS.semi, fontSize: 12, color: GRAD.from, marginTop: 8 }}>
                      {file.name}
                    </Text>
                  )}
                </View>

                <View>
                  <Text style={st.fieldLabel}>Tags (optional)</Text>
                  <TextInput
                    style={st.input}
                    value={tags}
                    onChangeText={setTags}
                    placeholder="e.g., hackathon, workshop"
                    placeholderTextColor={SAC.dim}
                  />
                </View>
              </>
            ) : (
              <View style={{ gap: 12 }}>
                <View style={st.resultBox}>
                  <CheckCircle size={24} color="#10B981" />
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: SAC.text }}>
                    Import Complete
                  </Text>
                </View>
                <View style={st.resultStats}>
                  <Text style={st.resultStatLabel}>Imported</Text>
                  <Text style={st.resultStatValue}>{result.imported}</Text>
                </View>
                <View style={st.resultStats}>
                  <Text style={st.resultStatLabel}>Skipped</Text>
                  <Text style={st.resultStatValue}>{result.skipped}</Text>
                </View>
                {result.errors?.length > 0 && (
                  <View style={{ gap: 4 }}>
                    <Text style={st.fieldLabel}>Errors:</Text>
                    {result.errors.map((e: string, i: number) => (
                      <Text key={i} style={{ fontFamily: FONTS.med, fontSize: 11, color: '#F87171' }}>{e}</Text>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={st.modalFooter}>
            <SecondaryButton onPress={onClose}>
              <Text style={st.secText}>{result ? 'Close' : 'Cancel'}</Text>
            </SecondaryButton>
            {!result && (
              <GradientButton onPress={handleImport} disabled={!file || importing} size="sm">
                {importing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12 }}>Import</Text>
                )}
              </GradientButton>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Add/Edit Modal ────────────────────────────────────────────────────────────

function AddEditModal({ visible, contact, lists, onClose, onSave }: {
  visible: boolean;
  contact?: Contact;
  lists: ContactList[];
  onClose: () => void;
  onSave: () => void;
}) {
  const { toast, flash, hide } = useToast();
  const [form, setForm] = useState({
    name: contact?.name || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    notes: contact?.notes || '',
    lists: contact?.lists || [],
  });
  const [saving, setSaving] = useState(false);
  const apiBase = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || '';

  const handleSave = async () => {
    if (!form.email.trim()) {
      flash('Email is required');
      return;
    }
    setSaving(true);
    try {
      const { tokenStore } = await import('@/src/models/services/api');
      const token = await tokenStore.getAccess();

      const url = contact
        ? `${apiBase}/api/admin/contacts/${contact._id || contact.id}`
        : `${apiBase}/api/admin/contacts`;

      const res = await fetch(url, {
        method: contact ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to save');
      }

      flash(contact ? 'Contact updated' : 'Contact added');
      onSave();
      onClose();
    } catch (e: any) {
      flash(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.modalOverlay}>
        <View style={st.modalBox}>
          <View style={st.modalHeader}>
            <Text style={st.modalTitle}>{contact ? 'Edit Contact' : 'Add Contact'}</Text>
            <Pressable onPress={onClose} style={st.modalCloseBtn}><X size={18} color={SAC.muted} /></Pressable>
          </View>

          <ScrollView style={{ padding: 20, gap: 12 }}>
            <View>
              <Text style={st.fieldLabel}>Name</Text>
              <TextInput style={st.input} value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} placeholder="John Doe" placeholderTextColor={SAC.dim} />
            </View>
            <View>
              <Text style={st.fieldLabel}>Email *</Text>
              <TextInput style={st.input} value={form.email} onChangeText={v => setForm(f => ({ ...f, email: v }))} placeholder="john@example.com" placeholderTextColor={SAC.dim} keyboardType="email-address" autoCapitalize="none" />
            </View>
            <View>
              <Text style={st.fieldLabel}>Phone</Text>
              <TextInput style={st.input} value={form.phone} onChangeText={v => setForm(f => ({ ...f, phone: v }))} placeholder="+91 98765 43210" placeholderTextColor={SAC.dim} keyboardType="phone-pad" />
            </View>
            <View>
              <Text style={st.fieldLabel}>Lists</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {lists.map(l => {
                  const selected = form.lists.includes(l.name);
                  return (
                    <Pressable
                      key={l._id}
                      onPress={() => {
                        setForm(f => ({
                          ...f,
                          lists: selected
                            ? f.lists.filter(x => x !== l.name)
                            : [...f.lists, l.name],
                        }));
                      }}
                      style={[st.listChip, selected && st.listChipActive]}
                    >
                      <Text style={[st.listChipText, selected && st.listChipTextActive]}>{l.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View>
              <Text style={st.fieldLabel}>Notes</Text>
              <TextInput style={[st.input, { minHeight: 60 }]} value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} placeholder="Any notes…" placeholderTextColor={SAC.dim} multiline />
            </View>
          </ScrollView>

          <View style={st.modalFooter}>
            <SecondaryButton onPress={onClose}>
              <Text style={st.secText}>Cancel</Text>
            </SecondaryButton>
            <GradientButton onPress={handleSave} disabled={saving} size="sm">
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12 }}>{contact ? 'Update' : 'Add'}</Text>
              )}
            </GradientButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 16 },
  sub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4, lineHeight: 17, maxWidth: 720 },
  secText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 },
  kpiRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  searchGo: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: SAC.border, backgroundColor: 'rgba(255,255,255,0.04)',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
  filterPill: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: SAC.border, backgroundColor: 'rgba(255,255,255,0.04)',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
  filterPillActive: { borderColor: GRAD.from, backgroundColor: 'rgba(124,58,237,0.15)' },
  filterPillText: { fontFamily: FONTS.med, fontSize: 11, color: SAC.muted },
  filterPillTextActive: { color: '#C4B5FD' },
  bulkDeleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.1)',
  },
  tableHeader: {
    flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.04)', borderBottomWidth: 1, borderBottomColor: SAC.border,
  },
  headerCell: { fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 },
  tableRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  tableRowSelected: { backgroundColor: 'rgba(124,58,237,0.08)' },
  cell: { fontFamily: FONTS.med, fontSize: 12, color: '#e5e7eb' },
  cellBold: { fontFamily: FONTS.bold, fontSize: 12.5, color: '#fff' },
  cellDim: { fontFamily: FONTS.med, fontSize: 10.5, color: SAC.dim },
  checkbox: {
    width: 18, height: 18, borderRadius: 4, borderWidth: 1.5,
    borderColor: 'rgba(167,139,250,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: GRAD.from, borderColor: GRAD.from },
  sourceBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  sourceText: { fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.4 },
  listBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(124,58,237,0.15)' },
  listBadgeText: { fontFamily: FONTS.semi, fontSize: 9, color: '#C4B5FD' },
  moreText: { fontFamily: FONTS.semi, fontSize: 9, color: SAC.dim },
  actionBtn: {
    width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)',
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)',
  },
  pagination: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, paddingHorizontal: 14,
    borderTopWidth: 1, borderTopColor: SAC.border,
  },
  paginationText: { fontFamily: FONTS.med, fontSize: 11, color: SAC.dim },
  pageBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: SAC.border, backgroundColor: 'rgba(255,255,255,0.04)',
  },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { fontFamily: FONTS.bold, fontSize: 11, color: SAC.muted },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: {
    width: '100%', maxWidth: 520, backgroundColor: '#141A2D', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)', maxHeight: '85vh',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: SAC.border },
  modalTitle: { fontFamily: FONTS.bold, fontSize: 16, color: SAC.text },
  modalCloseBtn: { padding: 4 },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: SAC.border },
  uploadArea: {
    borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(167,139,250,0.3)',
    borderRadius: 12, padding: 24, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)',
  },
  fieldLabel: { fontFamily: FONTS.semi, fontSize: 11, color: SAC.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: SAC.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: SAC.text,
    fontFamily: FONTS.med, fontSize: 13,
  },
  resultBox: { alignItems: 'center', gap: 8, padding: 16 },
  resultStats: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  resultStatLabel: { fontFamily: FONTS.semi, fontSize: 12, color: SAC.muted },
  resultStatValue: { fontFamily: FONTS.bold, fontSize: 14, color: SAC.text },
  listChip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: SAC.border, backgroundColor: 'rgba(255,255,255,0.04)',
  },
  listChipActive: { borderColor: GRAD.from, backgroundColor: 'rgba(124,58,237,0.15)' },
  listChipText: { fontFamily: FONTS.med, fontSize: 12, color: SAC.muted },
  listChipTextActive: { color: '#C4B5FD' },
});
