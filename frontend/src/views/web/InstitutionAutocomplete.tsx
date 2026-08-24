/**
 * InstitutionAutocomplete — search & pick an Indian school/college/university.
 *
 * • Hits  GET /api/institutions/search?q=…&type=…  (Nominatim proxy w/ filtering)
 * • Shows up to 8 results in a glassy dropdown (z-index 200)
 * • "+ Use this name as-is" row → soft-confirms typed name without sticky modes
 * • On select → fires onSelect({name, address_line, city, state, domain, logo_url, manual})
 * • Logo: cascading <Image onError> chain — Clearbit (multiple TLDs) → polished default crest.
 *
 * NB: There's NO sticky "manual mode". Users can keep typing freely; the dropdown
 *     auto-reopens whenever the query changes. The "Use as-is" button just commits
 *     the current text and closes the popup.
 */
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, ActivityIndicator, TextInput, Image, Platform, ScrollView,
} from 'react-native';
import { GraduationCap, Building2, Search, Plus } from 'lucide-react-native';
import { request } from '@/src/models/services/api';

export interface InstitutionPick {
  name: string;
  address_line?: string;
  city?: string;
  state?: string;
  domain?: string;
  logo_url?: string;
  manual?: boolean;
}

interface SearchResult {
  id: string;
  name: string;
  display_name: string;
  address_line: string;
  city: string;
  state: string;
  country: string;
  domain: string;
  type: string;
}

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  onSelect?: (pick: InstitutionPick) => void;
  type?: 'school' | 'college' | 'university';
  placeholder?: string;
  testID?: string;
}

