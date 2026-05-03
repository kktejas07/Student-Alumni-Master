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
  View, Text, StyleSheet, Pressable, ActivityIndicator, TextInput, Image, Platform,
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

  const useAsIs = () => {
    setOpen(false);
    setSuppress(true);
    onSelect({ name: value || '', manual: true });
  };

  return (
    <View style={{
      position: 'relative',
      // Lift above any later siblings (e.g. Batch Year + YoE row, Session
      // Price chips) when the suggestion list is open. Otherwise stay at
      // a moderate z so the field itself sits flat with neighbours.
      zIndex: open ? 9999 : 50,
      ...(Platform.OS === 'web' ? ({ isolation: 'isolate' } as any) : {}),
    }}>
      <View style={styles.inputWrap}>
        <Search size={16} color="rgba(255,255,255,0.45)" />
        <TextInput
          value={value}
          onChangeText={(v) => {
            setSuppress(false);   // any new keystroke re-enables search
            onChangeText(v);
          }}
          onFocus={() => { if (results.length && !suppress) setOpen(true); }}
          placeholder={ph}
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={styles.input}
          testID={testID}
        />
        {loading && <ActivityIndicator size="small" color="#A78BFA" />}
      </View>

      {open && (
        <View style={styles.dropdown}>
          {results.length === 0 && !loading && (
            <Pressable
              onPress={useAsIs}
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
                <Text style={[styles.rowName, { color: '#2DD4BF' }]} numberOfLines={1}>
                  Use “{value}” as my institution
                </Text>
                <Text style={styles.rowMeta}>No matches — type your address manually below.</Text>
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
              onPress={useAsIs}
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
              <Text style={[styles.rowName, { color: '#2DD4BF' }]}>
                Can’t find it? Use “{value}” as-is
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
      <View style={[styles.defaultLogo, { width: size, height: size, borderRadius: size * 0.22 }]}>
        <GraduationCap size={size * 0.55} color="#C4B5FD" />
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
    boxShadow: '0px 16px 30px rgba(0,0,0,0.55)',
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

  logoWrap: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    borderColor: 'rgba(196,181,253,0.40)', borderWidth: 1,
    overflow: 'hidden',
  },
  defaultLogo: {
    backgroundColor: 'rgba(124,58,237,0.22)',
    borderColor: 'rgba(196,181,253,0.45)', borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    boxShadow: '0px 4px 14px rgba(124,58,237,0.30)',
  },
});
