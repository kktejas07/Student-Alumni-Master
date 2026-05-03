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
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Dropdown } from '@/src/views/web/Dropdown';

export function DateOfBirthPicker({
  value, onChange,
  minAge = 18,
  required = true,
  label = 'Date of Birth',
  helper,
}: {
  /** ISO 8601 (YYYY-MM-DD) or empty string */
  value: string;
  onChange: (iso: string) => void;
  minAge?: number;
  required?: boolean;
  label?: string;
  helper?: string;
}) {
  // Parse incoming ISO into discrete parts. Use blank string for unset parts
  // so the dropdowns show their placeholder.
  const [d, setD] = useState<string>('');
  const [m, setM] = useState<string>('');
  const [y, setY] = useState<string>('');

  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [yy, mm, dd] = value.split('-');
      setY(yy); setM(mm); setD(dd);
    }
  }, [value]);

  const currentYear = new Date().getFullYear();

  // Year list — 100 years back through (current - minAge), so the youngest
  // selectable date is exactly `minAge` years ago. Older years go back 100.
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
      // Use a non-leap year as default
      max = new Date(2023, monthInt, 0).getDate();
    }
    return Array.from({ length: max }, (_, i) => {
      const v = String(i + 1).padStart(2, '0');
      return { value: v, label: v };
    });
  }, [m, y]);

  // Whenever any part changes & all 3 are populated, emit ISO.
  useEffect(() => {
    if (d && m && y) {
      onChange(`${y}-${m}-${d}`);
    } else {
      onChange('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, m, y]);

  const completed = !!(d && m && y);
  const ageOk = useMemo(() => {
    if (!completed) return true; // don't show age error until all 3 picked
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
            onChange={setD}
            placeholder="DD"
            allowOther={false}
            testID="dob-day"
          />
        </View>
        <View style={{ flex: 1.4 }}>
          <Dropdown
            label="Month"
            value={m}
            options={months}
            onChange={setM}
            placeholder="MM"
            allowOther={false}
            testID="dob-month"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Dropdown
            label="Year"
            value={y}
            options={years}
            onChange={setY}
            placeholder="YYYY"
            allowOther={false}
            testID="dob-year"
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
  label: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 13, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8 },
  err: { color: '#EF4444', fontFamily: 'DMSans_500Medium', fontSize: 12, marginTop: 4 },
  helper: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_500Medium', fontSize: 12, marginTop: 4 },
});
