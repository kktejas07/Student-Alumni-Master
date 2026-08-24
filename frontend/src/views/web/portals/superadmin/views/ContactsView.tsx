// @ts-nocheck
/**
 * Super Admin → Contacts Management view.
 *
 * Complete contacts management system with:
 *   - Contact list with search, filters, pagination
 *   - CSV/XLSX import with preview and validation
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
  Edit3, Save, AlertCircle, CheckCircle, FileText, List, XCircle,
  Building2, MapPin, Globe, Briefcase, GraduationCap, ExternalLink,
  MoreVertical, Eye,
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
  first_name?: string;
  last_name?: string;
  location?: string;
  zip_code?: string;
  headline?: string;
  current_title?: string;
  current_company?: string;
  position_start_date?: string;
  education_degree?: string;
  education_institution?: string;
  profile_url?: string;
  is_registered_user?: boolean;
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

const PER_PAGE = 25;

const SOURCE_COLORS: Record<string, string> = {
  registered: '#10B981',
  manual: '#10B981',
  csv: '#3B82F6',
  import: '#8B5CF6',
  echo: '#F59E0B',
  newsletter: '#EC4899',
  website: '#06B6D4',
};

const SOURCE_ICONS: Record<string, any> = {
  registered: User,
  manual: Edit3,
  csv: FileText,
  import: Upload,
  echo: Globe,
  newsletter: Mail,
  website: Globe,
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
  const [showDetail, setShowDetail] = useState<Contact | null>(null);
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
        include_registered: 'true',
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

      {/* Header */}
      <Card>
        <View style={st.headRow}>
          <IconBox size={38}><Users size={18} color={GRAD.to} /></IconBox>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.title}>Contacts</Text>
            <Text style={st.sub}>Manage contacts, import from CSV/XLSX, and send targeted newsletters.</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <SecondaryButton onPress={() => setShowImport(true)}>
              <Upload size={12} color={SAC.muted} />
              <Text style={st.secText}>Import</Text>
            </SecondaryButton>
            <GradientButton onPress={() => setShowAdd(true)} size="sm">
              <Plus size={14} color="#fff" />
              <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12 }}>Add</Text>
            </GradientButton>
          </View>
        </View>
      </Card>

      {/* Stats */}
      <View style={st.kpiRow}>
        <KpiTile Icon={Users} label="Total" value={String(stats?.total || 0)} />
        <KpiTile Icon={User} label="Registered" value={String(stats?.registered_count || 0)} />
        <KpiTile Icon={FileText} label="Imported" value={String(stats?.imported_count || 0)} />
        <KpiTile Icon={List} label="Lists" value={String(stats?.lists || 0)} />
      </View>

      {/* Search & Filters */}
      <Card>
        <View style={st.cardHead}>
          <SectionLabel>SEARCH</SectionLabel>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <SearchField value={q} onChange={setQ} placeholder="Search name, email, company…" width={260} />
            <Pressable onPress={() => { setPage(1); loadContacts(); }} style={st.searchGo}>
              <Text style={st.secText}>Apply</Text>
            </Pressable>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {['', 'registered', 'csv', 'manual', 'echo', 'newsletter', 'website'].map(s => (
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
        <View style={st.bulkBar}>
          <Text style={st.bulkText}>{selected.size} selected</Text>
          <Pressable onPress={bulkDelete} style={st.bulkDeleteBtn}>
            <Trash2 size={14} color="#F87171" />
            <Text style={{ color: '#F87171', fontFamily: FONTS.bold, fontSize: 12 }}>Delete</Text>
          </Pressable>
        </View>
      )}

      {/* Table */}
      <Card style={{ overflow: 'hidden', padding: 0 }}>
        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={GRAD.from} />
          </View>
        ) : contacts.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center', gap: 10 }}>
            <IconBox size={46}><Users size={18} color={GRAD.to} /></IconBox>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: SAC.text }}>No contacts found</Text>
            <Text style={{ fontFamily: FONTS.med, fontSize: 12.5, color: SAC.muted }}>
              Import contacts from CSV/XLSX or add manually.
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
            <View style={{ minWidth: 1000, flex: 1 }}>
              {/* Header */}
              <View style={st.tableHeader}>
                <Pressable onPress={selectAll} style={{ width: 36, alignItems: 'center' }}>
                  <View style={[st.checkbox, selected.size === contacts.length && st.checkboxChecked]}>
                    {selected.size === contacts.length && <Check size={12} color="#fff" />}
                  </View>
                </Pressable>
                <Text style={[st.headerCell, { flex: 1.5, minWidth: 240 }]}>CONTACT</Text>
                <Text style={[st.headerCell, { flex: 1, minWidth: 160 }]}>COMPANY</Text>
                <Text style={[st.headerCell, { flex: 1, minWidth: 120 }]}>LOCATION</Text>
                <Text style={[st.headerCell, { width: 90 }]}>SOURCE</Text>
                <Text style={[st.headerCell, { width: 80 }]}>STATUS</Text>
                <Text style={[st.headerCell, { width: 100, textAlign: 'center' }]}>ACTIONS</Text>
              </View>

              {/* Rows */}
              {contacts.map((c) => {
                const id = c._id || c.id || '';
                const isSelected = selected.has(id);
                const SourceIcon = SOURCE_ICONS[c.source] || User;
                return (
                  <View key={id} style={[st.tableRow, isSelected && st.tableRowSelected]}>
                    <Pressable onPress={() => toggleSelect(id)} style={{ width: 36, alignItems: 'center' }}>
                      <View style={[st.checkbox, isSelected && st.checkboxChecked]}>
                        {isSelected && <Check size={12} color="#fff" />}
                      </View>
                    </Pressable>
                    
                    {/* Contact */}
                    <Pressable onPress={() => setShowDetail(c)} style={{ flex: 1.5, minWidth: 240, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={[st.avatar, { backgroundColor: `${SOURCE_COLORS[c.source] || '#6B7280'}20` }]}>
                        <SourceIcon size={16} color={SOURCE_COLORS[c.source] || '#9CA3AF'} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={st.cellBold}>{c.name || '—'}</Text>
                        <Text numberOfLines={1} style={st.cellDim}>{c.email}</Text>
                        {c.current_title && (
                          <Text numberOfLines={1} style={[st.cellDim, { fontSize: 10 }]}>{c.current_title}</Text>
                        )}
                      </View>
                    </Pressable>
                    
                    {/* Company */}
                    <View style={{ flex: 1, minWidth: 160 }}>
                      {c.current_company ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Building2 size={12} color={SAC.dim} />
                          <Text numberOfLines={1} style={st.cell}>{c.current_company}</Text>
                        </View>
                      ) : (
                        <Text style={st.cellDim}>—</Text>
                      )}
                    </View>
                    
                    {/* Location */}
                    <View style={{ flex: 1, minWidth: 120 }}>
                      {c.location ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <MapPin size={12} color={SAC.dim} />
                          <Text numberOfLines={1} style={st.cell}>{c.location}</Text>
                        </View>
                      ) : (
                        <Text style={st.cellDim}>—</Text>
                      )}
                    </View>
                    
                    {/* Source */}
                    <View style={{ width: 90 }}>
                      <View style={[st.sourceBadge, { backgroundColor: `${SOURCE_COLORS[c.source] || '#6B7280'}15`, borderColor: `${SOURCE_COLORS[c.source] || '#6B7280'}30` }]}>
                        <Text style={[st.sourceText, { color: SOURCE_COLORS[c.source] || '#9CA3AF' }]}>{c.source}</Text>
                      </View>
                    </View>
                    
                    {/* Status */}
                    <View style={{ width: 80 }}>
                      <StatusPill
                        kind={c.subscribed ? 'success' : 'neutral'}
                        label={c.subscribed ? 'Active' : 'Off'}
                      />
                    </View>
                    
                    {/* Actions */}
                    <View style={{ width: 100, flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
                      <Pressable onPress={() => setShowDetail(c)} style={st.actionBtn}>
                        <Eye size={14} color="#818CF8" />
                      </Pressable>
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

      {/* Modals */}
      {showImport && (
        <ImportModal visible={showImport} onClose={() => setShowImport(false)} onImported={() => { loadContacts(); loadStats(); }} />
      )}
      {showAdd && (
        <AddEditModal visible={showAdd} lists={lists} onClose={() => setShowAdd(false)} onSave={() => { loadContacts(); loadStats(); }} />
      )}
      {showEdit && (
        <AddEditModal visible={true} contact={showEdit} lists={lists} onClose={() => setShowEdit(null)} onSave={() => { loadContacts(); loadStats(); }} />
      )}
      {showDetail && (
        <ContactDetailModal contact={showDetail} onClose={() => setShowDetail(null)} onEdit={(c) => { setShowDetail(null); setShowEdit(c); }} />
      )}
    </View>
  );
}

// ── Contact Detail Modal ─────────────────────────────────────────────────────

function ContactDetailModal({ contact, onClose, onEdit }: { contact: Contact; onClose: () => void; onEdit: (c: Contact) => void }) {
  const fmtDate = (iso?: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.modalOverlay}>
        <Pressable style={st.modalBackdrop} onPress={onClose} />
        <View style={st.detailModal}>
          {/* Header */}
          <View style={st.importHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[st.avatarLarge, { backgroundColor: `${SOURCE_COLORS[contact.source] || '#6B7280'}20` }]}>
                <User size={24} color={SOURCE_COLORS[contact.source] || '#9CA3AF'} />
              </View>
              <View>
                <Text style={st.detailName}>{contact.name || '—'}</Text>
                <Text style={st.detailEmail}>{contact.email}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => { onClose(); onEdit(contact); }} style={st.editBtn}>
                <Edit3 size={14} color="#C4B5FD" />
                <Text style={st.editBtnText}>Edit</Text>
              </Pressable>
              <Pressable onPress={onClose} style={st.closeBtn}>
                <X size={18} color={SAC.muted} />
              </Pressable>
            </View>
          </View>

          {/* Content */}
          <ScrollView style={st.detailContent}>
            {/* Quick Info */}
            <View style={st.detailSection}>
              <Text style={st.detailSectionTitle}>Contact Information</Text>
              <View style={st.detailGrid}>
                {contact.phone && (
                  <View style={st.detailItem}>
                    <Phone size={14} color={SAC.dim} />
                    <View>
                      <Text style={st.detailItemLabel}>Phone</Text>
                      <Text style={st.detailItemValue}>{contact.phone}</Text>
                    </View>
                  </View>
                )}
                {contact.location && (
                  <View style={st.detailItem}>
                    <MapPin size={14} color={SAC.dim} />
                    <View>
                      <Text style={st.detailItemLabel}>Location</Text>
                      <Text style={st.detailItemValue}>{contact.location}</Text>
                    </View>
                  </View>
                )}
                {contact.current_company && (
                  <View style={st.detailItem}>
                    <Building2 size={14} color={SAC.dim} />
                    <View>
                      <Text style={st.detailItemLabel}>Company</Text>
                      <Text style={st.detailItemValue}>{contact.current_company}</Text>
                    </View>
                  </View>
                )}
                {contact.current_title && (
                  <View style={st.detailItem}>
                    <Briefcase size={14} color={SAC.dim} />
                    <View>
                      <Text style={st.detailItemLabel}>Title</Text>
                      <Text style={st.detailItemValue}>{contact.current_title}</Text>
                    </View>
                  </View>
                )}
                {contact.education_institution && (
                  <View style={st.detailItem}>
                    <GraduationCap size={14} color={SAC.dim} />
                    <View>
                      <Text style={st.detailItemLabel}>Education</Text>
                      <Text style={st.detailItemValue}>{contact.education_degree ? `${contact.education_degree} · ` : ''}{contact.education_institution}</Text>
                    </View>
                  </View>
                )}
                {contact.profile_url && (
                  <View style={st.detailItem}>
                    <Globe size={14} color={SAC.dim} />
                    <View style={{ flex: 1 }}>
                      <Text style={st.detailItemLabel}>Profile</Text>
                      <Text numberOfLines={1} style={[st.detailItemValue, { color: GRAD.from }]}>{contact.profile_url}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Source & Status */}
            <View style={st.detailSection}>
              <Text style={st.detailSectionTitle}>Metadata</Text>
              <View style={st.detailGrid}>
                <View style={st.detailItem}>
                  <Text style={st.detailItemLabel}>Source</Text>
                  <View style={[st.sourceBadge, { backgroundColor: `${SOURCE_COLORS[contact.source] || '#6B7280'}15` }]}>
                    <Text style={[st.sourceText, { color: SOURCE_COLORS[contact.source] || '#9CA3AF' }]}>{contact.source}</Text>
                  </View>
                </View>
                <View style={st.detailItem}>
                  <Text style={st.detailItemLabel}>Status</Text>
                  <StatusPill kind={contact.subscribed ? 'success' : 'neutral'} label={contact.subscribed ? 'Subscribed' : 'Unsubscribed'} />
                </View>
                <View style={st.detailItem}>
                  <Text style={st.detailItemLabel}>Created</Text>
                  <Text style={st.detailItemValue}>{fmtDate(contact.created_at)}</Text>
                </View>
                <View style={st.detailItem}>
                  <Text style={st.detailItemLabel}>Updated</Text>
                  <Text style={st.detailItemValue}>{fmtDate(contact.updated_at)}</Text>
                </View>
              </View>
            </View>

            {/* Notes */}
            {contact.notes && (
              <View style={st.detailSection}>
                <Text style={st.detailSectionTitle}>Notes</Text>
                <Text style={st.detailNotes}>{contact.notes}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Import Modal ──────────────────────────────────────────────────────────────

function ImportModal({ visible, onClose, onImported }: { visible: boolean; onClose: () => void; onImported: () => void }) {
  const { toast, flash, hide } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [tags, setTags] = useState('');
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [currentFile, setCurrentFile] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiBase = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || '';

  const handleImport = async () => {
    if (files.length === 0) return;
    setImporting(true);
    const allResults = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setCurrentFile(i);
      const validTypes = ['.csv', '.xlsx', '.xls'];
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!validTypes.includes(fileExt)) {
        allResults.push({ file: file.name, error: 'Invalid file type' });
        continue;
      }
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
        allResults.push({ file: file.name, ...data });
      } catch (e: any) {
        allResults.push({ file: file.name, error: e.message || 'Import failed' });
      }
    }
    setResults(allResults);
    setImporting(false);
    onImported();
  };

  const handleFileSelect = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []) as File[];
    setFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const removeFile = (index: number) => setFiles(prev => prev.filter((_, i) => i !== index));
  const clearFiles = () => { setFiles([]); setResults([]); };

  const totalImported = results.reduce((sum, r) => sum + (r.imported || 0), 0);
  const totalUpdated = results.reduce((sum, r) => sum + (r.updated || 0), 0);
  const totalSkipped = results.reduce((sum, r) => sum + (r.skipped || 0), 0);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.modalOverlay}>
        <Pressable style={st.modalBackdrop} onPress={onClose} />
        <View style={st.importModal}>
          <View style={st.importHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(124,58,237,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                <Upload size={18} color="#C4B5FD" />
              </View>
              <View>
                <Text style={st.importTitle}>Import Contacts</Text>
                <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.muted }}>CSV or XLSX files</Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={st.closeBtn}><X size={18} color={SAC.muted} /></Pressable>
          </View>
          <ScrollView style={st.importContent}>
            {!results.length ? (
              <>
                <Pressable onPress={handleFileSelect} style={st.uploadBtn}>
                  <View style={st.uploadIconWrap}><Upload size={24} color="#C4B5FD" /></View>
                  <View>
                    <Text style={st.uploadBtnText}>Click to select files</Text>
                    <Text style={st.uploadBtnSub}>CSV or XLSX • Multiple files supported</Text>
                  </View>
                </Pressable>
                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" multiple onChange={handleFileChange} style={{ display: 'none' }} />
                {files.length > 0 && (
                  <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={st.fileListTitle}>{files.length} file{files.length > 1 ? 's' : ''}</Text>
                      <Pressable onPress={clearFiles}><Text style={st.clearAllText}>Clear</Text></Pressable>
                    </View>
                    {files.map((f, i) => (
                      <View key={i} style={st.fileItem}>
                        <FileText size={16} color="#C4B5FD" />
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <Text numberOfLines={1} style={st.fileName}>{f.name}</Text>
                          <Text style={st.fileSize}>{(f.size / 1024).toFixed(1)} KB</Text>
                        </View>
                        <Pressable onPress={() => removeFile(i)} style={st.removeBtn}><X size={14} color="#F87171" /></Pressable>
                      </View>
                    ))}
                  </View>
                )}
                <View style={{ gap: 6 }}>
                  <Text style={st.fieldLabel}>Tags (optional)</Text>
                  <TextInput style={st.textInput} value={tags} onChangeText={setTags} placeholder="e.g., leads, vip" placeholderTextColor={SAC.dim} />
                </View>
              </>
            ) : (
              <View style={{ gap: 12, alignItems: 'center' }}>
                <View style={st.successIcon}><CheckCircle size={32} color="#10B981" /></View>
                <Text style={st.successTitle}>Import Complete</Text>
                <View style={st.statsRow}>
                  <View style={st.statBox}><Text style={[st.statValue, { color: '#10B981' }]}>{totalImported}</Text><Text style={st.statLabel}>New</Text></View>
                  <View style={st.statBox}><Text style={[st.statValue, { color: '#3B82F6' }]}>{totalUpdated}</Text><Text style={st.statLabel}>Updated</Text></View>
                  <View style={st.statBox}><Text style={[st.statValue, { color: '#F59E0B' }]}>{totalSkipped}</Text><Text style={st.statLabel}>Skipped</Text></View>
                </View>
                <View style={{ width: '100%', gap: 6 }}>
                  {results.map((r, i) => (
                    <View key={i} style={st.fileResultItem}>
                      {r.error ? <XCircle size={16} color="#F87171" /> : <CheckCircle size={16} color="#10B981" />}
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text numberOfLines={1} style={st.fileName}>{r.file}</Text>
                        <Text style={st.fileResultText}>{r.error || `${r.imported || 0} new, ${r.updated || 0} updated, ${r.skipped || 0} skipped`}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
          <View style={st.importFooter}>
            <SecondaryButton onPress={onClose}><Text style={st.secondaryBtnText}>{results.length ? 'Done' : 'Cancel'}</Text></SecondaryButton>
            {!results.length && (
              <GradientButton onPress={handleImport} disabled={files.length === 0 || importing} size="sm">
                {importing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={st.primaryBtnText}>Import {files.length} file{files.length > 1 ? 's' : ''}</Text>}
              </GradientButton>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Add/Edit Modal ────────────────────────────────────────────────────────────

function AddEditModal({ visible, contact, lists, onClose, onSave }: { visible: boolean; contact?: Contact; lists: ContactList[]; onClose: () => void; onSave: () => void }) {
  const { flash } = useToast();
  const [form, setForm] = useState({
    name: contact?.name || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    current_company: contact?.current_company || '',
    current_title: contact?.current_title || '',
    location: contact?.location || '',
    notes: contact?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const apiBase = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || '';

  const handleSave = async () => {
    if (!form.email.trim()) { flash('Email is required'); return; }
    setSaving(true);
    try {
      const { tokenStore } = await import('@/src/models/services/api');
      const token = await tokenStore.getAccess();
      const url = contact ? `${apiBase}/api/admin/contacts/${contact._id || contact.id}` : `${apiBase}/api/admin/contacts`;
      const res = await fetch(url, {
        method: contact ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.detail || 'Failed'); }
      flash(contact ? 'Updated' : 'Added');
      onSave();
      onClose();
    } catch (e: any) { flash(e?.message || 'Failed'); } finally { setSaving(false); }
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.modalOverlay}>
        <Pressable style={st.modalBackdrop} onPress={onClose} />
        <View style={st.importModal}>
          <View style={st.importHeader}>
            <Text style={st.importTitle}>{contact ? 'Edit Contact' : 'Add Contact'}</Text>
            <Pressable onPress={onClose} style={st.closeBtn}><X size={18} color={SAC.muted} /></Pressable>
          </View>
          <ScrollView style={st.importContent}>
            <View style={{ gap: 12 }}>
              <View style={{ gap: 6 }}>
                <Text style={st.fieldLabel}>Name</Text>
                <TextInput style={st.textInput} value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} placeholder="John Doe" placeholderTextColor={SAC.dim} />
              </View>
              <View style={{ gap: 6 }}>
                <Text style={st.fieldLabel}>Email *</Text>
                <TextInput style={st.textInput} value={form.email} onChangeText={v => setForm(f => ({ ...f, email: v }))} placeholder="john@example.com" placeholderTextColor={SAC.dim} keyboardType="email-address" autoCapitalize="none" />
              </View>
              <View style={{ gap: 6 }}>
                <Text style={st.fieldLabel}>Phone</Text>
                <TextInput style={st.textInput} value={form.phone} onChangeText={v => setForm(f => ({ ...f, phone: v }))} placeholder="+91 98765 43210" placeholderTextColor={SAC.dim} keyboardType="phone-pad" />
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={st.fieldLabel}>Company</Text>
                  <TextInput style={st.textInput} value={form.current_company} onChangeText={v => setForm(f => ({ ...f, current_company: v }))} placeholder="Company name" placeholderTextColor={SAC.dim} />
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={st.fieldLabel}>Title</Text>
                  <TextInput style={st.textInput} value={form.current_title} onChangeText={v => setForm(f => ({ ...f, current_title: v }))} placeholder="Job title" placeholderTextColor={SAC.dim} />
                </View>
              </View>
              <View style={{ gap: 6 }}>
                <Text style={st.fieldLabel}>Location</Text>
                <TextInput style={st.textInput} value={form.location} onChangeText={v => setForm(f => ({ ...f, location: v }))} placeholder="City, Country" placeholderTextColor={SAC.dim} />
              </View>
              <View style={{ gap: 6 }}>
                <Text style={st.fieldLabel}>Notes</Text>
                <TextInput style={[st.textInput, { minHeight: 60 }]} value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} placeholder="Any notes…" placeholderTextColor={SAC.dim} multiline />
              </View>
            </View>
          </ScrollView>
          <View style={st.importFooter}>
            <SecondaryButton onPress={onClose}><Text style={st.secondaryBtnText}>Cancel</Text></SecondaryButton>
            <GradientButton onPress={handleSave} disabled={saving} size="sm">
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={st.primaryBtnText}>{contact ? 'Update' : 'Add'}</Text>}
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
  searchGo: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: SAC.border, backgroundColor: 'rgba(255,255,255,0.04)' },
  filterPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: SAC.border, backgroundColor: 'rgba(255,255,255,0.04)' },
  filterPillActive: { borderColor: GRAD.from, backgroundColor: 'rgba(124,58,237,0.15)' },
  filterPillText: { fontFamily: FONTS.med, fontSize: 11, color: SAC.muted },
  filterPillTextActive: { color: '#C4B5FD' },
  bulkBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 10, backgroundColor: 'rgba(124,58,237,0.08)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)' },
  bulkText: { fontFamily: FONTS.bold, fontSize: 13, color: '#C4B5FD' },
  bulkDeleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.1)' },
  tableHeader: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderBottomWidth: 1, borderBottomColor: SAC.border },
  headerCell: { fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  tableRowSelected: { backgroundColor: 'rgba(124,58,237,0.08)' },
  cell: { fontFamily: FONTS.med, fontSize: 12, color: '#e5e7eb' },
  cellBold: { fontFamily: FONTS.bold, fontSize: 12.5, color: '#fff' },
  cellDim: { fontFamily: FONTS.med, fontSize: 10.5, color: SAC.dim },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: 'rgba(167,139,250,0.5)', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: GRAD.from, borderColor: GRAD.from },
  avatar: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  avatarLarge: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sourceBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, alignSelf: 'flex-start' },
  sourceText: { fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.4 },
  actionBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: SAC.border },
  paginationText: { fontFamily: FONTS.med, fontSize: 11, color: SAC.dim },
  pageBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: SAC.border, backgroundColor: 'rgba(255,255,255,0.04)' },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { fontFamily: FONTS.bold, fontSize: 11, color: SAC.muted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  importModal: { width: '100%', maxWidth: 480, backgroundColor: '#141A2D', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)', maxHeight: '80vh' },
  detailModal: { width: '100%', maxWidth: 520, backgroundColor: '#141A2D', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)', maxHeight: '80vh' },
  importHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: SAC.border },
  importTitle: { fontFamily: FONTS.bold, fontSize: 15, color: SAC.text },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  importContent: { padding: 16, gap: 16 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, backgroundColor: 'rgba(124,58,237,0.08)', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(167,139,250,0.4)' },
  uploadIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(124,58,237,0.15)', alignItems: 'center', justifyContent: 'center' },
  uploadBtnText: { fontFamily: FONTS.bold, fontSize: 13, color: SAC.text },
  uploadBtnSub: { fontFamily: FONTS.med, fontSize: 11, color: SAC.muted, marginTop: 2 },
  fileListTitle: { fontFamily: FONTS.semi, fontSize: 12, color: SAC.text },
  clearAllText: { fontFamily: FONTS.semi, fontSize: 11, color: '#F87171' },
  fileItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  fileName: { fontFamily: FONTS.semi, fontSize: 12, color: SAC.text },
  fileSize: { fontFamily: FONTS.med, fontSize: 10, color: SAC.dim },
  removeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(239,68,68,0.1)', alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { fontFamily: FONTS.semi, fontSize: 11, color: SAC.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  textInput: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: SAC.text, fontFamily: FONTS.med, fontSize: 13 },
  importFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: SAC.border },
  secondaryBtnText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 },
  primaryBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12 },
  successIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(16,185,129,0.15)', alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontFamily: FONTS.bold, fontSize: 16, color: SAC.text },
  statsRow: { flexDirection: 'row', gap: 12, width: '100%' },
  statBox: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center' },
  statValue: { fontFamily: FONTS.xbold, fontSize: 20, color: '#10B981' },
  statLabel: { fontFamily: FONTS.semi, fontSize: 11, color: SAC.muted, marginTop: 4 },
  fileResultItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  fileResultText: { fontFamily: FONTS.med, fontSize: 11, color: SAC.dim, marginTop: 2 },
  // Detail modal styles
  detailName: { fontFamily: FONTS.bold, fontSize: 16, color: SAC.text },
  detailEmail: { fontFamily: FONTS.med, fontSize: 12, color: SAC.muted },
  detailContent: { padding: 16, gap: 16 },
  detailSection: { gap: 10 },
  detailSectionTitle: { fontFamily: FONTS.bold, fontSize: 12, color: SAC.text, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailGrid: { gap: 10 },
  detailItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.03)' },
  detailItemLabel: { fontFamily: FONTS.semi, fontSize: 10, color: SAC.dim, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailItemValue: { fontFamily: FONTS.med, fontSize: 13, color: SAC.text, marginTop: 2 },
  detailNotes: { fontFamily: FONTS.med, fontSize: 12, color: SAC.muted, lineHeight: 18, padding: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.03)' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)', backgroundColor: 'rgba(124,58,237,0.1)' },
  editBtnText: { fontFamily: FONTS.semi, fontSize: 12, color: '#C4B5FD' },
});
