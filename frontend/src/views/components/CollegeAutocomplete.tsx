import React, { useEffect, useState } from 'react';
import { api } from '@/src/models/services/api';
import { COLORS } from '@/src/theme/tokens';

export type CollegeSelection = {
  id: string | null;
  name: string;
  tier: string | null;
  isCustom: boolean;
};

type CollegeOption = {
  id: string;
  name: string;
  city?: string;
  state?: string;
  tier?: string | null;
};

type Props = {
  value: CollegeSelection | null;
  onChange: (value: CollegeSelection | null) => void;
  error?: string;
};

export function CollegeAutocomplete({ value, onChange, error }: Props) {
  const [query, setQuery] = useState(value?.name || '');
  const [options, setOptions] = useState<CollegeOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      setSearchError('');
      try {
        const result = await api.searchColleges(query.trim(), 8);
        if (active) setOptions(Array.isArray(result?.results) ? result.results : []);
      } catch {
        if (active) {
          setOptions([]);
          setSearchError('College search is temporarily unavailable. You can choose Other.');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  const chooseCollege = (college: CollegeOption) => {
    setQuery(college.name);
    setIsOpen(false);
    onChange({ id: college.id, name: college.name, tier: college.tier || null, isCustom: false });
  };

  const chooseOther = () => {
    setQuery('');
    setIsOpen(false);
    onChange({ id: null, name: '', tier: null, isCustom: true });
  };

  const enterCustomName = (name: string) => {
    onChange({ id: null, name, tier: null, isCustom: true });
  };

  return (
    <div style={{ position: 'relative' }}>
      <label htmlFor="college-search" style={{ display: 'block', fontSize: '13px', color: 'var(--muted)', marginBottom: '8px' }}>
        College
      </label>
      <input
        id="college-search"
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls="college-options"
        aria-invalid={Boolean(error)}
        value={query}
        placeholder="Search for your college"
        onFocus={() => setIsOpen(true)}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
        onChange={(event) => {
          const next = event.target.value;
          setQuery(next);
          setIsOpen(true);
          onChange(null);
        }}
        style={{ border: `1px solid ${error ? COLORS.danger : 'var(--line)'}`, borderRadius: '10px', background: 'var(--card)', padding: '14px 15px', fontSize: '15px', color: 'var(--text)', width: '100%', outline: 'none' }}
      />
      {value && !value.isCustom && value.tier && (
        <div style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '6px' }}>{value.tier} · Curated dataset label</div>
      )}
      {isOpen && (
        <div id="college-options" role="listbox" style={{ position: 'absolute', zIndex: 20, top: '100%', left: 0, right: 0, maxHeight: '280px', overflowY: 'auto', marginTop: '5px', border: '1px solid var(--line)', borderRadius: '10px', background: 'var(--card)', boxShadow: '0 12px 28px rgba(0,0,0,.35)' }}>
          {isLoading && <div style={{ padding: '12px 14px', color: 'var(--muted)', fontSize: '14px' }}>Searching colleges…</div>}
          {!isLoading && options.map((college) => (
            <button key={college.id} type="button" role="option" aria-selected={value?.id === college.id} onMouseDown={(event) => event.preventDefault()} onClick={() => chooseCollege(college)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 14px', border: 0, borderBottom: '1px solid var(--line)', background: value?.id === college.id ? 'var(--tint)' : 'transparent', color: 'var(--text)', textAlign: 'left', cursor: 'pointer', font: 'inherit' }}>
              <span>{college.name}{(college.city || college.state) ? <span style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginTop: '3px' }}>{[college.city, college.state].filter(Boolean).join(', ')}</span> : null}</span>
              {college.tier && <span style={{ whiteSpace: 'nowrap', color: 'var(--ind-lt)', fontSize: '12px' }}>{college.tier}</span>}
            </button>
          ))}
          {!isLoading && query.trim() && options.length === 0 && !searchError && <div style={{ padding: '12px 14px', color: 'var(--muted)', fontSize: '14px' }}>No listed colleges found.</div>}
          {searchError && <div style={{ padding: '12px 14px', color: COLORS.danger, fontSize: '13px' }}>{searchError}</div>}
          <button type="button" role="option" aria-selected={Boolean(value?.isCustom)} onMouseDown={(event) => event.preventDefault()} onClick={chooseOther} style={{ width: '100%', padding: '12px 14px', border: 0, background: 'transparent', color: 'var(--ind-lt)', textAlign: 'left', cursor: 'pointer', font: 'inherit', fontWeight: 600 }}>
            Other — My college isn’t listed
          </button>
        </div>
      )}
      {value?.isCustom && (
        <div style={{ marginTop: '12px' }}>
          <label htmlFor="custom-college-name" style={{ display: 'block', fontSize: '13px', color: 'var(--muted)', marginBottom: '8px' }}>Enter your college name</label>
          <input id="custom-college-name" type="text" required value={value.name} onChange={(event) => enterCustomName(event.target.value)} placeholder="Enter your college’s full name" aria-invalid={Boolean(error)} style={{ border: `1px solid ${error ? COLORS.danger : 'var(--line)'}`, borderRadius: '10px', background: 'var(--card)', padding: '14px 15px', fontSize: '15px', color: 'var(--text)', width: '100%', outline: 'none' }} />
        </div>
      )}
      {error && <div role="alert" style={{ color: COLORS.danger, fontSize: '13px', marginTop: '8px' }}>Please enter your college name.</div>}
    </div>
  );
}
