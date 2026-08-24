import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Platform } from 'react-native';
import { Calendar, CheckCircle, Sparkles } from 'lucide-react-native';
import { CC } from '../tokens';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { request } from '@/src/models/services/api';
import { useRouter } from 'expo-router';
import { useToast } from '@/src/views/components';

const MODES = ['Online', 'In-person', 'Hybrid'];
const CATEGORIES = ['Workshop', 'Hackathon', 'Career Fair', 'Talk', 'Networking'];

export function CreateEventView({ onNavigate }: { onNavigate?: (id: any) => void }) {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const email = user?.email || 'college-high1@persona.demo';
  const initialCollegeName = user?.college_info?.institution_name || user?.school_info?.institution_name || 'IIT Bombay';

  const [title, setTitle] = useState('AI/ML Workshop 2026');
  const [category, setCategory] = useState('Workshop');
  const [mode, setMode] = useState('Hybrid');
  const [collegeName, setCollegeName] = useState(initialCollegeName);
  const [startDate, setStartDate] = useState('');
  const [capacity, setCapacity] = useState('200');
  const [price, setPrice] = useState('0');
  const [creating, setCreating] = useState(false);
  const [createdEvent, setCreatedEvent] = useState<any>(null);

  const create = async () => {
    if (!title.trim()) {
      toast.error('Title required', 'Please enter an event title.');
      return;
    }
    try {
      setCreating(true);
      const sd = startDate || new Date(Date.now() + 14 * 86400000).toISOString();
      const j = await request<any>('/college/events', {
        method: 'POST',
        body: {
          title, category, mode, college_name: collegeName,
          start_date: sd, capacity: parseInt(capacity, 10) || 100, price: parseInt(price, 10) || 0,
        },
      });
      setCreatedEvent({ ...j, title, category, mode });
      toast.success('Event created', `"${title.trim()}" has been published.`);
      setTimeout(() => {
        onNavigate?.('events');
      }, 1500);
    } catch (e: any) {
      toast.error('Create failed', e?.message || 'Please try again.');
    } finally { setCreating(false); }
  };

  return (
    <View className="gap-4 max-w-[760px]">
      <View>
        <Text className="text-text font-display-bold text-[22px] tracking-tight">Create Event</Text>
        <Text className="text-muted font-body text-[12.5px] mt-1">Acting as {email}</Text>
      </View>

      <View className="bg-glass-soft border border-glass-border rounded-[14px] p-[18px] gap-[14px]">
        <Field label="Event Title">
          <TextInput value={title} onChangeText={setTitle}
            className="h-9 rounded-[10px] border border-glass-border px-3 text-text font-body text-[13px] bg-bg"
            placeholder="e.g. AI/ML Workshop 2026" placeholderTextColor={CC.dim}
            style={Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}} />
        </Field>

        <Field label="College Name">
          <TextInput value={collegeName} onChangeText={setCollegeName}
            className="h-9 rounded-[10px] border border-glass-border px-3 text-text font-body text-[13px] bg-bg"
            placeholder="e.g. IIT Bombay" placeholderTextColor={CC.dim}
            style={Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}} />
        </Field>

        <Field label="Category">
          <View className="flex-row gap-[6px] flex-wrap">
            {CATEGORIES.map((c) => (
              <Pressable key={c} onPress={() => setCategory(c)}
                className={`px-3 h-[30px] rounded-lg border items-center justify-center ${category === c ? 'bg-teal border-teal' : 'bg-bg border-glass-border'}`}>
                <Text className={`font-body-bold text-xs ${category === c ? 'text-text' : 'text-muted'}`}>{c}</Text>
              </Pressable>
            ))}
          </View>
        </Field>

        <Field label="Mode">
          <View className="flex-row gap-[6px] flex-wrap">
            {MODES.map((m) => (
              <Pressable key={m} onPress={() => setMode(m)}
                className={`px-3 h-[30px] rounded-lg border items-center justify-center ${mode === m ? 'bg-teal border-teal' : 'bg-bg border-glass-border'}`}>
                <Text className={`font-body-bold text-xs ${mode === m ? 'text-text' : 'text-muted'}`}>{m}</Text>
              </Pressable>
            ))}
          </View>
        </Field>

        <View className="flex-row gap-3 flex-wrap">
          <View className="flex-1 min-w-[150px]">
            <Field label="Capacity">
              <TextInput value={capacity} onChangeText={setCapacity} keyboardType="numeric"
                className="h-9 rounded-[10px] border border-glass-border px-3 text-text font-body text-[13px] bg-bg"
                placeholder="200" placeholderTextColor={CC.dim}
                style={Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}} />
            </Field>
          </View>
          <View className="flex-1 min-w-[150px]">
            <Field label="Price (₹)">
              <TextInput value={price} onChangeText={setPrice} keyboardType="numeric"
                className="h-9 rounded-[10px] border border-glass-border px-3 text-text font-body text-[13px] bg-bg"
                placeholder="0 = Free" placeholderTextColor={CC.dim}
                style={Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}} />
            </Field>
          </View>
        </View>

        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={create}
            disabled={creating || !!createdEvent || !title || !collegeName}
            className={`flex-row gap-[6px] items-center px-[18px] h-10 rounded-[10px] bg-teal ${(creating || !!createdEvent || !title || !collegeName) ? 'opacity-50' : ''}`}
            style={Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}}>
            <Sparkles size={13} color={CC.bg} />
            <Text className="text-bg font-display-bold text-[13px]">{creating ? 'Creating…' : createdEvent ? 'Created!' : 'Create Event'}</Text>
          </Pressable>
          
          {createdEvent && (
            <>
              <View className="flex-row items-center gap-[6px] px-3 py-[7px] rounded-lg bg-[rgba(34,197,94,0.10)] border border-[rgba(34,197,94,0.30)]">
                <CheckCircle size={14} color="#22C55E" />
                <Text className="text-green-500 font-body-bold text-xs">
                  {createdEvent.title}
                </Text>
              </View>
              
              <Pressable
                onPress={() => {
                   const router = require('expo-router').router;
                   router.push(`/manage-event/${createdEvent.event_id}`);
                }}
                className={`flex-row gap-[6px] items-center px-[18px] h-10 rounded-[10px] bg-glass-soft border border-glass-border`}
                style={Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}}>
                <Text className="text-text font-body-bold text-xs">Manage Event →</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text className="text-muted font-display-bold text-[11px] tracking-wider mb-[6px]">{label}</Text>
      {children}
    </View>
  );
}
