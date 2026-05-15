/**
 * EventsView — Amber Admin theme.
 *
 * Card grid of events from `/admin/super/events`. Uses the unified
 * applekit primitives (Card, IconBox, KpiTile, StatusPill, etc.) so
 * it visually matches Overview / Imports / Colleges / Students.
 *
 * Wires:
 *   • "New event"        → opens EventModal (create)
 *   • "Manage event"     → opens EventModal (edit, with Delete)
 *   • "Review & approve" → patches start_date to "now+1 day" + reloads
 */
import React, { useMemo, useState } from 'react';
<<<<<<< Updated upstream
import { View, Text, Pressable, StyleSheet, Platform, useWindowDimensions, Modal, TextInput, ScrollView, Alert } from 'react-native';
import { Calendar as CalIcon, MapPin, Users as UsersIcon, ShieldCheck, AlertTriangle, IndianRupee, Sparkles, Plus, X, Trash2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SAC, FONTS } from '../tokens';
import { GRAD, Card, IconBox, KpiTile, StatusPill, GradientButton, SecondaryButton, SearchField, TopTabs, EmptyState, useToast, Toast } from '../applekit';
import { usePortalData } from '@/src/lib/portalApi';
import { request } from '@/src/models/services/api';
=======
import { View, Text, Pressable, StyleSheet, Platform, useWindowDimensions, Modal, ScrollView } from 'react-native';
import { Calendar as CalIcon, MapPin, Users as UsersIcon, ShieldCheck, AlertTriangle, IndianRupee, Sparkles, Plus, X, Check, Pencil } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SAC, FONTS } from '../tokens';
import { GRAD, Card, IconBox, KpiTile, StatusPill, GradientButton, SecondaryButton, SearchField, TopTabs, EmptyState, Toast, useToast, LoadingBox, SectionLabel } from '../applekit';
import { usePortalData, postPortal } from '@/src/lib/portalApi';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { TextInput } from 'react-native';
>>>>>>> Stashed changes

type Ev = { id: string; title: string; date: string; mode: string; city: string; cat: string; attending: number; capacity: number; status: string; kind: string; price?: number; accent: string };
const FALLBACK = { items: [] as Ev[] };

type Tab = 'all' | 'live' | 'pending' | 'free' | 'paid';

/* ─── Event create/edit modal ───────────────────────────────────────── */

type Editable = {
  id?: string;
  title: string;
  start_date: string;   // ISO "YYYY-MM-DDTHH:mm"
  mode: string;
  venue: string;
  category: string;
  capacity: string;     // string in form, parsed on save
  price: string;        // string in form, parsed on save
  description: string;
};

const EMPTY: Editable = {
  title: '', start_date: '', mode: 'Online', venue: 'Online',
  category: 'Workshop', capacity: '200', price: '', description: '',
};

