/**
 * EventsPage — list + compose modal + edit + delete.
 */
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { Plus, Calendar, Users as UsersIcon, Edit3, Trash2, AlertTriangle, Save } from 'lucide-react-native';
import { request } from '@/src/models/services/api';
import { AdminLayout } from './AdminLayout';
import { GlassCard, StatusChip, ActionButton } from './primitives';
import { SlidePanel } from './SlidePanel';
import { ADMIN_THEME as T } from './theme';

export default function EventsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);  // existing event being edited
  const [confirmDel, setConfirmDel] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', date: '', location: '', capacity: '50' });

  const load = async () => {
    setLoading(true);
    try {
      const r = await request<{ items: any[] }>('/admin/events');
      setItems(r.items || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', description: '', date: '', location: '', capacity: '50' });
    setOpen(true);
  };

  const openEdit = (e: any) => {
    setEditing(e);
    setForm({
      title: e.title || '',
      description: e.description || '',
      date: e.date || '',
      location: e.location || '',
      capacity: String(e.capacity || 50),
    });
    setOpen(true);
  };

  const submit = async () => {
    setBusy(true);
    try {
      const payload = {
        title: form.title || 'Untitled Event',
        description: form.description,
        date: form.date || new Date().toISOString(),
        location: form.location || 'Online',
        capacity: parseInt(form.capacity, 10) || 50,
      };
      if (editing?.id) {
        await request(`/admin/events/${editing.id}`, { method: 'PATCH', body: payload } as any);
      } else {
        await request('/admin/events', { method: 'POST', body: payload } as any);
      }
      setOpen(false);
      setEditing(null);
      await load();
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!confirmDel?.id) return;
    setBusy(true);
    try {
      await request(`/admin/events/${confirmDel.id}`, { method: 'DELETE' } as any);
      setConfirmDel(null);
      await load();
    } finally { setBusy(false); }
  };

  return (
    <AdminLayout title="Events" subtitle="Hosted & upcoming events"
      rightAction={<ActionButton label="New event" icon={Plus} onPress={openCreate} testID="new-event-btn" />}
    >
      {loading && <View style={{ alignItems: 'center', padding: 60 }}><ActivityIndicator color={T.light} /></View>}
      <View style={styles.grid}>
        {!loading && items.map((e: any, i: number) => (
          <GlassCard key={e.id || i}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <View style={styles.eventIcon}><Calendar size={16} color={T.light} /></View>
              <Text style={styles.eventTitle} numberOfLines={1}>{e.title}</Text>
            </View>
            <Text style={styles.eventDesc} numberOfLines={2}>{e.description || 'No description provided.'}</Text>
            <View style={styles.eventMeta}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Calendar size={11} color="rgba(255,255,255,0.45)" />
                <Text style={styles.metaText}>{e.date ? new Date(e.date).toLocaleDateString() : 'TBD'}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <UsersIcon size={11} color="rgba(255,255,255,0.45)" />
                <Text style={styles.metaText}>{e.rsvp_count || 0} / {e.capacity || '\u221E'}</Text>
              </View>
              <StatusChip label={e.location || 'Online'} tone="warn" />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <ActionButton label="Edit" icon={Edit3} variant="ghost" onPress={() => openEdit(e)} testID={`event-edit-${i}`} />
              <ActionButton label="Delete" icon={Trash2} variant="danger" onPress={() => setConfirmDel(e)} testID={`event-delete-${i}`} />
            </View>
          </GlassCard>
        ))}
        {!loading && items.length === 0 && (
          <GlassCard style={{ alignItems: 'center', padding: 40 } as any}>
            <Calendar size={36} color={T.textMute} />
            <Text style={{ color: T.text, fontFamily: 'DMSans_700Bold', fontSize: 16, marginTop: 14 }}>No events yet</Text>
            <Text style={{ color: T.textMute, fontFamily: 'DMSans_500Medium', fontSize: 12, marginTop: 6 }}>Click "New event" to host the first one.</Text>
          </GlassCard>
        )}
      </View>

      <SlidePanel
        open={open}
        onClose={() => { setOpen(false); setEditing(null); }}
        title={editing ? 'Edit Event' : 'Compose Event'}
        subtitle={editing ? 'Update event details' : 'Broadcast a new event to your community'}
        footer={<>
          <ActionButton label="Cancel" variant="ghost" onPress={() => { setOpen(false); setEditing(null); }} />
          <View style={{ flex: 1 }} />
          <ActionButton label={busy ? 'Saving…' : (editing ? 'Save' : 'Publish')} icon={Save} onPress={submit} testID="publish-event-btn" />
        </>}
      >
        <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
        <Field label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} multiline />
        <Field label="Date / Time (ISO)" value={form.date} onChange={(v) => setForm({ ...form, date: v })} placeholder="2026-06-12T10:00" />
        <Field label="Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} placeholder="Online" />
        <Field label="Capacity" value={form.capacity} onChange={(v) => setForm({ ...form, capacity: v })} />
      </SlidePanel>

      {/* Delete confirmation panel */}
      <SlidePanel
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        title="Delete Event?"
        subtitle={confirmDel?.title}
        footer={<>
          <ActionButton label="Cancel" variant="ghost" onPress={() => setConfirmDel(null)} />
          <View style={{ flex: 1 }} />
          <ActionButton label={busy ? 'Deleting…' : 'Yes, delete'} variant="danger" icon={Trash2} onPress={remove} testID="event-confirm-delete" />
        </>}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={18} color={T.bad} />
          <Text style={{ color: T.text, fontFamily: 'DMSans_700Bold', fontSize: 14 }}>Permanent deletion</Text>
        </View>
        <Text style={{ color: T.textDim, fontFamily: 'DMSans_400Regular', fontSize: 13, marginTop: 12, lineHeight: 20 }}>
          This will permanently remove "{confirmDel?.title}" and all its RSVPs. This cannot be undone.
        </Text>
      </SlidePanel>
    </AdminLayout>
  );
}

function Field({ label, value, onChange, multiline, placeholder }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; placeholder?: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.30)"
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        style={[styles.input, multiline && { minHeight: 90, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { ...({ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 } as any) },
  eventIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: T.glassMd, borderColor: T.borderMd, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  eventTitle: { color: T.text, fontFamily: 'DMSans_700Bold', fontSize: 14, flex: 1 },
  eventDesc: { color: 'rgba(255,255,255,0.65)', fontFamily: 'DMSans_400Regular', fontSize: 12, lineHeight: 18, marginBottom: 12 },
  eventMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginTop: 8 },
  metaText: { color: 'rgba(255,255,255,0.65)', fontFamily: 'DMSans_500Medium', fontSize: 11.5 },
  fieldLabel: { color: T.textMute, fontFamily: 'DMSans_700Bold', fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  input: {
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: T.glass, borderColor: T.border, borderWidth: 1, borderRadius: 10,
    color: T.text, fontFamily: 'DMSans_500Medium', fontSize: 13,
    ...({ outlineStyle: 'none' } as any),
  },
});
