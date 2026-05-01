/**
 * Mentor → Availability — set weekly recurring slots.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Platform } from 'react-native';
import { Clock, CheckCircle, Plus, X } from 'lucide-react-native';
import { MC, FONTS } from '../tokens';
import { useCurrentUser } from '@/src/lib/useCurrentUser';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type Slot = { day: string; start_time: string; end_time: string };

export function AvailabilityView() {
  const { email } = useCurrentUser('mentor-active1@persona.demo');
  const [slots, setSlots] = useState<Slot[]>([
    { day: 'Monday', start_time: '09:00', end_time: '17:00' },
    { day: 'Wednesday', start_time: '14:00', end_time: '18:00' },
    { day: 'Friday', start_time: '10:00', end_time: '16:00' },
  ]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const addSlot = () => setSlots([...slots, { day: 'Monday', start_time: '09:00', end_time: '17:00' }]);
  const removeSlot = (i: number) => setSlots(slots.filter((_, idx) => idx !== i));
  const updateSlot = (i: number, key: keyof Slot, val: string) =>
    setSlots(slots.map((s, idx) => (idx === i ? { ...s, [key]: val } : s)));

  const save = async () => {
    try {
      setSaving(true);
      const base = (process.env.EXPO_PUBLIC_BACKEND_URL || '').replace(/\/$/, '');
      const res = await fetch(`${base}/api/mentor/availability`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mentor_email: email, slots }),
      });
      const j = await res.json();
      if (j.ok) setSavedAt(new Date().toLocaleTimeString());
    } finally { setSaving(false); }
  };

  return (
    <View style={{ gap: 16 }}>
      <View>
        <Text style={s.h1}>Set Availability</Text>
        <Text style={s.sub}>Weekly recurring slots for {email}</Text>
      </View>

      <View style={{ gap: 8 }}>
        {slots.map((slot, i) => (
          <View key={i} style={s.row}>
            <View style={s.iconBox}><Clock size={16} color={MC.tealP} /></View>
            <View style={s.dayPicker}>
              {DAYS.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => updateSlot(i, 'day', d)}
                  style={[s.dayChip, slot.day === d && s.dayChipOn]}
                >
                  <Text style={{ color: slot.day === d ? '#fff' : MC.muted, fontFamily: FONTS.bold, fontSize: 11 }}>{d.slice(0, 3)}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput value={slot.start_time} onChangeText={(t) => updateSlot(i, 'start_time', t)} style={s.timeInput} placeholder="09:00" placeholderTextColor={MC.dim} />
            <Text style={s.dash}>—</Text>
            <TextInput value={slot.end_time} onChangeText={(t) => updateSlot(i, 'end_time', t)} style={s.timeInput} placeholder="17:00" placeholderTextColor={MC.dim} />
            <Pressable onPress={() => removeSlot(i)} style={s.removeBtn}>
              <X size={13} color="#EF4444" />
            </Pressable>
          </View>
        ))}
      </View>

      <Pressable onPress={addSlot} style={({ hovered }: any) => [s.addBtn, hovered && { backgroundColor: MC.cardH }]}>
        <Plus size={13} color={MC.tealP} />
        <Text style={s.addText}>Add Slot</Text>
      </Pressable>

      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <Pressable
          onPress={save}
          disabled={saving}
          style={({ hovered }: any) => [s.saveBtn, hovered && { transform: [{ translateY: -1 }] }, saving && { opacity: 0.6 }]}
        >
          <CheckCircle size={13} color={MC.bg} />
          <Text style={s.saveText}>{saving ? 'Saving…' : `Save ${slots.length} Slot${slots.length === 1 ? '' : 's'}`}</Text>
        </Pressable>
        {savedAt && <Text style={{ color: '#22C55E', fontFamily: FONTS.bold, fontSize: 12 }}>✓ Saved at {savedAt}</Text>}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  h1: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 22, letterSpacing: -0.4 },
  sub: { color: MC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 12, padding: 12, flexWrap: 'wrap' },
  iconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(94,234,212,0.10)', borderColor: 'rgba(94,234,212,0.30)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dayPicker: { flexDirection: 'row', gap: 4, flex: 1, flexWrap: 'wrap' },
  dayChip: { paddingHorizontal: 9, height: 28, borderRadius: 6, backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dayChipOn: { backgroundColor: MC.tealP, borderColor: MC.tealP },
  timeInput: { width: 70, height: 32, borderRadius: 8, borderColor: MC.border, borderWidth: 1, paddingHorizontal: 8, color: '#fff', fontFamily: FONTS.med, fontSize: 12.5, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  dash: { color: MC.muted },
  removeBtn: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderColor: '#EF444466', borderWidth: 1, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 34, borderRadius: 10, backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, alignSelf: 'flex-start', ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  addText: { color: MC.tealP, fontFamily: FONTS.bold, fontSize: 12 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, height: 38, borderRadius: 10, backgroundColor: MC.tealP, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  saveText: { color: MC.bg, fontFamily: FONTS.xbold, fontSize: 13 },
});
