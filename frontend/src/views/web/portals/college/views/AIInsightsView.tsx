import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Sparkles, AlertTriangle, TrendingUp, Lightbulb, Zap } from 'lucide-react-native';
import { CC } from '../tokens';
import { Badge } from '../atoms';
import { usePortalData, postPortal } from '@/src/lib/portalApi';
import { useToast } from '@/src/views/components';

type Insight = { id: string; kind: 'risk'|'opportunity'|'insight'; icon: string; color: string; title: string; body: string };
const ICON_MAP: Record<string, any> = { AlertTriangle, TrendingUp, Lightbulb, Zap };
const FALLBACK = { items: [] as Insight[] };

export function AIInsightsView() {
  const toast = useToast();
  const { data } = usePortalData<typeof FALLBACK>('/college/ai-insights', FALLBACK);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const items = (data?.items || []).filter((i) => !dismissed.has(i.id));
  const onDismiss = async (id: string) => {
    setDismissed((p) => new Set(p).add(id));
    try {
      await postPortal(`/admin/super/ai-insights/${id}/dismiss`);
      toast.success('Insight dismissed');
    } catch (e: any) {
      setDismissed((p) => { const n = new Set(p); n.delete(id); return n; });
      toast.error('Dismiss failed', e?.message || 'Please try again.');
    }
  };
  return (
    <View>
      <View className="flex-row gap-3 p-[14px] mb-[14px] rounded-[14px] bg-[rgba(34,211,238,0.06)] border border-glass-border">
        <View className="w-9 h-9 rounded-[10px] bg-[rgba(34,211,238,0.15)] border border-[rgba(34,211,238,0.30)] items-center justify-center">
          <Sparkles size={16} color={CC.accent} />
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-text font-display-bold text-[13px]">AI Insights · Powered by Claude</Text>
          <Text className="text-muted font-body text-xs mt-1 leading-[17px]">6 prioritized insights generated this morning. Trust the high-priority ones — they've been verified against your last 3 months of platform data.</Text>
        </View>
      </View>
      <View className="gap-3">
        {items.map((it) => {
          const Icon = ICON_MAP[it.icon] || Lightbulb;
          return (
            <View key={it.id} className="flex-row gap-3 bg-glass-soft border border-glass-border rounded-[14px] p-4">
              <View className="w-[34px] h-[34px] rounded-[10px] border items-center justify-center" style={{ backgroundColor: it.color + '20', borderColor: it.color + '40' }}>
                <Icon size={15} color={it.color} />
              </View>
              <View className="flex-1 min-w-0">
                <View className="flex-row items-center gap-2 flex-wrap">
                  <Text className="text-text font-body-bold text-[13.5px]">{it.title}</Text>
                  <Badge label={it.kind === 'risk' ? 'RISK' : it.kind === 'opportunity' ? 'OPPORTUNITY' : 'INSIGHT'} color={it.kind === 'risk' ? 'red' : it.kind === 'opportunity' ? 'green' : 'amber'} />
                </View>
                <Text className="text-muted font-body text-[12.5px] mt-[6px] leading-[18px]">{it.body}</Text>
                <View className="flex-row gap-2 mt-3">
                  <Pressable className="px-[14px] h-[30px] rounded-lg bg-violet items-center justify-center" onPress={() => onDismiss(it.id)}>
                    <Text className="text-text font-display-bold text-[11.5px]">Take action</Text>
                  </Pressable>
                  <Pressable className="px-[14px] h-[30px] rounded-lg border border-glass-border bg-glass-soft items-center justify-center" onPress={() => onDismiss(it.id)}>
                    <Text className="text-muted font-body-bold text-[11.5px]">Dismiss</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
