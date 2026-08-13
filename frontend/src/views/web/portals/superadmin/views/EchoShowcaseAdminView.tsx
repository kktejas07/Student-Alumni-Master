// @ts-nocheck
/**
 * Super Admin — ECHO Showcase CMS View.
 *
 * Full CMS-driven Event Management system with:
 *   - Page-level navigation: All Showcases | Create New | Drafts | Media Library
 *   - Drag & Drop multi-image uploader (captions, alt, credit, tags, ordering, featured, deletion)
 *   - Hero image uploads: Banner, Cover, Thumbnail, Background
 *   - Complete CRUD for events, statistics, highlights, timeline, testimonials,
 *     sponsors, downloadable resources, videos, and SEO metadata.
 *   - Testimonials: photo upload, star-rating UI, LinkedIn, visible toggle, sort order
 *   - Sponsors: logo upload widget + priority
 *   - Downloads: file upload widget
 *   - Gallery layout selector (grid/masonry/mixed/featured-grid/carousel)
 *   - Draft, Published, Archived state management.
 *   - Autosave to sessionStorage + unsaved changes warning.
 *   - Full shared Media Library panel.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform, ActivityIndicator,
  TextInput, Modal, ScrollView, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Pencil, Trash2, Eye, Globe, Archive, Send, X, Zap,
  Star, BookOpen, Upload, MoveUp, MoveDown, Images, FolderOpen,
  Copy, Check, Search, RefreshCw, PlusCircle, FileText, Link2,
  Image as ImageIcon, HardDrive, Calendar, Layout, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Users,
  Settings, Ticket, Mail, Palette, ScanLine,
  CupSoda, UtensilsCrossed, Cookie, Sandwich, Coffee, Lock, XCircle, Clock,
} from 'lucide-react-native';
import {
  GRAD, GradientButton, SecondaryButton, Card,
  StatusPill, SearchField, KpiTile, useToast, Toast, TopTabs, IconBox,
} from '../applekit';
import { SAC, FONTS } from '../tokens';
import { api, resolveImageUrl } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useSubTab } from '@/src/views/web/portals/portalUrl';

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_PILL_MAP: Record<string, any> = {
  published: 'success', draft: 'warn', archived: 'neutral',
};

const SESSION_PASS_ICONS: Record<string, any> = {
  breakfast: CupSoda,
  lunch: UtensilsCrossed,
  snacks: Cookie,
  dinner: UtensilsCrossed,
  tiffin: Sandwich,
  coffee: Coffee,
};

const CATEGORY_OPTIONS = [
  'college-event', 'hackathon', 'workshop', 'bootcamp', 'alumni-meet',
  'career-guidance', 'industrial-visit', 'placement-training',
];
const STATUS_OPTIONS = ['draft', 'published', 'archived'];
const STATUS_BADGE_OPTIONS = ['Upcoming', 'Live', 'Completed'];
const SPONSOR_TIER_OPTIONS = ['Title Sponsor', 'Platinum Sponsor', 'Gold Sponsor', 'Silver Sponsor', 'Associate Sponsor', 'Partner'];
const GALLERY_LAYOUT_OPTIONS = ['grid', 'masonry', 'mixed', 'featured-grid', 'carousel'];
const VIDEO_PLATFORM_OPTIONS = ['youtube', 'vimeo', 'mp4'];
const DOWNLOAD_CATEGORY_OPTIONS = ['Brochure', 'Schedule', 'Certificate', 'Presentation', 'Report', 'Document'];

type PageTab = 'all' | 'create' | 'drafts' | 'media' | 'registrations' | 'settings' | 'volunteers';
type StatusFilter = 'all' | 'published' | 'draft' | 'archived';
type FormTab =
  | 'general' | 'hero' | 'statistics' | 'about' | 'gallery'
  | 'testimonials' | 'highlights' | 'sponsors' | 'videos' | 'downloads'
  | 'sections' | 'registration' | 'seo' | 'publish';

const PAGE_TABS: Array<{ id: PageTab; label: string; icon?: any }> = [
  { id: 'all', label: 'All Showcases', icon: Layout },
  { id: 'create', label: 'Create Showcase', icon: PlusCircle },
  { id: 'drafts', label: 'Drafts', icon: FileText },
  { id: 'registrations', label: 'Registrations & Payments', icon: Users },
  { id: 'volunteers', label: 'Volunteers', icon: Users },
  { id: 'media', label: 'Media Library', icon: Images },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const FILTER_TABS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'published', label: 'Published' },
  { id: 'draft', label: 'Draft' },
  { id: 'archived', label: 'Archived' },
];

const FORM_TABS: Array<{ id: FormTab; label: string }> = [
  { id: 'general',      label: 'General' },
  { id: 'hero',         label: 'Hero' },
  { id: 'statistics',   label: 'Statistics' },
  { id: 'about',        label: 'About' },
  { id: 'gallery',      label: 'Gallery' },
  { id: 'testimonials', label: 'Testimonials' },
  { id: 'highlights',   label: 'Highlights' },
  { id: 'sponsors',     label: 'Sponsors' },
  { id: 'videos',       label: 'Videos' },
  { id: 'downloads',    label: 'Downloads' },
  { id: 'sections',     label: 'Sections' },
  { id: 'registration', label: 'Registration' },
  { id: 'seo',          label: 'SEO' },
  { id: 'publish',      label: 'Publish' },
];

// ── Field helpers ─────────────────────────────────────────────────────────────
function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: SAC.muted, letterSpacing: 0.4 }}>
          {label.toUpperCase()}
        </Text>
        {hint && (
          <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.dim }}>{hint}</Text>
        )}
      </View>
      {children}
    </View>
  );
}

// Human date ("July 31, 2026") <-> ISO date ("2026-07-31") for native pickers
function humanToIso(human: string): string {
  if (!human) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(human)) return human;
  const t = Date.parse(human);
  if (isNaN(t)) return '';
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function isoToHuman(iso: string): string {
  if (!iso) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}
// 12h display ("10:00 AM") <-> 24h native time ("10:00")
function humanTimeToNative(t: string): string {
  if (!t) return '';
  const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (m) {
    let h = parseInt(m[1], 10), mm = m[2], ap = (m[3] || '').toUpperCase();
    if (ap === 'PM' && h !== 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${mm}`;
  }
  return '';
}
function nativeToHumanTime(t: string): string {
  if (!t) return '';
  const m = t.trim().match(/^(\d{2}):(\d{2})$/);
  if (!m) return t;
  let h = parseInt(m[1], 10);
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m[2]} ${ap}`;
}

function FieldDate({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder?: string }) {
  if (Platform.OS === 'web') {
    return (
      <input
        type="date"
        value={humanToIso(value)}
        placeholder={placeholder}
        onChange={(e: any) => onChangeText(e.target.value ? isoToHuman(e.target.value) : '')}
        style={{
          backgroundColor: '#0d1326', border: `1px solid ${SAC.border}`,
          borderRadius: 8, padding: '9px 12px',
          fontFamily: FONTS.med, fontSize: 13, color: SAC.text, width: '100%',
          colorScheme: 'dark',
        }}
      />
    );
  }
  return (
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={SAC.dim} style={fi.input} />
  );
}

function FieldTime({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder?: string }) {
  if (Platform.OS === 'web') {
    return (
      <input
        type="time"
        value={humanTimeToNative(value)}
        placeholder={placeholder}
        onChange={(e: any) => onChangeText(e.target.value ? nativeToHumanTime(e.target.value) : '')}
        style={{
          backgroundColor: '#0d1326', border: `1px solid ${SAC.border}`,
          borderRadius: 8, padding: '9px 12px',
          fontFamily: FONTS.med, fontSize: 13, color: SAC.text, width: '100%',
          colorScheme: 'dark',
        }}
      />
    );
  }
  return (
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={SAC.dim} style={fi.input} />
  );
}

// ISO date field (YYYY-MM-DD) — use where the backend parses ISO directly
function IsoDateField({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder?: string }) {
  if (Platform.OS === 'web') {
    return (
      <input
        type="date"
        value={/^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value.slice(0, 10) : ''}
        placeholder={placeholder}
        onChange={(e: any) => onChangeText(e.target.value ? e.target.value.slice(0, 10) : '')}
        style={{
          backgroundColor: '#0d1326', border: `1px solid ${SAC.border}`,
          borderRadius: 8, padding: '9px 12px',
          fontFamily: FONTS.med, fontSize: 13, color: SAC.text, width: '100%',
          colorScheme: 'dark',
        }}
      />
    );
  }
  return (
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={SAC.dim} style={fi.input} />
  );
}

const fi = StyleSheet.create({
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: SAC.border,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9,
    fontFamily: FONTS.med, fontSize: 13, color: SAC.text,
  },
});

function Field({ value, onChangeText, placeholder, multiline = false, rows = 3 }: any) {
  return (
    <TextInput
      value={value || ''}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={SAC.dim}
      multiline={multiline}
      numberOfLines={multiline ? rows : 1}
      style={[fi.input, multiline && { minHeight: rows * 22, textAlignVertical: 'top' }]}
    />
  );
}

function SelectNative({ value, onChange, options }: any) {
  if (Platform.OS === 'web') {
    return (
      <select
        value={value}
        onChange={(e: any) => onChange(e.target.value)}
        style={{
          backgroundColor: '#0d1326',
          border: `1px solid ${SAC.border}`,
          borderRadius: 8, padding: '9px 12px',
          fontFamily: FONTS.med, fontSize: 13, color: SAC.text,
          width: '100%', appearance: 'none',
        } as any}
      >
        {options.map((o: string) => (
          <option key={o} value={o} style={{ backgroundColor: '#0d1326' }}>{o}</option>
        ))}
      </select>
    );
  }
  return <Field value={value} onChangeText={onChange} placeholder="Select…" />;
}

// ── Icon button ───────────────────────────────────────────────────────────────
const cs = StyleSheet.create({
  meta: { fontFamily: FONTS.med, fontSize: 11.5, color: SAC.muted },
  iconBtn: {
    width: 32, height: 32, borderRadius: 8,
    borderWidth: 1, borderColor: SAC.border,
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
});

// ── Hover-tooltip icon action button (super-admin rows) ──────────────────────
function IconAction({ icon, label, color, bg, onPress, disabled = false, danger = false }: {
  icon: React.ReactNode;
  label: string;
  color: string;
  bg?: string;
  onPress?: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <View
      style={{ position: 'relative', zIndex: hover ? 50 : 1 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={{
          width: 30, height: 30, borderRadius: 8,
          backgroundColor: bg || (danger ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)'),
          alignItems: 'center', justifyContent: 'center',
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 0.45 : 1,
          transitionDuration: '120ms',
        }}
      >
        {icon}
      </Pressable>
      {hover && !disabled && (
        <View style={{
          position: 'absolute', top: '100%', left: '50%',
          transform: [{ translateX: -50 }] as any,
          marginTop: 5, paddingHorizontal: 7, paddingVertical: 4,
          backgroundColor: '#0B0F1E', borderRadius: 6,
          borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)',
          maxWidth: 150, zIndex: 60, whiteSpace: 'nowrap' as any,
        }}>
          <Text style={{ color: '#E9E4FF', fontFamily: FONTS.med, fontSize: 10, textAlign: 'center', lineHeight: 13 }}>{label}</Text>
        </View>
      )}
    </View>
  );
}

// ── Generic hover tooltip wrapper (any icon button) ──────────────────────────
function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  const [hover, setHover] = useState(false);
  return (
    <View
      style={{ position: 'relative', zIndex: hover ? 50 : 1 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
      {hover && (
        <View style={{
          position: 'absolute', bottom: '100%', left: '50%',
          transform: [{ translateX: -50 }] as any,
          marginBottom: 5, paddingHorizontal: 7, paddingVertical: 4,
          backgroundColor: '#0B0F1E', borderRadius: 6,
          borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)',
          maxWidth: 160, zIndex: 60, whiteSpace: 'nowrap' as any,
        }}>
          <Text style={{ color: '#E9E4FF', fontFamily: FONTS.med, fontSize: 10, textAlign: 'center', lineHeight: 13 }}>{label}</Text>
        </View>
      )}
    </View>
  );
}

// ── Single image upload widget ────────────────────────────────────────────────
function ImageUploadWidget({
  label, url, onUpload, onRemove, aspectHint, onUploadStart, onUploadEnd, flash, onPickMedia,
}: {
  label: string;
  url?: string | null;
  onUpload: (url: string) => void;
  onRemove: () => void;
  aspectHint?: string;
  onUploadStart?: () => void;
  onUploadEnd?: () => void;
  flash?: (msg: string) => void;
  onPickMedia?: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');

  const handleFile = async (file: File) => {
    // 1. Instant local preview
    if (Platform.OS === 'web' && typeof URL !== 'undefined') {
      try {
        const localPreview = URL.createObjectURL(file);
        onUpload(localPreview);
      } catch (e) {
        console.warn('Could not create local object URL for preview', e);
      }
    }

    setUploading(true);
    setProgress(`Uploading ${file.name}…`);
    onUploadStart?.();

    try {
      const fd = new FormData();
      fd.append('file', file, file.name);
      const res = await api.uploadEchoMedia(fd);

      if (res?.url) {
        onUpload(res.url);
        flash?.(`${label} uploaded`);
      } else {
        throw new Error('Upload returned no URL');
      }
    } catch (err: any) {
      flash?.(`Upload failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
      setProgress('');
      onUploadEnd?.();
    }
  };

  const handleRemove = () => {
    onRemove();
  };

  const onDrop = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: SAC.muted, letterSpacing: 0.4 }}>
        {label.toUpperCase()}
      </Text>
      {aspectHint && (
        <Text style={{ fontFamily: FONTS.med, fontSize: 10.5, color: SAC.dim }}>{aspectHint}</Text>
      )}
      {url ? (
        <View style={{ borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: SAC.border }}>
          <Image
            source={{ uri: resolveImageUrl(url) }}
            style={{ width: '100%', height: 140 }}
            resizeMode="cover"
          />
          <View style={{ flexDirection: 'row', gap: 8, padding: 8, backgroundColor: 'rgba(0,0,0,0.4)' }}>
            {Platform.OS === 'web' && (
              <label style={{ cursor: 'pointer' }}>
                <span style={{
                  backgroundColor: 'rgba(123,61,191,0.30)', color: '#fff',
                  padding: '5px 10px', borderRadius: '6px',
                  fontFamily: FONTS.semi, fontSize: '11px',
                }}>
                  Replace
                </span>
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={(e: any) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </label>
            )}
            <Pressable
              onPress={handleRemove}
              style={{ backgroundColor: 'rgba(239,68,68,0.25)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }}
            >
              <Text style={{ fontFamily: FONTS.semi, fontSize: 11, color: '#FCA5A5' }}>Remove</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View
          style={{
            borderWidth: 2, borderColor: 'rgba(123,61,191,0.40)', borderStyle: 'dashed',
            borderRadius: 10, padding: 20, alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(123,61,191,0.04)',
          }}
          {...(Platform.OS === 'web' ? {
            onDragOver: (e: any) => { e.preventDefault(); e.stopPropagation(); },
            onDrop: onDrop,
          } : {})}
        >
          {uploading ? (
            <>
              <ActivityIndicator size="small" color={GRAD.from} />
              <Text style={{ fontFamily: FONTS.semi, fontSize: 12, color: GRAD.from, marginTop: 8 }}>{progress}</Text>
            </>
          ) : (
            <>
              <Upload size={22} color={GRAD.from} />
              <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: SAC.text, marginTop: 8 }}>
                Drag & Drop or Browse
              </Text>
              <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.muted, marginTop: 4 }}>
                JPEG · PNG · WEBP · AVIF · Max 25MB
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                {Platform.OS === 'web' && (
                  <label style={{ cursor: 'pointer' }}>
                    <span style={{
                      backgroundColor: 'rgba(123,61,191,0.30)', color: '#fff',
                      padding: '6px 14px', borderRadius: '8px',
                      fontFamily: FONTS.semi, fontSize: '12px',
                    }}>
                      Browse Files
                    </span>
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={(e: any) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                  </label>
                )}
                {onPickMedia && (
                  <Pressable onPress={onPickMedia} style={{ backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: SAC.border }}>
                    <Text style={{ fontFamily: FONTS.semi, fontSize: 12, color: SAC.text }}>Choose Existing Image</Text>
                  </Pressable>
                )}
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

// ── Star Rating Selector ──────────────────────────────────────────────────────
function StarRating({ value = 5, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)}>
          <Star
            size={20}
            color="#F59E0B"
            fill={n <= value ? '#F59E0B' : 'transparent'}
          />
        </Pressable>
      ))}
    </View>
  );
}

// ── Stat Editor ───────────────────────────────────────────────────────────────
function StatsEditor({ stats, onChange }: any) {
  const update = (i: number, key: string, val: string) => {
    const next = [...stats];
    next[i] = { ...next[i], [key]: val };
    onChange(next);
  };
  const add = () => onChange([...stats, { label: '', value: '', icon: 'users', display_order: stats.length }]);
  const remove = (i: number) => onChange(stats.filter((_: any, j: number) => j !== i));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= stats.length) return;
    const next = [...stats];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };
  return (
    <View style={{ gap: 8 }}>
      {stats.map((s: any, i: number) => (
        <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput value={s.value || ''} onChangeText={(v) => update(i, 'value', v)} placeholder="Value" placeholderTextColor={SAC.dim} style={[fi.input, { flex: 0.4 }]} />
          <TextInput value={s.label || ''} onChangeText={(v) => update(i, 'label', v)} placeholder="Label" placeholderTextColor={SAC.dim} style={[fi.input, { flex: 1 }]} />
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <Tip label="Move up"><Pressable onPress={() => move(i, i - 1)} style={[cs.iconBtn, { width: 26, height: 26 }]}><MoveUp size={11} color={SAC.muted} /></Pressable></Tip>
            <Tip label="Move down"><Pressable onPress={() => move(i, i + 1)} style={[cs.iconBtn, { width: 26, height: 26 }]}><MoveDown size={11} color={SAC.muted} /></Pressable></Tip>
          </View>
          <Tip label="Remove"><Pressable onPress={() => remove(i)} style={cs.iconBtn}><X size={12} color="#F87171" /></Pressable></Tip>
        </View>
      ))}
      <Pressable onPress={add}><Text style={{ color: GRAD.from, fontFamily: FONTS.semi, fontSize: 12.5 }}>+ Add Stat</Text></Pressable>
    </View>
  );
}

// ── Generic list editor ───────────────────────────────────────────────────────
function ListEditor({ items, fields, onChange, addLabel }: any) {
  const update = (i: number, key: string, val: string) => {
    const next = [...items];
    next[i] = { ...next[i], [key]: val };
    onChange(next);
  };
  const add = () => {
    const blank: any = {};
    fields.forEach((f: any) => { blank[f.key] = f.defaultValue ?? ''; });
    onChange([...items, blank]);
  };
  const remove = (i: number) => onChange(items.filter((_: any, j: number) => j !== i));
  return (
    <View style={{ gap: 8 }}>
      {items.map((item: any, i: number) => (
        <View key={i} style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {fields.map((fd: any) => (
            <TextInput
              key={fd.key}
              value={item[fd.key] || ''}
              onChangeText={(v) => update(i, fd.key, v)}
              placeholder={fd.placeholder}
              placeholderTextColor={SAC.dim}
              style={[fi.input, { flex: fd.flex ?? 1, minWidth: 70 }]}
            />
          ))}
          <Tip label="Remove"><Pressable onPress={() => remove(i)} style={cs.iconBtn}><X size={12} color="#F87171" /></Pressable></Tip>
        </View>
      ))}
      <Pressable onPress={add}><Text style={{ color: GRAD.from, fontFamily: FONTS.semi, fontSize: 12.5 }}>+ {addLabel}</Text></Pressable>
    </View>
  );
}

// ── Testimonials Editor ───────────────────────────────────────────────────────
function TestimonialsEditor({ testimonials, onChange }: any) {
  const update = (i: number, key: string, val: any) => {
    const next = [...testimonials];
    next[i] = { ...next[i], [key]: val };
    onChange(next);
  };
  const add = () => onChange([...testimonials, {
    name: '', branch: '', department: '', year: '', quote: '',
    rating: 5, photo_url: null, linkedin_url: '', visible: true, sort_order: testimonials.length,
  }]);
  const remove = (i: number) => onChange(testimonials.filter((_: any, j: number) => j !== i));

  const handlePhotoUpload = async (i: number, file: File) => {
    try {
      const fd = new FormData();
      fd.append('file', file, file.name);
      const res = await api.uploadEchoMedia(fd);
      if (res?.url) update(i, 'photo_url', res.url);
    } catch { /* ignore */ }
  };

  return (
    <View style={{ gap: 16 }}>
      {testimonials.map((t: any, i: number) => (
        <View key={i} style={{
          backgroundColor: 'rgba(255,255,255,0.03)',
          borderRadius: 12, padding: 14, borderWidth: 1,
          borderColor: t.visible !== false ? SAC.border : 'rgba(239,68,68,0.25)',
          gap: 10,
        }}>
          {/* Header row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: SAC.text }}>Testimonial #{i + 1}</Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              {/* Visible toggle */}
              <Pressable
                onPress={() => update(i, 'visible', !t.visible)}
                style={[cs.iconBtn, { paddingHorizontal: 10, width: 'auto' as any,
                  borderColor: t.visible !== false ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)',
                  backgroundColor: t.visible !== false ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)' }]}
              >
                <Text style={{ fontFamily: FONTS.semi, fontSize: 11,
                  color: t.visible !== false ? '#34D399' : '#F87171' }}>
                  {t.visible !== false ? 'Visible' : 'Hidden'}
                </Text>
              </Pressable>
              <Pressable onPress={() => remove(i)} style={[cs.iconBtn, { borderColor: 'rgba(239,68,68,0.30)' }]}>
                <Trash2 size={13} color="#F87171" />
              </Pressable>
            </View>
          </View>

          {/* Photo + basic info row */}
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            {/* Photo upload */}
            <View style={{ alignItems: 'center', gap: 6 }}>
              <View style={{ width: 60, height: 60, borderRadius: 30, overflow: 'hidden',
                backgroundColor: 'rgba(123,61,191,0.15)', borderWidth: 1, borderColor: SAC.border,
                alignItems: 'center', justifyContent: 'center' }}>
                {t.photo_url ? (
                  <Image source={{ uri: resolveImageUrl(t.photo_url) }}
                    style={{ width: 60, height: 60 }} resizeMode="cover" />
                ) : (
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: GRAD.from }}>
                    {(t.name || 'U')[0].toUpperCase()}
                  </Text>
                )}
              </View>
              {Platform.OS === 'web' && (
                <label style={{ cursor: 'pointer' }}>
                  <span style={{ backgroundColor: 'rgba(123,61,191,0.20)', color: GRAD.from,
                    padding: '3px 8px', borderRadius: '6px', fontFamily: FONTS.semi, fontSize: '10px' }}>
                    {t.photo_url ? 'Change' : 'Photo'}
                  </span>
                  <input type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={(e: any) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(i, f); }} />
                </label>
              )}
            </View>

            {/* Fields grid */}
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                <TextInput value={t.name || ''} onChangeText={(v) => update(i, 'name', v)}
                  placeholder="Full Name" placeholderTextColor={SAC.dim} style={[fi.input, { flex: 1, minWidth: 100 }]} />
                <TextInput value={t.department || t.branch || ''} onChangeText={(v) => { update(i, 'department', v); update(i, 'branch', v); }}
                  placeholder="Department" placeholderTextColor={SAC.dim} style={[fi.input, { flex: 1, minWidth: 100 }]} />
                <TextInput value={t.year || ''} onChangeText={(v) => update(i, 'year', v)}
                  placeholder="Year (e.g. Final Year)" placeholderTextColor={SAC.dim} style={[fi.input, { flex: 0.7, minWidth: 80 }]} />
              </View>
              <TextInput value={t.quote || ''} onChangeText={(v) => update(i, 'quote', v)}
                placeholder="Testimonial quote…" placeholderTextColor={SAC.dim} multiline numberOfLines={3}
                style={[fi.input, { minHeight: 60, textAlignVertical: 'top' }]} />
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.muted }}>Rating:</Text>
                <StarRating value={t.rating || 5} onChange={(v) => update(i, 'rating', v)} />
              </View>
              <TextInput value={t.linkedin_url || ''} onChangeText={(v) => update(i, 'linkedin_url', v)}
                placeholder="LinkedIn URL (optional)" placeholderTextColor={SAC.dim} style={fi.input} />
            </View>
          </View>
        </View>
      ))}
      <Pressable onPress={add}>
        <Text style={{ color: GRAD.from, fontFamily: FONTS.semi, fontSize: 12.5 }}>+ Add Testimonial</Text>
      </Pressable>
    </View>
  );
}

