/**
 * InstitutionAutocomplete — search & pick an Indian school/college/university.
 *
 * • Hits  GET /api/institutions/search?q=…&type=…  (Nominatim proxy w/ filtering)
 * • Shows up to 8 results in a glassy dropdown
 * • Last item: "+ Add my institution manually" → switches to free-text mode
 * • On select → fires onSelect({name, address_line, city, state, domain, logo_url})
 * • Logo: cascading <Image onError> fallback chain (Clearbit → Favicon → default icon).
 */
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, TextInput, Image,
} from 'react-native';
import { Building2, Search, Plus, X } from 'lucide-react-native';
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
  onSelect: (pick: InstitutionPick) => void;
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
  const [manual, setManual] = useState(false);
  const debounceRef = useRef<any>(null);

  const ph = placeholder
    || (type === 'school'   ? 'Search your school (e.g., DPS, Kendriya Vidyalaya)…'
      : type === 'college'  ? 'Search your college (e.g., St. Stephen’s)…'
      : type === 'university' ? 'Search your university (e.g., JNTU, Anna University)…'
      : 'Search for your institution…');

  // Debounced fetch (re-runs when query OR institution type changes)
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
  }, [value, manual, type]);

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
      address_line: r.address_line,
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
          placeholder={ph}
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
          {'✏️'}  Manual mode — type your institution name. Logo will use the default icon.
        </Text>
      )}

      {open && !manual && (
        <View style={styles.dropdown}>
          {results.length === 0 && !loading && (
            <Pressable
              onPress={enterManualMode}
              testID="institution-add-manual-empty"
              style={({ hovered }: any) => [
                styles.row,
                hovered && { backgroundColor: 'rgba(45,212,191,0.16)' },
              ]}
            >
              <View style={[styles.rowIcon, { backgroundColor: 'rgba(45,212,191,0.18)' }]}>
                <Plus size={14} color="#2DD4BF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowName, { color: '#2DD4BF' }]}>
                  Use “{value}” as my institution
                </Text>
                <Text style={styles.rowMeta}>No matches — add manually.</Text>
              </View>
            </Pressable>
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
          {results.length > 0 && (
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
          )}
        </View>
      )}
    </View>
  );
}

// ─── Logo display with cascading fallback ──────────────────────────────
export function InstitutionLogo({
  name, domain, logoUrl, size = 56,
}: { name: string; domain?: string; logoUrl?: string; size?: number }) {
  const candidates: string[] = [];
  if (logoUrl) candidates.push(logoUrl);
  if (domain) candidates.push(`https://logo.clearbit.com/${domain}`);
  const slug = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (slug) {
    candidates.push(`https://logo.clearbit.com/${slug}.ac.in`);
    candidates.push(`https://logo.clearbit.com/${slug}.edu.in`);
    candidates.push(`https://logo.clearbit.com/${slug}.in`);
    candidates.push(`https://logo.clearbit.com/${slug}.com`);
    // Google Favicon as last-resort (always returns something)
    candidates.push(`https://www.google.com/s2/favicons?domain=${slug}.ac.in&sz=128`);
    candidates.push(`https://www.google.com/s2/favicons?domain=${slug}.edu.in&sz=128`);
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
    <View style={[styles.logoWrap, { width: size, height: size, borderRadius: size * 0.22 }]}>
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
    position: 'absolute', top: 54, left: 0, right: 0, zIndex: 200,
    backgroundColor: 'rgba(20,8,40,0.98)',
    borderColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.55, shadowRadius: 30, shadowOffset: { width: 0, height: 16 },
    ...({ backdropFilter: 'blur(24px)' } as any),
  },
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

  logoWrap: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    borderColor: 'rgba(196,181,253,0.40)', borderWidth: 1,
    overflow: 'hidden',
  },
  defaultLogo: {
    backgroundColor: 'rgba(124,58,237,0.20)',
    borderColor: 'rgba(196,181,253,0.35)', borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
});
