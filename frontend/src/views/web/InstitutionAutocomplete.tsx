/**
 * InstitutionAutocomplete — search & pick an Indian school/college.
 *
 * • Hits  GET /api/institutions/search?q=…  (Nominatim proxy)
 * • Shows up to 8 results in a glassy dropdown
 * • Last item: "+ Add my institution manually" → switches to free-text mode
 * • On select → fires onSelect({name, city, state, domain, logo_candidates})
 * • Logo: tries Clearbit then Google Favicon then default building icon (cascading <Image onError>).
 */
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, TextInput, Image, Platform,
} from 'react-native';
import { Building2, Search, Plus, Check, X } from 'lucide-react-native';
import { request } from '@/src/models/services/api';
import { Colors } from '@/src/theme';

const C = Colors.light;

export interface InstitutionPick {
  name: string;
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
  city: string;
  state: string;
  country: string;
  domain: string;
}

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  onSelect: (pick: InstitutionPick) => void;
  placeholder?: string;
  testID?: string;
}

export function InstitutionAutocomplete({
  value, onChangeText, onSelect, placeholder = 'Search for your school or college…', testID,
}: Props) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [manual, setManual] = useState(false);
  const debounceRef = useRef<any>(null);

  // Debounced fetch
  useEffect(() => {
    if (manual) return;
    const q = (value || '').trim();
    if (q.length < 2) {
      setResults([]); setOpen(false); return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await request<{ results: SearchResult[] }>(
          `/institutions/search?q=${encodeURIComponent(q)}`,
          { auth: false },
        );
        setResults(res.results || []);
        setOpen(true);
      } catch (e) {
        setResults([]); setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [value, manual]);

  const pick = async (r: SearchResult) => {
    setOpen(false);
    onChangeText(r.name);
    // Resolve logo candidates server-side
    let logo_url = '';
    try {
      const lr = await request<{ candidates: { url: string }[] }>(
        `/institutions/logo?name=${encodeURIComponent(r.name)}&domain=${encodeURIComponent(r.domain || '')}`,
        { auth: false },
      );
      logo_url = lr.candidates?.[0]?.url || '';
    } catch {}
    onSelect({
      name: r.name,
      city: r.city,
      state: r.state,
      domain: r.domain,
      logo_url,
      manual: false,
    });
  };

  const enterManualMode = () => {
    setManual(true);
    setOpen(false);
    setResults([]);
    onSelect({ name: value || '', manual: true });
  };

  const exitManualMode = () => {
    setManual(false);
  };

  return (
    <View style={{ position: 'relative', zIndex: 50 }}>
      <View style={styles.inputWrap}>
        <Search size={16} color="rgba(255,255,255,0.45)" />
        <TextInput
          value={value}
          onChangeText={(v) => {
            onChangeText(v);
            if (manual) onSelect({ name: v, manual: true });
          }}
          onFocus={() => { if (!manual && results.length) setOpen(true); }}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={styles.input}
          testID={testID}
        />
        {loading && <ActivityIndicator size="small" color="#A78BFA" />}
        {manual && (
          <Pressable onPress={exitManualMode} hitSlop={8} testID="institution-exit-manual">
            <X size={16} color="rgba(255,255,255,0.55)" />
          </Pressable>
        )}
      </View>

      {manual && (
        <Text style={styles.manualHint}>
          ✏️  Manual mode — type your institution name. Logo will use the default icon.
        </Text>
      )}

      {open && !manual && (
        <View style={styles.dropdown}>
          {results.length === 0 && !loading && (
            <Text style={styles.empty}>No results. Try a different search or add manually.</Text>
          )}
          {results.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => pick(r)}
              testID={`institution-result-${r.id}`}
              style={({ hovered, pressed }: any) => [
                styles.row,
                hovered && { backgroundColor: 'rgba(124,58,237,0.16)' },
                pressed && { backgroundColor: 'rgba(124,58,237,0.24)' },
              ]}
            >
              <View style={styles.rowIcon}>
                <Building2 size={14} color="#A78BFA" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowName} numberOfLines={1}>{r.name}</Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {[r.city, r.state, r.country].filter(Boolean).join(' · ')}
                </Text>
              </View>
            </Pressable>
          ))}
          <Pressable
            onPress={enterManualMode}
            testID="institution-add-manual"
            style={({ hovered, pressed }: any) => [
              styles.row, styles.rowAdd,
              hovered && { backgroundColor: 'rgba(45,212,191,0.16)' },
              pressed && { backgroundColor: 'rgba(45,212,191,0.24)' },
            ]}
          >
            <View style={[styles.rowIcon, { backgroundColor: 'rgba(45,212,191,0.18)' }]}>
              <Plus size={14} color="#2DD4BF" />
            </View>
            <Text style={[styles.rowName, { color: '#2DD4BF' }]}>Add my institution manually</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── Logo display with cascading fallback ──────────────────────────────
export function InstitutionLogo({
  name, domain, size = 36,
}: { name: string; domain?: string; size?: number }) {
  const candidates: string[] = [];
  if (domain) candidates.push(`https://logo.clearbit.com/${domain}`);
  const slug = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (slug) {
    candidates.push(`https://logo.clearbit.com/${slug}.ac.in`);
    candidates.push(`https://logo.clearbit.com/${slug}.edu.in`);
    candidates.push(`https://www.google.com/s2/favicons?domain=${slug}.ac.in&sz=128`);
  }
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);

  if (failed || !candidates.length) {
    return (
      <View style={[styles.defaultLogo, { width: size, height: size, borderRadius: size * 0.22 }]}>
        <Building2 size={size * 0.5} color="#A78BFA" />
      </View>
    );
  }
  return (
    <Image
      source={{ uri: candidates[idx] }}
      onError={() => {
        if (idx < candidates.length - 1) setIdx(idx + 1);
        else setFailed(true);
      }}
      style={{ width: size, height: size, borderRadius: size * 0.22, backgroundColor: 'rgba(255,255,255,0.06)' }}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, height: 48,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1, borderRadius: 12,
  },
  input: {
    flex: 1, color: '#FFFFFF', fontFamily: 'DMSans_500Medium', fontSize: 14,
    ...({ outlineStyle: 'none' } as any),
  },
  dropdown: {
    position: 'absolute', top: 54, left: 0, right: 0, zIndex: 100,
    backgroundColor: 'rgba(20,8,40,0.96)',
    borderColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 28, shadowOffset: { width: 0, height: 12 },
    ...({ backdropFilter: 'blur(24px)' } as any),
  },
  empty: { color: 'rgba(255,255,255,0.45)', fontFamily: 'DMSans_400Regular', fontSize: 12.5, padding: 14 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    ...({ cursor: 'pointer', transitionDuration: '120ms' } as any),
  },
  rowAdd: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  rowIcon: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(124,58,237,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  rowName: { color: '#FFFFFF', fontFamily: 'DMSans_600SemiBold', fontSize: 13 },
  rowMeta: { color: 'rgba(255,255,255,0.50)', fontFamily: 'DMSans_400Regular', fontSize: 11.5, marginTop: 2 },

  manualHint: {
    color: '#FCD34D', fontFamily: 'DMSans_500Medium', fontSize: 11.5,
    marginTop: 6, marginLeft: 4,
  },

  defaultLogo: {
    backgroundColor: 'rgba(124,58,237,0.20)',
    borderColor: 'rgba(196,181,253,0.35)', borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
});
