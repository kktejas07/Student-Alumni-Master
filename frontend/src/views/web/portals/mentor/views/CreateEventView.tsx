/**
 * Mentor Portal — Create Event view: event form + AI generator + my events list.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { Sparkles, Plus, Calendar as CalIcon, Users as UsersIcon } from 'lucide-react-native';
import { MC, FONTS } from '../tokens';
import { Badge } from '../atoms';
import { MY_EVENTS } from '../data';

export function CreateEventView() {
  const { width } = useWindowDimensions();
  const stack = width < 980;

  const [title, setTitle]   = useState('');
  const [date,  setDate]    = useState('');
  const [time,  setTime]    = useState('');
  const [seats, setSeats]   = useState('30');
  const [price, setPrice]   = useState('');
  const [desc,  setDesc]    = useState('');
  const [aiBusy, setAiBusy] = useState(false);

  const aiGenerate = () => {
    setAiBusy(true);
    setTimeout(() => {
      setTitle('System Design Live: Building Notifications at Scale');
      setDesc('A 90-minute live deep dive into the architectural patterns behind a fan-out notification system. Q&A + whiteboard + real outage stories.');
      setSeats('40');
      setAiBusy(false);
    }, 800);
  };

  const create = () => {
    if (!title) { alert('Add a title first'); return; }
    alert('Event created (mock). It would be saved to /api/catalog/events.');
    setTitle(''); setDate(''); setTime(''); setSeats('30'); setPrice(''); setDesc('');
  };

  return (
    <View style={{ flexDirection: stack ? 'column' : 'row', gap: 16 }}>
      {/* Form */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={s.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={s.cardTitle}>New Event</Text>
            <Pressable onPress={aiGenerate} style={s.aiCta}>
              <Sparkles size={13} color="#FCD34D" />
              <Text style={{ color: '#FCD34D', fontFamily: FONTS.bold, fontSize: 12 }}>{aiBusy ? 'Generating…' : 'AI Suggest'}</Text>
            </Pressable>
          </View>

          <Field label="Event Title" value={title} onChangeText={setTitle} placeholder="e.g. AMA: Career in Big Tech" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Field label="Date" value={date} onChangeText={setDate} placeholder="May 30, 2026" /></View>
            <View style={{ flex: 1 }}><Field label="Time" value={time} onChangeText={setTime} placeholder="19:00" /></View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Field label="Capacity" value={seats} onChangeText={setSeats} keyboardType="numeric" placeholder="30" /></View>
            <View style={{ flex: 1 }}><Field label="Price (₹) — leave blank for free" value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="0" /></View>
          </View>
          <Field label="Description" value={desc} onChangeText={setDesc} multiline placeholder="Tell students what they will get out of it…" />

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
            <Pressable onPress={create} style={s.primaryCta}><Plus size={14} color={MC.bg} /><Text style={{ color: MC.bg, fontFamily: FONTS.xbold, fontSize: 12 }}>Publish Event</Text></Pressable>
            <Pressable onPress={() => alert('Saved as draft')} style={s.outlineCta}><Text style={{ color: MC.tealP, fontFamily: FONTS.bold, fontSize: 12 }}>Save Draft</Text></Pressable>
          </View>
        </View>
      </View>

      {/* Right column: my events */}
      <View style={{ width: stack ? '100%' : 320, gap: 12 }}>
        <View style={s.card}>
          <Text style={s.cardTitle}>My Upcoming Events</Text>
          {MY_EVENTS.map((e) => {
            const pct = Math.round((e.registered / e.seats) * 100);
            return (
              <View key={e.id} style={s.evRow}>
                <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13 }}>{e.title}</Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 }}>
                  <CalIcon size={11} color={MC.dim} />
                  <Text style={{ color: MC.dim, fontFamily: FONTS.med, fontSize: 11 }}>{e.date} · {e.time}</Text>
                  <Badge label={e.type === 'paid' ? `₹${e.price}` : 'Free'} color={e.type === 'paid' ? 'green' : 'teal'} />
                </View>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8 }}>
                  <UsersIcon size={11} color={MC.muted} />
                  <Text style={{ color: MC.muted, fontFamily: FONTS.bold, fontSize: 11 }}>{e.registered} / {e.seats} registered</Text>
                </View>
                <View style={s.barTrack}><View style={[s.barFill, { width: `${pct}%` as any }]} /></View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function Field({ label, ...rest }: any) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={s.label}>{label}</Text>
      <View style={[s.inputBox, rest.multiline && { minHeight: 80 }]}>
        <TextInput placeholderTextColor={MC.dim} {...rest} style={s.input} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 18 },
  cardTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 14, marginBottom: 4 },
  label: { color: MC.muted, fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 0.4, marginBottom: 5 },
  inputBox: { backgroundColor: MC.bg2, borderColor: MC.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  input: { color: '#fff', fontFamily: FONTS.med, fontSize: 13.5, paddingVertical: 8, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  primaryCta: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, height: 38, borderRadius: 10, backgroundColor: MC.tealP, marginTop: 6 },
  outlineCta: { paddingHorizontal: 16, height: 38, borderRadius: 10, borderWidth: 1, borderColor: MC.border2, backgroundColor: 'rgba(20,184,166,0.07)', alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  aiCta: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 30, borderRadius: 8, backgroundColor: 'rgba(252,211,77,0.10)', borderWidth: 1, borderColor: 'rgba(252,211,77,0.30)' },
  evRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: MC.border },
  barTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginTop: 6 },
  barFill: { height: '100%', backgroundColor: MC.tealP, borderRadius: 2 },
});
