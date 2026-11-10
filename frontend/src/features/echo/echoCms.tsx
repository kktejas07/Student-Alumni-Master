// the EchoShowcaseAdminView entry component — split verbatim from EchoShowcaseAdminView.tsx (audit Step 6a).
// @ts-nocheck
import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useConfirm } from '@/src/views/components';
import { useSubTab } from '@/src/views/web/portals/portalUrl';
import { Card, GRAD, GradientButton, IconBox, KpiTile, SearchField, Toast, TopTabs, useToast } from '@/src/views/web/portals/superadmin/applekit';
import { FONTS, SAC, resolveColors, useSAC } from '@/src/views/web/portals/superadmin/tokens';
import { Archive, BookOpen, ChevronLeft, ChevronRight, PlusCircle, Search, Star, Ticket, X, Zap } from 'lucide-react-native';
import { ActivityIndicator, Modal, Platform, Pressable, Text, View } from 'react-native';
import { fi } from './fields/echoCmsFields';
import { MediaLibraryPanel } from './media/echoCmsMedia';
import { AUTOSAVE_KEY, ShowcaseCard, ShowcaseModal } from './modal/echoCmsModal';
import { InternalHiringPanel, LiveScanMonitorPanel, RegistrationPasscodeControl, RegistrationPasscodeGate, RegistrationsPanel, VolunteersPanel } from './panels/echoCmsPanels';
import { FILTER_TABS, PAGE_TABS, type PageTab, StatusFilter } from './shared/echoCmsShared';