function EventModal({
  visible, editing, onClose, onSaved, onDeleted,
}: {
  visible: boolean;
  editing: (Ev & Partial<Editable>) | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const isEdit = !!editing;
  const [form, setForm] = useState<Editable>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  React.useEffect(() => {
    if (!visible) return;
    if (editing) {
      setForm({
        id: editing.id,
        title: editing.title || '',
        start_date: '',
        mode: editing.mode || 'Online',
        venue: editing.city || editing.venue || 'Online',
        category: editing.cat || editing.category || 'Workshop',
        capacity: String(editing.capacity || 200),
        price: editing.price ? String(editing.price) : '',
        description: editing.description || '',
      });
    } else {
      setForm(EMPTY);
    }
    setErr('');
  }, [visible, editing]);

  const set = <K extends keyof Editable>(k: K, v: Editable[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title.trim()) { setErr('Title is required'); return; }
    setSaving(true); setErr('');
    try {
      const payload: any = {
        title: form.title.trim(),
        mode: form.mode || 'Online',
        venue: form.venue || 'Online',
        category: form.category || 'Workshop',
        capacity: Number(form.capacity) || 200,
        description: form.description || '',
      };
      if (form.start_date) payload.start_date = form.start_date;
      payload.price = form.price ? Number(form.price) : null;

      if (isEdit && editing?.id) {
        await request(`/admin/super/events/${editing.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        await request('/admin/super/events', { method: 'POST', body: JSON.stringify(payload) });
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setErr(e?.message || 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editing?.id) return;
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (!window.confirm('Delete this event? This cannot be undone.')) return;
    }
    setSaving(true); setErr('');
    try {
      await request(`/admin/super/events/${editing.id}`, { method: 'DELETE' });
      onDeleted();
      onClose();
    } catch (e: any) {
      setErr(e?.message || 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={mst.bg}>
        <Pressable style={mst.bgPress} onPress={onClose} />
        <View style={mst.card}>
          <View style={mst.head}>
            <IconBox size={32}><CalIcon size={14} color={GRAD.to} /></IconBox>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={mst.title}>{isEdit ? 'Manage event' : 'New event'}</Text>
              <Text style={mst.sub}>{isEdit ? `Editing "${editing?.title}"` : 'Create a new event across the platform'}</Text>
            </View>
            <Pressable onPress={onClose} style={mst.closeBtn}>
              <X size={16} color={SAC.muted} />
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: 12, padding: 18 }}>
            <Field label="Title *">
              <TextInput value={form.title} onChangeText={(v) => set('title', v)}
                placeholder="e.g. AI in Hiring 2026" placeholderTextColor={SAC.dim} style={mst.input} />
            </Field>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field label={isEdit ? 'New start date / time' : 'Start date / time'}>
                  <TextInput value={form.start_date} onChangeText={(v) => set('start_date', v)}
                    placeholder="2026-07-15T18:00" placeholderTextColor={SAC.dim} style={mst.input} />
                </Field>
              </View>
              <View style={{ width: 150 }}>
                <Field label="Capacity">
                  <TextInput value={form.capacity} onChangeText={(v) => set('capacity', v.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric" placeholder="200" placeholderTextColor={SAC.dim} style={mst.input} />
                </Field>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field label="Mode">
                  <Segmented value={form.mode} onChange={(v) => set('mode', v)} options={['Online', 'Offline', 'Hybrid']} />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Venue / City">
                  <TextInput value={form.venue} onChangeText={(v) => set('venue', v)}
                    placeholder="Bengaluru / Online" placeholderTextColor={SAC.dim} style={mst.input} />
                </Field>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field label="Category">
                  <Segmented value={form.category} onChange={(v) => set('category', v)}
                    options={['Workshop', 'Webinar', 'Hackathon', 'Career Fair', 'Meetup']} />
                </Field>
              </View>
              <View style={{ width: 150 }}>
                <Field label="Price (₹, blank = free)">
                  <TextInput value={form.price} onChangeText={(v) => set('price', v.replace(/[^0-9.]/g, ''))}
                    keyboardType="numeric" placeholder="0" placeholderTextColor={SAC.dim} style={mst.input} />
                </Field>
              </View>
            </View>

            <Field label="Description">
              <TextInput value={form.description} onChangeText={(v) => set('description', v)}
                multiline numberOfLines={3} placeholder="Short summary…" placeholderTextColor={SAC.dim}
                style={[mst.input, { minHeight: 70, paddingTop: 9, textAlignVertical: 'top' as any }]} />
            </Field>

            {!!err && (
              <View style={mst.err}>
                <AlertTriangle size={12} color="#FCA5A5" />
                <Text style={{ color: '#FCA5A5', fontFamily: FONTS.bold, fontSize: 11.5 }}>{err}</Text>
              </View>
            )}
          </ScrollView>

          <View style={mst.foot}>
            {isEdit ? (
              <Pressable onPress={remove} disabled={saving} style={mst.delBtn}>
                <Trash2 size={13} color="#FCA5A5" />
                <Text style={{ color: '#FCA5A5', fontFamily: FONTS.xbold, fontSize: 12 }}>Delete</Text>
              </Pressable>
            ) : <View />}
            <View style={{ flex: 1 }} />
            <SecondaryButton onPress={onClose}>
              <Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>Cancel</Text>
            </SecondaryButton>
            <GradientButton onPress={save} loading={saving}>
              <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 }}>
                {isEdit ? 'Save changes' : 'Create event'}
              </Text>
            </GradientButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={mst.label}>{label}</Text>
      {children}
    </View>
  );
}

function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
      {options.map((o) => {
        const active = o === value;
        return (
          <Pressable key={o} onPress={() => onChange(o)} style={[mst.segBtn, active && mst.segOn]}>
            <Text style={{ color: active ? '#fff' : SAC.muted, fontFamily: FONTS.xbold, fontSize: 11 }}>{o}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/* ─── Main view ─────────────────────────────────────────────────────── */

export function EventsView() {
  const { data, refresh } = usePortalData<typeof FALLBACK>('/admin/super/events', FALLBACK);
  const EVENTS = data?.items || [];
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>('all');
  const [q, setQ] = useState('');
<<<<<<< Updated upstream
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Ev | null>(null);
=======
  const [creating, setCreating] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', city: '', cat: 'WORKSHOP', kind: 'free', price: 0, capacity: 50 });
  const [eventDetail, setEventDetail] = useState<Ev | null>(null);
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState<any>({});
>>>>>>> Stashed changes
  const { toast, flash } = useToast();

  const list = useMemo(() => {
    return EVENTS.filter((e) => {
      if (tab === 'live'    && e.status !== 'live')    return false;
      if (tab === 'pending' && e.status !== 'pending') return false;
      if (tab === 'free'    && e.kind   !== 'free')    return false;
      if (tab === 'paid'    && e.kind   !== 'paid')    return false;
      if (q && !`${e.title} ${e.city} ${e.cat}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [EVENTS, tab, q]);

  const counts = {
    all: EVENTS.length,
    live: EVENTS.filter((e) => e.status === 'live').length,
    pending: EVENTS.filter((e) => e.status === 'pending').length,
    free: EVENTS.filter((e) => e.kind === 'free').length,
    paid: EVENTS.filter((e) => e.kind === 'paid').length,
  };
  const tabs = [
    { id: 'all',     label: 'All',     count: counts.all },
    { id: 'live',    label: 'Live',    count: counts.live },
    { id: 'pending', label: 'Pending', count: counts.pending },
    { id: 'free',    label: 'Free',    count: counts.free },
    { id: 'paid',    label: 'Paid',    count: counts.paid },
  ] as const;

  const cols = width >= 1280 ? 3 : width >= 760 ? 2 : 1;
  const totalRevenue = EVENTS.filter((e) => e.kind === 'paid').reduce((n, e) => n + (e.price || 0) * (e.attending || 0), 0);

<<<<<<< Updated upstream
  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit  = (e: Ev) => { setEditing(e); setModalOpen(true); };

  const reviewApprove = async (e: Ev) => {
    try {
      // bump start_date forward to mark "approved" (within 30-day live window)
      const sd = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16);
      await request(`/admin/super/events/${e.id}`, { method: 'PATCH', body: JSON.stringify({ title: e.title, start_date: sd }) });
      await refresh?.();
      flash('Event approved');
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.warn('approve failed', err?.message);
    }
=======
  const createEvent = async () => {
    if (!newEvent.title.trim() || !newEvent.date.trim()) return;
    try {
      await postPortal('/admin/super/events', { body: newEvent });
      flash('Event created successfully');
      setCreating(false);
      setNewEvent({ title: '', date: '', city: '', cat: 'WORKSHOP', kind: 'free', price: 0, capacity: 50 });
      refresh();
    } catch { flash('Failed to create event'); }
  };

  const approveEvent = async (id: string) => {
    try { await postPortal(`/admin/super/events/${id}/approve`); flash('Event approved'); refresh(); } catch { flash('Failed to approve'); }
  };

  const openEvent = (e: Ev) => {
    setEventDetail(e);
    setEdit(false);
    setDraft({});
  };
  const saveEvent = async () => {
    if (!eventDetail) return;
    try { await postPortal(`/admin/super/events/${eventDetail.id}`, { method: 'PATCH', body: draft }); flash('Event updated'); setEdit(false); setDraft({}); refresh(); } catch { flash('Failed to update'); }
  };
  const deleteEvent = async () => {
    if (!eventDetail) return;
    try { await postPortal(`/admin/super/events/${eventDetail.id}`, { method: 'DELETE' }); flash('Event deleted'); setEventDetail(null); refresh(); } catch { flash('Failed to delete'); }
>>>>>>> Stashed changes
  };

  return (
    <View style={{ gap: 14 }}>
      <Card>
        <View style={st.headRow}>
          <IconBox size={38}><CalIcon size={18} color={GRAD.to} /></IconBox>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.title}>Events</Text>
            <Text style={st.sub}>Manage live + upcoming events across all colleges. Approve new submissions and track attendance live.</Text>
          </View>
<<<<<<< Updated upstream
          <GradientButton onPress={openCreate}>
            <Plus size={13} color="#fff" />
            <Text style={st.btnText}>New event</Text>
          </GradientButton>
=======
          <GradientButton onPress={() => setCreating(true)}><Plus size={13} color="#fff" /><Text style={st.btnText}>New event</Text></GradientButton>
>>>>>>> Stashed changes
        </View>
      </Card>

      {/* KPIs */}
      <View style={st.kpiRow}>
        <KpiTile Icon={CalIcon}        label="TOTAL EVENTS"      value={String(counts.all)} />
        <KpiTile Icon={ShieldCheck}    label="LIVE NOW"          value={String(counts.live)}    delta="active"  deltaKind="success" />
        <KpiTile Icon={AlertTriangle}  label="PENDING APPROVAL"  value={String(counts.pending)} delta={counts.pending ? 'review' : 'clear'} deltaKind={counts.pending ? 'warn' : 'success'} />
        <KpiTile Icon={IndianRupee}    label="GROSS REVENUE"     value={`₹${(totalRevenue/1000).toFixed(0)}k`} delta="this period" deltaKind="info" />
      </View>

      {/* Tabs + search */}
      <Card>
        <View style={st.browseHead}>
          <TopTabs tabs={tabs as any} active={tab} onChange={setTab} />
          <SearchField value={q} onChange={setQ} placeholder="Search events…" />
        </View>
      </Card>

      {/* Grid */}
      {list.length === 0 ? (
        <Card>
          <EmptyState icon={Sparkles} title="No events match this filter" sub="Try clearing the search or switching tabs." />
        </Card>
      ) : (
        <View style={st.grid}>
          {list.map((e) => {
            const pct = Math.min(100, Math.round(((e.attending || 0) / (e.capacity || 1)) * 100));
            return (
              <View key={e.id} style={st.card}>
                <View style={[st.cover, { backgroundColor: e.accent + '22', borderColor: e.accent + '40' }]}>
                  <CalIcon size={28} color={e.accent} />
                </View>
                <View style={{ padding: 14, gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <StatusPill label={e.cat} kind="brand" />
                    <StatusPill
                      label={e.kind === 'free' ? 'FREE' : `₹${e.price}`}
                      kind={e.kind === 'free' ? 'success' : 'warn'}
                    />
                  </View>
                  <Text numberOfLines={2} style={st.cTitle}>{e.title}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <CalIcon size={11} color={SAC.muted} />
                    <Text style={st.meta}>{e.date}</Text>
                    <Text style={st.dot}>·</Text>
                    <MapPin size={11} color={SAC.muted} />
                    <Text style={st.meta}>{e.city}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <UsersIcon size={11} color={SAC.muted} />
                    <Text style={st.meta}>{e.attending}/{e.capacity} attending · {pct}%</Text>
                  </View>
                  <View style={st.barTrack}>
                    <LinearGradient colors={[GRAD.from, GRAD.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[st.barFill, { width: `${pct}%` as any }]} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    {e.status === 'pending'
<<<<<<< Updated upstream
                      ? <GradientButton onPress={() => reviewApprove(e)}><Text style={st.btnText}>Review & approve</Text></GradientButton>
                      : <SecondaryButton onPress={() => openEdit(e)}><Text style={st.secText}>Manage event</Text></SecondaryButton>
=======
                      ? <GradientButton onPress={() => approveEvent(e.id)}><Text style={st.btnText}>Review & approve</Text></GradientButton>
                      : <SecondaryButton onPress={() => openEvent(e)}><Text style={st.secText}>Manage event</Text></SecondaryButton>
>>>>>>> Stashed changes
                    }
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
<<<<<<< Updated upstream

      <EventModal
        visible={modalOpen}
        editing={editing}
        onClose={() => setModalOpen(false)}
        onSaved={() => { refresh?.(); flash(editing ? 'Event updated' : 'Event created'); }}
        onDeleted={() => { refresh?.(); flash('Event deleted'); }}
      />
=======
      {/* Create Event Modal */}
      <Modal visible={creating} transparent animationType="fade" onRequestClose={() => setCreating(false)}>
        <View style={st.modalBg}>
          <Animated.View entering={FadeInDown.duration(200)} style={[st.modalCard, { maxWidth: 420 }]}>
            <LinearGradient colors={GRAD.soft} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.modalHero}>
              <IconBox size={36}><CalIcon size={16} color={GRAD.to} /></IconBox>
              <View style={{ flex: 1 }}><Text style={st.modalTitle}>Create new event</Text><Text style={st.muted}>Fill in the details below.</Text></View>
              <Pressable onPress={() => setCreating(false)}><X size={16} color={SAC.muted} /></Pressable>
            </LinearGradient>
            <View style={{ padding: 18, gap: 12 }}>
              <TextInput value={newEvent.title} onChangeText={(v) => setNewEvent({ ...newEvent, title: v })} placeholder="Event title" placeholderTextColor={SAC.dim} style={st.input} />
              <TextInput value={newEvent.date} onChangeText={(v) => setNewEvent({ ...newEvent, date: v })} placeholder="Date (e.g. 2025-06-15)" placeholderTextColor={SAC.dim} style={st.input} />
              <TextInput value={newEvent.city} onChangeText={(v) => setNewEvent({ ...newEvent, city: v })} placeholder="City" placeholderTextColor={SAC.dim} style={st.input} />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                <SecondaryButton onPress={() => setCreating(false)}><Text style={st.secText}>Cancel</Text></SecondaryButton>
                <GradientButton onPress={createEvent} disabled={!newEvent.title.trim()}><Check size={13} color="#fff" /><Text style={st.btnText}>Create</Text></GradientButton>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Event Detail Modal */}
      <Modal visible={!!eventDetail} transparent animationType="fade" onRequestClose={() => setEventDetail(null)}>
        <View style={st.modalBg}>
          <Animated.View entering={FadeInDown.duration(220)} style={st.modalCard}>
            <LinearGradient colors={GRAD.soft} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.modalHero}>
              <View style={{ flex: 1, minWidth: 0 }}><Text style={st.modalTitle} numberOfLines={1}>{eventDetail?.title}</Text><Text style={st.muted}>{eventDetail?.date} · {eventDetail?.city}</Text></View>
              <Pressable onPress={() => setEventDetail(null)}><X size={16} color={SAC.muted} /></Pressable>
            </LinearGradient>
            <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={{ padding: 20, gap: 16 }}>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                <StatusPill kind="info" label={eventDetail?.cat?.toUpperCase() || 'EVENT'} />
                <StatusPill kind={eventDetail?.status === 'pending' ? 'warn' : 'success'} label={eventDetail?.status?.toUpperCase() || 'LIVE'} />
                <StatusPill kind={eventDetail?.kind === 'paid' ? 'info' : 'success'} label={eventDetail?.kind === 'paid' ? `₹${eventDetail?.price}` : 'FREE'} />
              </View>
              <View>
                <SectionLabel>ATTENDANCE</SectionLabel>
                <View style={{ marginTop: 8, gap: 6 }}>
                  <View style={st.detailRow}><UsersIcon size={13} color={SAC.muted} /><Text style={st.detailLabel}>Attending</Text><Text style={st.detailValue}>{eventDetail?.attending}/{eventDetail?.capacity}</Text></View>
                  <View style={st.detailRow}><MapPin size={13} color={SAC.muted} /><Text style={st.detailLabel}>City</Text><Text style={st.detailValue}>{eventDetail?.city || '—'}</Text></View>
                  <View style={st.detailRow}><CalIcon size={13} color={SAC.muted} /><Text style={st.detailLabel}>Date</Text><Text style={st.detailValue}>{eventDetail?.date || '—'}</Text></View>
                </View>
              </View>
              <View style={st.actionsRow}>
                {!edit ? (
                  <SecondaryButton onPress={() => setEdit(true)}><Pencil size={12} color={SAC.muted} /><Text style={st.secText}>Edit</Text></SecondaryButton>
                ) : (
                  <>
                    <SecondaryButton onPress={() => { setEdit(false); setDraft({}); }}><Text style={st.secText}>Cancel</Text></SecondaryButton>
                    <GradientButton onPress={saveEvent}><Check size={13} color="#fff" /><Text style={st.btnText}>Save</Text></GradientButton>
                  </>
                )}
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

>>>>>>> Stashed changes
      <Toast text={toast.text} visible={toast.visible} />
    </View>
  );
}

const st = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 16 },
  sub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4, lineHeight: 17, maxWidth: 760 },
  btnText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 },
  secText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 },
  muted: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12 },

  kpiRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  browseHead: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 14,
    ...(Platform.OS === 'web' ? ({ display: 'grid' as any, gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' as any, gap: 14 } as any) : {}),
  },
  card: {
    backgroundColor: '#1A0F05', borderColor: 'rgba(251,146,60,0.18)', borderWidth: 1, borderRadius: 16, overflow: 'hidden',
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 6px 24px rgba(0,0,0,0.45)' } as any) : {}),
  },
  cover: { height: 96, borderBottomWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 14.5, lineHeight: 18 },
  meta: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5 },
  dot: { color: SAC.dim, fontSize: 11 },
  barTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginTop: 2 },
  barFill: { height: '100%', borderRadius: 3 },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 560, maxHeight: '92%', backgroundColor: SAC.bg2, borderRadius: 16, borderWidth: 1, borderColor: SAC.border2, overflow: 'hidden' },
  modalHero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderBottomWidth: 1, borderBottomColor: SAC.border },
  modalTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 15 },
  input: { flex: 1, color: '#fff', fontFamily: FONTS.med, fontSize: 13, backgroundColor: SAC.cardSolid, borderRadius: 9, borderWidth: 1, borderColor: SAC.border, paddingHorizontal: 12, paddingVertical: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailLabel: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11.5, width: 100 },
  detailValue: { color: '#fff', fontFamily: FONTS.med, fontSize: 12.5, flex: 1 },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});

const mst = StyleSheet.create({
  bg: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  bgPress: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  card: {
    width: '100%', maxWidth: 620,
    backgroundColor: '#1A0F05', borderColor: 'rgba(251,146,60,0.20)', borderWidth: 1, borderRadius: 16,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 24px 60px rgba(0,0,0,0.5)' } as any) : {}),
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  title: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 15 },
  sub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 },
  closeBtn: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  label: { color: SAC.muted, fontFamily: FONTS.xbold, fontSize: 10.5, letterSpacing: 1.4 },
  input: {
    height: 38, paddingHorizontal: 12, color: '#fff', fontFamily: FONTS.med, fontSize: 13,
    backgroundColor: 'rgba(0,0,0,0.35)', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderRadius: 10,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  err: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(239,68,68,0.10)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.30)',
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
  },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  delBtn: {
    flexDirection: 'row', gap: 6, alignItems: 'center',
    paddingHorizontal: 12, height: 32, borderRadius: 9,
    backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.28)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  segBtn: {
    paddingHorizontal: 11, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  segOn: { backgroundColor: GRAD.to, borderColor: GRAD.from },
});