// ── Sponsors Editor ───────────────────────────────────────────────────────────
function SponsorsEditor({ sponsors, onChange }: any) {
  const update = (i: number, key: string, val: any) => {
    const next = [...sponsors];
    next[i] = { ...next[i], [key]: val };
    onChange(next);
  };
  const add = () => onChange([...sponsors, { name: '', tier: 'Gold Sponsor', logo_url: null, website_url: '', priority: sponsors.length }]);
  const remove = (i: number) => onChange(sponsors.filter((_: any, j: number) => j !== i));

  const handleLogoUpload = async (i: number, file: File) => {
    try {
      const fd = new FormData();
      fd.append('file', file, file.name);
      const res = await api.uploadEchoMedia(fd);
      if (res?.url) update(i, 'logo_url', res.url);
    } catch { /* ignore */ }
  };

  return (
    <View style={{ gap: 12 }}>
      {sponsors.map((sp: any, i: number) => (
        <View key={i} style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: SAC.border, gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            {/* Logo upload */}
            <View style={{ alignItems: 'center', gap: 4 }}>
              <View style={{ width: 72, height: 44, borderRadius: 8, overflow: 'hidden',
                backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: SAC.border,
                alignItems: 'center', justifyContent: 'center' }}>
                {sp.logo_url ? (
                  <Image source={{ uri: resolveImageUrl(sp.logo_url) }}
                    style={{ width: 70, height: 42 }} resizeMode="contain" />
                ) : (
                  <ImageIcon size={18} color={SAC.dim} />
                )}
              </View>
              {Platform.OS === 'web' && (
                <label style={{ cursor: 'pointer' }}>
                  <span style={{ backgroundColor: 'rgba(123,61,191,0.15)', color: GRAD.from,
                    padding: '2px 6px', borderRadius: '4px', fontFamily: FONTS.semi, fontSize: '9px' }}>
                    Logo
                  </span>
                  <input type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={(e: any) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(i, f); }} />
                </label>
              )}
            </View>
            {/* Fields */}
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                <TextInput value={sp.name || ''} onChangeText={(v) => update(i, 'name', v)}
                  placeholder="Sponsor Name" placeholderTextColor={SAC.dim} style={[fi.input, { flex: 1, minWidth: 100 }]} />
                <View style={{ flex: 0.8, minWidth: 120 }}>
                  <SelectNative value={sp.tier || 'Gold Sponsor'} onChange={(v: string) => update(i, 'tier', v)} options={SPONSOR_TIER_OPTIONS} />
                </View>
              </View>
              <TextInput value={sp.website_url || ''} onChangeText={(v) => update(i, 'website_url', v)}
                placeholder="Website URL" placeholderTextColor={SAC.dim} style={fi.input} />
              {sp.logo_url && (
                <Pressable onPress={() => update(i, 'logo_url', null)}>
                  <Text style={{ fontFamily: FONTS.med, fontSize: 10.5, color: '#F87171' }}>Remove logo</Text>
                </Pressable>
              )}
            </View>
<Tip label="Remove tab"><Pressable onPress={() => remove(i)} style={[cs.iconBtn, { borderColor: 'rgba(239,68,68,0.30)' }]}>
                <Trash2 size={13} color="#F87171" />
              </Pressable></Tip>
            </View>
          </View>
      ))}
      <Pressable onPress={add}>
        <Text style={{ color: GRAD.from, fontFamily: FONTS.semi, fontSize: 12.5 }}>+ Add Sponsor</Text>
      </Pressable>
    </View>
  );
}

