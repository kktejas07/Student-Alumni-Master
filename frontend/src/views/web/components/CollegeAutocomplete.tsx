// @ts-nocheck
/**
 * CollegeAutocomplete — search & pick a college from the platform DB.
 *
 * • Hits  GET /api/colleges/search?q=…  (public, no auth)
 * • Matches by name substring AND acronyms (IIT, NIT, …)
 * • "Can't find it? Type it manually" row → falls back to free-text entry
 * • Dark glass theme — matches the ECHO register page
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, TextInput, Platform, ScrollView,
} from 'react-native';
import { Search, Building2, Plus } from 'lucide-react-native';
import { api } from '@/src/models/services/api';
import { PALETTE, FONTS, TYPO } from '@/src/views/web/portals/student/tokens';
import { GRAD } from '@/src/views/web/portals/student/portalkit';

export interface CollegePick {
  id?: string;
  name: string;
}

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  onSelect?: (pick: CollegePick) => void;
  placeholder?: string;
}

export function CollegeAutocomplete({ value, onChangeText, onSelect, placeholder }: Props) {
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suppress, setSuppress] = useState(false);
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    if (suppress) return;
    const q = (value || '').trim();
    if (q.length < 2) {
      setResults([]); setOpen(false); return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.searchColleges(q, 8);
        setResults(res?.results || []);
        setOpen(true);
      } catch {
        setResults([]); setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [value, suppress]);

  const pick = (r: any) => {
    setOpen(false);
    setSuppress(true);
    onChangeText(r.name);
    onSelect?.({ id: r.id, name: r.name });
  };

  const useAsIs = () => {
    setOpen(false);
    setSuppress(true);
    onSelect?.({ name: value || '' });
  };

  return (
    <View style={[s.wrap, open && s.wrapOpen, ...(Platform.OS === 'web' ? [{ isolation: 'isolate' } as any] : [])]}>
      <View style={s.inputWrap}>
        <Search size={15} color={PALETTE.dim} />
        <TextInput
          value={value}
          onChangeText={(v) => { setSuppress(false); onChangeText(v); }}
          onFocus={() => { if (results.length && !suppress) setOpen(true); }}
          placeholder={placeholder || 'Search your college…'}
          placeholderTextColor={PALETTE.dim}
          style={s.input}
        />
        {loading && <ActivityIndicator size="small" color={GRAD.from} />}
      </View>

      {open && (
        <View style={s.dropdown}>
          {results.length === 0 && !loading && (
            <Pressable
              onPress={useAsIs}
              {...(Platform.OS === 'web' ? ({ onMouseDown: (e: any) => e.preventDefault() } as any) : {})}
              style={({ hovered }: any) => [s.row, hovered && { backgroundColor: 'rgba(52,211,153,0.08)' }]}
            >
              <View style={s.rowIconManual}><Plus size={14} color="#34D399" /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowNameManual} numberOfLines={1}>Can't find it? Use “{value}” as-is</Text>
                <Text style={s.rowMeta}>You can still register — we'll accept your entry as-is.</Text>
              </View>
            </Pressable>
          )}

          <ScrollView style={s.scroll} nestedScrollEnabled={true} showsVerticalScrollIndicator={true} keyboardShouldPersistTaps="handled">
            {results.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => pick(r)}
                {...(Platform.OS === 'web' ? ({ onMouseDown: (e: any) => e.preventDefault() } as any) : {})}
                style={({ hovered, pressed }: any) => [
                  s.row,
                  hovered && { backgroundColor: 'rgba(37,99,235,0.12)' },
                  pressed && { backgroundColor: 'rgba(37,99,235,0.18)' },
                ]}
              >
                <View style={s.rowIcon}><Building2 size={14} color={GRAD.from} /></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.rowName} numberOfLines={1}>{r.name}</Text>
                  {[r.city, r.state, r.country].filter(Boolean).length > 0 && (
                    <Text style={s.rowMeta} numberOfLines={1}>
                      {[r.city, r.state, r.country].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                </View>
              </Pressable>
            ))}
          </ScrollView>

          {results.length > 0 && (
            <Pressable
              onPress={useAsIs}
              {...(Platform.OS === 'web' ? ({ onMouseDown: (e: any) => e.preventDefault() } as any) : {})}
              style={({ hovered }: any) => [s.row, s.rowAdd, hovered && { backgroundColor: 'rgba(52,211,153,0.08)' }]}
            >
              <View style={s.rowIconManual}><Plus size={14} color="#34D399" /></View>
              <Text style={s.rowNameManual}>Can't find it? Type it manually</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'relative', zIndex: 50 },
  wrapOpen: { zIndex: 9999 },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.06)', borderColor: PALETTE.glassBorder,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
  },
  input: {
    flex: 1, color: '#fff', fontFamily: FONTS.med, fontSize: 14,
    padding: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },

  dropdown: {
    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6,
    backgroundColor: '#131B31', borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1, borderRadius: 12, overflow: 'hidden', zIndex: 9999,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 12px 32px rgba(0,0,0,0.55)' } as any) : {}),
  },
  scroll: { maxHeight: 220 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '120ms' } as any) : {}),
  },
  rowAdd: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  rowIcon: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(37,99,235,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  rowIconManual: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(52,211,153,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  rowName: { color: '#fff', fontFamily: TYPO.display600 ?? FONTS.semi, fontSize: 13 },
  rowNameManual: { color: '#34D399', fontFamily: FONTS.semi, fontSize: 12.5 },
  rowMeta: { color: PALETTE.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 2 },
});