export function InstitutionAutocomplete({
  value, onChangeText, onSelect, type, placeholder, testID,
}: Props) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // Suppress search until next keystroke (after user picks/dismisses).
  const [suppress, setSuppress] = useState(false);
  const debounceRef = useRef<any>(null);

  const ph = placeholder
    || (type === 'school'   ? 'Search your Inter / Junior / PU college (Sri Chaitanya, Narayana…)'
      : type === 'college'  ? 'Search IITs, NITs, BITS, VIT, engineering colleges…'
      : type === 'university' ? 'Search your university (e.g., JNTU, Anna University)'
      : 'Search for your institution…');

  // Debounced fetch
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
        const url = `/institutions/search?q=${encodeURIComponent(q)}${type ? `&type=${type}` : ''}`;
        const res = await request<{ results: SearchResult[] }>(url, { auth: false });
        setResults(res.results || []);
        setOpen(true);
      } catch (e) {
        setResults([]); setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [value, type, suppress]);

  const pick = async (r: SearchResult) => {
    setOpen(false);
    setSuppress(true);
    onChangeText(r.name);
    let logo_url = '';
    try {
      const lr = await request<{ candidates: { url: string }[] }>(
        `/institutions/logo?name=${encodeURIComponent(r.name)}&domain=${encodeURIComponent(r.domain || '')}`,
        { auth: false },
      );
      logo_url = lr.candidates?.[0]?.url || '';
    } catch {}
    onSelect?.({
      name: r.name,
      address_line: r.address_line,
      city: r.city,
      state: r.state,
      domain: r.domain,
      logo_url,
      manual: false,
    });
  };

  const useAsIs = () => {
    setOpen(false);
    setSuppress(true);
    onSelect?.({ name: value || '', manual: true });
  };

  return (
    <View style={{ position: 'relative', zIndex: open ? 9999 : 50, ...(Platform.OS === 'web' ? { isolation: 'isolate' } as any : {}) }}>
      <View className="flex-row items-center gap-2.5 px-3.5 bg-white rounded-xl border" style={{ height: 48, borderColor: '#E5E7EB' }}>
        <Search size={16} color="#9CA3AF" />
        <TextInput
          value={value}
          onChangeText={(v) => { setSuppress(false); onChangeText(v); }}
          onFocus={() => { if (results.length && !suppress) setOpen(true); }}
          placeholder={ph}
          placeholderTextColor="#9CA3AF"
          className="flex-1 text-gray-800 font-body-medium text-base"
          style={{ outlineStyle: 'none' } as any}
          testID={testID}
        />
        {loading && <ActivityIndicator size="small" color="#A78BFA" />}
      </View>

      {open && (
        <View className="mt-1.5 bg-white rounded-2xl border overflow-hidden" style={{ zIndex: 200, borderColor: '#E5E7EB', boxShadow: '0px 8px 24px rgba(0,0,0,0.1)' } as any}>
          {results.length === 0 && !loading && (
            <Pressable
              onPress={useAsIs}
              {...({ onMouseDown: Platform.OS === 'web' ? (e: any) => e.preventDefault() : undefined } as any)}
              testID="institution-add-manual-empty"
              className="flex-row items-center gap-2.5 px-3.5 py-2.5"
              style={({ hovered }: any) => ({ cursor: 'pointer', transitionDuration: '120ms', backgroundColor: hovered ? '#CCFBF1' : undefined })}
            >
              <View className="rounded-lg items-center justify-center" style={{ width: 28, height: 28, backgroundColor: '#CCFBF1' }}>
                <Plus size={14} color="#0D9488" />
              </View>
              <View className="flex-1">
                <Text className="font-body-semibold text-sm" style={{ color: '#0D9488' }} numberOfLines={1}>
                  Use "{value}" as my institution
                </Text>
                <Text className="font-body-regular text-xs" style={{ color: '#6B7280', marginTop: 2 }}>No matches — type your address manually below.</Text>
              </View>
            </Pressable>
          )}
          <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
            {results.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => pick(r)}
                {...({ onMouseDown: Platform.OS === 'web' ? (e: any) => e.preventDefault() : undefined } as any)}
                testID={`institution-result-${r.id}`}
                className="flex-row items-center gap-2.5 px-3.5 py-2.5"
                style={({ hovered, pressed }: any) => ({ cursor: 'pointer', transitionDuration: '120ms', backgroundColor: hovered ? '#F3E8FF' : pressed ? '#E9D5FF' : undefined })}
              >
                <View className="rounded-lg items-center justify-center" style={{ width: 28, height: 28, backgroundColor: '#F3E8FF' }}>
                  <Building2 size={14} color="#A78BFA" />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="font-body-semibold text-sm text-gray-800" numberOfLines={1}>{r.name}</Text>
                  <Text className="font-body-regular text-xs text-gray-500" numberOfLines={1}>
                    {[r.city, r.state, r.country].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
          {results.length > 0 && (
            <Pressable
              onPress={useAsIs}
              {...({ onMouseDown: Platform.OS === 'web' ? (e: any) => e.preventDefault() : undefined } as any)}
              testID="institution-add-manual"
              className="flex-row items-center gap-2.5 px-3.5 py-2.5 border-t"
              style={({ hovered, pressed }: any) => ({ cursor: 'pointer', transitionDuration: '120ms', borderColor: '#E5E7EB', backgroundColor: hovered ? '#CCFBF1' : pressed ? '#99F6E4' : undefined })}
            >
              <View className="rounded-lg items-center justify-center" style={{ width: 28, height: 28, backgroundColor: '#CCFBF1' }}>
                <Plus size={14} color="#0D9488" />
              </View>
              <Text className="font-body-semibold text-sm" style={{ color: '#0D9488' }}>
                Can't find it? Use "{value}" as-is
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Logo display with cascading fallback ──────────────────────────────
// Stops BEFORE Google Favicon (which returns generic globe placeholder for
// non-existent domains). Falls through to a polished default school crest.
export function InstitutionLogo({
  name, domain, logoUrl, size = 56,
}: { name: string; domain?: string; logoUrl?: string; size?: number }) {
  const candidates: string[] = [];
  if (logoUrl && !logoUrl.includes('google.com/s2/favicons')) candidates.push(logoUrl);
  if (domain) candidates.push(`https://logo.clearbit.com/${domain}`);
  const slug = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (slug) {
    candidates.push(`https://logo.clearbit.com/${slug}.ac.in`);
    candidates.push(`https://logo.clearbit.com/${slug}.edu.in`);
    candidates.push(`https://logo.clearbit.com/${slug}.in`);
    candidates.push(`https://logo.clearbit.com/${slug}.com`);
    candidates.push(`https://logo.clearbit.com/${slug}.org`);
  }
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);

  // Reset fallback chain when the institution changes
  useEffect(() => { setIdx(0); setFailed(false); }, [name, domain, logoUrl]);

  if (failed || !candidates.length) {
    return (
      <View className="bg-purple-100 border-2 border-purple-300 items-center justify-center" style={{ width: size, height: size, borderRadius: size * 0.22 }}>
        <GraduationCap size={size * 0.55} color="#C4B5FD" />
      </View>
    );
  }
  return (
    <View className="bg-white items-center justify-center border border-purple-300/40 overflow-hidden" style={{ width: size, height: size, borderRadius: size * 0.22 }}>
      <Image
        key={idx}
        source={{ uri: candidates[idx] }}
        onError={() => {
          if (idx < candidates.length - 1) setIdx(idx + 1);
          else setFailed(true);
        }}
        style={{ width: size - 4, height: size - 4, borderRadius: size * 0.18 }}
        resizeMode="contain"
      />
    </View>
  );
}
