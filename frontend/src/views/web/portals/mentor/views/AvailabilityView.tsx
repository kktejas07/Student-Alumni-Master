/**
 * Mentor → Availability — set weekly recurring slots.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, Platform } from 'react-native';
import { Clock, CheckCircle, Plus, X } from 'lucide-react-native';
import { MC, FONTS } from '../tokens';
import { useCurrentUser } from '@/src/lib/useCurrentUser';
import { request } from '@/src/models/services/api';
import { useToast } from '@/src/views/components';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type Slot = { day: string; start_time: string; end_time: string };

export function AvailabilityView() {
  const toast = useToast();
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
      const j = await request<{ ok?: boolean }>('/mentor/availability', {
        method: 'POST',
        body: { mentor_email: email, slots },
      });
      if (j.ok) {
        setSavedAt(new Date().toLocaleTimeString());
        toast.success('Availability saved');
      } else {
        toast.error('Save failed', 'Could not update availability.');
      }
    } catch (e: any) {
      toast.error('Save failed', e?.message || 'Please try again.');
    } finally { setSaving(false); }
  };

  return (
    <View className="gap-4">
      <View>
        <Text className="text-white font-display-bold text-[22px] tracking-[-0.4px]">Set Availability</Text>
        <Text className="text-muted font-body-semibold text-[12.5px] mt-1">Weekly recurring slots for {email}</Text>
      </View>

      <View className="gap-2">
        {slots.map((slot, i) => (
          <View key={i} className="flex-row items-center gap-2 bg-card border border-glass-border rounded-xl p-3 flex-wrap">
            <View className="w-8 h-8 rounded-lg items-center justify-center" style={{ backgroundColor: 'rgba(94,234,212,0.10)', borderColor: 'rgba(94,234,212,0.30)', borderWidth: 1 }}>
              <Clock size={16} color={MC.tealP} />
            </View>
            <View className="flex-row gap-1 flex-1 flex-wrap">
              {DAYS.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => updateSlot(i, 'day', d)}
                  className="px-[9px] h-7 rounded-md items-center justify-center border"
                  style={slot.day === d
                    ? { backgroundColor: MC.tealP, borderColor: MC.tealP }
                    : { backgroundColor: MC.card, borderColor: MC.border }
                  }
                >
                  <Text className="text-[11px] font-body-bold" style={{ color: slot.day === d ? '#fff' : MC.muted }}>{d.slice(0, 3)}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput value={slot.start_time} onChangeText={(t) => updateSlot(i, 'start_time', t)} className="w-[70px] h-8 rounded-lg border px-2 text-white font-body-semibold text-[12.5px]" style={{ borderColor: MC.border, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}) }} placeholder="09:00" placeholderTextColor={MC.dim} />
            <Text className="text-muted">—</Text>
            <TextInput value={slot.end_time} onChangeText={(t) => updateSlot(i, 'end_time', t)} className="w-[70px] h-8 rounded-lg border px-2 text-white font-body-semibold text-[12.5px]" style={{ borderColor: MC.border, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}) }} placeholder="17:00" placeholderTextColor={MC.dim} />
            <Pressable onPress={() => removeSlot(i)} className="w-[30px] h-[30px] rounded-lg items-center justify-center border" style={{ borderColor: '#EF444466', ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}) }}>
              <X size={13} color="#EF4444" />
            </Pressable>
          </View>
        ))}
      </View>

      <Pressable onPress={addSlot} className="flex-row items-center gap-1.5 px-[14px] h-[34px] rounded-[10px] bg-card border border-glass-border self-start" style={Platform.OS === 'web' ? { cursor: 'pointer' } as any : undefined}>
        <Plus size={13} color={MC.tealP} />
        <Text className="text-tealP font-body-bold text-xs">Add Slot</Text>
      </Pressable>

      <View className="flex-row gap-2.5 items-center">
        <Pressable
          onPress={save}
          disabled={saving}
          className="flex-row items-center gap-1.5 px-4 h-[38px] rounded-[10px] bg-tealP"
          style={({ hovered }: any) => ({
            cursor: 'pointer',
            ...(hovered ? { transform: [{ translateY: -1 }] } : {}),
            ...(saving ? { opacity: 0.6 } : {}),
          })}
        >
          <CheckCircle size={13} color={MC.bg} />
          <Text className="text-bg font-display-bold text-[13px]">{saving ? 'Saving…' : `Save ${slots.length} Slot${slots.length === 1 ? '' : 's'}`}</Text>
        </Pressable>
        {savedAt && <Text className="text-green font-body-bold text-xs">✓ Saved at {savedAt}</Text>}
      </View>
    </View>
  );
}
