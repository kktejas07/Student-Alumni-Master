/**
 * College → Create Event — POST /api/college/events.
 */
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Platform } from 'react-native';
import { Calendar, CheckCircle, Sparkles } from 'lucide-react-native';
import { CC, FONTS } from '../tokens';
import { useCurrentUser } from '@/src/lib/useCurrentUser';

const MODES = ['Online', 'In-person', 'Hybrid'];
const CATEGORIES = ['Workshop', 'Hackathon', 'Career Fair', 'Talk', 'Networking'];

export function CreateEventView() {
  const { email } = useCurrentUser('college-high1@persona.demo');
  const [title, setTitle] = useState('AI/ML Workshop 2026');
  const [category, setCategory] = useState('Workshop');
  const [mode, setMode] = useState('Hybrid');
  const [collegeName, setCollegeName] = useState('IIT Bombay');
  const [startDate, setStartDate] = useState('');
  const [capacity, setCapacity] = useState('200');
  const [price, setPrice] = useState('0');
  const [creating, setCreating] = useState(false);
  const [createdEvent, setCreatedEvent] = useState<any>(null);

  const create = async () => {
    try {
      setCreating(true);
      const base = (process.env.EXPO_PUBLIC_BACKEND_URL || '').replace(/\/$/, '');
      const sd = startDate || new Date(Date.now() + 14 * 86400000).toISOString();
      const res = await fetch(`${base}/api/college/events`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, category, mode, college_name: collegeName,
          start_date: sd, capacity: parseInt(capacity, 10) || 100, price: parseInt(price, 10) || 0,
        }),
      });
      const j = await res.json();
      if (j.ok) setCreatedEvent({ ...j, title, category, mode });
    } finally { setCreating(false); }
  };

  return (
    <View style={{ gap: 16, maxWidth: 760 }}>
      <View>
        <Text style={s.h1}>Create Event</Text>
        <Text style={s.sub}>Acting as {email}</Text>
      </View>

      <View style={s.card}>
        <Field label="Event Title">
          <TextInput value={title} onChangeText={setTitle} style={s.input} placeholder="e.g. AI/ML Workshop 2026" placeholderTextColor={CC.dim} />
        </Field>

        <Field label="College Name">
          <TextInput value={collegeName} onChangeText={setCollegeName} style={s.input} placeholder="e.g. IIT Bombay" placeholderTextColor={CC.dim} />
        </Field>

        <Field label="Category">
          <View style={s.chipRow}>
            {CATEGORIES.map((c) => (
              <Pressable key={c} onPress={() => setCategory(c)} style={[s.chip, category === c && s.chipOn]}>
                <Text style={{ color: category === c ? '#fff' : CC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>{c}</Text>
              </Pressable>
            ))}
          </View>
        </Field>

        <Field label="Mode">
          <View style={s.chipRow}>
            {MODES.map((m) => (
              <Pressable key={m} onPress={() => setMode(m)} style={[s.chip, mode === m && s.chipOn]}>
                <Text style={{ color: mode === m ? '#fff' : CC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>{m}</Text>
              </Pressable>
            ))}
          </View>
        </Field>

        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
          <View style={{ flex: 1, minWidth: 150 }}>
            <Field label="Capacity">
              <TextInput value={capacity} onChangeText={setCapacity} keyboardType="numeric" style={s.input} placeholder="200" placeholderTextColor={CC.dim} />
            </Field>
          </View>
          <View style={{ flex: 1, minWidth: 150 }}>
            <Field label="Price (₹)">
              <TextInput value={price} onChangeText={setPrice} keyboardType="numeric" style={s.input} placeholder="0 = Free" placeholderTextColor={CC.dim} />
            </Field>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            onPress={create}
            disabled={creating || !title || !collegeName}
            style={({ hovered }: any) => [s.createBtn, hovered && { transform: [{ translateY: -1 }] }, (creating || !title || !collegeName) && { opacity: 0.5 }]}
          >
            <Sparkles size={13} color={CC.bg} />
            <Text style={s.createText}>{creating ? 'Creating…' : 'Create Event'}</Text>
          </Pressable>
          {createdEvent && (
            <View style={s.successBox}>
              <CheckCircle size={14} color="#22C55E" />
              <Text style={{ color: '#22C55E', fontFamily: FONTS.bold, fontSize: 12 }}>
                {createdEvent.title} · id {createdEvent.event_id}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={s.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  h1: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 22, letterSpacing: -0.4 },
  sub: { color: CC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4 },
  card: { backgroundColor: CC.card, borderColor: CC.border, borderWidth: 1, borderRadius: 14, padding: 18, gap: 14 },
  fieldLabel: { color: CC.muted, fontFamily: FONTS.xbold, fontSize: 11, letterSpacing: 0.7, marginBottom: 6 },
  input: { height: 38, borderRadius: 10, borderColor: CC.border, borderWidth: 1, paddingHorizontal: 12, color: '#fff', fontFamily: FONTS.med, fontSize: 13, backgroundColor: CC.bg, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, height: 30, borderRadius: 8, backgroundColor: CC.bg, borderColor: CC.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: CC.accentBright, borderColor: CC.accentBright },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, height: 40, borderRadius: 10, backgroundColor: CC.accentBright, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  createText: { color: CC.bg, fontFamily: FONTS.xbold, fontSize: 13 },
  successBox: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: 'rgba(34,197,94,0.10)', borderColor: 'rgba(34,197,94,0.30)', borderWidth: 1 },
});
