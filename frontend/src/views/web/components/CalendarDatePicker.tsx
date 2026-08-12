/**
 * CalendarDatePicker — Dark/purple popover date picker component for StudentAlumni.
 *
 * Features:
 * - Click input to open dark-themed calendar popover
 * - Navigable months (< >) and year selector dropdown
 * - Grid of days with active selection highlighting
 * - Disables future dates
 * - Timezone-safe date handling (emits YYYY-MM-DD)
 * - Accessible and responsive for mobile and desktop
 */
import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal, Platform, ScrollView,
} from 'react-native';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react-native';
import { PALETTE, FONTS, TYPO } from '../portals/student/tokens';
import { GRAD } from '../portals/student/portalkit';

interface CalendarDatePickerProps {
  label?: string;
  required?: boolean;
  value: string; // YYYY-MM-DD
  onChange: (iso: string) => void;
  placeholder?: string;
  error?: string | null;
  disabled?: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export function CalendarDatePicker({
  label = 'DATE OF BIRTH',
  required = false,
  value,
  onChange,
  placeholder = 'YYYY-MM-DD',
  error,
  disabled = false,
}: CalendarDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);

  const today = useMemo(() => new Date(), []);
  const currentYear = today.getFullYear();

  // Parse initial value or default to 18 years ago
  const initialParsed = useMemo(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map(Number);
      return { year: y, month: m - 1, day: d };
    }
    return { year: currentYear - 18, month: 0, day: 1 };
  }, [value, currentYear]);

  const [viewYear, setViewYear] = useState<number>(initialParsed.year);
  const [viewMonth, setViewMonth] = useState<number>(initialParsed.month);

  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m] = value.split('-').map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    }
  }, [value]);

  // Year options: 100 years back up to currentYear
  const yearOptions = useMemo(() => {
    const list: number[] = [];
    for (let y = currentYear; y >= currentYear - 100; y--) {
      list.push(y);
    }
    return list;
  }, [currentYear]);

  // Format string for input display: DD/MM/YYYY
  const displayFormatted = useMemo(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-');
      return `${d}/${m}/${y}`;
    }
    return '';
  }, [value]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    const nextDate = new Date(viewYear, viewMonth + 1, 1);
    if (nextDate > today) return; // Future month check
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const selectedDate = new Date(viewYear, viewMonth, day);
    if (selectedDate > today) return; // Disallow future dates

    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const iso = `${viewYear}-${mm}-${dd}`;
    onChange(iso);
    setOpen(false);
  };

  // Generate day grid cells
  const calendarCells = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    // Monday index = 0 (Sunday = 6)
    const firstDayIndex = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;

    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(d);
    }
    return cells;
  }, [viewYear, viewMonth]);

  const isNextDisabled = useMemo(() => {
    const nextDate = new Date(viewYear, viewMonth + 1, 1);
    return nextDate > today;
  }, [viewYear, viewMonth, today]);

  return (
    <View style={s.wrap}>
      {label ? (
        <Text style={s.label}>
          {label}{required ? <Text style={{ color: '#EF4444' }}> *</Text> : null}
        </Text>
      ) : null}

      <Pressable
        onPress={() => !disabled && setOpen(true)}
        style={({ hovered, pressed }: any) => [
          s.inputTrigger,
          error ? s.inputError : null,
          hovered && !disabled && s.inputHover,
          pressed && !disabled && s.inputPress,
          open && s.inputActive,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={[s.inputText, !displayFormatted && s.placeholderText]}>
          {displayFormatted || placeholder}
        </Text>
        <CalendarIcon size={18} color={PALETTE.muted} />
      </Pressable>

      {error ? <Text style={s.errorText}>{error}</Text> : null}

      {/* Calendar Popover Modal */}
      {open && (
        <Modal transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
            <Pressable style={s.popoverCard} onPress={(e) => e.stopPropagation()}>
              {/* Header */}
              <View style={s.cardHeader}>
                <View style={s.monthNav}>
                  <Pressable onPress={handlePrevMonth} style={s.navBtn} accessibilityLabel="Previous month">
                    <ChevronLeft size={18} color="#fff" />
                  </Pressable>
                  <Text style={s.monthLabel}>{MONTH_NAMES[viewMonth]}</Text>
                  <Pressable
                    onPress={handleNextMonth}
                    disabled={isNextDisabled}
                    style={[s.navBtn, isNextDisabled && s.navBtnDisabled]}
                    accessibilityLabel="Next month"
                  >
                    <ChevronRight size={18} color={isNextDisabled ? 'rgba(255,255,255,0.2)' : '#fff'} />
                  </Pressable>
                </View>

                {/* Year Select Trigger */}
                <Pressable
                  onPress={() => setShowYearDropdown(!showYearDropdown)}
                  style={s.yearTrigger}
                >
                  <Text style={s.yearText}>{viewYear}</Text>
                  <ChevronDown size={14} color="#C4B5FD" />
                </Pressable>

                <Pressable onPress={() => setOpen(false)} style={s.closeBtn}>
                  <X size={16} color={PALETTE.muted} />
                </Pressable>
              </View>

              {/* Year Dropdown Overlay */}
              {showYearDropdown ? (
                <View style={s.yearOverlay}>
                  <ScrollView style={s.yearScroll} nestedScrollEnabled>
                    {yearOptions.map((y) => (
                      <Pressable
                        key={y}
                        onPress={() => {
                          setViewYear(y);
                          setShowYearDropdown(false);
                        }}
                        style={[s.yearItem, y === viewYear && s.yearItemActive]}
                      >
                        <Text style={[s.yearItemText, y === viewYear && s.yearItemTextActive]}>{y}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : (
                <>
                  {/* Weekdays */}
                  <View style={s.weekdaysRow}>
                    {WEEKDAYS.map((w) => (
                      <View key={w}>
                        <Text style={s.weekdayText}>{w}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Day Grid */}
                  <View style={s.daysGrid}>
                    {calendarCells.map((day, idx) => {
                      if (day === null) {
                        return <View key={`empty-${idx}`} style={s.dayCellEmpty} />;
                      }

                      const cellDate = new Date(viewYear, viewMonth, day);
                      const isFuture = cellDate > today;
                      const isSelected =
                        value &&
                        /^\d{4}-\d{2}-\d{2}$/.test(value) &&
                        viewYear === initialParsed.year &&
                        viewMonth === initialParsed.month &&
                        day === initialParsed.day;

                      return (
                        <Pressable
                          key={`day-${day}`}
                          disabled={isFuture}
                          onPress={() => handleSelectDay(day)}
                          style={({ hovered }: any) => [
                            s.dayCell,
                            isSelected && s.dayCellSelected,
                            isFuture && s.dayCellDisabled,
                            hovered && !isFuture && !isSelected && s.dayCellHover,
                          ]}
                        >
                          <Text
                            style={[
                              s.dayText,
                              isSelected && s.dayTextSelected,
                              isFuture && s.dayTextDisabled,
                            ]}
                          >
                            {day}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 4 },
  label: { color: '#94a3b8', fontFamily: FONTS.semi, fontSize: 11, marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  inputTrigger: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderColor: PALETTE.glassBorder, borderWidth: 1,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '150ms' } as any) : {}),
  },
  inputHover: { borderColor: 'rgba(167,139,250,0.5)' },
  inputPress: { borderColor: GRAD.from },
  inputActive: { borderColor: GRAD.from, backgroundColor: 'rgba(124,58,237,0.1)' },
  inputError: { borderColor: '#F87171' },
  inputText: { color: '#fff', fontFamily: FONTS.med, fontSize: 14 },
  placeholderText: { color: PALETTE.dim },
  errorText: { color: '#F87171', fontFamily: FONTS.med, fontSize: 12, marginTop: 4 },

  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  popoverCard: {
    width: '100%', maxWidth: 340, backgroundColor: '#0d1326',
    borderRadius: 16, borderWidth: 1, borderColor: PALETTE.glassBorder,
    padding: 16, gap: 12,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' } as any) : {}),
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navBtn: {
    width: 28, height: 28, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  navBtnDisabled: { opacity: 0.3 },
  monthLabel: { color: '#fff', fontFamily: TYPO.display700, fontSize: 14, minWidth: 80, textAlign: 'center' },

  yearTrigger: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(124,58,237,0.2)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  yearText: { color: '#C4B5FD', fontFamily: TYPO.display700, fontSize: 13 },
  closeBtn: { padding: 4, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },

  weekdaysRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  weekdayText: { width: 36, textAlign: 'center', color: PALETTE.muted, fontFamily: FONTS.semi, fontSize: 12 },

  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 4 },
  dayCellEmpty: { width: `${100 / 7}%`, height: 36 },
  dayCell: {
    width: `${100 / 7}%`, height: 36, alignItems: 'center', justifyContent: 'center',
    borderRadius: 8,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  dayCellHover: { backgroundColor: 'rgba(255,255,255,0.1)' },
  dayCellSelected: { backgroundColor: GRAD.from },
  dayCellDisabled: { opacity: 0.25 },
  dayText: { color: '#fff', fontFamily: FONTS.med, fontSize: 13 },
  dayTextSelected: { color: '#fff', fontFamily: TYPO.display700 },
  dayTextDisabled: { color: PALETTE.dim },

  yearOverlay: { height: 220 },
  yearScroll: { flex: 1 },
  yearItem: {
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  yearItemActive: { backgroundColor: 'rgba(124,58,237,0.3)' },
  yearItemText: { color: PALETTE.muted, fontFamily: FONTS.med, fontSize: 14 },
  yearItemTextActive: { color: '#fff', fontFamily: TYPO.display700 },
});
