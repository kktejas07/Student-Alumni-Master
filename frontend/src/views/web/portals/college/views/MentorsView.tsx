import React, { useState } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { CC } from '../tokens';
import { Av, Badge } from '../atoms';
import { usePortalData, postPortal } from '@/src/lib/portalApi';
import { useToast } from '@/src/views/components';

type Mentor = { id: string; name: string; initials: string; role: string; company: string; status: string; sessions: number; rating: number; color: string };
const FALLBACK = { items: [] as Mentor[] };

export function MentorsView() {
  const toast = useToast();
  const { data } = usePortalData<typeof FALLBACK>('/college/mentors', FALLBACK);
  const [actioned, setActioned] = useState<Record<string, string>>({});
  const MENTORS = (data?.items || []).filter((m) => !actioned[m.id]);
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<'active'|'pending'>('active');
  const list = MENTORS.filter((m) => (tab === 'active' ? m.status === 'approved' : m.status === 'pending'));

  const onApprove = async (id: string) => {
    setActioned((p) => ({ ...p, [id]: 'approved' }));
    try {
      await postPortal(`/admin/super/approvals/${id}/approve`);
      toast.success('Mentor approved', 'The mentor is now active.');
    } catch (e: any) {
      setActioned((p) => { const n = { ...p }; delete n[id]; return n; });
      toast.error('Approve failed', e?.message || 'Please try again.');
    }
  };
  const onReject = async (id: string) => {
    setActioned((p) => ({ ...p, [id]: 'rejected' }));
    try {
      await postPortal(`/admin/super/approvals/${id}/reject`);
      toast.success('Mentor rejected', 'The request has been declined.');
    } catch (e: any) {
      setActioned((p) => { const n = { ...p }; delete n[id]; return n; });
      toast.error('Reject failed', e?.message || 'Please try again.');
    }
  };

  return (
    <View>
      <View className="flex-row gap-1.5 mb-4">
        {(['active','pending'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)}
            className={`flex-row gap-2 px-[14px] h-9 rounded-[10px] border-b-2 items-center ${tab === t ? 'border-violet bg-[rgba(99,102,241,0.10)]' : 'border-transparent'}`}>
            <Text className={`font-body-bold text-xs capitalize ${tab === t ? 'text-text' : 'text-muted'}`}>{t}</Text>
            <View className="bg-[rgba(255,255,255,0.06)] px-[7px] py-[1px] rounded-md">
              <Text className="text-muted font-display-bold text-[10px]">{MENTORS.filter((m) => (t === 'active' ? m.status === 'approved' : m.status === 'pending')).length}</Text>
            </View>
          </Pressable>
        ))}
      </View>
      <View className="gap-[10px]">
        {list.map((m) => (
          <View key={m.id} className="flex-row items-center gap-3 bg-glass-soft border border-glass-border rounded-xl p-[14px]">
            <Av initials={m.initials} size={42} color={m.color} />
            <View className="flex-1 min-w-0">
              <Text numberOfLines={1} className="text-text font-body-bold text-[13.5px]">{m.name}</Text>
              <Text numberOfLines={1} className="text-muted font-body text-[11.5px] mt-[2px]">{m.role} at {m.company}</Text>
              {tab === 'active' && <Text className="text-dim font-body text-[11px] mt-1">{m.sessions} sessions · {m.rating}★</Text>}
            </View>
            {tab === 'pending' ? (
              <View className="flex-row gap-1.5">
                <Pressable className="flex-row gap-[6px] items-center px-3 h-8 rounded-lg bg-green-500" onPress={() => onApprove(m.id)}>
                  <Check size={13} color="#fff" /><Text className="text-text font-display-bold text-[11.5px]">Approve</Text>
                </Pressable>
                <Pressable className="flex-row gap-[6px] items-center px-3 h-8 rounded-lg border border-[rgba(239,68,68,0.40)] bg-[rgba(239,68,68,0.10)]" onPress={() => onReject(m.id)}>
                  <X size={13} color={CC.red} /><Text className="font-body-bold text-[11.5px]" style={{ color: CC.red }}>Reject</Text>
                </Pressable>
              </View>
            ) : (
              <Badge label="Active" color="green" />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