export function EchoShowcaseAdminView({ sub, onSub }: { sub?: string; onSub?: (s: string) => void }) {
  const T = useSAC();
  Object.assign(fi, resolveColors(fi, T));

  const [pageTab, setPageTab] = useSubTab<PageTab>(['registrations', 'scan-monitor', 'all', 'create', 'drafts', 'interns', 'volunteers', 'media'], 'registrations', { sub, onSub });
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [editing, setEditing] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;
  const { toast, flash, hide } = useToast();
  const { confirm } = useConfirm();
  const user = useAuthStore((s) => s.user);

  const [regPassEnabled, setRegPassEnabled] = useState<boolean | null>(null);
  const [regPassUnlocked, setRegPassUnlocked] = useState(false);

  const loadPasscodeStatus = useCallback(async () => {
    try {
      const res = await api.getEchoRegistrationPasscode();
      setRegPassEnabled(res?.enabled ? true : false);
    } catch {
      setRegPassEnabled(false);
    }
  }, []);

  useEffect(() => {
    if (pageTab === 'registrations') {
      loadPasscodeStatus();
      if (Platform.OS === 'web') {
        try {
          const unlocked = sessionStorage.getItem('echo_reg_pass_unlocked') === '1';
          setRegPassUnlocked(unlocked);
        } catch {}
      }
    }
  }, [pageTab, loadPasscodeStatus]);

  // Re-lock when browser tab becomes hidden (tab switch, window blur)
  useEffect(() => {
    if (Platform.OS !== 'web' || pageTab !== 'registrations' || !regPassEnabled) return;
    const onVisChange = () => {
      if (document.hidden) {
        setRegPassUnlocked(false);
        try { sessionStorage.removeItem('echo_reg_pass_unlocked'); } catch {}
      }
    };
    document.addEventListener('visibilitychange', onVisChange);
    return () => document.removeEventListener('visibilitychange', onVisChange);
  }, [pageTab, regPassEnabled]);

  const regPassUnlock = () => {
    setRegPassUnlocked(true);
    if (Platform.OS === 'web') {
      try { sessionStorage.setItem('echo_reg_pass_unlocked', '1'); } catch {}
    }
  };

  const onPasscodeChanged = (newEnabled: boolean) => {
    setRegPassEnabled(newEnabled);
    if (newEnabled) {
      setRegPassUnlocked(false);
      if (Platform.OS === 'web') {
        try { sessionStorage.removeItem('echo_reg_pass_unlocked'); } catch {}
      }
    } else {
      setRegPassUnlocked(true);
      if (Platform.OS === 'web') {
        try { sessionStorage.setItem('echo_reg_pass_unlocked', '1'); } catch {}
      }
    }
  };

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const res = await api.adminListEchoShowcases();
      setItems(res?.items || []);
    } catch {
      flash('Failed to load showcases');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // When user clicks "Create Showcase" tab → open modal immediately
  useEffect(() => {
    if (pageTab === 'create') {
      setEditing(null);
      setModalOpen(true);
    }
  }, [pageTab]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const q = search.toLowerCase();
      const matchQ = !q || i.title?.toLowerCase().includes(q) || i.slug?.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || i.status === statusFilter;
      const matchPage = pageTab === 'drafts' ? i.status === 'draft' : true;
      return matchQ && matchStatus && matchPage;
    });
  }, [items, search, statusFilter, pageTab]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, pageTab, items]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const onCreate = () => { setEditing(null); setModalOpen(true); setPageTab('create'); };
  const onEdit = (item: any) => { setEditing(item); setModalOpen(true); };
  const onClose = () => { setModalOpen(false); setEditing(null); if (pageTab === 'create') setPageTab('all'); };

  const onSave = async (form: any) => {
    if (!form.title?.trim()) {
      flash('Event name is required');
      return;
    }
    if (!form.slug?.trim()) {
      form = { ...form, slug: form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untitled' };
    }
    setSaving(true);

    try {
      if (editing) {
        const res = await api.updateEchoShowcase(editing._id, form);
        flash('Showcase updated');
      } else {
        const res = await api.createEchoShowcase(form);
        flash('Showcase created');
        // Clear autosave draft
        if (Platform.OS === 'web') {
          try { sessionStorage.removeItem(AUTOSAVE_KEY); } catch { /* ignore */ }
        }
      }
      onClose();
      await load();
    } catch (e: any) {
      console.error('[CMS SAVE ERROR]', e);
      flash(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const onPublish = async (item: any) => {
    setBusy(item._id);
    try { await api.publishEchoShowcase(item._id); flash(`"${item.title}" published`); await load(); }
    catch { flash('Publish failed'); }
    finally { setBusy(null); }
  };
  const onDraft = async (item: any) => {
    setBusy(item._id);
    try { await api.draftEchoShowcase(item._id); flash('Moved to draft'); await load(); }
    catch { flash('Failed'); }
    finally { setBusy(null); }
  };
  const onArchive = async (item: any) => {
    setBusy(item._id);
    try { await api.archiveEchoShowcase(item._id); flash('Archived'); await load(); }
    catch { flash('Failed'); }
    finally { setBusy(null); }
  };
  const onDelete = async (item: any) => {
    const ok = await confirm({
      title: 'Delete showcase',
      message: `Delete "${item.title}"? This cannot be undone.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try { await api.deleteEchoShowcase(item._id); flash('Deleted'); await load(); }
    catch { flash('Delete failed'); }
  };
  const onPreview = (item: any) => {
    if (Platform.OS === 'web') window.open(`/echo/${item.slug}`, '_blank');
  };

  const pub = items.filter((i) => i.status === 'published').length;
  const draft = items.filter((i) => i.status === 'draft').length;
  const arc = items.filter((i) => i.status === 'archived').length;

  return (
    <View>
      <Toast text={toast.text} visible={toast.visible} kind={toast.kind} onDismiss={hide} />

      {/* Page header */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <View>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 22, color: SAC.text }}>ECHO Showcase CMS</Text>
          <Text style={{ fontFamily: FONTS.med, fontSize: 13, color: SAC.muted, marginTop: 3 }}>
            Create and manage showcase pages. Published showcases appear in the Student Portal.
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <GradientButton onPress={onCreate} size="md">
            <PlusCircle size={14} color="#fff" />
            <Text style={{ color: SAC.text, fontFamily: FONTS.bold, fontSize: 13, marginLeft: 6 }}>New Showcase</Text>
          </GradientButton>
        </View>
      </View>

      {/* Page-level navigation tabs */}
      <View style={{ marginBottom: 20 }}>
        <TopTabs tabs={PAGE_TABS} active={pageTab} onChange={setPageTab} />
      </View>

      {/* ── MEDIA LIBRARY ── */}
      {pageTab === 'media' && <MediaLibraryPanel />}
      {pageTab === 'scan-monitor' && <LiveScanMonitorPanel />}

      {/* ── REGISTRATIONS & PAYMENTS ── */}
      {pageTab === 'registrations' && (
        regPassEnabled === null
          ? <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
              <ActivityIndicator size="large" color="#8B5CF6" />
            </View>
          : (regPassEnabled
              ? (!regPassUnlocked
                  ? <RegistrationPasscodeGate onUnlocked={regPassUnlock} onChange={onPasscodeChanged} enabled={regPassEnabled} />
                  : <View style={{ gap: 14 }}>
                      <RegistrationPasscodeControl enabled={regPassEnabled} onChange={onPasscodeChanged} />
                      <RegistrationsPanel />
                    </View>)
              : <View style={{ gap: 14 }}>
                  <RegistrationPasscodeControl enabled={false} onChange={onPasscodeChanged} />
                  <RegistrationsPanel />
                </View>)
      )}

      {/* ── INTERNAL HIRING & INTERNS ── */}
      {pageTab === 'interns' && <InternalHiringPanel />}

      {/* ── VOLUNTEERS ── */}
      {pageTab === 'volunteers' && <VolunteersPanel />}

      {/* ── SHOWCASES LIST (All / Drafts) ── */}
      {(pageTab === 'all' || pageTab === 'drafts') && (
        <>
          {/* KPI tiles */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <KpiTile Icon={Zap} label="Total Showcases" value={String(items.length)} />
            <KpiTile Icon={Star} label="Published" value={String(pub)} />
            <KpiTile Icon={BookOpen} label="Drafts" value={String(draft)} />
            <KpiTile Icon={Archive} label="Archived" value={String(arc)} />
          </View>

          {/* Search + filter */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <View style={{ flex: 1, minWidth: 200 }}>
              <SearchField value={search} onChange={setSearch} placeholder="Search showcases…" />
            </View>
            {pageTab === 'all' && (
              <TopTabs tabs={FILTER_TABS} active={statusFilter} onChange={(val) => setStatusFilter(val as StatusFilter)} />
            )}
          </View>

          {/* List */}
          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={GRAD.from} />
            </View>
          ) : filtered.length === 0 ? (
            <Card style={{ padding: 40, alignItems: 'center', gap: 12 }}>
              <IconBox size={48}><Zap size={20} color={GRAD.to} /></IconBox>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: SAC.text }}>
                {pageTab === 'drafts' ? 'No draft showcases' : 'No showcases yet'}
              </Text>
              <Text style={{ fontFamily: FONTS.med, fontSize: 13, color: SAC.muted, textAlign: 'center', maxWidth: 280 }}>
                {pageTab === 'drafts'
                  ? 'All your showcases are published or archived.'
                  : 'Create your first ECHO Showcase to let students explore memorable campus events.'}
              </Text>
              <GradientButton onPress={onCreate} size="md">
                <Text style={{ color: SAC.text, fontFamily: FONTS.bold, fontSize: 13 }}>+ New Showcase</Text>
              </GradientButton>
            </Card>
          ) : (
            <>
              {paged.map((item) => (
                <ShowcaseCard key={item._id} item={item} onEdit={onEdit} onDelete={onDelete}
                  onPublish={onPublish} onDraft={onDraft} onArchive={onArchive} onPreview={onPreview} busy={busy} />
              ))}
              {/* Pagination */}
              {filtered.length > PER_PAGE && (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingVertical: 10, paddingHorizontal: 4,
                  borderTopWidth: 1, borderTopColor: SAC.border, flexWrap: 'wrap', gap: 10, marginTop: 6,
                }}>
                  <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.dim }}>
                    Showing {(safePage - 1) * PER_PAGE + 1}–{Math.min(safePage * PER_PAGE, filtered.length)} of {filtered.length}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <Pressable
                      onPress={() => setPage(safePage - 1)}
                      disabled={safePage === 1}
                      style={{
                        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7,
                        backgroundColor: safePage === 1 ? 'rgba(255,255,255,0.04)' : 'rgba(167,139,250,0.15)',
                        borderWidth: 1, borderColor: safePage === 1 ? SAC.border : 'rgba(167,139,250,0.3)',
                        opacity: safePage === 1 ? 0.4 : 1,
                      }}
                    >
                      <ChevronLeft size={14} color={SAC.text} />
                    </Pressable>
                    {Array.from({ length: totalPages }, (_, p) => p + 1).map((p) => {
                      if (totalPages > 7 && Math.abs(p - safePage) > 2 && p !== 1 && p !== totalPages) {
                        return null;
                      }
                      return (
                        <Pressable key={p} onPress={() => setPage(p)} style={{
                          minWidth: 30, alignItems: 'center', justifyContent: 'center',
                          paddingVertical: 6, borderRadius: 7,
                          backgroundColor: p === safePage ? '#7C3AED' : 'rgba(255,255,255,0.05)',
                          borderWidth: 1, borderColor: p === safePage ? '#7C3AED' : SAC.border,
                        }}>
                          <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: p === safePage ? '#fff' : SAC.text }}>{p}</Text>
                        </Pressable>
                      );
                    })}
                    <Pressable
                      onPress={() => setPage(safePage + 1)}
                      disabled={safePage >= totalPages}
                      style={{
                        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7,
                        backgroundColor: safePage >= totalPages ? 'rgba(255,255,255,0.04)' : 'rgba(167,139,250,0.15)',
                        borderWidth: 1, borderColor: safePage >= totalPages ? SAC.border : 'rgba(167,139,250,0.3)',
                        opacity: safePage >= totalPages ? 0.4 : 1,
                      }}
                    >
                      <ChevronRight size={14} color={SAC.text} />
                    </Pressable>
                  </View>
                </View>
              )}
            </>
          )}
        </>
      )}

      {/* Showcase Editor Modal */}
      <ShowcaseModal visible={modalOpen} editing={editing} onClose={onClose} onSave={onSave} saving={saving} flash={flash} onPreview={(html: string) => setPreviewHtml(html)} />

      {/* Ticket Preview Modal */}
      <Modal visible={!!previewHtml} transparent animationType="fade" onRequestClose={() => setPreviewHtml(null)}>
        <View style={{ flex: 1, backgroundColor: SAC.panel2, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#1e1b4b', borderRadius: 16, overflow: 'hidden', width: '100%', maxWidth: 800, maxHeight: '90vh' as any, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' }}>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: SAC.text }}>Ticket Preview</Text>
              <Pressable onPress={() => setPreviewHtml(null)} style={{ padding: 6 }}>
                <X size={18} color="#94a3b8" />
              </Pressable>
            </View>
            <View style={{ flex: 1, overflow: 'hidden' as any }}>
              {previewHtml ? (
                <iframe
                  srcDoc={previewHtml}
                  style={{ width: '100%', height: 600, border: 'none', background: '#101019' }}
                  title="Ticket Preview"
                />
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
