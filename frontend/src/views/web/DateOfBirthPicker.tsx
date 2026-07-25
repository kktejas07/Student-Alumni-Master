/**
 * DateOfBirthPicker — cross-platform DD/MM/YYYY picker built on the canonical
 * <Dropdown/> primitive (OptionListCard). Mandatory by default with min-age
 * gating (defaults to 18) and future-date rejection.
 *
 * Output:
 *  • onChange(iso) — fires only when day/month/year are all set, with an ISO
 *    8601 date string (YYYY-MM-DD) suitable for direct DB persistence.
 *  • onValid(boolean, message?) — bubbles up validation status.
 *
 * The widget displays the value in DD/MM/YYYY for users while storing ISO.
 */
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Keyboard } from 'react-native';
import { Dropdown } from '@/src/views/web/Dropdown';

export function DateOfBirthPicker({
  value, onChange,
  minAge = 18,
  required = true,
  label = 'Date of Birth',
  helper,
  editable = true,
}: {
  /** ISO 8601 (YYYY-MM-DD) or empty string */
  value: string;
  onChange: (iso: string) => void;
  minAge?: number;
  required?: boolean;
  label?: string;
  helper?: string;
  editable?: boolean;
}) {
  // Parse incoming ISO into discrete parts.
  const [d, setD] = useState<string>('');
  const [m, setM] = useState<string>('');
  const [y, setY] = useState<string>('');

  const dayRef = useRef<TextInput>(null);
  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  const lastEmitted = useRef<string>(value || '');

  useEffect(() => {
    console.log('DateOfBirthPicker useEffect [value]:', value);
    if (value === lastEmitted.current) {
      return;
    }
    lastEmitted.current = value || '';
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [yy, mm, dd] = value.split('-');
      setY(yy); setM(mm); setD(dd);
    } else if (!value) {
      setY(''); setM(''); setD('');
    }
  }, [value]);

  const currentYear = new Date().getFullYear();

  // Year list — 100 years back through (current - minAge)
  const years = useMemo(() => {
    const max = currentYear - minAge;
    const min = currentYear - 100;
    const arr: { value: string; label: string }[] = [];
    for (let yr = max; yr >= min; yr--) arr.push({ value: String(yr), label: String(yr) });
    return arr;
  }, [currentYear, minAge]);

  const months = [
    { value: '01', label: 'January' },   { value: '02', label: 'February' },
    { value: '03', label: 'March' },     { value: '04', label: 'April' },
    { value: '05', label: 'May' },       { value: '06', label: 'June' },
    { value: '07', label: 'July' },      { value: '08', label: 'August' },
    { value: '09', label: 'September' }, { value: '10', label: 'October' },
    { value: '11', label: 'November' },  { value: '12', label: 'December' },
  ];

  // Days dynamically depend on selected month + year (handle leap years).
  const days = useMemo(() => {
    let max = 31;
    if (m && y) {
      const monthInt = parseInt(m, 10);
      const yearInt = parseInt(y, 10);
      max = new Date(yearInt, monthInt, 0).getDate();
    } else if (m) {
      const monthInt = parseInt(m, 10);
      max = new Date(2023, monthInt, 0).getDate();
    }
    return Array.from({ length: max }, (_, i) => {
      const v = String(i + 1).padStart(2, '0');
      return { value: v, label: v };
    });
  }, [m, y]);

  // Whenever any part changes & all 3 are populated, emit ISO.
  useEffect(() => {
    console.log('DateOfBirthPicker state [d, m, y]:', { d, m, y });
    let iso = '';
    if (d && m && y) {
      if (/^\d{2}$/.test(d) && /^\d{2}$/.test(m) && /^\d{4}$/.test(y)) {
        iso = `${y}-${m}-${d}`;
      }
    }
    if (iso !== lastEmitted.current) {
      lastEmitted.current = iso;
      onChange(iso);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, m, y]);

  const completed = !!(d && m && y);
  const ageOk = useMemo(() => {
    if (!completed) return true;
    const dob = new Date(`${y}-${m}-${d}`);
    if (isNaN(dob.getTime())) return false;
    if (dob > new Date()) return false;
    const age = currentYear - dob.getFullYear() - (
      new Date(currentYear, dob.getMonth(), dob.getDate()) > new Date() ? 1 : 0
    );
    return age >= minAge;
  }, [completed, d, m, y, currentYear, minAge]);

  const errorMsg = !completed
    ? null
    : !ageOk
      ? `You must be at least ${minAge} years old to register.`
      : null;

  // Text inputs typing logic with auto-advance
  const handleDayChange = (val: string) => {
    console.log('handleDayChange val =', val);
    const clean = val.replace(/[^0-9]/g, '');
    
    if (clean.length === 0) {
      setD('');
      return;
    }

    if (clean.length === 1) {
      if (/^[4-9]$/.test(clean)) {
        // Since no day starts with 4-9, it's a single digit day (04-09).
        // Auto-pad and auto-advance to Month.
        setD('0' + clean);
        monthRef.current?.focus();
      } else {
        // It's 0, 1, 2, or 3. Wait for the second digit.
        setD(clean);
      }
    } else if (clean.length === 2) {
      const num = parseInt(clean, 10);
      if (num >= 1 && num <= 31) {
        setD(clean);
        monthRef.current?.focus();
      } else {
        if (clean === '00') {
          // If they typed 00, keep it as '0' to allow typing a valid digit next
          setD('0');
        } else if (num > 31) {
          // If they typed something like 32-99, ignore the second digit
          setD(clean.slice(0, 1));
        }
      }
    }
  };

  const handleDayBlur = () => {
    console.log('handleDayBlur d =', d);
    if (d && d.length === 1) {
      if (d === '0') {
        setD('');
      } else {
        setD(d.padStart(2, '0'));
      }
    }
  };

  const handleMonthChange = (val: string) => {
    const clean = val.replace(/[^0-9a-zA-Z]/g, '');
    
    // Check if it's numeric
    if (/^\d+$/.test(clean)) {
      if (clean.length === 1) {
        if (/^[2-9]$/.test(clean)) {
          // Auto-pad 2-9 and focus Year (no month starts with 2-9)
          setM('0' + clean);
          yearRef.current?.focus();
        } else {
          // It's '0' or '1', wait for next digit
          setM(clean);
        }
      } else if (clean.length === 2) {
        const num = parseInt(clean, 10);
        if (num >= 1 && num <= 12) {
          setM(clean);
          yearRef.current?.focus();
        } else {
          if (clean === '00') {
            setM('0');
          } else if (num > 12) {
            setM(clean.slice(0, 1));
          }
        }
      }
    } else {
      // It has letters, just set it and let handleMonthBlur resolve it, or check if they typed a full month name.
      setM(clean);
    }
  };

  const handleMonthBlur = () => {
    if (/^\d+$/.test(m)) {
      if (m === '0') {
        setM('');
      } else {
        setM(m.padStart(2, '0'));
      }
    } else if (m) {
      const found = months.find(opt => opt.label.toLowerCase().startsWith(m.toLowerCase()));
      if (found) {
        setM(found.value);
        // Autofocus year after a month name is successfully auto-completed on blur
        setTimeout(() => yearRef.current?.focus(), 50);
      } else {
        setM('');
      }
    }
  };

  const handleYearChange = (val: string) => {
    const clean = val.replace(/[^0-9]/g, '');
    setY(clean);
    if (clean.length === 4) {
      yearRef.current?.blur();
      Keyboard.dismiss();
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label}{required ? <Text style={{ color: '#EF4444' }}> *</Text> : null}
      </Text>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Dropdown
            label="Day"
            value={d}
            options={days}
            onChange={handleDayChange}
            placeholder="DD"
            allowOther={false}
            testID="dob-day"
            editable={editable}
            keyboardType="number-pad"
            maxLength={2}
            inputRef={dayRef}
            onBlur={handleDayBlur}
          />
        </View>
        <View style={{ flex: 1.4 }}>
          <Dropdown
            label="Month"
            value={m}
            options={months}
            onChange={handleMonthChange}
            placeholder="MM"
            allowOther={false}
            testID="dob-month"
            editable={editable}
            keyboardType="default"
            maxLength={12}
            inputRef={monthRef}
            onBlur={handleMonthBlur}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Dropdown
            label="Year"
            value={y}
            options={years}
            onChange={handleYearChange}
            placeholder="YYYY"
            allowOther={false}
            testID="dob-year"
            editable={editable}
            keyboardType="number-pad"
            maxLength={4}
            inputRef={yearRef}
          />
        </View>
      </View>
      {errorMsg ? (
        <Text style={styles.err}>{errorMsg}</Text>
      ) : helper ? (
        <Text style={styles.helper}>{helper}</Text>
      ) : null}
    </View>
  );
}

/** Pure helper — call from screen's submit handler to gate the form. */
export function isDobValid(iso: string, minAge = 18): { ok: boolean; message?: string } {
  if (!iso) return { ok: false, message: 'Date of birth is required.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return { ok: false, message: 'Pick a valid date.' };
  const dob = new Date(iso);
  if (isNaN(dob.getTime())) return { ok: false, message: 'Pick a valid date.' };
  if (dob > new Date()) return { ok: false, message: 'Date of birth cannot be in the future.' };
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const mm = today.getMonth() - dob.getMonth();
  if (mm < 0 || (mm === 0 && today.getDate() < dob.getDate())) age--;
  if (age < minAge) return { ok: false, message: `You must be at least ${minAge} years old.` };
  return { ok: true };
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { color: '#374151', fontFamily: 'DMSans_700Bold', fontSize: 13, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8 },
  err: { color: '#EF4444', fontFamily: 'DMSans_500Medium', fontSize: 12, marginTop: 4 },
  helper: { color: '#9CA3AF', fontFamily: 'DMSans_500Medium', fontSize: 12, marginTop: 4 },
});