// ── Downloads Editor ──────────────────────────────────────────────────────────
function DownloadsEditor({ downloads, onChange }: any) {
  const update = (i: number, key: string, val: any) => {
    const next = [...downloads];
    next[i] = { ...next[i], [key]: val };
    onChange(next);
  };
  const add = () => onChange([...downloads, { title: '', file_url: '', description: '', file_size: '', category: 'Document' }]);
  const remove = (i: number) => onChange(downloads.filter((_: any, j: number) => j !== i));

  const handleFileUpload = async (i: number, file: File) => {
    try {
      const fd = new FormData();
      fd.append('file', file, file.name);
      const res = await api.uploadEchoMedia(fd);
      const sizeKB = file.size / 1024;
      const sizeHuman = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${Math.round(sizeKB)} KB`;
      if (res?.url) update(i, 'file_url', res.url);
      if (!downloads[i].file_size) update(i, 'file_size', sizeHuman);
    } catch { /* ignore */ }
  };

  return (
    <View style={{ gap: 10 }}>
      {downloads.map((dl: any, i: number) => (
        <View key={i} style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: SAC.border, gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextInput value={dl.title || ''} onChangeText={(v) => update(i, 'title', v)}
              placeholder="Document Title" placeholderTextColor={SAC.dim} style={[fi.input, { flex: 1, minWidth: 120 }]} />
            <View style={{ flex: 0.5, minWidth: 100 }}>
              <SelectNative value={dl.category || 'Document'} onChange={(v: string) => update(i, 'category', v)} options={DOWNLOAD_CATEGORY_OPTIONS} />
            </View>
            <TextInput value={dl.file_size || ''} onChangeText={(v) => update(i, 'file_size', v)}
              placeholder="Size (2.4 MB)" placeholderTextColor={SAC.dim} style={[fi.input, { flex: 0.35, minWidth: 80 }]} />
            <Tip label="Remove sponsor"><Tip label="Remove download"><Pressable onPress={() => remove(i)} style={[cs.iconBtn, { borderColor: 'rgba(239,68,68,0.30)' }]}>
              <Trash2 size={13} color="#F87171" />
            </Pressable></Tip></Tip>
          </View>
          <TextInput value={dl.description || ''} onChangeText={(v) => update(i, 'description', v)}
            placeholder="Description" placeholderTextColor={SAC.dim} style={fi.input} />
          {/* File URL + upload */}
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TextInput value={dl.file_url || ''} onChangeText={(v) => update(i, 'file_url', v)}
              placeholder="File URL or paste link" placeholderTextColor={SAC.dim} style={[fi.input, { flex: 1 }]} />
            {Platform.OS === 'web' && (
              <Tip label="Upload file">
                <label style={{ cursor: 'pointer' }}>
                  <View style={[cs.iconBtn, { backgroundColor: 'rgba(123,61,191,0.15)', borderColor: 'rgba(123,61,191,0.40)' }]}>
                    <Upload size={13} color={GRAD.from} />
                  </View>
                  <input type="file" accept=".pdf,.docx,.xlsx,.pptx,.zip" style={{ display: 'none' }}
                    onChange={(e: any) => { const f = e.target.files?.[0]; if (f) handleFileUpload(i, f); }} />
                </label>
              </Tip>
            )}
          </View>
          {dl.file_url && (
            <Text style={{ fontFamily: FONTS.med, fontSize: 10.5, color: SAC.muted }} numberOfLines={1}>
              📎 {dl.file_url}
            </Text>
          )}
        </View>
      ))}
      <Pressable onPress={add}>
        <Text style={{ color: GRAD.from, fontFamily: FONTS.semi, fontSize: 12.5 }}>+ Add Download</Text>
      </Pressable>
    </View>
  );
}

// ── Poster Editor (simple URL list) ──────────────────────────────────────────
function PosterEditor({ posters, onChange }: { posters: string[]; onChange: (p: string[]) => void }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const list = Array.isArray(posters) ? posters : [];

  const addFromUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const newUrls: string[] = [];
    const total = files.length;
    for (let i = 0; i < total; i++) {
      const file = files[i];
      setProgress(`Uploading ${i + 1} of ${total}…`);
      try {
        const fd = new FormData();
        fd.append('file', file, file.name);
        const res = await api.uploadEchoMedia(fd);
        if (res?.url) newUrls.push(res.url);
      } catch { /* skip failed */ }
    }
    if (newUrls.length > 0) onChange([...list, ...newUrls]);
    setUploading(false);
    setProgress('');
  };

  const set = (i: number, v: string) => {
    const next = [...list];
    next[i] = v;
    onChange(next);
  };
  const add = () => onChange([...list, '']);
  const remove = (i: number) => onChange(list.filter((_: string, j: number) => j !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const onDrop = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.files) addFromUpload(e.dataTransfer.files);
  };

  return (
    <View style={{ gap: 10 }}>
      {/* Dropzone */}
      <View
        style={{
          borderWidth: 2, borderColor: 'rgba(123,61,191,0.35)', borderStyle: 'dashed',
          borderRadius: 10, padding: 16, alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(123,61,191,0.04)',
        }}
        {...(Platform.OS === 'web' ? {
          onDragOver: (e: any) => { e.preventDefault(); e.stopPropagation(); },
          onDrop: onDrop,
        } : {})}
      >
        {uploading ? (
          <View style={{ alignItems: 'center', gap: 6 }}>
            <ActivityIndicator size="small" color={GRAD.from} />
            <Text style={{ fontFamily: FONTS.semi, fontSize: 12, color: GRAD.from }}>{progress}</Text>
          </View>
        ) : (
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Upload size={18} color={GRAD.from} />
            <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: SAC.text }}>Drop poster images here</Text>
            <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.muted }}>Or use the button below</Text>
            {Platform.OS === 'web' && (
              <label style={{ marginTop: 4, cursor: 'pointer' }}>
                <span style={{
                  backgroundColor: 'rgba(123,61,191,0.25)', color: '#fff',
                  padding: '5px 12px', borderRadius: '7px',
                  fontFamily: FONTS.semi, fontSize: '11px',
                }}>
                  Browse Files
                </span>
                <input type="file" multiple accept="image/*" style={{ display: 'none' }}
                  onChange={(e: any) => { if (e.target.files?.length > 0) addFromUpload(e.target.files); }} />
              </label>
            )}
          </View>
        )}
      </View>

      {/* Poster list */}
      {list.map((url, i) => (
        <View key={i} style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: SAC.border, gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            {url ? (
              <Image source={{ uri: resolveImageUrl(url) }} style={{ width: 44, height: 56, borderRadius: 6, backgroundColor: '#0d1326' }} resizeMode="cover" />
            ) : (
              <View style={{ width: 44, height: 56, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}>
                <ImageIcon size={14} color={SAC.dim} />
              </View>
            )}
            <TextInput value={url} onChangeText={(v) => set(i, v)}
              placeholder="Poster image URL" placeholderTextColor={SAC.dim}
              style={[fi.input, { flex: 1 }]} />
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <Tip label="Move up"><Pressable onPress={() => move(i, -1)} disabled={i === 0} style={[cs.iconBtn, { opacity: i === 0 ? 0.35 : 1 }]}>
                <ChevronUp size={13} color="#CBD5E1" />
              </Pressable></Tip>
              <Tip label="Move down"><Pressable onPress={() => move(i, 1)} disabled={i === list.length - 1} style={[cs.iconBtn, { opacity: i === list.length - 1 ? 0.35 : 1 }]}>
                <ChevronDown size={13} color="#CBD5E1" />
              </Pressable></Tip>
              <Tip label="Remove"><Pressable onPress={() => remove(i)} style={[cs.iconBtn, { borderColor: 'rgba(239,68,68,0.30)' }]}>
                <Trash2 size={13} color="#F87171" />
              </Pressable></Tip>
            </View>
          </View>
          {url ? (
            <Text style={{ fontFamily: FONTS.med, fontSize: 10.5, color: SAC.muted }} numberOfLines={1}>
                    <Ticket size={14} color={SAC.muted} /> {url}
            </Text>
          ) : null}
        </View>
      ))}
      <Pressable onPress={add}>
        <Text style={{ color: GRAD.from, fontFamily: FONTS.semi, fontSize: 12.5 }}>+ Add Poster Image (URL)</Text>
      </Pressable>
    </View>
  );
}

// ── Banner Carousel Editor ──────────────────────────────────────────────────
function BannerCarouselEditor({ banners, onChange }: { banners: string[]; onChange: (b: string[]) => void }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const list = Array.isArray(banners) ? banners : [];

  const addFromUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const newUrls: string[] = [];
    const total = files.length;
    for (let i = 0; i < total; i++) {
      const file = files[i];
      setProgress(`Uploading ${i + 1} of ${total}…`);
      try {
        const fd = new FormData();
        fd.append('file', file, file.name);
        const res = await api.uploadEchoMedia(fd);
        if (res?.url) newUrls.push(res.url);
      } catch { /* skip failed */ }
    }
    if (newUrls.length > 0) onChange([...list, ...newUrls]);
    setUploading(false);
    setProgress('');
  };

  const set = (i: number, v: string) => {
    const next = [...list];
    next[i] = v;
    onChange(next);
  };
  const add = () => onChange([...list, '']);
  const remove = (i: number) => onChange(list.filter((_: string, j: number) => j !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const onDrop = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.files) addFromUpload(e.dataTransfer.files);
  };

  return (
    <View style={{ gap: 10 }}>
      {/* Dropzone for bulk upload */}
      <View
        style={{
          borderWidth: 2, borderColor: 'rgba(123,61,191,0.35)', borderStyle: 'dashed',
          borderRadius: 10, padding: 18, alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(123,61,191,0.04)',
        }}
        {...(Platform.OS === 'web' ? {
          onDragOver: (e: any) => { e.preventDefault(); e.stopPropagation(); },
          onDrop: onDrop,
        } : {})}
      >
        {uploading ? (
          <View style={{ alignItems: 'center', gap: 6 }}>
            <ActivityIndicator size="small" color={GRAD.from} />
            <Text style={{ fontFamily: FONTS.semi, fontSize: 12, color: GRAD.from }}>{progress}</Text>
          </View>
        ) : (
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Upload size={20} color={GRAD.from} />
            <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: SAC.text }}>Drag banner images here</Text>
            <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.muted }}>Or use the buttons below</Text>
            {Platform.OS === 'web' && (
              <label style={{ marginTop: 4, cursor: 'pointer' }}>
                <span style={{
                  backgroundColor: 'rgba(123,61,191,0.25)', color: '#fff',
                  padding: '5px 12px', borderRadius: '7px',
                  fontFamily: FONTS.semi, fontSize: '11px',
                }}>
                  Browse Files
                </span>
                <input type="file" multiple accept="image/*" style={{ display: 'none' }}
                  onChange={(e: any) => { if (e.target.files?.length > 0) addFromUpload(e.target.files); }} />
              </label>
            )}
          </View>
        )}
      </View>

      {/* Banner list */}
      {list.map((url, i) => (
        <View key={i} style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: SAC.border, gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            {url ? (
              <Image source={{ uri: resolveImageUrl(url) }}
                style={{ width: 80, height: 40, borderRadius: 6, backgroundColor: '#0d1326' }} resizeMode="cover" />
            ) : (
              <View style={{ width: 80, height: 40, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}>
                <ImageIcon size={14} color={SAC.dim} />
              </View>
            )}
            <TextInput value={url} onChangeText={(v) => set(i, v)}
              placeholder="Banner image URL or paste link" placeholderTextColor={SAC.dim}
              style={[fi.input, { flex: 1 }]} />
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <Tip label="Move up"><Pressable onPress={() => move(i, -1)} disabled={i === 0} style={[cs.iconBtn, { opacity: i === 0 ? 0.35 : 1 }]}>
                <ChevronUp size={13} color="#CBD5E1" />
              </Pressable></Tip>
              <Tip label="Move down"><Pressable onPress={() => move(i, 1)} disabled={i === list.length - 1} style={[cs.iconBtn, { opacity: i === list.length - 1 ? 0.35 : 1 }]}>
                <ChevronDown size={13} color="#CBD5E1" />
              </Pressable></Tip>
              <Tip label="Remove"><Pressable onPress={() => remove(i)} style={[cs.iconBtn, { borderColor: 'rgba(239,68,68,0.30)' }]}>
                <Trash2 size={13} color="#F87171" />
              </Pressable></Tip>
            </View>
          </View>
        </View>
      ))}
      <Pressable onPress={add}>
        <Text style={{ color: GRAD.from, fontFamily: FONTS.semi, fontSize: 12.5 }}>+ Add Banner Image URL</Text>
      </Pressable>
    </View>
  );
}

// ── Gallery Dropzone ──────────────────────────────────────────────────────────
function GalleryDropzone({ gallery, onChange }: { gallery: any[]; onChange: (g: any[]) => void }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');

  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const newItems: any[] = [];
    const total = files.length;

    for (let i = 0; i < total; i++) {
      const file = files[i];
      setProgress(`Uploading ${i + 1} of ${total}…`);
      try {
        const fd = new FormData();
        fd.append('file', file, file.name);
        const res = await api.uploadEchoMedia(fd);
        if (res?.url) {
          newItems.push({
            url: res.url,
            caption: file.name.split('.')[0].replace(/[-_]/g, ' '),
            alt: file.name,
            credit: '',
            tags: [],
            featured: false,
            hero: false,
            order: (gallery?.length || 0) + i,
          });
        }
      } catch (err) {
        console.error('Upload error', err);
      }
    }

    if (newItems.length > 0) {
      onChange([...(gallery || []), ...newItems]);
    }
    setUploading(false);
    setProgress('');
  };

  const onDrop = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.files) processFiles(e.dataTransfer.files);
  };
  const onFileSelect = (e: any) => {
    if (e.target?.files) processFiles(e.target.files);
  };

  const updateItem = (index: number, key: string, val: any) => {
    const next = [...(gallery || [])];
    next[index] = { ...next[index], [key]: val };
    onChange(next);
  };

  const removeItem = (index: number) => {
    onChange((gallery || []).filter((_, i) => i !== index));
  };

  const moveItem = (from: number, to: number) => {
    if (to < 0 || to >= (gallery || []).length) return;
    const next = [...(gallery || [])];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <View style={{ gap: 14 }}>
      {/* Dropzone */}
      <View
        style={{
          borderWidth: 2, borderColor: 'rgba(123,61,191,0.40)', borderStyle: 'dashed',
          borderRadius: 12, padding: 24, alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(123,61,191,0.06)',
        }}
        {...(Platform.OS === 'web' ? {
          onDragOver: (e: any) => { e.preventDefault(); e.stopPropagation(); },
          onDrop: onDrop,
        } : {})}
      >
        <Upload size={28} color={GRAD.from} />
        <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: SAC.text, marginTop: 8 }}>
          Drag & Drop Gallery Images Here
        </Text>
        <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted, marginTop: 4 }}>
          Supports JPEG, PNG, WEBP, AVIF. Multiple files at once. Max 25MB each.
        </Text>
        {Platform.OS === 'web' && (
          <label style={{ marginTop: 12, cursor: 'pointer' }}>
            <span style={{
              backgroundColor: 'rgba(123,61,191,0.30)', color: '#fff',
              padding: '7px 14px', borderRadius: '8px',
              fontFamily: FONTS.semi, fontSize: '12px',
            }}>
              Browse Files
            </span>
            <input type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={onFileSelect} />
          </label>
        )}
        {uploading && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <ActivityIndicator size="small" color={GRAD.from} />
            <Text style={{ fontFamily: FONTS.semi, fontSize: 12, color: GRAD.from }}>{progress}</Text>
          </View>
        )}
      </View>

      {/* Gallery items */}
      {(gallery || []).length > 0 && (
        <View style={{ gap: 10 }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: SAC.muted }}>
            {(gallery || []).length} PHOTO{(gallery || []).length !== 1 ? 'S' : ''} IN GALLERY
          </Text>
          {(gallery || []).map((item: any, i: number) => (
            <View key={i} style={{
              flexDirection: 'row', gap: 12, alignItems: 'flex-start',
              backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 10,
              borderWidth: 1, borderColor: item.featured ? 'rgba(245,158,11,0.50)' : (item.hero ? 'rgba(123,61,191,0.50)' : SAC.border),
            }}>
              {/* Thumbnail */}
              <View style={{ width: 72, height: 72, borderRadius: 8, overflow: 'hidden', backgroundColor: '#000' }}>
                {item.url ? (
                  <Image source={{ uri: resolveImageUrl(item.url) }}
                    style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Upload size={16} color={SAC.dim} />
                  </View>
                )}
              </View>

              {/* Inputs */}
              <View style={{ flex: 1, gap: 5 }}>
                <TextInput value={item.caption || ''} onChangeText={(v) => updateItem(i, 'caption', v)}
                  placeholder="Caption (e.g. Keynote speech)" placeholderTextColor={SAC.dim}
                  style={[fi.input, { paddingVertical: 6 }]} />
                <TextInput value={item.alt || ''} onChangeText={(v) => updateItem(i, 'alt', v)}
                  placeholder="Alt Text (for SEO & accessibility)" placeholderTextColor={SAC.dim}
                  style={[fi.input, { paddingVertical: 6 }]} />
                <TextInput value={item.credit || ''} onChangeText={(v) => updateItem(i, 'credit', v)}
                  placeholder="Photo credit (optional)" placeholderTextColor={SAC.dim}
                  style={[fi.input, { paddingVertical: 6 }]} />
              </View>

              {/* Controls */}
              <View style={{ gap: 5, alignItems: 'center' }}>
                {/* Featured star */}
                <Tip label={item.featured ? 'Unmark featured' : 'Mark featured'}>
                  <Pressable onPress={() => updateItem(i, 'featured', !item.featured)}
                    style={[cs.iconBtn, item.featured && { borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                    <Star size={14} color={item.featured ? '#F59E0B' : SAC.muted} fill={item.featured ? '#F59E0B' : 'transparent'} />
                  </Pressable>
                </Tip>
                {/* Hero marker */}
                <Tip label={item.hero ? 'Unmark hero' : 'Mark as hero image'}>
                  <Pressable onPress={() => updateItem(i, 'hero', !item.hero)}
                    style={[cs.iconBtn, item.hero && { borderColor: GRAD.from, backgroundColor: 'rgba(123,61,191,0.15)' }]}>
                    <ImageIcon size={13} color={item.hero ? GRAD.from : SAC.muted} />
                  </Pressable>
                </Tip>
                {/* Order */}
                <View style={{ flexDirection: 'row', gap: 3 }}>
                  <Tip label="Move up"><Pressable onPress={() => moveItem(i, i - 1)} style={[cs.iconBtn, { width: 24, height: 24 }]}><MoveUp size={10} color={SAC.muted} /></Pressable></Tip>
                  <Tip label="Move down"><Pressable onPress={() => moveItem(i, i + 1)} style={[cs.iconBtn, { width: 24, height: 24 }]}><MoveDown size={10} color={SAC.muted} /></Pressable></Tip>
                </View>
                {/* Delete */}
                <Tip label="Remove image"><Pressable onPress={() => removeItem(i)} style={[cs.iconBtn, { borderColor: 'rgba(239,68,68,0.30)' }]}>
                  <X size={13} color="#F87171" />
                </Pressable></Tip>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Media Library Panel ───────────────────────────────────────────────────────
function MediaLibraryPanel() {
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<any | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [totalInfo, setTotalInfo] = useState<{ total: number; total_size_human: string }>({ total: 0, total_size_human: '0 B' });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const { flash } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listEchoMedia();
      setMedia(res?.items || []);
      setTotalInfo({ total: res?.total || 0, total_size_human: res?.total_size_human || '0 B' });
    } catch {
      flash('Failed to load media library');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = media.filter((m) =>
    !search || m.filename.toLowerCase().includes(search.toLowerCase()) ||
    (m.original_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const images = filtered.filter((m) => m.is_image);
  const docs = filtered.filter((m) => !m.is_image);

  const copyUrl = (url: string) => {
    if (Platform.OS === 'web') {
      const full = resolveImageUrl(url);
      navigator.clipboard?.writeText(full).catch(() => {});
    }
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const onDelete = async (filename: string) => {
    if (Platform.OS === 'web' && !window.confirm(`Delete ${filename}? This cannot be undone.`)) return;
    setDeleting(filename);
    try {
      await api.deleteEchoMedia(filename);
      flash('File deleted');
      await load();
    } catch {
      flash('Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  const handleBulkUpload = async (files: FileList) => {
    setUploading(true);
    let count = 0;
    for (let i = 0; i < files.length; i++) {
      setUploadProgress(`Uploading ${i + 1}/${files.length}…`);
      const file = files[i];
      try {
        const fd = new FormData();
        fd.append('file', file, file.name);
        await api.uploadEchoMedia(fd);
        count++;
      } catch { /* skip failed */ }
    }
    setUploading(false);
    setUploadProgress('');
    flash(`${count} file${count !== 1 ? 's' : ''} uploaded`);
    await load();
  };

  return (
    <View style={{ gap: 16 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <View>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 20, color: SAC.text }}>Media Library</Text>
          <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted }}>
            {totalInfo.total} files · {totalInfo.total_size_human} total
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          {Platform.OS === 'web' && (
            <label style={{ cursor: 'pointer' }}>
              <View>
                <GradientButton size="md">
                  <Upload size={13} color="#fff" />
                  <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13, marginLeft: 6 }}>
                    {uploading ? uploadProgress : 'Bulk Upload'}
                  </Text>
                </GradientButton>
              </View>
              <input type="file" multiple accept="image/*,.pdf,.docx,.xlsx,.pptx" style={{ display: 'none' }}
                onChange={(e: any) => { if (e.target.files?.length > 0) handleBulkUpload(e.target.files); }} />
            </label>
          )}
          <Tip label="Refresh files"><Pressable onPress={load} style={[cs.iconBtn, { width: 34, height: 34 }]}>
            <RefreshCw size={15} color={SAC.muted} />
          </Pressable></Tip>
        </View>
      </View>

      {/* Search */}
      <SearchField value={search} onChange={setSearch} placeholder="Search files…" width="100%" />

      {loading ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={GRAD.from} />
        </View>
      ) : filtered.length === 0 ? (
        <Card style={{ padding: 32, alignItems: 'center', gap: 10 }}>
          <HardDrive size={28} color={SAC.dim} />
          <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: SAC.text }}>No files uploaded yet</Text>
          <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted }}>
            Upload images and documents to use in your showcases.
          </Text>
        </Card>
      ) : (
        <>
          {/* Images grid */}
          {images.length > 0 && (
            <View style={{ gap: 10 }}>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: SAC.muted, letterSpacing: 1 }}>
                IMAGES ({images.length})
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {images.map((m) => (
                  <Pressable key={m.filename} onPress={() => setPreview(m)}
                    style={{ width: 120, borderRadius: 10, overflow: 'hidden',
                      backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: SAC.border }}>
                    <Image
                      source={{ uri: resolveImageUrl(m.url) }}
                      style={{ width: 120, height: 80 }} resizeMode="cover"
                    />
                    <View style={{ padding: 6, gap: 3 }}>
                      <Text style={{ fontFamily: FONTS.med, fontSize: 9.5, color: SAC.muted }} numberOfLines={1}>
                        {m.original_name || m.filename}
                      </Text>
                      <Text style={{ fontFamily: FONTS.med, fontSize: 9, color: SAC.dim }}>{m.size_human}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Docs list */}
          {docs.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: SAC.muted, letterSpacing: 1 }}>
                DOCUMENTS ({docs.length})
              </Text>
              {docs.map((m) => (
                <View key={m.filename} style={{ flexDirection: 'row', alignItems: 'center', gap: 12,
                  backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 10,
                  borderWidth: 1, borderColor: SAC.border }}>
                  <FileText size={20} color={GRAD.from} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: SAC.text }}>{m.original_name || m.filename}</Text>
                    <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.muted }}>{m.size_human} · {m.ext.toUpperCase()}</Text>
                  </View>
                  <Tip label="Copy URL">
                    <Pressable onPress={() => copyUrl(m.url)} style={cs.iconBtn}>
                      {copiedUrl === m.url ? <Check size={13} color="#34D399" /> : <Copy size={13} color={SAC.muted} />}
                    </Pressable>
                  </Tip>
                  <Tip label="Delete file">
                    <Pressable onPress={() => onDelete(m.filename)}
                      style={[cs.iconBtn, { borderColor: 'rgba(239,68,68,0.30)' }]}>
                      {deleting === m.filename ? <ActivityIndicator size={10} color="#F87171" /> : <Trash2 size={13} color="#F87171" />}
                    </Pressable>
                  </Tip>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {/* Image preview modal */}
      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', alignItems: 'center', justifyContent: 'center' }}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setPreview(null)} />
          {preview && (
            <View style={{ width: '90%', maxWidth: 700, backgroundColor: '#0d1326',
              borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: SAC.border, zIndex: 2 }}>
              <Image
                source={{ uri: resolveImageUrl(preview.url) }}
                style={{ width: '100%', height: 380 }} resizeMode="contain"
              />
              <View style={{ padding: 14, gap: 10 }}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: SAC.text }}>{preview.original_name || preview.filename}</Text>
                <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.muted }}>
                  {preview.size_human} · {preview.ext.toUpperCase()} · Uploaded {new Date(preview.uploaded_at).toLocaleDateString()}
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable onPress={() => copyUrl(preview.url)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6,
                      backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 8, flex: 1 }}>
                    {copiedUrl === preview.url ? <Check size={14} color="#34D399" /> : <Copy size={14} color={SAC.muted} />}
                    <Text style={{ fontFamily: FONTS.semi, fontSize: 12, color: SAC.muted }}>
                      {copiedUrl === preview.url ? 'Copied!' : 'Copy URL'}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => { onDelete(preview.filename); setPreview(null); }}
                    style={{ alignItems: 'center', justifyContent: 'center',
                      backgroundColor: 'rgba(239,68,68,0.12)', borderRadius: 8, padding: 8, paddingHorizontal: 14 }}>
                    <Trash2 size={15} color="#F87171" />
                  </Pressable>
                  <Pressable onPress={() => setPreview(null)}
                    style={{ alignItems: 'center', justifyContent: 'center',
                      backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 8, paddingHorizontal: 14 }}>
                    <X size={15} color={SAC.muted} />
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

// ── Showcase Card ─────────────────────────────────────────────────────────────
function ShowcaseCard({ item, onEdit, onDelete, onPublish, onDraft, onArchive, onPreview, busy }: any) {
  const viewShowcase = () => {
    if (Platform.OS === 'web') {
      window.open(`/echo/${item.slug}`, '_blank');
    }
  };

  return (
    <Card style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
        <View style={{ flex: 1, gap: 5 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: SAC.text }}>{item.title}</Text>
            <StatusPill label={(item.status || 'draft').toUpperCase()} kind={STATUS_PILL_MAP[item.status] || 'neutral'} />
            {item.event_status_badge && (
              <StatusPill label={item.event_status_badge} kind={item.event_status_badge === 'Live' ? 'danger' : item.event_status_badge === 'Completed' ? 'success' : 'warn'} />
            )}
          </View>
          {item.subtitle ? <Text style={{ fontFamily: FONTS.med, fontSize: 12.5, color: SAC.muted }} numberOfLines={1}>{item.subtitle}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 3, flexWrap: 'wrap' }}>
            {item.date ? <Text style={cs.meta}>{item.end_date && item.end_date !== item.date ? `${item.date} – ${item.end_date}` : item.date}</Text> : null}
            {item.venue ? <Text style={cs.meta}>{item.venue}</Text> : null}
            {item.category ? <Text style={cs.meta}>{item.category}</Text> : null}
            <Text style={cs.meta}>/{item.slug}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Tip label="View live page">
            <Pressable onPress={viewShowcase} style={[cs.iconBtn, { backgroundColor: 'rgba(124,58,237,0.12)', borderColor: 'rgba(167,139,250,0.25)' }]}>
              <Globe size={14} color="#A78BFA" />
            </Pressable>
          </Tip>
          <Tip label="Preview">
            <Pressable onPress={() => onPreview(item)} style={cs.iconBtn}><Eye size={14} color={SAC.muted} /></Pressable>
          </Tip>
          <Tip label="Edit">
            <Pressable onPress={() => onEdit(item)} style={cs.iconBtn}><Pencil size={14} color={SAC.muted} /></Pressable>
          </Tip>
          {item.status !== 'published' && (
            <Tip label="Publish">
              <Pressable onPress={() => onPublish(item)} style={[cs.iconBtn, { borderColor: 'rgba(16,185,129,0.35)' }]}>
                {busy === item._id ? <ActivityIndicator size={12} color={SAC.text} /> : <Send size={14} color="#34D399" />}
              </Pressable>
            </Tip>
          )}
          {item.status === 'published' && (
            <Tip label="Move to draft">
              <Pressable onPress={() => onDraft(item)} style={cs.iconBtn}><Globe size={14} color={SAC.muted} /></Pressable>
            </Tip>
          )}
          {item.status !== 'archived' && (
            <Tip label="Archive">
              <Pressable onPress={() => onArchive(item)} style={cs.iconBtn}><Archive size={14} color={SAC.muted} /></Pressable>
            </Tip>
          )}
          <Tip label="Delete">
            <Pressable onPress={() => onDelete(item)} style={[cs.iconBtn, { borderColor: 'rgba(239,68,68,0.30)' }]}>
              <Trash2 size={14} color="#F87171" />
            </Pressable>
          </Tip>
        </View>
      </View>
    </Card>
  );
}

// ── Empty showcase form ───────────────────────────────────────────────────────
const EMPTY: any = {
  title: '', slug: '', subtitle: '', description: '',
  date: '', end_date: '', time: '', venue: '', college: '', category: 'college-event',
  status: 'draft', event_status_badge: 'Upcoming',
  hero_image_url: '', hero_cover_url: '', hero_thumbnail_url: '', hero_bg_url: '',
  hero_banners: [],
  organizer_name: '', organizer_logo_url: '',
  sessions: [],
  cta_title: 'Stay tuned for more events!',
  cta_subtitle: 'Join our community and never miss an opportunity to learn, connect, and grow.',
  cta_button_text: 'View Upcoming Events',
  cta_url: '',
  seo_title: '', seo_description: '', seo_keywords: '', og_image_url: '',
  gallery_layout: 'grid',
  stats: [
    { label: 'Students Attended', value: '', icon: 'users' },
    { label: 'Sessions', value: '', icon: 'sessions' },
    { label: 'Speakers', value: '', icon: 'speakers' },
    { label: 'Partners', value: '', icon: 'partners' },
    { label: 'Feedback Score', value: '', icon: 'feedback' },
  ],
  highlights: [
    { icon: 'book', title: 'Learn', description: '' },
    { icon: 'network', title: 'Connect', description: '' },
    { icon: 'trending', title: 'Grow', description: '' },
  ],
  about_cards: [
    { icon: 'book', title: 'Learn', description: '' },
    { icon: 'network', title: 'Connect', description: '' },
    { icon: 'trending', title: 'Grow', description: '' },
  ],
  testimonials: [],
  timeline: [
    { icon: 'star', title: 'Inspiring Keynotes', description: '' },
    { icon: 'users', title: 'Panel Discussions', description: '' },
    { icon: 'code', title: 'Hands-on Workshops', description: '' },
    { icon: 'network', title: 'Networking Sessions', description: '' },
  ],
  partners: [], sponsors: [], downloads: [], videos: [], gallery: [],
  sections: {
    hero: true, stats: true, about: true, gallery: true, testimonials: true,
    timeline: true, partners: true, sponsors: true, videos: true,
    downloads: true, cta: true, registration: true,
  },
  registration: {
    enabled: true, fee: 0, currency: 'INR', max_seats: 0,
    deadline: '', payment_note: '', payment_url: '', poster_images: [],
  },
};

// ── Autosave key ──────────────────────────────────────────────────────────────
const AUTOSAVE_KEY = 'echo_cms_autosave';

// ── Showcase Editor Modal ─────────────────────────────────────────────────────
function ShowcaseModal({ visible, editing, onClose, onSave, saving, flash, onPreview }: any) {
  const [tab, setTab] = useState<FormTab>('general');
  const [form, setForm] = useState<any>({ ...EMPTY });
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [activeUploads, setActiveUploads] = useState(0);
  const autosaveTimer = useRef<any>(null);

  const onUploadStart = () => setActiveUploads((c) => c + 1);
  const onUploadEnd = () => setActiveUploads((c) => Math.max(0, c - 1));

  useEffect(() => {
    const initial = editing ? { ...editing } : { ...EMPTY };
    setForm(initial);
    setTab('general');
    setIsDirty(false);
    setLastSaved(null);
    setActiveUploads(0);
    // Restore autosave draft if creating new
    if (!editing && Platform.OS === 'web') {
      try {
        const saved = sessionStorage.getItem(AUTOSAVE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && !parsed._id) {
            setForm(parsed);
            setLastSaved('Restored from autosave');
          }
        }
      } catch { /* ignore */ }
    }
  }, [editing, visible]);

  const set = (key: string, val: any) => {
    setForm((prev: any) => {
      const next = { ...prev, [key]: val };
      scheduleAutosave(next);
      return next;
    });
    setIsDirty(true);
  };

  const scheduleAutosave = (formData: any) => {
    if (Platform.OS !== 'web') return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      try {
        sessionStorage.setItem(AUTOSAVE_KEY, JSON.stringify(formData));
        setLastSaved(new Date().toLocaleTimeString());
      } catch { /* ignore */ }
    }, 2000);
  };

  const handleClose = () => {
    if (isDirty && Platform.OS === 'web') {
      if (!window.confirm('You have unsaved changes. Close anyway?')) return;
    }
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    onClose();
  };

  const autoSlug = (title: string) => {
    if (!editing) {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      setForm((prev: any) => {
        const next = { ...prev, title, slug };
        scheduleAutosave(next);
        return next;
      });
    } else {
      set('title', title);
    }
    setIsDirty(true);
  };

  // Unsaved changes warning on browser close
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [visible, isDirty]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={ml.overlay}>
        <Pressable style={ml.backdrop} onPress={handleClose} />
        <View style={ml.box}>
          {/* Header */}
          <LinearGradient colors={[GRAD.from, GRAD.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ml.header}>
            <View>
              <Text style={ml.headerTitle}>{editing ? `Edit: ${editing.title}` : 'New ECHO Showcase'}</Text>
              {lastSaved && (
                <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                  Autosaved at {lastSaved}
                </Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {isDirty && (
                <View style={{ backgroundColor: 'rgba(245,158,11,0.25)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontFamily: FONTS.semi, fontSize: 10, color: '#FCD34D' }}>Unsaved changes</Text>
                </View>
              )}
              <Pressable onPress={handleClose} style={{ padding: 4 }}><X size={16} color="#fff" /></Pressable>
            </View>
          </LinearGradient>

          {/* Tab bar */}
          <View style={{ borderBottomWidth: 1, borderBottomColor: SAC.border }}>
            <TopTabs tabs={FORM_TABS} active={tab} onChange={setTab} />
          </View>

          {/* Body */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>

            {/* ── GENERAL TAB ── */}
            {tab === 'general' && <>
              <FieldRow label="Event Name">
                <Field value={form.title} onChangeText={autoSlug} placeholder="VNR ECHO 2026" />
              </FieldRow>
              <FieldRow label="Short Title / Slug" hint="Auto-generated from title. Used in the page URL.">
                <Field value={form.slug} onChangeText={(v: string) => set('slug', v)} placeholder="vnrvjit" />
              </FieldRow>
              <FieldRow label="Subtitle">
                <Field value={form.subtitle} onChangeText={(v: string) => set('subtitle', v)} placeholder="Empowering Tomorrow's Leaders" />
              </FieldRow>
              <FieldRow label="Description">
                <Field value={form.description} onChangeText={(v: string) => set('description', v)} placeholder="Describe the event…" multiline rows={4} />
              </FieldRow>
              <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                <View style={{ flex: 1, minWidth: 180 }}>
                  <FieldRow label="Start Date">
                    <FieldDate value={form.date} onChangeText={(v: string) => set('date', v)} placeholder="August 15, 2026" />
                  </FieldRow>
                </View>
                <View style={{ flex: 1, minWidth: 180 }}>
                  <FieldRow label="End Date" hint="Empty = one-day">
                    <FieldDate value={form.end_date} onChangeText={(v: string) => set('end_date', v)} placeholder="August 16, 2026" />
                  </FieldRow>
                </View>
                <View style={{ flex: 1, minWidth: 150 }}>
                  <FieldRow label="Time">
                    <FieldTime value={form.time} onChangeText={(v: string) => set('time', v)} placeholder="10:00 AM – 4:30 PM" />
                  </FieldRow>
                </View>
              </View>
              <FieldRow label="Venue">
                <Field value={form.venue} onChangeText={(v: string) => set('venue', v)} placeholder="Main Auditorium, VNR VJIET" />
              </FieldRow>
              <FieldRow label="College">
                <Field value={form.college} onChangeText={(v: string) => set('college', v)} placeholder="VNR VJIET" />
              </FieldRow>
              <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                <View style={{ flex: 1, minWidth: 160 }}>
                  <FieldRow label="Status">
                    <SelectNative value={form.status} onChange={(v: string) => set('status', v)} options={STATUS_OPTIONS} />
                  </FieldRow>
                </View>
                <View style={{ flex: 1, minWidth: 160 }}>
                  <FieldRow label="Event Status Badge">
                    <SelectNative value={form.event_status_badge} onChange={(v: string) => set('event_status_badge', v)} options={STATUS_BADGE_OPTIONS} />
                  </FieldRow>
                </View>
                <View style={{ flex: 1, minWidth: 160 }}>
                  <FieldRow label="Category">
                    <SelectNative value={form.category} onChange={(v: string) => set('category', v)} options={CATEGORY_OPTIONS} />
                  </FieldRow>
                </View>
              </View>
              <FieldRow label="CTA Button Text">
                <Field value={form.cta_button_text} onChangeText={(v: string) => set('cta_button_text', v)} placeholder="View Upcoming Events" />
              </FieldRow>
              <FieldRow label="CTA URL">
                <Field value={form.cta_url} onChangeText={(v: string) => set('cta_url', v)} placeholder="https://…" />
              </FieldRow>
            </>}

            {/* ── HERO TAB ── */}
            {tab === 'hero' && <>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: SAC.text, marginBottom: 16 }}>
                Hero images for the showcase page. "Banners" shows a full-width carousel on the detail page. "Card Thumbnail" is the image on the /echo listing cards.
              </Text>
              <View style={{ gap: 20 }}>
                <FieldRow label="Hero Banners (carousel)" hint="Multiple banner images for an auto-rotating carousel at the top of the detail page. First image is the primary banner.">
                  <BannerCarouselEditor
                    banners={form.hero_banners || []}
                    onChange={(b: string[]) => set('hero_banners', b)}
                  />
                </FieldRow>
                <ImageUploadWidget
                  label="Card Thumbnail (listing page + fallback)"
                  url={form.hero_image_url}
                  onUpload={(url) => set('hero_image_url', url)}
                  onRemove={() => set('hero_image_url', '')}
                  onUploadStart={onUploadStart}
                  onUploadEnd={onUploadEnd}
                  flash={flash}
                  aspectHint="Used as card image on /echo listing page, fallback hero when no banners, and poster on register page"
                />
                <ImageUploadWidget
                  label="Cover Image (fallback card thumbnail)"
                  url={form.hero_cover_url}
                  onUpload={(url) => set('hero_cover_url', url)}
                  onRemove={() => set('hero_cover_url', '')}
                  onUploadStart={onUploadStart}
                  onUploadEnd={onUploadEnd}
                  flash={flash}
                  aspectHint="Used as card image on /echo listing only when Card Thumbnail is empty"
                />
              </View>
              <View style={{ marginTop: 20 }}>
                <FieldRow label="Organizer Name" hint="Displayed in the 'About the Event' section on the detail page">
                  <Field value={form.organizer_name} onChangeText={(v: string) => set('organizer_name', v)} placeholder="Student Alumni Cell" />
                </FieldRow>
                <ImageUploadWidget
                  label="Organizer Logo"
                  url={form.organizer_logo_url}
                  onUpload={(url) => set('organizer_logo_url', url)}
                  onRemove={() => set('organizer_logo_url', '')}
                  onUploadStart={onUploadStart}
                  onUploadEnd={onUploadEnd}
                  flash={flash}
                  aspectHint="Shown next to organizer name in the About section"
                />
              </View>
            </>}

            {/* ── STATISTICS TAB ── */}
            {tab === 'statistics' && (
              <FieldRow label="Event Statistics" hint="Add numerical statistics shown in the stats bar. Drag to reorder.">
                <StatsEditor stats={form.stats || []} onChange={(s: any) => set('stats', s)} />
              </FieldRow>
            )}

            {/* ── ABOUT TAB ── */}
            {tab === 'about' && <>
              <FieldRow label="About Description">
                <Field value={form.description} onChangeText={(v: string) => set('description', v)} placeholder="Describe the event in detail…" multiline rows={5} />
              </FieldRow>
              <FieldRow label="Highlight Cards" hint="Cards shown in the 'About the Event' section (Learn, Connect, Grow)">
                <ListEditor
                  items={form.highlights || []}
                  fields={[
                    { key: 'icon', placeholder: 'Icon (book/network/star)', flex: 0.5 },
                    { key: 'title', placeholder: 'Card Title', flex: 0.6 },
                    { key: 'description', placeholder: 'Short description', flex: 1 },
                  ]}
                  onChange={(v: any) => set('highlights', v)}
                  addLabel="Add Highlight Card"
                />
              </FieldRow>
              <FieldRow label="About Cards (Extended)">
                <ListEditor
                  items={form.about_cards || []}
                  fields={[
                    { key: 'icon', placeholder: 'Icon', flex: 0.4 },
                    { key: 'title', placeholder: 'Title', flex: 0.6 },
                    { key: 'description', placeholder: 'Description', flex: 1.2 },
                  ]}
                  onChange={(v: any) => set('about_cards', v)}
                  addLabel="Add About Card"
                />
              </FieldRow>
            </>}

            {/* ── GALLERY TAB ── */}
            {tab === 'gallery' && <>
              <FieldRow label="Gallery Layout" hint="Choose how photos are displayed on the public page.">
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {GALLERY_LAYOUT_OPTIONS.map((layout) => (
                    <Pressable key={layout} onPress={() => set('gallery_layout', layout)}
                      style={{
                        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
                        borderWidth: 1,
                        borderColor: form.gallery_layout === layout ? GRAD.from : SAC.border,
                        backgroundColor: form.gallery_layout === layout ? 'rgba(251,146,60,0.15)' : 'transparent',
                      }}>
                      <Text style={{
                        fontFamily: FONTS.semi, fontSize: 12,
                        color: form.gallery_layout === layout ? GRAD.from : SAC.muted,
                      }}>
                        {layout.charAt(0).toUpperCase() + layout.slice(1).replace('-', ' ')}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </FieldRow>
              <FieldRow label="Event Photo Gallery" hint="Upload unlimited photos. Drag to reorder. Star = featured. Image icon = mark as hero.">
                <GalleryDropzone gallery={form.gallery || []} onChange={(g: any[]) => set('gallery', g)} />
              </FieldRow>
            </>}

            {/* ── TESTIMONIALS TAB ── */}
            {tab === 'testimonials' && (
              <FieldRow label="Student Testimonials" hint="Add unlimited testimonials. Hidden testimonials won't appear on the public page.">
                <TestimonialsEditor testimonials={form.testimonials || []} onChange={(v: any) => set('testimonials', v)} />
              </FieldRow>
            )}

            {/* ── HIGHLIGHTS TAB ── */}
            {tab === 'highlights' && (
              <FieldRow label="Event Timeline / Highlights" hint="Cards shown in the 'Event Highlights' section.">
                <ListEditor
                  items={form.timeline || []}
                  fields={[
                    { key: 'icon', placeholder: 'Icon (star/users/code)', flex: 0.45 },
                    { key: 'title', placeholder: 'Item Title', flex: 0.7 },
                    { key: 'description', placeholder: 'Description', flex: 1 },
                  ]}
                  onChange={(v: any) => set('timeline', v)}
                  addLabel="Add Timeline Item"
                />
              </FieldRow>
            )}

            {/* ── SPONSORS TAB ── */}
            {tab === 'sponsors' && <>
              <FieldRow label="Event Sponsors" hint="Upload sponsor logos and set tier priority.">
                <SponsorsEditor sponsors={form.sponsors || []} onChange={(v: any) => set('sponsors', v)} />
              </FieldRow>
              <FieldRow label="Association Partners" hint="Organisations that partnered or co-branded the event.">
                <ListEditor
                  items={form.partners || []}
                  fields={[
                    { key: 'name', placeholder: 'Partner Name', flex: 1 },
                    { key: 'logo_url', placeholder: 'Logo URL (optional)', flex: 1 },
                    { key: 'website_url', placeholder: 'Website (optional)', flex: 1 },
                  ]}
                  onChange={(v: any) => set('partners', v)}
                  addLabel="Add Partner"
                />
              </FieldRow>
            </>}

            {/* ── VIDEOS TAB ── */}
            {tab === 'videos' && (
              <FieldRow label="Event Videos" hint="Paste YouTube/Vimeo URLs or upload MP4 files.">
                <ListEditor
                  items={form.videos || []}
                  fields={[
                    { key: 'title', placeholder: 'Video Title', flex: 0.7 },
                    { key: 'video_url', placeholder: 'YouTube / Vimeo / MP4 URL', flex: 1 },
                    { key: 'thumbnail_url', placeholder: 'Thumbnail URL (optional)', flex: 0.8 },
                  ]}
                  onChange={(v: any) => set('videos', v)}
                  addLabel="Add Video"
                />
              </FieldRow>
            )}

            {/* ── DOWNLOADS TAB ── */}
            {tab === 'downloads' && (
              <FieldRow label="Downloadable Resources" hint="Upload PDFs, schedules, certificates, presentations, and brochures.">
                <DownloadsEditor downloads={form.downloads || []} onChange={(v: any) => set('downloads', v)} />
              </FieldRow>
            )}

            {/* ── SECTIONS TAB ── */}
            {tab === 'sections' && <>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: SAC.text, marginBottom: 16 }}>
                Toggle which sections appear on the public page. Hidden sections stay in the CMS but won't render publicly.
              </Text>
              <Card style={{ padding: 18, gap: 4 }}>
                {[
                  { key: 'hero', label: 'Hero', hint: 'Title, subtitle, date/time/venue, hero image' },
                  { key: 'stats', label: 'Statistics', hint: 'Attendance, speakers, sessions numbers' },
                  { key: 'about', label: 'About + Organizers', hint: 'Description, highlights, organizer card' },
                  { key: 'gallery', label: 'Photo Gallery', hint: 'Event photos grid + lightbox' },
                  { key: 'testimonials', label: 'Testimonials', hint: 'Student quotes with ratings' },
                  { key: 'timeline', label: 'Timeline / Highlights', hint: 'Event agenda cards' },
                  { key: 'partners', label: 'Collaboration Partners', hint: 'In-association partner chips' },
                  { key: 'sponsors', label: 'Sponsors', hint: 'Sponsor logos with tiers' },
                  { key: 'videos', label: 'Videos', hint: 'YouTube / uploaded videos' },
                  { key: 'downloads', label: 'Downloads', hint: 'Brochures, schedules, certificates' },
                  { key: 'cta', label: 'CTA Banner', hint: 'Bottom call-to-action' },
                  { key: 'registration', label: 'Registration', hint: 'Register button + registration page' },
                ].map((sec) => {
                  const on = (form.sections && form.sections[sec.key]) !== false;
                  return (
                    <Pressable key={sec.key} onPress={() => set('sections', { ...(form.sections || {}), [sec.key]: !on })}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: SAC.border }}>
                      <View style={{
                        width: 40, height: 22, borderRadius: 11, padding: 2,
                        backgroundColor: on ? '#10B981' : '#334155',
                      }}>
                        <View style={{
                          width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff',
                          transform: [{ translateX: on ? 18 : 0 }],
                        }} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#fff', fontFamily: FONTS.semi, fontSize: 13 }}>{sec.label}</Text>
                        <Text style={{ color: SAC.dim, fontFamily: FONTS.med, fontSize: 11 }}>{sec.hint}</Text>
                      </View>
                      <Text style={{ color: on ? '#34D399' : '#F87171', fontFamily: FONTS.bold, fontSize: 11 }}>{on ? 'Visible' : 'Hidden'}</Text>
                    </Pressable>
                  );
                })}
              </Card>
            </>}

            {/* ── REGISTRATION TAB ── */}
            {tab === 'registration' && <>
              <Card style={{ marginBottom: 16, padding: 20, gap: 12 }}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: SAC.text }}>Registration & Payment</Text>
                <FieldRow label="Registrations Enabled">
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Pressable onPress={() => set('registration', { ...(form.registration || {}), enabled: !((form.registration || {}).enabled) })} style={{
                      width: 44, height: 24, borderRadius: 12, padding: 2, backgroundColor: (form.registration || {}).enabled ? '#10B981' : '#334155',
                    }}>
                      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', transform: [{ translateX: (form.registration || {}).enabled ? 20 : 0 }] }} />
                    </Pressable>
                    <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 12 }}>
                      Allow users to register + pay on the public page
                    </Text>
                  </View>
                </FieldRow>
                <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                  <View style={{ flex: 1, minWidth: 140 }}>
                    <FieldRow label="Fee (0 = free)">
                      <Field value={String((form.registration || {}).fee ?? 0)} onChangeText={(v: string) => set('registration', { ...(form.registration || {}), fee: Number(v) || 0 })} placeholder="0" />
                    </FieldRow>
                  </View>
                  <View style={{ flex: 1, minWidth: 120 }}>
                    <FieldRow label="Currency">
                      <Field value={(form.registration || {}).currency || 'INR'} onChangeText={(v: string) => set('registration', { ...(form.registration || {}), currency: v })} placeholder="INR" />
                    </FieldRow>
                  </View>
                  <View style={{ flex: 1, minWidth: 140 }}>
                    <FieldRow label="Max Seats (0 = unlimited)">
                      <Field value={String((form.registration || {}).max_seats ?? 0)} onChangeText={(v: string) => set('registration', { ...(form.registration || {}), max_seats: Number(v) || 0 })} placeholder="0" />
                    </FieldRow>
                  </View>
                </View>
                <FieldRow label="Registration Deadline">
                  <IsoDateField value={(form.registration || {}).deadline || ''} onChangeText={(v: string) => set('registration', { ...(form.registration || {}), deadline: v })} placeholder="2026-08-14" />
                </FieldRow>
                <FieldRow label="Payment / Registration Note" hint="Shown to attendees on the registration page.">
                  <Field value={(form.registration || {}).payment_note || ''} onChangeText={(v: string) => set('registration', { ...(form.registration || {}), payment_note: v })} placeholder="Free entry for VNR students…" multiline rows={3} />
                </FieldRow>
                <FieldRow label="External Payment Link (optional)" hint="Leave empty to use the connected Razorpay integration automatically. Only fill this if you want to redirect attendees to a custom payment page (e.g. a Razorpay payment link, PayU, or Stripe checkout).">
                  <Field value={(form.registration || {}).payment_url || ''} onChangeText={(v: string) => set('registration', { ...(form.registration || {}), payment_url: v })} placeholder="Leave empty to use connected Razorpay" />
                </FieldRow>
                <FieldRow label="Poster Images" hint="Left-column carousel on the register page. Falls back to gallery/hero images when empty.">
                  <PosterEditor
                    posters={(form.registration || {}).poster_images || []}
                    onChange={(p: string[]) => set('registration', { ...(form.registration || {}), poster_images: p })}
                  />
                </FieldRow>
              </Card>

              {/* Session Passes */}
              <Card style={{ marginBottom: 16, padding: 20, gap: 12 }}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: SAC.text }}>Session Passes</Text>
                <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted }}>
                  Enable food/amenity coupons for attendees. Each enabled session generates a unique QR coupon that can be scanned once at the venue. For multi-day events, set the Day each pass belongs to.
                </Text>
                {[
                  { key: 'breakfast', label: 'Breakfast', Icon: CupSoda },
                  { key: 'lunch', label: 'Lunch', Icon: UtensilsCrossed },
                  { key: 'snacks', label: 'Snacks', Icon: Cookie },
                  { key: 'dinner', label: 'Dinner', Icon: UtensilsCrossed },
                  { key: 'tiffin', label: 'Tiffin', Icon: Sandwich },
                  { key: 'coffee', label: 'Coffee & Tea', Icon: Coffee },
                ].map((s) => {
                  const sessions = (form.sessions || []);
                  const existing = sessions.find((x: any) => x.key === s.key);
                  const enabled = existing?.enabled ?? false;
                  const locked = existing?.locked ?? false;
                  const day = existing?.day ?? 1;
                  const maxDay = Math.max(1, Math.min(7, parseInt(form.end_date && form.date ? '2' : '1', 10) || 1));
                  const dayOptions = Array.from({ length: Math.max(2, maxDay) }, (_, i) => String(i + 1));
                  return (
                    <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                      <View style={{ width: 28, alignItems: 'center', justifyContent: 'center' }}>
                        <s.Icon size={18} color={enabled ? GRAD.from : SAC.dim} />
                      </View>
                      <Text style={{ flex: 1, fontFamily: FONTS.med, fontSize: 13, color: SAC.text }}>{s.label}</Text>
                      {enabled && (
                        <>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.dim }}>Day</Text>
                            <select
                              value={String(day)}
                              onChange={(e: any) => {
                                const current = [...(form.sessions || [])];
                                const idx = current.findIndex((x: any) => x.key === s.key);
                                if (idx >= 0) {
                                  current[idx] = { ...current[idx], day: Number(e.target.value) || 1 };
                                  set('sessions', current);
                                }
                              }}
                              style={{ backgroundColor: '#0d1326', border: `1px solid ${SAC.border}`, borderRadius: 6, padding: '3px 6px', fontFamily: FONTS.med, fontSize: 11, color: SAC.text, appearance: 'none' } as any}
                            >
                              {dayOptions.map((d) => <option key={d} value={d} style={{ backgroundColor: '#0d1326' }}>{d}</option>)}
                            </select>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: locked ? '#F59E0B' : SAC.dim }}>
                              {locked ? 'Locked' : 'Active'}
                            </Text>
                            <Pressable onPress={() => {
                              const current = [...(form.sessions || [])];
                              const idx = current.findIndex((x: any) => x.key === s.key);
                              if (idx >= 0) {
                                current[idx] = { ...current[idx], locked: !locked };
                              }
                              set('sessions', current);
                            }} style={{
                              width: 36, height: 20, borderRadius: 10, padding: 2,
                              backgroundColor: locked ? '#F59E0B' : '#334155', cursor: 'pointer',
                            }}>
                              <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff', transform: [{ translateX: locked ? 16 : 0 }] }} />
                            </Pressable>
                          </View>
                        </>
                      )}
                      <Pressable onPress={() => {
                        const current = [...(form.sessions || [])];
                        const idx = current.findIndex((x: any) => x.key === s.key);
                        if (idx >= 0) {
                          current[idx] = { ...current[idx], enabled: !enabled, locked: false };
                        } else {
                          current.push({ key: s.key, label: s.label, day: 1, enabled: true, locked: false });
                        }
                        set('sessions', current);
                      }} style={{
                        width: 44, height: 24, borderRadius: 12, padding: 2,
                        backgroundColor: enabled ? '#10B981' : '#334155', cursor: 'pointer',
                      }}>
                        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', transform: [{ translateX: enabled ? 20 : 0 }] }} />
                      </Pressable>
                    </View>
                  );
                })}
              </Card>
            </>}

            {/* ── SEO TAB ── */}
            {tab === 'seo' && <>
              <FieldRow label="SEO Page Title">
                <Field value={form.seo_title} onChangeText={(v: string) => set('seo_title', v)} placeholder="VNR ECHO 2026 — Student Alumni Flagship Showcase" />
              </FieldRow>
              <FieldRow label="Meta Description">
                <Field value={form.seo_description} onChangeText={(v: string) => set('seo_description', v)} placeholder="Join VNR ECHO 2026 for inspiration, workshops, networking, and industry keynotes." multiline />
              </FieldRow>
              <FieldRow label="Keywords (comma-separated)">
                <Field value={form.seo_keywords} onChangeText={(v: string) => set('seo_keywords', v)} placeholder="VNR VJIET, ECHO 2026, Student Alumni, Hackathon" />
              </FieldRow>
              <FieldRow label="OG Image URL">
                <Field value={form.og_image_url} onChangeText={(v: string) => set('og_image_url', v)} placeholder="https://example.com/og-image.jpg" />
              </FieldRow>
            </>}

            {/* ── PUBLISH TAB ── */}
            {tab === 'publish' && <>
              <Card style={{ marginBottom: 16, padding: 20, gap: 14 }}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: SAC.text }}>Publish Settings</Text>
                <FieldRow label="Publication Status">
                  <SelectNative value={form.status} onChange={(v: string) => set('status', v)} options={STATUS_OPTIONS} />
                </FieldRow>
                <FieldRow label="CTA Title">
                  <Field value={form.cta_title} onChangeText={(v: string) => set('cta_title', v)} placeholder="Stay tuned for more events!" />
                </FieldRow>
                <FieldRow label="CTA Subtitle">
                  <Field value={form.cta_subtitle} onChangeText={(v: string) => set('cta_subtitle', v)} placeholder="Join our community…" multiline />
                </FieldRow>
                <FieldRow label="CTA Button Text">
                  <Field value={form.cta_button_text} onChangeText={(v: string) => set('cta_button_text', v)} placeholder="View Upcoming Events" />
                </FieldRow>
              </Card>
              <Card style={{ padding: 16, gap: 10, backgroundColor: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.25)' }}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: '#34D399' }}>Public Preview</Text>
                <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted }}>
                  After saving, the page will be available at:
                </Text>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: GRAD.from }}>
                  /echo/{form.slug || 'your-college'}
                </Text>
                {form.status !== 'published' && (
                  <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: '#FBBF24' }}>
                    Status is "{form.status}" — set to Published to make it visible to students.
                  </Text>
                )}
              </Card>
            </>}

          </ScrollView>

          {/* Footer */}
          <View style={ml.footer}>
            <SecondaryButton onPress={handleClose} size="md">
              <Text style={{ fontFamily: FONTS.semi, fontSize: 13, color: SAC.muted }}>Cancel</Text>
            </SecondaryButton>
            <GradientButton onPress={() => onSave(form)} loading={saving || activeUploads > 0} disabled={saving || activeUploads > 0} size="md">
              <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13 }}>
                {activeUploads > 0 ? 'Uploading…' : editing ? 'Save Changes' : 'Create Showcase'}
              </Text>
            </GradientButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const ml = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.70)' },
  box: {
    width: '96%', maxWidth: 900, maxHeight: '95%',
    backgroundColor: '#0d1326', borderRadius: 18,
    borderWidth: 1, borderColor: SAC.border,
    overflow: 'hidden', zIndex: 2,
    ...(Platform.OS === 'web' ? { boxShadow: '0 24px 80px rgba(0,0,0,0.60)' } as any : {}),
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 16, color: '#fff' },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: SAC.border },
});

// ── Registrations & Payments panel ───────────────────────────────────────────
// ── Session Passes Overview ───────────────────────────────────────────────────
function SessionPassesOverview({ events, onRefresh }: { events: any[]; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<Record<string, any[]>>({});
  const [toggling, setToggling] = useState<string | null>(null);

  const loadSessions = async (slug: string) => {
    try {
      const base = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || '';
      const { tokenStore } = await import('@/src/models/services/api');
      const token = await tokenStore.getAccess();
      const resp = await fetch(`${base}/api/echo/admin/${slug}/sessions`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (resp.ok) {
        const data = await resp.json();
        setSessionData((prev) => ({ ...prev, [slug]: data.sessions || [] }));
      }
    } catch { /* ignore */ }
  };

  const toggleLock = async (slug: string, sessionKey: string, currentLocked: boolean) => {
    setToggling(`${slug}:${sessionKey}`);
    try {
      const base = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || '';
      const { tokenStore } = await import('@/src/models/services/api');
      const token = await tokenStore.getAccess();
      await fetch(`${base}/api/echo/admin/${slug}/sessions/${sessionKey}/lock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ locked: !currentLocked }),
      });
      await loadSessions(slug);
    } catch { /* ignore */ }
    setToggling(null);
  };

  const toggleExpand = (slug: string) => {
    if (expanded === slug) {
      setExpanded(null);
    } else {
      setExpanded(slug);
      if (!sessionData[slug]) loadSessions(slug);
    }
  };

  if (events.length === 0) return null;

  return (
    <Card style={{ marginBottom: 16 }}>
      <Pressable onPress={() => setExpanded(expanded ? null : events[0]?.slug)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ticket size={16} color="#A78BFA" />
          <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: SAC.text }}>Session Passes</Text>
          <StatusPill kind="info" label={`${events.length} events`} />
        </View>
        <ChevronUp size={16} color={SAC.muted} style={{ transform: [{ rotate: expanded ? '0deg' : '180deg' }] }} />
      </Pressable>
      {expanded && (
        <View style={{ padding: 16, paddingTop: 0, gap: 12 }}>
          {events.map((ev) => {
            const sessions = sessionData[ev.slug] || [];
            return (
              <View key={ev.slug} style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: 12 }}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: SAC.text, marginBottom: 8 }}>{ev.title}</Text>
                {sessions.length === 0 ? (
                  <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.dim }}>No sessions configured</Text>
                ) : (
                  (() => {
                    const days = Array.from(new Set((sessions as any[]).map((x: any) => Number(x.day) || 1))).sort((a, b) => a - b);
                    return (
                      <View style={{ gap: 8 }}>
                        {days.map((day) => {
                          const daySessions = sessions.filter((x: any) => (Number(x.day) || 1) === day);
                          const dayLabel = days.length > 1 ? `Day ${day}` : 'Day 1';
                          return (
                            <View key={day} style={{ gap: 4 }}>
                              <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: SAC.muted, marginBottom: 2 }}>{dayLabel}</Text>
                              {daySessions.map((s: any) => {
                                const locked = s.locked ?? false;
                                const enabled = s.enabled ?? false;
                                const SessionIcon = SESSION_PASS_ICONS[s.key] || Ticket;
                                return (
                                  <View key={`${s.key}-${day}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                                    <SessionIcon size={16} color={enabled ? '#A78BFA' : SAC.dim} />
                                    <Text style={{ flex: 1, fontFamily: FONTS.med, fontSize: 12, color: SAC.text }}>{s.label}</Text>
                                    {enabled && (
                                      <>
                                        <StatusPill kind={locked ? 'warn' : 'success'} label={locked ? 'Locked' : 'Active'} />
                                        <Pressable onPress={() => toggleLock(ev.slug, s.key, locked)} disabled={toggling === `${ev.slug}:${s.key}`} style={{
                                          width: 32, height: 18, borderRadius: 9, padding: 2,
                                          backgroundColor: locked ? '#F59E0B' : '#334155', cursor: 'pointer',
                                        }}>
                                          <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#fff', transform: [{ translateX: locked ? 14 : 0 }] }} />
                                        </Pressable>
                                      </>
                                    )}
                                    {!enabled && <StatusPill kind="neutral" label="Disabled" />}
                                  </View>
                                );
                              })}
                            </View>
                          );
                        })}
                      </View>
                    );
                  })()
                )}
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}


function RegistrationsPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any>({ events: [], totals: {} });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [eventSlug, setEventSlug] = useState('all');
  const [detailRow, setDetailRow] = useState<any>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const PER_PAGE = 20;
  const { flash } = useToast();

  useEffect(() => { setPage(0); }, [q, status, eventSlug, rows]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [regs, rev] = await Promise.all([
        api.adminEchoRegistrations(),
        api.adminEchoRevenue(),
      ]);
      setRows(regs?.items || []);
      setRevenue(rev || { events: [], totals: {} });
    } catch {
      flash('Failed to load registrations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const deleteReg = async (id: string) => {
    if (!confirm('Delete this registration? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await api.adminEchoDeleteRegistration(id);
      setRows((prev) => prev.filter((r) => r.id !== id && r._id !== id));
      flash('Registration deleted');
    } catch {
      flash('Failed to delete registration');
    } finally {
      setDeleting(null);
    }
  };

  const sendReminder = async (r: any) => {
    setActioning(r.id);
    try {
      await api.adminEchoSendPaymentReminder(r.id);
      flash('Payment reminder emailed to the attendee');
      await load();
    } catch (err: any) {
      flash(err?.message || 'Failed to send reminder');
    } finally {
      setActioning(null);
    }
  };

  const markFailed = async (r: any) => {
    if (!confirm(`Mark this registration as failed? No ticket or pass will be issued, and the attendee will be emailed.`)) return;
    setActioning(r.id);
    try {
      await api.adminEchoMarkRegistrationFailed(r.id);
      flash('Registration marked as failed');
      await load();
    } catch (err: any) {
      flash(err?.message || 'Failed to mark as failed');
    } finally {
      setActioning(null);
    }
  };

  const filtered = rows.filter((r) => {
    const s = q.toLowerCase();
    const matchQ = !s
      || r.full_name?.toLowerCase().includes(s)
      || r.email?.toLowerCase().includes(s)
      || r.college?.toLowerCase().includes(s)
      || r.event_title?.toLowerCase().includes(s);
    const matchStatus = status === 'all' || r.payment_status === status;
    const matchEvent = eventSlug === 'all' || r.slug === eventSlug;
    return matchQ && matchStatus && matchEvent;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(safePage * PER_PAGE, safePage * PER_PAGE + PER_PAGE);

  const uniqueEvents = Array.from(new Set(rows.map((r: any) => r.slug).filter(Boolean)))
    .map((slug) => rows.find((r: any) => r.slug === slug))
    .filter(Boolean)
    .map((r: any) => ({ slug: r.slug, title: r.event_title || r.slug }));

  const fmtAmt = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
  const paid = filtered.filter((r) => r.payment_status === 'paid');
  const pending = filtered.filter((r) => r.payment_status === 'pending');
  const failed = filtered.filter((r) => r.payment_status === 'failed');
  const revenueTotal = paid.reduce((a, r) => a + Number(r.fee || 0), 0);

  return (
    <View>
      {/* Revenue KPIs */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <KpiTile Icon={Users} label="Total Registrations" value={String(filtered.length)} />
        <KpiTile Icon={Check} label="Paid" value={String(paid.length)} />
        <KpiTile Icon={Clock} label="Pending" value={String(pending.length)} />
        <KpiTile Icon={XCircle} label="Failed" value={String(failed.length)} />
        <KpiTile Icon={Zap} label="Revenue (filtered)" value={fmtAmt(revenueTotal)} delta="real-time" deltaKind="success" />
        <Pressable onPress={() => window.open('/echo/admin/scan', '_blank')} style={{
          flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#7C3AED',
          borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, cursor: 'pointer',
        }}>
          <ScanLine size={14} color="#fff" />
          <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: '#fff' }}>Scan Coupons</Text>
        </Pressable>
      </View>

      {/* Per-event revenue */}
      {revenue.events?.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: SAC.text }}>Event Revenue Breakdown</Text>
            <StatusPill kind="info" label={`${revenue.events.length} events`} />
          </View>
          <View style={{ gap: 8 }}>
            {revenue.events.map((ev: any, i: number) => (
              <View key={ev.slug + i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: GRAD.to }} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontFamily: FONTS.bold, fontSize: 12.5, color: '#fff' }}>{ev.title}</Text>
                  <Text numberOfLines={1} style={{ fontFamily: FONTS.med, fontSize: 10.5, color: SAC.dim }}>
                    {ev.paid} paid · {ev.pending} pending · {ev.free} free
                  </Text>
                </View>
                <Text style={{ fontFamily: FONTS.xbold, fontSize: 12.5, color: '#86EFAC' }}>{fmtAmt(ev.revenue)}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* Session Passes Overview */}
      {uniqueEvents.length > 0 && (
        <SessionPassesOverview events={uniqueEvents} onRefresh={load} />
      )}

      {/* Search + filter */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <View style={{ flex: 1, minWidth: 200 }}>
          <SearchField value={q} onChange={setQ} placeholder="Search attendee, email, event…" />
        </View>
        {uniqueEvents.length > 1 && (
          <select
            value={eventSlug}
            onChange={(e: any) => setEventSlug(e.target.value)}
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 12, fontFamily: 'Inter',
              outline: 'none', cursor: 'pointer', minWidth: 140,
            }}
          >
            <option value="all" style={{ background: '#1e1b4b', color: '#fff' }}>All Events</option>
            {uniqueEvents.map((ev: any) => (
              <option key={ev.slug} value={ev.slug} style={{ background: '#1e1b4b', color: '#fff' }}>{ev.title}</option>
            ))}
          </select>
        )}
        <TopTabs
          tabs={[
            { id: 'all', label: 'All' },
            { id: 'paid', label: 'Paid' },
            { id: 'pending', label: 'Pending' },
            { id: 'failed', label: 'Failed' },
          ]}
          active={status}
          onChange={setStatus}
        />
        <SecondaryButton onPress={load}><RefreshCw size={12} color={SAC.muted} /><Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12, marginLeft: 6 }}>Refresh</Text></SecondaryButton>
      </View>

      {/* Registrations table */}
      <Card style={{ overflow: 'hidden' }}>
        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={GRAD.from} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center', gap: 10 }}>
            <IconBox size={46}><Users size={18} color={GRAD.to} /></IconBox>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: SAC.text }}>No registrations found</Text>
            <Text style={{ fontFamily: FONTS.med, fontSize: 12.5, color: SAC.muted, textAlign: 'center', maxWidth: 320 }}>
              Registrations appear here the moment attendees sign up for an event.
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth: 860 }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderBottomWidth: 1, borderBottomColor: SAC.border }}>
                <Text style={{ width: 180, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>ATTENDEE</Text>
                <Text style={{ width: 200, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>EVENT</Text>
                <Text style={{ width: 150, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>COLLEGE / BRANCH</Text>
                <Text style={{ width: 150, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>AMOUNT</Text>
                <Text style={{ width: 150, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>PAYMENT</Text>
                <Text style={{ width: 130, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>ISSUED</Text>
                <Text style={{ width: 120, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>SA ACCOUNT</Text>
                <Text style={{ width: 150, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>DATE</Text>
                <Text style={{ width: 100, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5, textAlign: 'center' }}>ACTIONS</Text>
              </View>
              {paged.map((r: any, i: number) => (
                <View key={r.id || i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                  <View style={{ width: 180, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontFamily: FONTS.bold, fontSize: 12.5, color: '#fff' }}>{r.full_name || '—'}</Text>
                    <Text numberOfLines={1} style={{ fontFamily: FONTS.med, fontSize: 10.5, color: SAC.dim }}>{r.email || r.phone || ''}</Text>
                  </View>
                  <View style={{ width: 200, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontFamily: FONTS.med, fontSize: 12, color: '#e5e7eb' }}>{r.event_title || r.slug || '—'}</Text>
                  </View>
                  <View style={{ width: 150, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontFamily: FONTS.med, fontSize: 12, color: '#e5e7eb' }}>{r.college || '—'}</Text>
                    <Text numberOfLines={1} style={{ fontFamily: FONTS.med, fontSize: 10.5, color: SAC.dim }}>{[r.branch, r.year].filter(Boolean).join(' · ')}</Text>
                  </View>
                  <View style={{ width: 150, minWidth: 0 }}>
                    <Text style={{ fontFamily: FONTS.xbold, fontSize: 12.5, color: '#fff' }}>
                      {Number(r.fee || 0) > 0 ? `₹${Number(r.fee).toLocaleString('en-IN')}` : 'FREE'}
                    </Text>
                    <Text numberOfLines={1} style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.dim }}>{r.payment_id || ''}</Text>
                  </View>
                  <View style={{ width: 150, minWidth: 0 }}>
                    <StatusPill
                      kind={r.payment_status === 'paid' ? 'success' : r.payment_status === 'pending' ? 'warn' : r.payment_status === 'failed' ? 'danger' : 'neutral'}
                      label={(r.payment_status || '—').toUpperCase()}
                    />
                    {r.failed_reason ? (
                      <Text numberOfLines={1} style={{ fontFamily: FONTS.med, fontSize: 9.5, color: '#FCA5A5', marginTop: 3 }}>
                        {r.failed_reason}
                      </Text>
                    ) : null}
                  </View>
                  <View style={{ width: 130, minWidth: 0 }}>
                    {r.payment_status === 'paid' ? (
                      <>
                        <Text style={{ fontFamily: FONTS.xbold, fontSize: 10.5, color: '#86EFAC' }}>
                          {r.coupons_issued > 0 ? `Ticket + ${r.coupons_issued} coupon${r.coupons_issued > 1 ? 's' : ''}` : 'Ticket'}
                        </Text>
                        <Text numberOfLines={1} style={{ fontFamily: FONTS.med, fontSize: 9.5, color: SAC.dim }}>
                          {r.invoice_issued ? (r.invoice_no || 'Invoice issued') : 'No invoice'}
                        </Text>
                      </>
                    ) : r.payment_status === 'pending' ? (
                      <Text style={{ fontFamily: FONTS.med, fontSize: 10.5, color: '#FCD34D' }}>
                        Nothing — awaiting payment
                      </Text>
                    ) : (
                      <Text style={{ fontFamily: FONTS.med, fontSize: 10.5, color: '#FCA5A5' }}>
                        Nothing — not issued
                      </Text>
                    )}
                  </View>
                  <View style={{ width: 120, minWidth: 0 }}>
                    <StatusPill
                      kind={r.has_account ? 'success' : 'neutral'}
                      label={r.has_account ? 'Yes' : 'No'}
                    />
                  </View>
                  <View style={{ width: 150, minWidth: 0 }}>
                    <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.dim }}>
                      {(r.registered_at || '').slice(0, 16).replace('T', ' ') || '—'}
                    </Text>
                  </View>
                  <View style={{ width: 100, flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
                    <IconAction icon={<Eye size={14} color="#818CF8" />} label="View" color="#818CF8" onPress={() => setDetailRow(r)} />
                    {r.payment_status === 'pending' && (
                      <>
                        <IconAction
                          icon={<Mail size={14} color="#FBBF24" />}
                          label="Remind"
                          color="#FBBF24"
                          bg="rgba(245,158,11,0.15)"
                          onPress={() => sendReminder(r)}
                          disabled={actioning === r.id}
                        />
                        <IconAction
                          icon={<XCircle size={14} color="#F87171" />}
                          label="Mark failed"
                          color="#F87171"
                          bg="rgba(239,68,68,0.15)"
                          danger
                          onPress={() => markFailed(r)}
                          disabled={actioning === r.id}
                        />
                      </>
                    )}
                    <IconAction
                      icon={<Trash2 size={14} color="#F87171" />}
                      label="Delete"
                      color="#F87171"
                      bg={deleting === (r.id || r._id) ? 'rgba(100,100,100,0.15)' : 'rgba(239,68,68,0.15)'}
                      danger
                      onPress={() => deleteReg(r.id || r._id)}
                      disabled={deleting === (r.id || r._id)}
                    />
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
        {/* Pagination */}
        {filtered.length > PER_PAGE && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingVertical: 10, paddingHorizontal: 14,
            borderTopWidth: 1, borderTopColor: SAC.border, flexWrap: 'wrap', gap: 10,
          }}>
            <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.dim }}>
              Showing {safePage * PER_PAGE + 1}–{Math.min((safePage + 1) * PER_PAGE, filtered.length)} of {filtered.length}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <Pressable
                onPress={() => setPage(safePage - 1)}
                disabled={safePage === 0}
                style={{
                  paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7,
                  backgroundColor: safePage === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(167,139,250,0.15)',
                  borderWidth: 1, borderColor: safePage === 0 ? SAC.border : 'rgba(167,139,250,0.3)',
                  opacity: safePage === 0 ? 0.4 : 1,
                }}
              >
                <ChevronLeft size={14} color={SAC.text} />
              </Pressable>
              {Array.from({ length: totalPages }, (_, p) => p).map((p) => {
                if (totalPages > 7 && Math.abs(p - safePage) > 2 && p !== 0 && p !== totalPages - 1) {
                  return null;
                }
                return (
                  <Pressable key={p} onPress={() => setPage(p)} style={{
                    minWidth: 30, alignItems: 'center', justifyContent: 'center',
                    paddingVertical: 6, borderRadius: 7,
                    backgroundColor: p === safePage ? '#7C3AED' : 'rgba(255,255,255,0.05)',
                    borderWidth: 1, borderColor: p === safePage ? '#7C3AED' : SAC.border,
                  }}>
                    <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: p === safePage ? '#fff' : SAC.text }}>{p + 1}</Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setPage(safePage + 1)}
                disabled={safePage >= totalPages - 1}
                style={{
                  paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7,
                  backgroundColor: safePage >= totalPages - 1 ? 'rgba(255,255,255,0.04)' : 'rgba(167,139,250,0.15)',
                  borderWidth: 1, borderColor: safePage >= totalPages - 1 ? SAC.border : 'rgba(167,139,250,0.3)',
                  opacity: safePage >= totalPages - 1 ? 0.4 : 1,
                }}
              >
                <ChevronRight size={14} color={SAC.text} />
              </Pressable>
            </View>
          </View>
        )}
      </Card>

      {/* Detail Modal */}
      {detailRow && (
        <Modal visible={true} transparent animationType="fade" onRequestClose={() => setDetailRow(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{
              width: '100%', maxWidth: 480, padding: 24, gap: 16,
              backgroundColor: '#141A2D',
              borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)',
              borderRadius: 16,
              shadowColor: '#000', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.55, shadowRadius: 30,
              elevation: 12,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: SAC.text }}>Registration Details</Text>
                <Pressable onPress={() => setDetailRow(null)} style={{ padding: 4 }}><X size={18} color={SAC.muted} /></Pressable>
              </View>
              <View style={{ gap: 10 }}>
                {[
                  ['Name', detailRow.full_name],
                  ['Email', detailRow.email],
                  ['Phone', detailRow.phone],
                  ['College', detailRow.college],
                  ['Branch', detailRow.branch],
                  ['Event', detailRow.event_title || detailRow.slug],
                  ['Fee', Number(detailRow.fee || 0) > 0 ? `₹${Number(detailRow.fee).toLocaleString('en-IN')}` : 'FREE'],
                  ['Payment Status', (detailRow.payment_status || '—').toUpperCase()],
                  ['Payment ID', detailRow.payment_id],
                  ['Failed At', detailRow.failed_at ? new Date(detailRow.failed_at).toLocaleString() : null],
                  ['Failed Reason', detailRow.failed_reason],
                  ['Reminder Sent', detailRow.reminder_sent_at ? new Date(detailRow.reminder_sent_at).toLocaleString() : null],
                  ['Ticket / Pass Issued', detailRow.ticket_issued ? 'Yes — QR pass generated' : 'No — not issued until payment confirmed'],
                  ['Invoice', detailRow.invoice_issued ? (detailRow.invoice_no || 'Yes') : 'No — not issued until payment confirmed'],
                  ['SA Account', detailRow.has_account ? 'Yes' : 'No'],
                  ['Checked In', detailRow.checked_in_at ? new Date(detailRow.checked_in_at).toLocaleString() : 'No'],
                ].map(([label, value]) => (
                  <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', paddingBottom: 8 }}>
                    <Text style={{ fontFamily: FONTS.semi, fontSize: 12, color: SAC.muted }}>{label}</Text>
                    <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.text, textAlign: 'right', maxWidth: 260 }}>{value || '—'}</Text>
                  </View>
                ))}
                <View style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', paddingBottom: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontFamily: FONTS.semi, fontSize: 12, color: SAC.muted }}>Session Coupons</Text>
                    <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.text }}>
                      {(detailRow.coupons || []).length > 0 ? `${detailRow.coupons.length} issued` : 'None'}
                    </Text>
                  </View>
                  {(detailRow.coupons || []).length > 0 && (
                    <View style={{ gap: 5 }}>
                      {(detailRow.coupons || []).map((c: any, ci: number) => (
                        <View key={ci} style={{
                          flexDirection: 'row', alignItems: 'center', gap: 8,
                          backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 7,
                          paddingHorizontal: 9, paddingVertical: 6,
                          borderWidth: 1, borderColor: c.used ? 'rgba(16,185,129,0.30)' : 'rgba(167,139,250,0.25)',
                        }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontFamily: FONTS.bold, fontSize: 11.5, color: SAC.text }}>
                              {c.session_name || c.session_key}
                            </Text>
                            <Text style={{ fontFamily: FONTS.med, fontSize: 9.5, color: SAC.dim }}>
                              {c.session_day > 1 ? `Day ${c.session_day} · ` : ''}{c.coupon_code || ''}
                            </Text>
                          </View>
                          <View style={{
                            borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3,
                            backgroundColor: c.used ? 'rgba(16,185,129,0.15)' : 'rgba(167,139,250,0.15)',
                          }}>
                            <Text style={{ fontFamily: FONTS.bold, fontSize: 9, color: c.used ? '#34D399' : '#A78BFA' }}>
                              {c.used ? 'USED' : 'ACTIVE'}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
              <GradientButton onPress={() => setDetailRow(null)} size="sm" style={{ alignSelf: 'flex-end' }}>
                <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12 }}>Close</Text>
              </GradientButton>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

// ── Volunteers Panel ──────────────────────────────────────────────────────────
function VolunteersPanel() {
  const [showcases, setShowcases] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addSlug, setAddSlug] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('volunteer');
  const [q, setQ] = useState('');
  const [filterEvent, setFilterEvent] = useState('all');
  const [removing, setRemoving] = useState<string | null>(null);
  const { flash } = useToast();

  const apiBase = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || '';

  const authToken = async () => {
    const { tokenStore } = await import('@/src/models/services/api');
    const token = await tokenStore.getAccess();
    return token || '';
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await authToken();
      const [volResp, showResp] = await Promise.all([
        fetch(`${apiBase}/api/echo/admin/volunteers`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        fetch(`${apiBase}/api/echo/admin/showcases`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
      ]);
      if (volResp.ok) {
        const data = await volResp.json();
        setItems(data.volunteers || []);
      }
      if (showResp.ok) {
        const data = await showResp.json();
        const list = Array.isArray(data) ? data : (data.items || data.showcases || []);
        setShowcases(list.map((s: any) => ({ slug: s.slug, title: s.title || s.slug })));
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [apiBase]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setAdding(true);
    setAddSlug(showcases.length === 1 ? showcases[0].slug : '');
    setEmail('');
    setRole('volunteer');
  };

  const addVolunteer = async () => {
    const e = email.trim().toLowerCase();
    if (!e || !addSlug) return;
    setSaving(true);
    try {
      const token = await authToken();
      const resp = await fetch(`${apiBase}/api/echo/admin/${addSlug}/volunteers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ email: e, role }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || 'Failed to add');
      flash(data.has_account ? `${e} added as ${role} — has SA account` : `${e} added as ${role} — will get access on signup`);
      setAdding(false);
      setEmail('');
      load();
    } catch (err: any) {
      flash(err?.message || 'Failed to add volunteer');
    } finally {
      setSaving(false);
    }
  };

  const removeVolunteer = async (v: any) => {
    if (!confirm(`Remove ${v.email} as ${v.role} for ${v.event_title || v.slug}?`)) return;
    setRemoving(v._id);
    try {
      const token = await authToken();
      await fetch(`${apiBase}/api/echo/admin/${v.slug}/volunteers/${v._id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setItems((prev) => prev.filter((x) => x._id !== v._id));
      flash('Volunteer removed');
    } catch { flash('Failed to remove volunteer'); }
    setRemoving(null);
  };

  const filtered = items.filter((v) => {
    const s = q.toLowerCase();
    const matchQ = !s || v.email?.toLowerCase().includes(s) || (v.user_name || '').toLowerCase().includes(s) || (v.event_title || '').toLowerCase().includes(s);
    const matchEvent = filterEvent === 'all' || v.slug === filterEvent;
    return matchQ && matchEvent;
  });

  const uniqueEvents = Array.from(new Set(items.map((v) => v.slug).filter(Boolean)));

  return (
    <View style={{ gap: 16 }}>
      {/* Header + Add button */}
      <Card style={{ padding: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
          <View style={{ flex: 1, minWidth: 220 }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: SAC.text }}>Volunteers & Ambassadors</Text>
            <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted, marginTop: 3 }}>
              Registered users who can scan coupons at the venue. They get access to the scanner page only.
            </Text>
          </View>
          <GradientButton onPress={openAdd} size="sm">
            <PlusCircle size={13} color="#fff" />
            <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12, marginLeft: 6 }}>Add Volunteer</Text>
          </GradientButton>
        </View>

        {/* Add wizard */}
        {adding && (
          <View style={{ marginTop: 12, backgroundColor: 'rgba(167,139,250,0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)', padding: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: SAC.text }}>New Volunteer</Text>
              <Pressable onPress={() => setAdding(false)} style={{ padding: 4 }}><X size={16} color={SAC.muted} /></Pressable>
            </View>

            {!addSlug ? (
              <>
                <Text style={{ fontFamily: FONTS.semi, fontSize: 12, color: SAC.muted }}>
                  Step 1 · Select the event this person will help with
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {showcases.length === 0 && (
                    <Text style={{ fontFamily: FONTS.med, fontSize: 11.5, color: SAC.dim }}>No showcases found. Create an event first.</Text>
                  )}
                  {showcases.map((s) => (
                    <Pressable
                      key={s.slug}
                      onPress={() => setAddSlug(s.slug)}
                      style={{
                        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9,
                        backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: SAC.border,
                      }}
                    >
                      <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: SAC.text }}>{s.title}</Text>
                      <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.dim }}>{s.slug}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={{ fontFamily: FONTS.semi, fontSize: 12, color: SAC.muted }}>
                    Step 2 · Email & role for{' '}
                    <Text style={{ color: '#C4B5FD' }}>{showcases.find((s) => s.slug === addSlug)?.title || addSlug}</Text>
                  </Text>
                  <Pressable onPress={() => setAddSlug('')} style={{ padding: 4 }}>
                    <Text style={{ fontFamily: FONTS.med, fontSize: 10.5, color: '#A78BFA' }}>← change event</Text>
                  </Pressable>
                </View>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <View style={{ flex: 1, minWidth: 200 }}>
                    <Text style={{ fontFamily: FONTS.semi, fontSize: 11, color: SAC.muted, marginBottom: 4 }}>Email</Text>
                    <TextInput value={email} onChangeText={setEmail} placeholder="volunteer@email.com"
                      placeholderTextColor="#475569" keyboardType="email-address" autoCapitalize="none"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 10, color: '#fff', fontSize: 13 }} />
                  </View>
                  <View style={{ width: 140 }}>
                    <Text style={{ fontFamily: FONTS.semi, fontSize: 11, color: SAC.muted, marginBottom: 4 }}>Role</Text>
                    <SelectNative value={role} onChange={setRole} options={['volunteer', 'ambassador']} />
                  </View>
                  <GradientButton onPress={addVolunteer} loading={saving} disabled={saving || !email.trim()} size="sm">
                    <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12 }}>Add</Text>
                  </GradientButton>
                </View>
              </>
            )}
          </View>
        )}

        {/* Search + filter */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <SearchField value={q} onChange={setQ} placeholder="Search name, email, event…" width="260px" />
          <select
            value={filterEvent}
            onChange={(e: any) => setFilterEvent(e.target.value)}
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 12, fontFamily: 'Inter',
              outline: 'none', cursor: 'pointer', minWidth: 150,
            }}
          >
            <option value="all" style={{ background: '#1e1b4b', color: '#fff' }}>All Events</option>
            {uniqueEvents.map((slug) => (
              <option key={slug} value={slug} style={{ background: '#1e1b4b', color: '#fff' }}>
                {items.find((v) => v.slug === slug)?.event_title || slug}
              </option>
            ))}
          </select>
        </View>
      </Card>

      {/* Volunteers table */}
      <Card style={{ overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: SAC.border }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: SAC.muted }}>
            {filtered.length > 0 ? `${filtered.length} volunteer${filtered.length > 1 ? 's' : ''}` : 'No volunteers'}
          </Text>
          <Pressable onPress={load} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, padding: 4 }}>
            <RefreshCw size={12} color={SAC.muted} />
            <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.muted }}>Refresh</Text>
          </Pressable>
        </View>
        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={GRAD.from} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center', gap: 10 }}>
            <IconBox size={46}><Users size={18} color={GRAD.to} /></IconBox>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: SAC.text }}>No volunteers yet</Text>
            <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted, textAlign: 'center', maxWidth: 340 }}>
              {items.length === 0
                ? 'Add volunteers to let them scan coupons at the venue.'
                : 'No volunteers match your search / filter.'}
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth: 760 }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderBottomWidth: 1, borderBottomColor: SAC.border }}>
                <Text style={{ width: 200, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>VOLUNTEER</Text>
                <Text style={{ width: 180, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>EVENT</Text>
                <Text style={{ width: 110, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>ROLE</Text>
                <Text style={{ width: 110, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>STATUS</Text>
                <Text style={{ width: 150, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>ADDED</Text>
                <Text style={{ width: 90, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5, textAlign: 'center' }}>ACTIONS</Text>
              </View>
              {filtered.map((v) => (
                <View key={v._id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                  <View style={{ width: 200, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontFamily: FONTS.bold, fontSize: 12.5, color: '#fff' }}>{v.email}</Text>
                    <Text numberOfLines={1} style={{ fontFamily: FONTS.med, fontSize: 10.5, color: SAC.dim }}>{v.user_name || '—'}</Text>
                  </View>
                  <View style={{ width: 180, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontFamily: FONTS.med, fontSize: 12, color: '#e5e7eb' }}>{v.event_title || v.slug || '—'}</Text>
                    <Text numberOfLines={1} style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.dim }}>{v.slug}</Text>
                  </View>
                  <View style={{ width: 110, minWidth: 0 }}>
                    <StatusPill kind="info" label={(v.role || 'volunteer').toUpperCase()} />
                  </View>
                  <View style={{ width: 110, minWidth: 0 }}>
                    <StatusPill kind={v.has_account ? 'success' : 'warn'} label={v.has_account ? 'Active' : 'Pending'} />
                  </View>
                  <View style={{ width: 150, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.dim }}>
                      {v.created_at ? new Date(v.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                    </Text>
                  </View>
                  <View style={{ width: 90, flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
                    <Tip label="Remove volunteer">
                      <Pressable onPress={() => removeVolunteer(v)} style={cs.iconBtn}>
                        {removing === v._id ? <ActivityIndicator size={12} color="#F87171" /> : <Trash2 size={13} color="#F87171" />}
                      </Pressable>
                    </Tip>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </Card>
    </View>
  );
}


function SettingsPanel({ onPreview }: { onPreview?: (html: string) => void }) {
  const [tab, setTab] = useState<'pass' | 'invoice' | 'email' | 'branding'>('pass');
  const [defaultTemplate, setDefaultTemplate] = useState('aurora');
  const [invoiceTemplate, setInvoiceTemplate] = useState('modern');
  const [emailStyle, setEmailStyle] = useState('modern');
  const [brandColor, setBrandColor] = useState('#7C3AED');
  const [brandName, setBrandName] = useState('Student Alumni');
  const [emailFooter, setEmailFooter] = useState('Student Alumni Cell — Empowering the next generation of leaders.');
  const [saving, setSaving] = useState(false);
  const { flash } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const base = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || '';
        const { tokenStore } = await import('@/src/models/services/api');
        const token = await tokenStore.getAccess();
        const resp = await fetch(`${base}/api/echo/admin/settings`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (resp.ok) {
          const d = await resp.json();
          setDefaultTemplate(d.default_ticket_template || 'aurora');
          setInvoiceTemplate(d.default_invoice_template || 'modern');
          setEmailStyle(d.default_email_style || 'modern');
          setBrandColor(d.email_brand_color || '#7C3AED');
          setBrandName(d.brand_name || 'Student Alumni');
          setEmailFooter(d.email_footer || '');
        }
      } catch { /* use defaults */ }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const base = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || '';
      const { tokenStore } = await import('@/src/models/services/api');
      const token = await tokenStore.getAccess();
      const resp = await fetch(`${base}/api/echo/admin/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          default_ticket_template: defaultTemplate,
          default_invoice_template: invoiceTemplate,
          default_email_style: emailStyle,
          email_brand_color: brandColor,
          brand_name: brandName,
          email_footer: emailFooter,
        }),
      });
      if (!resp.ok) throw new Error('Failed to save');
      flash('Settings saved');
    } catch (err: any) {
      flash(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'pass' as const, label: 'Pass / Ticket', icon: Ticket },
    { id: 'invoice' as const, label: 'Invoice', icon: FileText },
    { id: 'email' as const, label: 'Email', icon: Mail },
    { id: 'branding' as const, label: 'Branding', icon: Palette },
  ];

  const fetchPreview = async (type: string, tplId: string) => {
    const base = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || '';
    try {
      const { tokenStore } = await import('@/src/models/services/api');
      const token = await tokenStore.getAccess();
      const url = type === 'invoice'
        ? `${base}/api/echo/admin/settings/preview/invoice/${tplId}`
        : `${base}/api/echo/tickets/preview/${tplId}`;
      const resp = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!resp.ok) throw new Error('Preview not available');
      const data = await resp.json();
      onPreview?.(data.html);
    } catch (err: any) {
      flash(err?.message || 'Could not load preview');
    }
  };

  const TemplatePicker = ({ label, options, value, onChange, previewType }: {
    label: string; options: { id: string; name: string; desc: string; gradient: string }[];
    value: string; onChange: (v: string) => void; previewType: string;
  }) => (
    <View style={{ gap: 8 }}>
      <Text style={{ fontFamily: FONTS.semi, fontSize: 11, color: SAC.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {options.map((tpl) => (
          <Pressable key={tpl.id} onPress={() => onChange(tpl.id)} style={{
            flex: 1, borderRadius: 10, borderWidth: 2,
            borderColor: value === tpl.id ? '#7C3AED' : 'rgba(255,255,255,0.1)',
            backgroundColor: value === tpl.id ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.03)',
            padding: 12, cursor: 'pointer',
          }}>
            <View style={{ height: 6, borderRadius: 3, marginBottom: 8, background: tpl.gradient }} />
            <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: value === tpl.id ? '#C4B5FD' : SAC.text }}>{tpl.name}</Text>
            <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.dim, marginTop: 2 }}>{tpl.desc}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={() => fetchPreview(previewType, value)} style={{
        flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
        backgroundColor: 'rgba(124,58,237,0.12)', borderRadius: 8,
        paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)',
        cursor: 'pointer', marginTop: 4,
      }}>
        <Eye size={12} color="#A78BFA" />
        <Text style={{ fontFamily: FONTS.semi, fontSize: 11, color: '#C4B5FD' }}>Preview</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {tabs.map((t) => (
          <Pressable key={t.id} onPress={() => setTab(t.id)} style={{
            flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8,
            borderRadius: 8, borderWidth: 1, cursor: 'pointer',
            borderColor: tab === t.id ? '#7C3AED' : SAC.border,
            backgroundColor: tab === t.id ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.03)',
          }}>
            <t.icon size={13} color={tab === t.id ? '#C4B5FD' : SAC.muted} />
            <Text style={{ fontFamily: FONTS.semi, fontSize: 12, color: tab === t.id ? '#C4B5FD' : SAC.muted }}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'pass' && (
        <Card style={{ padding: 20, gap: 16 }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: SAC.text }}>Pass / Ticket Templates</Text>
          <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted }}>
            Default entry pass style for all events. Individual events can override.
          </Text>
          <TemplatePicker label="Default Template" previewType="pass" value={defaultTemplate} onChange={setDefaultTemplate} options={[
            { id: 'aurora', name: 'Aurora', desc: 'Dark gradient, glow accents', gradient: 'linear-gradient(135deg,#312e81,#4C1D95)' },
            { id: 'classic', name: 'Classic', desc: 'White + purple header', gradient: 'linear-gradient(135deg,#fff,#f3f4f6)' },
            { id: 'minimal', name: 'Minimal', desc: 'Bare-bones borderless', gradient: 'linear-gradient(135deg,#f9fafb,#e5e7eb)' },
          ]} />
        </Card>
      )}

      {tab === 'invoice' && (
        <Card style={{ padding: 20, gap: 16 }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: SAC.text }}>Invoice Templates</Text>
          <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted }}>
            Default invoice style for paid event registrations.
          </Text>
          <TemplatePicker label="Default Invoice" previewType="invoice" value={invoiceTemplate} onChange={setInvoiceTemplate} options={[
            { id: 'modern', name: 'Modern', desc: 'Gradient header, card layout', gradient: 'linear-gradient(135deg,#7C3AED,#5B21B6)' },
            { id: 'minimal', name: 'Minimal', desc: 'Clean white, thin borders', gradient: 'linear-gradient(135deg,#f8fafc,#e2e8f0)' },
            { id: 'classic', name: 'Classic', desc: 'Dark header, traditional', gradient: 'linear-gradient(135deg,#0f172a,#1e293b)' },
          ]} />
        </Card>
      )}

      {tab === 'email' && (
        <Card style={{ padding: 20, gap: 16 }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: SAC.text }}>Email Templates</Text>
          <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted }}>
            Style for transactional emails: welcome, registration, payment receipts, newsletters.
          </Text>
          <TemplatePicker label="Email Style" previewType="pass" value={emailStyle} onChange={setEmailStyle} options={[
            { id: 'modern', name: 'Modern', desc: 'Purple gradient header', gradient: 'linear-gradient(135deg,#7C3AED,#5B21B6)' },
            { id: 'minimal', name: 'Minimal', desc: 'Clean, no gradient', gradient: 'linear-gradient(135deg,#f8fafc,#e2e8f0)' },
            { id: 'professional', name: 'Professional', desc: 'Dark header, corporate', gradient: 'linear-gradient(135deg,#0f172a,#334155)' },
          ]} />
          <FieldRow label="Email Footer Text">
            <Field value={emailFooter} onChangeText={setEmailFooter} placeholder="Student Alumni Cell — Empowering the next generation of leaders." multiline />
          </FieldRow>
        </Card>
      )}

      {tab === 'branding' && (
        <Card style={{ padding: 20, gap: 16 }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: SAC.text }}>Branding</Text>
          <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted }}>
            Brand settings applied across emails, passes, and invoices.
          </Text>
          <FieldRow label="Brand Name">
            <Field value={brandName} onChangeText={setBrandName} placeholder="Student Alumni" />
          </FieldRow>
          <FieldRow label="Brand Color">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <input type="color" value={brandColor} onChange={(e: any) => setBrandColor(e.target.value)}
                style={{ width: 40, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'transparent' }} />
              <Field value={brandColor} onChangeText={setBrandColor} placeholder="#7C3AED" />
            </View>
          </FieldRow>
          <View style={{ padding: 16, borderRadius: 12, backgroundColor: brandColor + '18', borderWidth: 1, borderColor: brandColor + '40' }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: brandColor }}>Preview</Text>
            <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted, marginTop: 4 }}>This is how {brandName} will appear in emails and passes.</Text>
          </View>
        </Card>
      )}

      <GradientButton onPress={save} loading={saving} disabled={saving} size="md">
        <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13 }}>Save Settings</Text>
      </GradientButton>
    </View>
  );
}

// ── Main View ─────────────────────────────────────────────────────────────────
export function EchoShowcaseAdminView({ sub, onSub }: { sub?: string; onSub?: (s: string) => void }) {
  const [pageTab, setPageTab] = useSubTab<PageTab>(['all', 'create', 'drafts', 'registrations', 'volunteers', 'media', 'settings'], 'all', { sub, onSub });
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [editing, setEditing] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const { toast, flash } = useToast();
  const user = useAuthStore((s) => s.user);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const res = await api.adminListEchoShowcases();
      setItems(res?.items || []);
    } catch {
      flash('Failed to load showcases');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // When user clicks "Create Showcase" tab → open modal immediately
  useEffect(() => {
    if (pageTab === 'create') {
      setEditing(null);
      setModalOpen(true);
    }
  }, [pageTab]);

  const filtered = items.filter((i) => {
    const q = search.toLowerCase();
    const matchQ = !q || i.title?.toLowerCase().includes(q) || i.slug?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || i.status === statusFilter;
    const matchPage = pageTab === 'drafts' ? i.status === 'draft' : true;
    return matchQ && matchStatus && matchPage;
  });

  const onCreate = () => { setEditing(null); setModalOpen(true); setPageTab('create'); };
  const onEdit = (item: any) => { setEditing(item); setModalOpen(true); };
  const onClose = () => { setModalOpen(false); setEditing(null); if (pageTab === 'create') setPageTab('all'); };

  const onSave = async (form: any) => {
    if (!form.title?.trim()) {
      flash('Event name is required');
      return;
    }
    if (!form.slug?.trim()) {
      form = { ...form, slug: form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untitled' };
    }
    setSaving(true);

    try {
      if (editing) {
        const res = await api.updateEchoShowcase(editing._id, form);
        flash('Showcase updated');
      } else {
        const res = await api.createEchoShowcase(form);
        flash('Showcase created');
        // Clear autosave draft
        if (Platform.OS === 'web') {
          try { sessionStorage.removeItem(AUTOSAVE_KEY); } catch { /* ignore */ }
        }
      }
      onClose();
      await load();
    } catch (e: any) {
      console.error('[CMS SAVE ERROR]', e);
      flash(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const onPublish = async (item: any) => {
    setBusy(item._id);
    try { await api.publishEchoShowcase(item._id); flash(`"${item.title}" published`); await load(); }
    catch { flash('Publish failed'); }
    finally { setBusy(null); }
  };
  const onDraft = async (item: any) => {
    setBusy(item._id);
    try { await api.draftEchoShowcase(item._id); flash('Moved to draft'); await load(); }
    catch { flash('Failed'); }
    finally { setBusy(null); }
  };
  const onArchive = async (item: any) => {
    setBusy(item._id);
    try { await api.archiveEchoShowcase(item._id); flash('Archived'); await load(); }
    catch { flash('Failed'); }
    finally { setBusy(null); }
  };
  const onDelete = async (item: any) => {
    if (Platform.OS === 'web' && !window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    try { await api.deleteEchoShowcase(item._id); flash('Deleted'); await load(); }
    catch { flash('Delete failed'); }
  };
  const onPreview = (item: any) => {
    if (Platform.OS === 'web') window.open(`/echo/${item.slug}`, '_blank');
  };

  const pub = items.filter((i) => i.status === 'published').length;
  const draft = items.filter((i) => i.status === 'draft').length;
  const arc = items.filter((i) => i.status === 'archived').length;

  return (
    <View>
      <Toast text={toast.text} visible={toast.visible} />

      {/* Page header */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <View>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 22, color: SAC.text }}>ECHO Showcase CMS</Text>
          <Text style={{ fontFamily: FONTS.med, fontSize: 13, color: SAC.muted, marginTop: 3 }}>
            Create and manage showcase pages. Published showcases appear in the Student Portal.
          </Text>
        </View>
        <GradientButton onPress={onCreate} size="md">
          <PlusCircle size={14} color="#fff" />
          <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13, marginLeft: 6 }}>New Showcase</Text>
        </GradientButton>
      </View>

      {/* Page-level navigation tabs */}
      <View style={{ marginBottom: 20 }}>
        <TopTabs tabs={PAGE_TABS} active={pageTab} onChange={setPageTab} />
      </View>

      {/* ── MEDIA LIBRARY ── */}
      {pageTab === 'media' && <MediaLibraryPanel />}

      {/* ── REGISTRATIONS & PAYMENTS ── */}
      {pageTab === 'registrations' && <RegistrationsPanel />}

      {/* ── SETTINGS ── */}
      {pageTab === 'settings' && <SettingsPanel onPreview={(html: string) => setPreviewHtml(html)} />}

      {/* ── VOLUNTEERS ── */}
      {pageTab === 'volunteers' && <VolunteersPanel />}

      {/* ── SHOWCASES LIST (All / Drafts) ── */}
      {(pageTab === 'all' || pageTab === 'drafts') && (
        <>
          {/* KPI tiles */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <KpiTile Icon={Zap} label="Total Showcases" value={String(items.length)} />
            <KpiTile Icon={Star} label="Published" value={String(pub)} />
            <KpiTile Icon={BookOpen} label="Drafts" value={String(draft)} />
            <KpiTile Icon={Archive} label="Archived" value={String(arc)} />
          </View>

          {/* Search + filter */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <View style={{ flex: 1, minWidth: 200 }}>
              <SearchField value={search} onChange={setSearch} placeholder="Search showcases…" />
            </View>
            {pageTab === 'all' && (
              <TopTabs tabs={FILTER_TABS} active={statusFilter} onChange={setStatusFilter} />
            )}
          </View>

          {/* List */}
          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={GRAD.from} />
            </View>
          ) : filtered.length === 0 ? (
            <Card style={{ padding: 40, alignItems: 'center', gap: 12 }}>
              <IconBox size={48}><Zap size={20} color={GRAD.to} /></IconBox>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: SAC.text }}>
                {pageTab === 'drafts' ? 'No draft showcases' : 'No showcases yet'}
              </Text>
              <Text style={{ fontFamily: FONTS.med, fontSize: 13, color: SAC.muted, textAlign: 'center', maxWidth: 280 }}>
                {pageTab === 'drafts'
                  ? 'All your showcases are published or archived.'
                  : 'Create your first ECHO Showcase to let students explore memorable campus events.'}
              </Text>
              <GradientButton onPress={onCreate} size="md">
                <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13 }}>+ New Showcase</Text>
              </GradientButton>
            </Card>
          ) : (
            filtered.map((item) => (
              <ShowcaseCard key={item._id} item={item} onEdit={onEdit} onDelete={onDelete}
                onPublish={onPublish} onDraft={onDraft} onArchive={onArchive} onPreview={onPreview} busy={busy} />
            ))
          )}
        </>
      )}

      {/* Showcase Editor Modal */}
      <ShowcaseModal visible={modalOpen} editing={editing} onClose={onClose} onSave={onSave} saving={saving} flash={flash} onPreview={(html: string) => setPreviewHtml(html)} />

      {/* Ticket Preview Modal */}
      <Modal visible={!!previewHtml} transparent animationType="fade" onRequestClose={() => setPreviewHtml(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#1e1b4b', borderRadius: 16, overflow: 'hidden', width: '100%', maxWidth: 800, maxHeight: '90vh', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' }}>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#fff' }}>Ticket Preview</Text>
              <Pressable onPress={() => setPreviewHtml(null)} style={{ padding: 6 }}>
                <X size={18} color="#94a3b8" />
              </Pressable>
            </View>
            <View style={{ flex: 1, overflow: 'auto' }}>
              {previewHtml ? (
                <iframe
                  srcDoc={previewHtml}
                  style={{ width: '100%', height: 600, border: 'none', background: '#0f172a' }}
                  title="Ticket Preview"
                />
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
