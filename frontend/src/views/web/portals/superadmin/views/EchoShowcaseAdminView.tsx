
// ── VIDEOS & REELS UPLOAD MANAGER ─────────────────────────────────────────────
function CustomVideosEditor({ videos, onChange }: { videos: any[]; onChange: (v: any[]) => void }) {
  const { flash } = useToast();
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  const updateItem = (index: number, key: string, val: any) => {
    const list = [...(videos || [])];
    list[index] = { ...list[index], [key]: val };
    onChange(list);
  };

  const addItem = () => {
    onChange([
      ...(videos || []),
      {
        title: 'New Video Clip / Reel',
        video_url: '',
        thumbnail_url: '',
        description: '',
        platform: 'youtube',
      },
    ]);
  };

  const removeItem = (index: number) => {
    const list = (videos || []).filter((_, i) => i !== index);
    onChange(list);
  };

  const handleFileUpload = async (index: number, e: any) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    setUploadingIdx(index);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.uploadEchoMedia(fd);
      const fileUrl = res?.url || res?.file_url;
      if (fileUrl) {
        updateItem(index, 'video_url', fileUrl);
        updateItem(index, 'platform', 'mp4');
        flash?.('Video file uploaded successfully!');
      }
    } catch (err: any) {
      flash?.('Failed to upload video file', 'error');
    } finally {
      setUploadingIdx(null);
    }
  };

  return (
    <View style={{ gap: 16 }}>
      {(videos || []).map((vid: any, idx: number) => {
        const isYt = vid.video_url?.includes('youtube.com') || vid.video_url?.includes('youtu.be');
        const ytId = isYt ? (vid.video_url.includes('v=') ? vid.video_url.split('v=')[1]?.split('&')[0] : vid.video_url.split('/').pop()) : null;

        return (
          <View key={idx} style={{ border: '1px solid ' + SAC.border, borderRadius: 14, padding: 18, backgroundColor: SAC.panelBg, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: SAC.text }}>Video / Clip #{idx + 1}</Text>
              <Pressable onPress={() => removeItem(idx)} style={{ padding: 4 }}>
                <Trash2 size={16} color="#EF4444" />
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              <TextInput
                style={[s.input, { flex: 1, minWidth: 200 }]}
                placeholder="Video Title (e.g. SNIST HackWave Teaser)"
                value={vid.title || ''}
                onChangeText={(t) => updateItem(idx, 'title', t)}
              />
              <TextInput
                style={[s.input, { flex: 1.5, minWidth: 260 }]}
                placeholder="Video URL (YouTube / Vimeo / MP4 File)"
                value={vid.video_url || ''}
                onChangeText={(t) => updateItem(idx, 'video_url', t)}
              />
              {Platform.OS === 'web' && (
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, background: '#7C3AED', color: '#FFF', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                  {uploadingIdx === idx ? 'Uploading...' : '🎥 Upload Video File'}
                  <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(e) => handleFileUpload(idx, e)} style={{ display: 'none' }} />
                </label>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              <TextInput
                style={[s.input, { flex: 1, minWidth: 200 }]}
                placeholder="Thumbnail Image URL (optional)"
                value={vid.thumbnail_url || ''}
                onChangeText={(t) => updateItem(idx, 'thumbnail_url', t)}
              />
              <TextInput
                style={[s.input, { flex: 1.5, minWidth: 260 }]}
                placeholder="Short Description / Caption (optional)"
                value={vid.description || ''}
                onChangeText={(t) => updateItem(idx, 'description', t)}
              />
            </View>

            {/* Live Video Preview Box */}
            {vid.video_url ? (
              <View style={{ marginTop: 6, borderRadius: 10, overflow: 'hidden', backgroundColor: '#000', maxHeight: 200, alignItems: 'center', justifyContent: 'center' }}>
                {isYt && ytId ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${ytId}`}
                    title="Preview"
                    style={{ width: '100%', height: '200px', border: 'none' }}
                  />
                ) : (
                  <video controls src={vid.video_url} style={{ width: '100%', maxHeight: '200px' }} />
                )}
              </View>
            ) : null}
          </View>
        );
      })}

      <Pressable onPress={addItem} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: 'rgba(124,92,252,0.15)', borderWidth: 1, borderColor: '#7C3AED' }}>
        <Plus size={16} color="#A78BFA" />
        <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: '#A78BFA' }}>Add Video Option</Text>
      </Pressable>
    </View>
  );
}

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
  Copy, Check, Search, RefreshCw, Plus, PlusCircle, FileText, Link2,
  Image as ImageIcon, HardDrive, Calendar, Layout, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Users,
  Ticket, Mail, ScanLine, Phone,
  CupSoda, UtensilsCrossed, Cookie, Sandwich, Coffee, Lock, XCircle, Clock, CheckCircle,
} from 'lucide-react-native';
import {
  GRAD, GradientButton, SecondaryButton, Card,
  StatusPill, SearchField, KpiTile, useToast, Toast, TopTabs, IconBox,
} from '../applekit';
import { SAC, FONTS } from '../tokens';
import { api, resolveImageUrl } from '@/src/models/services/api';
import { useConfirm } from '@/src/views/components';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useSubTab } from '@/src/views/web/portals/portalUrl';
import { DarkDropdown } from '@/src/views/web/components/DarkDropdown';

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

type PageTab = 'all' | 'create' | 'drafts' | 'media' | 'registrations' | 'volunteers';
type StatusFilter = 'all' | 'published' | 'draft' | 'archived';
type FormTab =
  | 'general' | 'hero' | 'statistics' | 'about' | 'gallery'
  | 'testimonials' | 'highlights' | 'speakers' | 'categories' | 'schedule'
  | 'panels' | 'faqs' | 'sponsors' | 'videos' | 'downloads'
  | 'sections' | 'registration' | 'seo' | 'publish';

const PAGE_TABS: Array<{ id: PageTab; label: string; icon?: any }> = [
  { id: 'all', label: 'All Showcases', icon: Layout },
  { id: 'create', label: 'Create Showcase', icon: PlusCircle },
  { id: 'drafts', label: 'Drafts', icon: FileText },
  { id: 'registrations', label: 'Registrations & Payments', icon: Users },
  { id: 'volunteers', label: 'Volunteers', icon: Users },
  { id: 'media', label: 'Media Library', icon: Images },
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
  { id: 'speakers',     label: 'Speakers & Panel' },
  { id: 'categories',   label: 'Categories' },
  { id: 'schedule',     label: 'Schedule' },
  { id: 'panels',       label: 'Panels' },
  { id: 'faqs',         label: 'FAQs' },
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
               {dl.file_url}
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

// ── Speakers Editor ──────────────────────────────────────────────────────────
function SpeakersEditor({ speakers, onChange }: any) {
  const update = (i: number, key: string, val: any) => {
    const next = [...speakers];
    next[i] = { ...next[i], [key]: val };
    onChange(next);
  };
  const add = () => onChange([...speakers, {
    name: '', position: '', company: '', bio: '', photo_url: null,
    linkedin_url: '', twitter_url: '', website_url: '',
    is_panel_member: false, session_title: '', visible: true, sort_order: speakers.length,
  }]);
  const remove = (i: number) => onChange(speakers.filter((_: any, j: number) => j !== i));

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
      {speakers.map((t: any, i: number) => (
        <View key={i} style={{
          backgroundColor: 'rgba(255,255,255,0.03)',
          borderRadius: 12, padding: 14, borderWidth: 1,
          borderColor: t.visible !== false ? SAC.border : 'rgba(239,68,68,0.25)',
          gap: 10,
        }}>
          {/* Header row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: SAC.text }}>Speaker #{i + 1}</Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Panel member toggle */}
              <Pressable
                onPress={() => update(i, 'is_panel_member', !t.is_panel_member)}
                style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1,
                  borderColor: t.is_panel_member ? 'rgba(236,72,153,0.4)' : SAC.border,
                  backgroundColor: t.is_panel_member ? 'rgba(236,72,153,0.10)' : 'transparent' }}
              >
                <Text style={{ fontFamily: FONTS.semi, fontSize: 11,
                  color: t.is_panel_member ? '#F472B6' : SAC.muted }}>
                  {t.is_panel_member ? 'Panel Member' : 'Speaker'}
                </Text>
              </Pressable>
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
              </View>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                <TextInput value={t.position || ''} onChangeText={(v) => update(i, 'position', v)}
                  placeholder="Position / Role (e.g. Chief AI Architect)" placeholderTextColor={SAC.dim} style={[fi.input, { flex: 1, minWidth: 120 }]} />
                <TextInput value={t.company || ''} onChangeText={(v) => update(i, 'company', v)}
                  placeholder="Company (e.g. Google)" placeholderTextColor={SAC.dim} style={[fi.input, { flex: 1, minWidth: 100 }]} />
              </View>
              <TextInput value={t.bio || ''} onChangeText={(v) => update(i, 'bio', v)}
                placeholder="Short bio / intro (1–2 lines)" placeholderTextColor={SAC.dim} multiline numberOfLines={2}
                style={[fi.input, { minHeight: 44, textAlignVertical: 'top' }]} />
              <TextInput value={t.session_title || ''} onChangeText={(v) => update(i, 'session_title', v)}
                placeholder="Assigned session (e.g. AI at Scale — Keynote)" placeholderTextColor={SAC.dim} style={fi.input} />
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                <TextInput value={t.linkedin_url || ''} onChangeText={(v) => update(i, 'linkedin_url', v)}
                  placeholder="LinkedIn URL" placeholderTextColor={SAC.dim} style={[fi.input, { flex: 1, minWidth: 120 }]} />
                <TextInput value={t.twitter_url || ''} onChangeText={(v) => update(i, 'twitter_url', v)}
                  placeholder="Twitter / X URL" placeholderTextColor={SAC.dim} style={[fi.input, { flex: 1, minWidth: 120 }]} />
                <TextInput value={t.website_url || ''} onChangeText={(v) => update(i, 'website_url', v)}
                  placeholder="Website URL" placeholderTextColor={SAC.dim} style={[fi.input, { flex: 1, minWidth: 120 }]} />
              </View>
            </View>
          </View>
        </View>
      ))}
      <Pressable onPress={add}>
        <Text style={{ color: GRAD.from, fontFamily: FONTS.semi, fontSize: 12.5 }}>+ Add Speaker</Text>
      </Pressable>
    </View>
  );
}

// ── Event Categories Editor ───────────────────────────────────────────────────
function CategoriesEditor({ categories, onChange }: any) {
  const update = (i: number, key: string, val: any) => {
    const next = [...categories];
    next[i] = { ...next[i], [key]: val };
    onChange(next);
  };
  const add = () => onChange([...categories, { name: '', description: '', icon: 'brain', color: '#8B5CF6' }]);
  const remove = (i: number) => onChange(categories.filter((_: any, j: number) => j !== i));
  return (
    <View style={{ gap: 8 }}>
      {categories.map((c: any, i: number) => (
        <View key={i} style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextInput value={c.name || ''} onChangeText={(v) => update(i, 'name', v)}
            placeholder="Category Name (e.g. Healthcare & MedTech)" placeholderTextColor={SAC.dim}
            style={[fi.input, { flex: 1, minWidth: 160 }]} />
          <TextInput value={c.icon || ''} onChangeText={(v) => update(i, 'icon', v)}
            placeholder="Icon (brain/leaf/landmark)" placeholderTextColor={SAC.dim}
            style={[fi.input, { flex: 0.4, minWidth: 100 }]} />
          <TextInput value={c.description || ''} onChangeText={(v) => update(i, 'description', v)}
            placeholder="Short description" placeholderTextColor={SAC.dim}
            style={[fi.input, { flex: 1, minWidth: 160 }]} />
          <Tip label="Remove"><Pressable onPress={() => remove(i)} style={cs.iconBtn}><X size={12} color="#F87171" /></Pressable></Tip>
        </View>
      ))}
      <Pressable onPress={add}>
        <Text style={{ color: GRAD.from, fontFamily: FONTS.semi, fontSize: 12.5 }}>+ Add Category</Text>
      </Pressable>
    </View>
  );
}

// ── Schedule Editor ──────────────────────────────────────────────────────────
function ScheduleEditor({ schedule, onChange }: any) {
  const update = (i: number, key: string, val: any) => {
    const next = [...schedule];
    next[i] = { ...next[i], [key]: val };
    onChange(next);
  };
  const add = () => onChange([...schedule, { time: '', title: '', description: '', session_type: 'session', speaker_names: [], day: 1 }]);
  const remove = (i: number) => onChange(schedule.filter((_: any, j: number) => j !== i));
  const toggleType = (i: number, type: string) => update(i, 'session_type', type);

  return (
    <View style={{ gap: 12 }}>
      {schedule.map((it: any, i: number) => (
        <View key={i} style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: SAC.border, gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextInput value={it.time || ''} onChangeText={(v) => update(i, 'time', v)}
              placeholder="10:00 AM" placeholderTextColor={SAC.dim} style={[fi.input, { flex: 0.5, minWidth: 90 }]} />
            {/* session type */}
            <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', flex: 1 }}>
              {['keynote', 'panel', 'workshop', 'activity', 'break', 'session'].map((tp) => (
                <Pressable key={tp} onPress={() => toggleType(i, tp)}
                  style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1,
                    borderColor: (it.session_type || 'session') === tp ? GRAD.from : SAC.border,
                    backgroundColor: (it.session_type || 'session') === tp ? 'rgba(123,61,191,0.15)' : 'transparent' }}>
                  <Text style={{ fontFamily: FONTS.semi, fontSize: 10,
                    color: (it.session_type || 'session') === tp ? GRAD.from : SAC.muted }}>
                    {tp.charAt(0).toUpperCase() + tp.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Tip label="Move up"><Pressable onPress={() => {
              if (i === 0) return;
              const next = [...schedule];
              [next[i - 1], next[i]] = [next[i], next[i - 1]];
              onChange(next);
            }} disabled={i === 0} style={[cs.iconBtn, { opacity: i === 0 ? 0.35 : 1 }]}>
              <ChevronUp size={13} color="#CBD5E1" />
            </Pressable></Tip>
            <Tip label="Move down"><Pressable onPress={() => {
              if (i === schedule.length - 1) return;
              const next = [...schedule];
              [next[i + 1], next[i]] = [next[i], next[i + 1]];
              onChange(next);
            }} disabled={i === schedule.length - 1} style={[cs.iconBtn, { opacity: i === schedule.length - 1 ? 0.35 : 1 }]}>
              <ChevronDown size={13} color="#CBD5E1" />
            </Pressable></Tip>
            <Tip label="Remove"><Pressable onPress={() => remove(i)} style={[cs.iconBtn, { borderColor: 'rgba(239,68,68,0.30)' }]}>
              <Trash2 size={13} color="#F87171" />
            </Pressable></Tip>
          </View>
          <TextInput value={it.title || ''} onChangeText={(v) => update(i, 'title', v)}
            placeholder="Session title (e.g. Keynote — AI at Scale)" placeholderTextColor={SAC.dim} style={fi.input} />
          <TextInput value={it.description || ''} onChangeText={(v) => update(i, 'description', v)}
            placeholder="Short description" placeholderTextColor={SAC.dim} multiline numberOfLines={2}
            style={[fi.input, { minHeight: 44, textAlignVertical: 'top' }]} />
        </View>
      ))}
      <Pressable onPress={add}>
        <Text style={{ color: GRAD.from, fontFamily: FONTS.semi, fontSize: 12.5 }}>+ Add Schedule Entry</Text>
      </Pressable>
    </View>
  );
}

// ── Panels Editor ────────────────────────────────────────────────────────────
function PanelsEditor({ panels, onChange }: any) {
  const update = (i: number, key: string, val: any) => {
    const next = [...panels];
    next[i] = { ...next[i], [key]: val };
    onChange(next);
  };
  const add = () => onChange([...panels, { topic: '', description: '', panelists: [] }]);
  const remove = (i: number) => onChange(panels.filter((_: any, j: number) => j !== i));

  return (
    <View style={{ gap: 12 }}>
      {panels.map((p: any, i: number) => (
        <View key={i} style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: SAC.border, gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <TextInput value={p.topic || ''} onChangeText={(v) => update(i, 'topic', v)}
              placeholder="Panel topic (e.g. Careers in AI)" placeholderTextColor={SAC.dim}
              style={[fi.input, { flex: 1 }]} />
            <Tip label="Remove"><Pressable onPress={() => remove(i)} style={[cs.iconBtn, { borderColor: 'rgba(239,68,68,0.30)' }]}>
              <Trash2 size={13} color="#F87171" />
            </Pressable></Tip>
          </View>
          <TextInput value={p.description || ''} onChangeText={(v) => update(i, 'description', v)}
            placeholder="Short description of the discussion" placeholderTextColor={SAC.dim} multiline numberOfLines={2}
            style={[fi.input, { minHeight: 44, textAlignVertical: 'top' }]} />
          <View style={{ gap: 4 }}>
            <Text style={{ fontFamily: FONTS.semi, fontSize: 11, color: SAC.muted }}>Panelists (names)</Text>
            {(p.panelists || []).map((name: string, j: number) => (
              <View key={j} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <TextInput value={name} onChangeText={(v) => {
                  const names = [...(p.panelists || [])];
                  names[j] = v;
                  update(i, 'panelists', names);
                }} placeholder="Panelist name" placeholderTextColor={SAC.dim} style={[fi.input, { flex: 1 }]} />
                <Pressable onPress={() => {
                  const names = (p.panelists || []).filter((_: string, k: number) => k !== j);
                  update(i, 'panelists', names);
                }} style={{ padding: 4 }}>
                  <X size={12} color="#F87171" />
                </Pressable>
              </View>
            ))}
            <Pressable onPress={() => update(i, 'panelists', [...(p.panelists || []), ''])} style={{ paddingVertical: 3 }}>
              <Text style={{ color: GRAD.from, fontFamily: FONTS.semi, fontSize: 11.5 }}>+ Add Panelist</Text>
            </Pressable>
          </View>
        </View>
      ))}
      <Pressable onPress={add}>
        <Text style={{ color: GRAD.from, fontFamily: FONTS.semi, fontSize: 12.5 }}>+ Add Panel Discussion</Text>
      </Pressable>
    </View>
  );
}

// ── FAQs Editor ───────────────────────────────────────────────────────────────
function FaqsEditor({ faqs, onChange }: any) {
  const update = (i: number, key: string, val: string) => {
    const next = [...faqs];
    next[i] = { ...next[i], [key]: val };
    onChange(next);
  };
  const add = () => onChange([...faqs, { question: '', answer: '' }]);
  const remove = (i: number) => onChange(faqs.filter((_: any, j: number) => j !== i));
  return (
    <View style={{ gap: 12 }}>
      {faqs.map((f: any, i: number) => (
        <View key={i} style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: SAC.border, gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <TextInput value={f.question || ''} onChangeText={(v) => update(i, 'question', v)}
              placeholder="Question" placeholderTextColor={SAC.dim} style={[fi.input, { flex: 1 }]} />
            <Tip label="Remove"><Pressable onPress={() => remove(i)} style={[cs.iconBtn, { borderColor: 'rgba(239,68,68,0.30)' }]}>
              <Trash2 size={13} color="#F87171" />
            </Pressable></Tip>
          </View>
          <TextInput value={f.answer || ''} onChangeText={(v) => update(i, 'answer', v)}
            placeholder="Answer" placeholderTextColor={SAC.dim} multiline numberOfLines={3}
            style={[fi.input, { minHeight: 60, textAlignVertical: 'top' }]} />
        </View>
      ))}
      <Pressable onPress={add}>
        <Text style={{ color: GRAD.from, fontFamily: FONTS.semi, fontSize: 12.5 }}>+ Add FAQ</Text>
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
  const { confirm } = useConfirm();
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
    const ok = await confirm({
      title: 'Delete file',
      message: `Delete ${filename}? This cannot be undone.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
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
  speakers: [], categories: [], schedule: [], panels: [], faqs: [],
  eligibility: '', prize_pool: null, team_composition: '',
  partners: [], sponsors: [], downloads: [], videos: [], gallery: [],
  sections: {
    hero: true, stats: true, about: true, gallery: true, testimonials: true,
    timeline: true, speakers: true, categories: true, schedule: true,
    panels: true, faqs: true, partners: true, sponsors: true, videos: true,
    downloads: true, cta: true, registration: true,
  },
  registration: {
    enabled: true, fee: 0, currency: 'INR', registration_type: 'individual', max_seats: 0, seat_leverage: 0.8,
    deadline: '', payment_note: '', payment_url: '', poster_images: [],
    contact_phones: [],
  },
};

// ── Autosave key ──────────────────────────────────────────────────────────────
const AUTOSAVE_KEY = 'echo_cms_autosave';

// ── Showcase Editor Modal ─────────────────────────────────────────────────────
function ShowcaseModal({ visible, editing, onClose, onSave, saving, flash, onPreview }: any) {
  const { confirm } = useConfirm();
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

  const handleClose = async () => {
    if (isDirty) {
      const ok = await confirm({
        title: 'Unsaved changes',
        message: 'You have unsaved changes. Close anyway?',
        confirmText: 'Discard',
        danger: true,
      });
      if (!ok) return;
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
                <ImageUploadWidget
                  label="Registration Page Background"
                  url={form.hero_bg_url}
                  onUpload={(url) => set('hero_bg_url', url)}
                  onRemove={() => set('hero_bg_url', '')}
                  onUploadStart={onUploadStart}
                  onUploadEnd={onUploadEnd}
                  flash={flash}
                  aspectHint="Full-page background image shown behind the registration form (transparent overlay applied automatically)"
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

            {/* ── SPEAKERS TAB ── */}
            {tab === 'speakers' && <>
              <FieldRow label="Speakers & Panel Members" hint="Add speakers and panelists. Panel members render in a distinct 'Panel Members' section on the public page.">
                <SpeakersEditor speakers={form.speakers || []} onChange={(v: any) => set('speakers', v)} />
              </FieldRow>
              <FieldRow label="Eligibility" hint="Who can participate — shown on the public page.">
                <Field value={form.eligibility || ''} onChangeText={(v: string) => set('eligibility', v)} placeholder="Open to all undergrad and postgrad students…" multiline rows={2} />
              </FieldRow>
              <FieldRow label="Team Composition" hint="Team size / composition requirement.">
                <Field value={form.team_composition || ''} onChangeText={(v: string) => set('team_composition', v)} placeholder="4–5 members…" />
              </FieldRow>
              <FieldRow label="Prize Pool" hint="Show prize amounts on the public page.">
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    <TextInput value={(form.prize_pool || {}).total || ''}
                      onChangeText={(v: string) => set('prize_pool', { ...(form.prize_pool || {}), total: v })}
                      placeholder="Total (e.g. ₹30,000)" placeholderTextColor={SAC.dim}
                      style={[fi.input, { flex: 1, minWidth: 100 }]} />
                    <TextInput value={(form.prize_pool || {}).first || ''}
                      onChangeText={(v: string) => set('prize_pool', { ...(form.prize_pool || {}), first: v })}
                      placeholder="1st Prize" placeholderTextColor={SAC.dim}
                      style={[fi.input, { flex: 1, minWidth: 100 }]} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    <TextInput value={(form.prize_pool || {}).second || ''}
                      onChangeText={(v: string) => set('prize_pool', { ...(form.prize_pool || {}), second: v })}
                      placeholder="2nd Prize" placeholderTextColor={SAC.dim}
                      style={[fi.input, { flex: 1, minWidth: 100 }]} />
                    <TextInput value={(form.prize_pool || {}).third || ''}
                      onChangeText={(v: string) => set('prize_pool', { ...(form.prize_pool || {}), third: v })}
                      placeholder="3rd Prize" placeholderTextColor={SAC.dim}
                      style={[fi.input, { flex: 1, minWidth: 100 }]} />
                  </View>
                  <TextInput value={((form.prize_pool || {}).other_prizes || []).join(', ')}
                    onChangeText={(v: string) => set('prize_pool', { ...(form.prize_pool || {}), other_prizes: v.split(',').map((s: string) => s.trim()).filter(Boolean) })}
                    placeholder="Other prizes (comma-separated)" placeholderTextColor={SAC.dim}
                    style={fi.input} />
                </View>
              </FieldRow>
            </>}

            {/* ── CATEGORIES TAB ── */}
            {tab === 'categories' && (
              <FieldRow label="Event Categories / Tracks" hint="Categories displayed as a grid on the public page (e.g. hackathon problem statements).">
                <CategoriesEditor categories={form.categories || []} onChange={(v: any) => set('categories', v)} />
              </FieldRow>
            )}

            {/* ── SCHEDULE TAB ── */}
            {tab === 'schedule' && (
              <FieldRow label="Event Schedule / Agenda" hint="Time-boxed agenda rows shown on the public page. Add cap-down to reorder.">
                <ScheduleEditor schedule={form.schedule || []} onChange={(v: any) => set('schedule', v)} />
              </FieldRow>
            )}

            {/* ── PANELS TAB ── */}
            {tab === 'panels' && (
              <FieldRow label="Panel Discussions" hint="Panel topics + panelist names shown on the public page.">
                <PanelsEditor panels={form.panels || []} onChange={(v: any) => set('panels', v)} />
              </FieldRow>
            )}

            {/* ── FAQs TAB ── */}
            {tab === 'faqs' && (
              <FieldRow label="Frequently Asked Questions" hint="Expandable Q&A shown at the bottom of the public page.">
                <FaqsEditor faqs={form.faqs || []} onChange={(v: any) => set('faqs', v)} />
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
              <FieldRow label="Event Videos & Promo Reels" hint="Paste YouTube/Vimeo URLs or upload MP4 video files directly to feature on the event page.">
                <CustomVideosEditor
                  videos={form.videos || []}
                  onChange={(v: any) => set('videos', v)}
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
                  { key: 'speakers', label: 'Speakers & Panel Members', hint: 'Speaker + panelist photo cards with bios' },
                  { key: 'categories', label: 'Categories / Tracks', hint: 'Event category/track grid' },
                  { key: 'schedule', label: 'Schedule / Agenda', hint: 'Time-boxed agenda rows' },
                  { key: 'panels', label: 'Panel Discussions', hint: 'Panel topics + panelists' },
                  { key: 'faqs', label: 'FAQs', hint: 'Expandable question & answers' },
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
                    <FieldRow label="Registration Type" hint="Whether this is individual or team registration.">
                      <DarkDropdown
                        value={(form.registration || {}).registration_type || 'individual'}
                        options={[
                          { value: 'individual', label: 'Individual' },
                          { value: 'team', label: 'Team (up to 5)' }
                        ]}
                        onChange={(v: string) => set('registration', { ...(form.registration || {}), registration_type: v })}
                        placeholder="Individual"
                        modalTitle="SELECT REGISTRATION TYPE"
                      />
                    </FieldRow>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                  <View style={{ flex: 1, minWidth: 140 }}>
                    <FieldRow label="Max Seats (0 = unlimited)">
                      <Field value={String((form.registration || {}).max_seats ?? 0)} onChangeText={(v: string) => set('registration', { ...(form.registration || {}), max_seats: Number(v) || 0 })} placeholder="0" />
                    </FieldRow>
                  </View>
                  <View style={{ flex: 1, minWidth: 140 }}>
                    <FieldRow label="Seat Leverage (0.8 = 20% buffer)" hint="Fraction of registrations that consume seats. 0.8 means only 80% count — gives buffer for no-shows.">
                      <Field value={String((form.registration || {}).seat_leverage ?? 0.8)} onChangeText={(v: string) => set('registration', { ...(form.registration || {}), seat_leverage: Math.min(1, Math.max(0, Number(v) || 0.8)) })} placeholder="0.8" />
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
                <FieldRow label="Contact Phone Numbers" hint="Phone numbers shown in the 'Important Information' section on the registration page.">
                  <View style={{ flex: 1, gap: 6 }}>
                    {((form.registration || {}).contact_phones || []).map((phone: string, idx: number) => (
                      <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Phone size={14} color={SAC.muted} />
                        <Field
                          value={phone}
                          onChangeText={(v: string) => {
                            const phones = [...((form.registration || {}).contact_phones || [])];
                            phones[idx] = v;
                            set('registration', { ...(form.registration || {}), contact_phones: phones });
                          }}
                          placeholder="+91 98765 43210"
                          style={{ flex: 1 }}
                        />
                        <Pressable onPress={() => {
                          const phones = ((form.registration || {}).contact_phones || []).filter((_: string, i: number) => i !== idx);
                          set('registration', { ...(form.registration || {}), contact_phones: phones });
                        }} style={{ padding: 4 }}>
                          <Trash2 size={14} color="#EF4444" />
                        </Pressable>
                      </View>
                    ))}
                    <Pressable onPress={() => {
                      const phones = [...((form.registration || {}).contact_phones || []), ''];
                      set('registration', { ...(form.registration || {}), contact_phones: phones });
                    }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 }}>
                      <PlusCircle size={14} color={GRAD.from} />
                      <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: GRAD.from }}>Add Phone Number</Text>
                    </Pressable>
                  </View>
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
  const { confirm } = useConfirm();
  const [rows, setRows] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any>({ events: [], totals: {} });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [eventSlug, setEventSlug] = useState('all');
  const [detailRow, setDetailRow] = useState<any>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);
  const [auditData, setAuditData] = useState<any>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [auditFilter, setAuditFilter] = useState<'all' | 'free' | 'admin' | 'paid' | 'pending' | 'failed' | 'team'>('all');
  const [auditEventFilter, setAuditEventFilter] = useState<string>('all');
  const [razorpayFees, setRazorpayFees] = useState<Record<string, { fee: number; tax: number; net: number; amount?: number; error?: string }>>({});
  const [fetchingFees, setFetchingFees] = useState(false);


  const [editingTeamReg, setEditingTeamReg] = useState<any>(null);
  const [editTeamMembers, setEditTeamMembers] = useState<any[]>([]);
  const [editTeamName, setEditTeamName] = useState('');


  const [page, setPage] = useState(0);
  const PER_PAGE = 20;
  const { flash } = useToast();

  useEffect(() => { setPage(0); }, [q, status, eventSlug, rows]);

  const exportAuditCSV = useCallback(() => {
    if (!auditData?.registrations) return;
    const rows = auditData.registrations;
    const headers = ['Name', 'Email', 'Event', 'Type', 'Team Size', 'Fee (DB)', 'RP Fee', 'RP Tax', 'RP Net', 'Payment ID', 'Status', 'Is Free', 'Is Admin', 'Is Team Member'];
    const csvRows = [headers.join(',')];
    for (const r of rows) {
      const pid = r.payment_id || '';
      const rpFee = razorpayFees[pid];
      const vals = [
        `"${(r.name || '').replace(/"/g, '""')}"`,
        `"${(r.email || '').replace(/"/g, '""')}"`,
        `"${(r.slug || '').replace(/"/g, '""')}"`,
        r.reg_type || 'individual',
        r.team_size || 1,
        r.fee || 0,
        rpFee?.fee ?? '',
        rpFee?.tax ?? '',
        rpFee?.net ?? '',
        pid,
        r.status || '',
        r.is_free ? 'Yes' : 'No',
        r.is_admin_pay ? 'Yes' : 'No',
        r.is_team_member ? 'Yes' : 'No',
      ];
      csvRows.push(vals.join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [auditData, razorpayFees]);

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

  const loadAudit = async () => {
    setAuditLoading(true);
    try {
      const r = await api.adminRevenueAudit();
      setAuditData(r);
      setShowAudit(true);
    } catch {
      flash('Failed to load audit data');
    } finally { setAuditLoading(false); }
  };

  const deleteReg = async (id: string) => {
    const ok = await confirm({
      title: 'Delete registration',
      message: 'Delete this registration? This cannot be undone.',
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
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

  
  const handleEditTeam = (r: any) => {
    setEditingTeamReg(r);
    setEditTeamName(r.team_name || '');
    const members = [...(r.team_members || [])];

    const size = r.team_size || 1;
    while (members.length < size - 1) {
      members.push({ name: '', email: '', phone: '' });
    }
    setEditTeamMembers(members);
  };

  const saveTeamMembers = async () => {
    if (!editingTeamReg) return;
    setActioning(editingTeamReg.id);
    try {
      await api.adminEchoUpdateTeam(editingTeamReg.id, editTeamMembers, editTeamName);
      flash('Team members updated successfully');
      setEditingTeamReg(null);
      await load();
    } catch (err: any) {
      flash(err?.message || 'Failed to update team members');
    } finally {
      setActioning(null);
    }
  };

  const resendTickets = async (r: any) => {
    setActioning(r.id);
    try {
      await api.adminEchoResendTickets(r.id);
      flash('Tickets and coupons resent successfully');
      await load();
    } catch (err: any) {
      flash(err?.message || 'Failed to resend tickets');
    } finally {
      setActioning(null);
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
    const ok = await confirm({
      title: 'Mark as failed',
      message: 'Mark this registration as failed? No ticket or pass will be issued, and the attendee will be emailed.',
      confirmText: 'Mark failed',
      danger: true,
    });
    if (!ok) return;
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

  const markPaid = async (r: any) => {
    const ok = await confirm({
      title: 'Mark as paid',
      message: 'Mark this registration as paid? This will issue a ticket, invoice, and provision an SA account. Only use if Razorpay confirms the payment was captured.',
      confirmText: 'Confirm payment',
    });
    if (!ok) return;
    setActioning(r.id);
    try {
      await api.adminEchoMarkRegistrationPaid(r.id);
      flash('Registration marked as paid — ticket and invoice issued');
      await load();
    } catch (err: any) {
      flash(err?.message || 'Failed to mark as paid');
    } finally {
      setActioning(null);
    }
  };

  const [resending, setResending] = useState<string | null>(null);
  const [syncingTeams, setSyncingTeams] = useState(false);

  const resendAccountTickets = async (r: any) => {
    const regId = r.id || r._id;
    if (!regId) return;
    const isTeam = r.registration_type === 'team';
    const ok = await confirm({
      title: 'Resend Account Credentials & Tickets?',
      message: `This will provision Student Alumni accounts for ${isTeam ? 'all team members (' + (r.team_size || 1) + ' members)' : r.full_name}, generate unique QR entry passes, and email login credentials and passes.`,
      confirmText: 'Resend & Issue Passes',
    });
    if (!ok) return;
    setResending(regId);
    try {
      const res = await api.adminEchoResendAccountTickets(regId);
      flash(res?.message || 'Accounts and tickets successfully sent!');
      await load();
      if (detailRow && (detailRow.id === regId || detailRow._id === regId)) {
        setDetailRow((prev: any) => ({ ...prev, has_account: true, ticket_issued: true }));
      }
    } catch (err: any) {
      flash(err?.message || 'Failed to resend accounts and tickets');
    } finally {
      setResending(null);
    }
  };

  const syncAllTeams = async () => {
    const ok = await confirm({
      title: 'Sync & Resend All Team Accounts & Passes?',
      message: 'This will scan all paid/registered team registrations, ensure every team member has an SA Student account, generate individual QR tickets, and email login credentials and entry passes.',
      confirmText: 'Sync All Teams',
    });
    if (!ok) return;
    setSyncingTeams(true);
    try {
      const res = await api.adminEchoSyncTeams();
      flash(`Successfully fulfilled ${res?.total_members_synced || 0} team members across ${res?.teams_processed || 0} teams!`);
      await load();
    } catch (err: any) {
      flash(err?.message || 'Failed to sync teams');
    } finally {
      setSyncingTeams(false);
    }
  };

  const [broadcastSummary, setBroadcastSummary] = useState<any>(null);
  const [broadcastModal, setBroadcastModal] = useState<any>(null);
  const [broadcasting, setBroadcasting] = useState(false);

  const loadBroadcastSummary = async () => {
    try {
      const summary = await api.adminEchoBroadcastSummary(eventSlug === 'all' ? undefined : eventSlug);
      setBroadcastSummary(summary);
    } catch (_) {}
  };

  useEffect(() => {
    loadBroadcastSummary();
  }, [eventSlug]);

  const openBroadcast = (targetGroup: 'pending_unpaid' | 'confirmed_paid' | 'unregistered_students') => {
    const selectedEvent = uniqueEvents.find((e: any) => e.slug === eventSlug);
    const eventName = selectedEvent?.title || 'SNIST HackWave 3.0';
    let defaultSubj = '';
    if (targetGroup === 'pending_unpaid') {
      defaultSubj = `Action Required: Complete your payment & pass for ${eventName}`;
    } else if (targetGroup === 'confirmed_paid') {
      defaultSubj = `Important Event Notice & Schedule Updates — ${eventName}`;
    } else {
      defaultSubj = `🚀 Invitation: Register your team for ${eventName}`;
    }
    setBroadcastModal({
      target_group: targetGroup,
      subject: defaultSubj,
      custom_message: '',
      slug: eventSlug === 'all' ? undefined : eventSlug,
    });
  };

  const submitBroadcast = async () => {
    if (!broadcastModal) return;
    setBroadcasting(true);
    try {
      const res = await api.adminEchoBroadcastSend(broadcastModal);
      flash(res?.message || `Successfully sent broadcast!`);
      setBroadcastModal(null);
      await load();
      await loadBroadcastSummary();
    } catch (err: any) {
      flash(err?.message || 'Failed to send broadcast');
    } finally {
      setBroadcasting(false);
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
  const realPayments = paid.filter((r) => Number(r.fee || 0) > 0 && !(r.payment_id || '').startsWith('ADMIN_PAY_'));
  // Deduplicate team payments: each team member has the full team fee,
  // but Razorpay only captures once per payment_id
  const seenPids = new Set<string>();
  const dedupedPayments = realPayments.filter((r) => {
    const pid = r.payment_id || '';
    if (seenPids.has(pid)) return false;
    seenPids.add(pid);
    return true;
  });
  const pending = filtered.filter((r) => r.payment_status === 'pending');
  const failed = filtered.filter((r) => r.payment_status === 'failed');
  const revenueTotal = dedupedPayments.reduce((a, r) => a + Number(r.fee || 0), 0);

  return (
    <View>
      {/* Revenue KPIs */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <KpiTile Icon={Users} label="Total Registrations" value={String(filtered.length)} />
        <KpiTile Icon={Check} label="Paid" value={String(paid.length)} />
        <KpiTile Icon={Clock} label="Pending" value={String(pending.length)} />
        <KpiTile Icon={XCircle} label="Failed" value={String(failed.length)} />
        <KpiTile Icon={Zap} label="Revenue (filtered)" value={fmtAmt(revenueTotal)} delta="real-time" deltaKind="success" />
        <Pressable onPress={loadAudit} disabled={auditLoading} style={{
          flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1E40AF',
          borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, cursor: 'pointer',
          opacity: auditLoading ? 0.6 : 1,
        }}>
          {auditLoading ? <ActivityIndicator size="small" color="#fff" /> : <Search size={14} color="#fff" />}
          <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: '#fff' }}>{auditLoading ? 'Loading…' : 'Revenue Audit'}</Text>
        </Pressable>
        <Pressable onPress={() => window.open('/echo/admin/scan', '_blank')} style={{
          flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#7C3AED',
          borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, cursor: 'pointer',
        }}>
          <ScanLine size={14} color="#fff" />
          <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: '#fff' }}>Scan Coupons</Text>
        </Pressable>
        <Pressable
          onPress={syncAllTeams}
          disabled={syncingTeams}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            backgroundColor: syncingTeams ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.15)',
            borderWidth: 1, borderColor: 'rgba(52,211,153,0.35)',
            borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} color="#34D399" />
          <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: '#34D399' }}>
            {syncingTeams ? 'Syncing...' : 'Sync & Resend Team Passes'}
          </Text>
        </Pressable>
      </View>

      {/* Segmented Audience Broadcasts & Notices */}
      <Card style={{ marginBottom: 18, backgroundColor: 'rgba(15,23,42,0.65)', borderColor: 'rgba(255,255,255,0.08)' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <View>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: '#fff' }}>Targeted Broadcasts &amp; Notices</Text>
            <Text style={{ fontFamily: FONTS.reg, fontSize: 12, color: SAC.muted, marginTop: 2 }}>
              Differentiate communication between unpaid cart registrants, confirmed attendees, and platform students
            </Text>
          </View>
          <StatusPill kind="info" label="Multi-Channel Notifications" />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {/* Card 1: Unpaid / Pending Recovery */}
          <View style={{
            flex: 1, minWidth: 260,
            backgroundColor: 'rgba(245,158,11,0.05)',
            borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)',
            borderRadius: 12, padding: 14, justifyContent: 'space-between', gap: 12,
          }}>
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 13.5, color: '#FCD34D' }}>Unpaid Registrants</Text>
                <View style={{ backgroundColor: 'rgba(245,158,11,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontFamily: FONTS.xbold, fontSize: 11, color: '#FBBF24' }}>
                    {broadcastSummary?.pending_unpaid ?? pending.length} Pending
                  </Text>
                </View>
              </View>
              <Text style={{ fontFamily: FONTS.reg, fontSize: 11.5, color: 'rgba(255,255,255,0.65)', lineHeight: 16 }}>
                Users with Student Alumni accounts whose registration payment is incomplete. Sends direct payment resume link &amp; event handbook.
              </Text>
            </View>
            <Pressable
              onPress={() => openBroadcast('pending_unpaid')}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                backgroundColor: '#D97706', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, cursor: 'pointer',
              }}
            >
              <Send size={13} color="#fff" />
              <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: '#fff' }}>Send Payment Recovery Notice</Text>
            </Pressable>
          </View>

          {/* Card 2: Confirmed Attendees */}
          <View style={{
            flex: 1, minWidth: 260,
            backgroundColor: 'rgba(16,185,129,0.05)',
            borderWidth: 1, borderColor: 'rgba(52,211,153,0.25)',
            borderRadius: 12, padding: 14, justifyContent: 'space-between', gap: 12,
          }}>
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 13.5, color: '#6EE7B7' }}>Confirmed Attendees</Text>
                <View style={{ backgroundColor: 'rgba(16,185,129,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontFamily: FONTS.xbold, fontSize: 11, color: '#34D399' }}>
                    {broadcastSummary?.confirmed_paid ?? paid.length} Confirmed
                  </Text>
                </View>
              </View>
              <Text style={{ fontFamily: FONTS.reg, fontSize: 11.5, color: 'rgba(255,255,255,0.65)', lineHeight: 16 }}>
                Attendees and teammates with active QR entry passes. Sends official timetable, track rules, meal pass guide &amp; handbook.
              </Text>
            </View>
            <Pressable
              onPress={() => openBroadcast('confirmed_paid')}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                backgroundColor: '#059669', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, cursor: 'pointer',
              }}
            >
              <Mail size={13} color="#fff" />
              <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: '#fff' }}>Send Event Notice &amp; Updates</Text>
            </Pressable>
          </View>

          {/* Card 3: Platform Students */}
          <View style={{
            flex: 1, minWidth: 260,
            backgroundColor: 'rgba(99,102,241,0.05)',
            borderWidth: 1, borderColor: 'rgba(129,140,248,0.25)',
            borderRadius: 12, padding: 14, justifyContent: 'space-between', gap: 12,
          }}>
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 13.5, color: '#A5B4FC' }}>Platform Students</Text>
                <View style={{ backgroundColor: 'rgba(99,102,241,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontFamily: FONTS.xbold, fontSize: 11, color: '#818CF8' }}>
                    {broadcastSummary?.unregistered_students ?? 0} Unregistered
                  </Text>
                </View>
              </View>
              <Text style={{ fontFamily: FONTS.reg, fontSize: 11.5, color: 'rgba(255,255,255,0.65)', lineHeight: 16 }}>
                Active Student Alumni members who have not registered for this event yet. Sends invitation newsletter with direct register link.
              </Text>
            </View>
            <Pressable
              onPress={() => openBroadcast('unregistered_students')}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                backgroundColor: '#6366F1', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, cursor: 'pointer',
              }}
            >
              <Zap size={13} color="#fff" />
              <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: '#fff' }}>Send Event Invitation</Text>
            </Pressable>
          </View>
        </View>
      </Card>

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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
            <View style={{ minWidth: 1050, flex: 1 }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderBottomWidth: 1, borderBottomColor: SAC.border }}>
                <Text style={{ flex: 1.5, minWidth: 180, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>ATTENDEE</Text>
                <Text style={{ width: 70, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>TYPE</Text>
                <Text style={{ width: 50, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>SIZE</Text>
                <Text style={{ flex: 1.5, minWidth: 180, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>EVENT</Text>
                <Text style={{ width: 120, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>AMOUNT</Text>
                <Text style={{ width: 120, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>PAYMENT</Text>
                <Text style={{ width: 120, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>STATUS</Text>
                <Text style={{ width: 120, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>DATE</Text>
                <Text style={{ width: 80, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5, textAlign: 'center' }}>ACTIONS</Text>
              </View>
              {paged.map((r: any, i: number) => {
                const isTeam = r.registration_type === 'team' || !!r.team_name || (r.team_size && r.team_size > 1);
                return (
                <View key={r.id || i} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                  <View style={{ flex: 1.5, minWidth: 180 }}>
                    <Text numberOfLines={1} style={{ fontFamily: FONTS.bold, fontSize: 12.5, color: '#fff' }}>{r.full_name || '—'}</Text>
                    <Text numberOfLines={1} style={{ fontFamily: FONTS.med, fontSize: 10.5, color: SAC.dim }}>{r.email || r.phone || ''}</Text>
                    {isTeam && (
                      <View style={{ marginTop: 6, gap: 4 }}>
                        {r.team_name && (
                          <Text numberOfLines={1} style={{ fontFamily: FONTS.bold, fontSize: 10, color: '#C4B5FD' }}>
                            Team: {r.team_name}
                          </Text>
                        )}
                        {(r.team_members?.length || 0) > 0 && r.team_members.slice(0, 2).map((member: any, idx: number) => (
                          <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: 'rgba(167,139,250,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ fontFamily: FONTS.xbold, fontSize: 7, color: '#C4B5FD' }}>{idx + 2}</Text>
                            </View>
                            <Text numberOfLines={1} style={{ fontFamily: FONTS.med, fontSize: 9, color: SAC.dim, flex: 1 }}>
                              {member.name || member.email || '—'}
                            </Text>
                          </View>
                        ))}
                        {(r.team_members?.length || 0) > 2 && (
                          <Text style={{ fontFamily: FONTS.med, fontSize: 8, color: SAC.dim }}>
                            +{r.team_members.length - 2} more
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                  <View style={{ width: 70 }}>
                    <View style={{ 
                      backgroundColor: isTeam ? 'rgba(124,58,237,0.15)' : 'rgba(52,211,153,0.15)',
                      paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
                      borderWidth: 1, borderColor: isTeam ? 'rgba(124,58,237,0.3)' : 'rgba(52,211,153,0.3)',
                      alignSelf: 'flex-start', alignItems: 'center'
                    }}>
                      <Text style={{ fontFamily: FONTS.xbold, fontSize: 9, color: isTeam ? '#C4B5FD' : '#6EE7B7' }}>
                        {isTeam ? 'TEAM' : 'IND'}
                      </Text>
                    </View>
                  </View>
                  <View style={{ width: 50, paddingTop: 4 }}>
                    <Text style={{ fontFamily: FONTS.xbold, fontSize: 11, color: '#e5e7eb' }}>
                      {isTeam ? (r.team_size > 1 ? r.team_size : 1) : 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1.5, minWidth: 180 }}>
                    <Text numberOfLines={1} style={{ fontFamily: FONTS.med, fontSize: 12, color: '#e5e7eb' }}>{r.event_title || r.slug || '—'}</Text>
                    <Text numberOfLines={1} style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.dim }}>{r.college || ''}</Text>
                  </View>
                  <View style={{ width: 120, minWidth: 0, paddingTop: 2 }}>
                    {r.is_team_member ? (
                      <View>
                        <Text style={{ fontFamily: FONTS.xbold, fontSize: 11.5, color: '#C4B5FD' }}>
                          Team Pass
                        </Text>
                        <Text numberOfLines={1} style={{ fontFamily: FONTS.med, fontSize: 9, color: SAC.dim, marginTop: 1 }}>
                          {r.team_leader_name ? `Paid by ${r.team_leader_name.split(' ')[0]}` : 'Covered in Team'}
                        </Text>
                      </View>
                    ) : (
                      <View>
                        <Text style={{ fontFamily: FONTS.xbold, fontSize: 12, color: '#fff' }}>
                          {Number(r.fee || 0) > 0 ? `₹${Number(r.fee).toLocaleString('en-IN')}` : 'FREE'}
                        </Text>
                        {isTeam && (r.team_size > 1 || (r.team_members?.length || 0) > 0) && (
                          <Text style={{ fontFamily: FONTS.med, fontSize: 9.5, color: '#A78BFA', marginTop: 1 }}>
                            {(r.team_size || (r.team_members?.length + 1))} Passes
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                  <View style={{ width: 120, minWidth: 0 }}>
                    <StatusPill
                      kind={r.payment_status === 'paid' ? 'success' : r.payment_status === 'pending' ? 'warn' : r.payment_status === 'failed' ? 'danger' : 'neutral'}
                      label={(r.payment_status || '—').toUpperCase()}
                    />
                  </View>
                  <View style={{ width: 120, minWidth: 0 }}>
                    {r.payment_status === 'paid' ? (
                      <>
                        <Text style={{ fontFamily: FONTS.xbold, fontSize: 10, color: '#86EFAC' }}>
                          {r.coupons_issued > 0 ? `Ticket +${r.coupons_issued}` : 'Ticket'}
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
                      <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: '#FCA5A5' }}>
                        Not issued
                      </Text>
                    )}
                  </View>
                  <View style={{ width: 120, minWidth: 0 }}>
                    <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.dim }}>
                      {(r.registered_at || '').slice(0, 10) || '—'}
                    </Text>
                  </View>
                  <View style={{ width: 110, flexDirection: 'row', gap: 4, justifyContent: 'center' }}>
                    <IconAction icon={<Eye size={14} color="#818CF8" />} label="View" color="#818CF8" onPress={() => setDetailRow(r)} />
                    {(r.payment_status === 'paid' || Number(r.fee || 0) === 0) && (
                      <IconAction
                        icon={<Send size={14} color="#A78BFA" />}
                        label="Resend Account & Pass"
                        color="#A78BFA"
                        bg="rgba(124,58,237,0.15)"
                        onPress={() => resendAccountTickets(r)}
                        disabled={resending === (r.id || r._id)}
                      />
                    )}
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
                    {r.payment_status === 'failed' && (
                      <IconAction
                        icon={<CheckCircle size={14} color="#86EFAC" />}
                        label="Mark paid"
                        color="#86EFAC"
                        bg="rgba(34,197,94,0.15)"
                        onPress={() => markPaid(r)}
                        disabled={actioning === r.id}
                      />
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
                );
              })}
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
              width: '100%', maxWidth: 680,
              backgroundColor: '#141A2D',
              borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)',
              borderRadius: 16,
              shadowColor: '#000', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.55, shadowRadius: 30,
              elevation: 12,
              maxHeight: '85vh',
            }}>
              {/* Fixed Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: SAC.text }}>Registration Details</Text>
                  {detailRow.registration_type === 'team' && (
                    <View style={{ backgroundColor: 'rgba(124,58,237,0.25)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                      <Text style={{ fontFamily: FONTS.xbold, fontSize: 10, color: '#C4B5FD' }}>TEAM</Text>
                    </View>
                  )}
                </View>
                <Pressable onPress={() => setDetailRow(null)} style={{ padding: 4 }}><X size={18} color={SAC.muted} /></Pressable>
              </View>

              {/* Scrollable Content */}
              <ScrollView style={{ maxHeight: '60vh' }} contentContainerStyle={{ padding: 20, gap: 16 }}>
              {/* 2-Column Grid Layout */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {[
                  { label: 'Name', value: detailRow.full_name, col: true },
                  { label: 'Email', value: detailRow.email, col: true },
                  { label: 'Phone', value: detailRow.phone, col: true },
                  { label: 'College', value: detailRow.college, col: true },
                  { label: 'Branch', value: detailRow.branch, col: false },
                  { label: 'Year', value: detailRow.year, col: false },
                  { label: 'Event', value: detailRow.event_title || detailRow.slug, col: true },
                  { label: 'Fee', value: Number(detailRow.fee || 0) > 0 ? `₹${Number(detailRow.fee).toLocaleString('en-IN')}` : 'FREE', col: false },
                  { label: 'Payment Status', value: (detailRow.payment_status || '—').toUpperCase(), col: false },
                  { label: 'Payment ID', value: detailRow.payment_id, col: true },
                  { label: 'Team Name', value: detailRow.team_name, col: detailRow.registration_type === 'team' },
                  { label: 'Team Size', value: detailRow.team_size > 1 ? `${detailRow.team_size} members` : null, col: detailRow.registration_type === 'team' },
                  { label: 'Ticket / Pass', value: detailRow.ticket_issued ? 'Issued — QR pass generated' : 'Not issued', col: true },
                  { label: 'Invoice', value: detailRow.invoice_issued ? (detailRow.invoice_no || 'Issued') : 'Not issued', col: true },
                  { label: 'SA Account', value: detailRow.has_account ? 'Yes' : 'No', col: false },
                  { label: 'Checked In', value: detailRow.checked_in_at ? new Date(detailRow.checked_in_at).toLocaleString() : 'No', col: false },
                  { label: 'Registered', value: detailRow.registered_at ? new Date(detailRow.registered_at).toLocaleString() : '—', col: true },
                  { label: 'Reminder Sent', value: detailRow.reminder_sent_at ? new Date(detailRow.reminder_sent_at).toLocaleString() : null, col: true },
                ].filter(item => item.value).map((item) => (
                  <View key={item.label} style={{ 
                    width: item.col ? '100%' : '48%', 
                    minWidth: item.col ? '100%' : 140,
                    backgroundColor: 'rgba(255,255,255,0.03)', 
                    borderRadius: 8, 
                    padding: 10,
                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
                  }}>
                    <Text style={{ fontFamily: FONTS.semi, fontSize: 10, color: SAC.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{item.label}</Text>
                    <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.text }}>{item.value || '—'}</Text>
                  </View>
                ))}
              </View>

                            {/* Team Members (if team registration) */}
              {detailRow.registration_type === 'team' && (
                <View style={{ backgroundColor: 'rgba(124,58,237,0.08)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)', gap: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontFamily: FONTS.bold, fontSize: 13.5, color: '#fff' }}>
                          Team: {detailRow.team_name || 'Team Registration'}
                        </Text>
                        <View style={{ backgroundColor: 'rgba(124,58,237,0.3)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ fontFamily: FONTS.xbold, fontSize: 10, color: '#DDD6FE' }}>
                            {((detailRow.team_members?.length || 0) + 1)} Passes Total
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: '#C4B5FD', marginTop: 2 }}>
                        1 Captain Pass ({detailRow.full_name}) + {(detailRow.team_members || []).length} Teammate Passes · {fmtAmt(detailRow.fee)} Paid
                      </Text>
                    </View>
                    {!editingTeamReg ? (
                      <Pressable onPress={() => handleEditTeam(detailRow)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(124,58,237,0.2)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.4)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }}>
                        <Pencil size={12} color="#C4B5FD" />
                        <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: '#C4B5FD' }}>Edit Members</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  
                  {!editingTeamReg ? (
                    <View style={{ gap: 8 }}>
                      {(detailRow.team_members || []).map((member: any, idx: number) => {
                        const memberRegId = member.reg_id || `${detailRow.id || detailRow._id}_M${idx + 1}`;
                        const saId = member.sa_unique_id || `SA-STU-${(member.email || '').split('@')[0]}`;
                        return (
                          <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
                            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(124,58,237,0.3)', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                              <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: '#C4B5FD' }}>{idx + 2}</Text>
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                                <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: '#fff' }} numberOfLines={1}>
                                  {member.name || `Team Member ${idx + 2}`}
                                </Text>
                                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                                  <View style={{ backgroundColor: 'rgba(52,211,153,0.15)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, borderWidth: 1, borderColor: 'rgba(52,211,153,0.3)' }}>
                                    <Text style={{ fontFamily: FONTS.bold, fontSize: 9.5, color: '#34D399' }}>Account Active</Text>
                                  </View>
                                  <View style={{ backgroundColor: 'rgba(124,58,237,0.2)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)' }}>
                                    <Text style={{ fontFamily: FONTS.bold, fontSize: 9.5, color: '#C4B5FD' }}>Pass Active</Text>
                                  </View>
                                </View>
                              </View>
                              <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.dim, marginTop: 2 }}>
                                {member.email || '—'} {member.phone ? `• ${member.phone}` : ''}
                              </Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                                <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: '#94A3B8' }}>
                                  SA ID: <Text style={{ color: '#E2E8F0', fontFamily: FONTS.bold }}>{saId}</Text>
                                </Text>
                                <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: '#94A3B8' }}>
                                  Pass ID: <Text style={{ color: '#E2E8F0', fontFamily: FONTS.bold }}>{memberRegId}</Text>
                                </Text>
                                <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: '#34D399' }}>
                                  • Covered under Team Pass
                                </Text>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={{ gap: 12 }}>
                      <View style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
                        <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: '#F59E0B', marginBottom: 8 }}>Team Name</Text>
                        <TextInput
                          style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: SAC.text, padding: 10, borderRadius: 6, fontFamily: FONTS.med, fontSize: 12 }}
                          placeholder="Enter team name"
                          placeholderTextColor="rgba(255,255,255,0.3)"
                          value={editTeamName}
                          onChangeText={setEditTeamName}
                        />
                      </View>
                      
                      {editTeamMembers.map((m, idx) => (
                        <View key={idx} style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
                          <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: '#C4B5FD', marginBottom: 8 }}>Team Member {idx + 2}</Text>
                          <TextInput
                            style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: SAC.text, padding: 10, borderRadius: 6, fontFamily: FONTS.med, fontSize: 12, marginBottom: 8 }}
                            placeholder="Full Name"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            value={m.name}
                            onChangeText={(val) => {
                              const updated = [...editTeamMembers];
                              updated[idx].name = val;
                              setEditTeamMembers(updated);
                            }}
                          />
                          <TextInput
                            style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: SAC.text, padding: 10, borderRadius: 6, fontFamily: FONTS.med, fontSize: 12, marginBottom: 8 }}
                            placeholder="Email Address"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            autoCapitalize="none"
                            value={m.email}
                            onChangeText={(val) => {
                              const updated = [...editTeamMembers];
                              updated[idx].email = val;
                              setEditTeamMembers(updated);
                            }}
                          />
                          <TextInput
                            style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: SAC.text, padding: 10, borderRadius: 6, fontFamily: FONTS.med, fontSize: 12 }}
                            placeholder="Phone (Optional)"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            keyboardType="numeric"
                            value={m.phone}
                            onChangeText={(val) => {
                              const updated = [...editTeamMembers];
                              updated[idx].phone = val;
                              setEditTeamMembers(updated);
                            }}
                          />
                        </View>
                      ))}
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                        <Pressable onPress={() => setEditingTeamReg(null)} style={{ flex: 1, padding: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 6, alignItems: 'center' }}>
                          <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: SAC.dim }}>Cancel</Text>
                        </Pressable>
                        <Pressable onPress={() => {
                          saveTeamMembers().then(() => {
                            setDetailRow(prev => ({ ...prev, team_members: editTeamMembers, team_name: editTeamName }));
                          });
                        }} style={{ flex: 1, padding: 10, backgroundColor: '#7C3AED', borderRadius: 6, alignItems: 'center' }}>
                          {actioning === editingTeamReg?.id ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: '#fff' }}>Save</Text>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Session Coupons */}
              {(detailRow.coupons || []).length > 0 && (
                <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                    <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: SAC.text }}>Session Coupons</Text>
                    <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.dim }}>{detailRow.coupons.length} issued</Text>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {(detailRow.coupons || []).map((c: any, ci: number) => (
                      <View key={ci} style={{
                        flexDirection: 'row', alignItems: 'center', gap: 8,
                        backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 7,
                        paddingHorizontal: 10, paddingVertical: 8,
                        borderWidth: 1, borderColor: c.used ? 'rgba(16,185,129,0.30)' : 'rgba(167,139,250,0.25)',
                        minWidth: 140,
                      }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: SAC.text }}>
                            {c.session_name || c.session_key}
                          </Text>
                          <Text style={{ fontFamily: FONTS.med, fontSize: 9, color: SAC.dim }}>
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
                </View>
              )}
              </ScrollView>

              {/* Fixed Footer */}
              <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                {(detailRow.payment_status === 'paid' || Number(detailRow.fee || 0) === 0) ? (
                  <Pressable
                    onPress={() => resendAccountTickets(detailRow)}
                    disabled={resending === (detailRow.id || detailRow._id)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      backgroundColor: 'rgba(124,58,237,0.2)', borderWidth: 1, borderColor: '#7C3AED',
                      borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
                      opacity: resending === (detailRow.id || detailRow._id) ? 0.6 : 1,
                    }}
                  >
                    <Send size={13} color="#C4B5FD" />
                    <Text style={{ fontFamily: FONTS.bold, fontSize: 11.5, color: '#DDD6FE' }}>
                      {resending === (detailRow.id || detailRow._id) ? 'Sending...' : 'Resend Accounts & Reissue Tickets'}
                    </Text>
                  </Pressable>
                ) : <View />}
                <GradientButton onPress={() => setDetailRow(null)} size="sm">
                  <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12 }}>Close</Text>
                </GradientButton>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Broadcast / Notice Modal */}
      {broadcastModal && (
        <Modal visible={true} transparent animationType="fade" onRequestClose={() => setBroadcastModal(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{
              width: '100%', maxWidth: 620,
              backgroundColor: '#141A2D',
              borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)',
              borderRadius: 16,
              shadowColor: '#000', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.6, shadowRadius: 32,
              elevation: 12, overflow: 'hidden',
            }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: '#fff' }}>
                    {broadcastModal.target_group === 'pending_unpaid' && 'Send Payment Recovery Notice'}
                    {broadcastModal.target_group === 'confirmed_paid' && 'Send Attendee Notice & Handbook'}
                    {broadcastModal.target_group === 'unregistered_students' && 'Send Event Invitation Newsletter'}
                  </Text>
                </View>
                <Pressable onPress={() => setBroadcastModal(null)} style={{ padding: 4 }}><X size={18} color={SAC.muted} /></Pressable>
              </View>

              {/* Body */}
              <ScrollView style={{ padding: 20, maxHeight: '65vh' }} contentContainerStyle={{ gap: 14 }}>
                {/* Target Audience Pill */}
                <View style={{ padding: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
                  <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted }}>Target Segment</Text>
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 13.5, color: '#E2E8F0', marginTop: 2 }}>
                    {broadcastModal.target_group === 'pending_unpaid' && `Pending Unpaid Registrants (${broadcastSummary?.pending_unpaid ?? pending.length} users)`}
                    {broadcastModal.target_group === 'confirmed_paid' && `Confirmed Active Attendees (${broadcastSummary?.confirmed_paid ?? paid.length} users)`}
                    {broadcastModal.target_group === 'unregistered_students' && `Platform Students (${broadcastSummary?.unregistered_students ?? 0} users)`}
                  </Text>
                </View>

                {/* Email Subject */}
                <View>
                  <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted, marginBottom: 6 }}>Email Subject Line</Text>
                  <TextInput
                    value={broadcastModal.subject}
                    onChangeText={(t) => setBroadcastModal((prev: any) => ({ ...prev, subject: t }))}
                    placeholder="Enter email subject..."
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
                      borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
                      color: '#fff', fontSize: 13.5, fontFamily: FONTS.reg,
                    }}
                  />
                </View>

                {/* Custom Message Body */}
                <View>
                  <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted, marginBottom: 6 }}>
                    Custom Announcement / Note <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>(Optional)</Text>
                  </Text>
                  <TextInput
                    value={broadcastModal.custom_message}
                    onChangeText={(t) => setBroadcastModal((prev: any) => ({ ...prev, custom_message: t }))}
                    placeholder="Add an optional message or highlight for recipients..."
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    multiline
                    numberOfLines={4}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
                      borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
                      color: '#fff', fontSize: 13, fontFamily: FONTS.reg, minHeight: 90, textAlignVertical: 'top',
                    }}
                  />
                </View>

                {/* Included Assets info */}
                <View style={{ padding: 12, backgroundColor: 'rgba(124,58,237,0.08)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(124,58,237,0.2)' }}>
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: '#C4B5FD' }}>✓ Automatic Attachments &amp; Links Included:</Text>
                  <Text style={{ fontFamily: FONTS.reg, fontSize: 11.5, color: '#DDD6FE', marginTop: 4, lineHeight: 16 }}>
                    • Attached PDF: <strong style={{ color: '#fff' }}>HackWave_3.0_Event_Handbook.pdf</strong><br/>
                    • Personalized pass registration / checkout / ticket links<br/>
                    • Real-time payment verification and QR entry credentials
                  </Text>
                </View>
              </ScrollView>

              {/* Footer */}
              <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
                <SecondaryButton onPress={() => setBroadcastModal(null)} size="sm">
                  <Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>Cancel</Text>
                </SecondaryButton>
                <GradientButton
                  onPress={submitBroadcast}
                  disabled={broadcasting}
                  size="sm"
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Send size={13} color="#fff" />
                    <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12 }}>
                      {broadcasting ? 'Sending Broadcast...' : 'Send Broadcast'}
                    </Text>
                  </View>
                </GradientButton>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Revenue Audit Modal */}
      <Modal visible={showAudit} transparent animationType="fade" onRequestClose={() => setShowAudit(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#1a1a2e', borderRadius: 16, padding: 18, maxWidth: 960, width: '100%', alignSelf: 'center', maxHeight: '90vh' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontFamily: FONTS.xbold, fontSize: 16, color: '#fff' }}>Revenue Audit — DB vs Razorpay</Text>
              <Pressable onPress={() => setShowAudit(false)} style={{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' }}>
                <X size={16} color="#fff" />
              </Pressable>
            </View>
            {auditData && (
              <>
                {/* Summary */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Total Registrations', value: String(auditData.summary?.total_registrations || 0), color: '#fff', filter: 'all' as const },
                    { label: 'DB Razorpay Total', value: fmtAmt(auditData.summary?.db_total_razorpay || 0), color: '#86EFAC', filter: 'paid' as const },
                    { label: 'Admin Overrides', value: fmtAmt(auditData.summary?.db_total_admin_override || 0), color: '#FBBF24', filter: 'admin' as const },
                    { label: 'Free Accounts', value: String(auditData.summary?.db_total_free || 0), color: '#C4B5FD', filter: 'free' as const },
                    { label: 'Pending', value: fmtAmt(auditData.summary?.db_total_pending || 0), color: '#F59E0B', filter: 'all' as const },
                    { label: 'Failed', value: fmtAmt(auditData.summary?.db_total_failed || 0), color: '#EF4444', filter: 'failed' as const },
                  ].map((t) => (
                    <Pressable key={t.label} onPress={() => setAuditFilter(t.filter)} style={{
                      flex: 1, minWidth: 100, backgroundColor: auditFilter === t.filter ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)',
                      borderRadius: 10, padding: 10, borderWidth: 1, borderColor: auditFilter === t.filter ? '#7C3AED' : 'rgba(255,255,255,0.08)',
                      cursor: 'pointer',
                    }}>
                      <Text style={{ color: SAC.muted, fontFamily: FONTS.semi, fontSize: 9, letterSpacing: 0.3 }}>{t.label}</Text>
                      <Text style={{ color: t.color, fontFamily: FONTS.xbold, fontSize: 14, marginTop: 3 }}>{t.value}</Text>
                    </Pressable>
                  ))}
                </View>

                {/* Team vs Individual breakdown */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                  <View style={{ flex: 1, backgroundColor: 'rgba(59,130,246,0.10)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(59,130,246,0.25)' }}>
                    <Text style={{ color: '#93C5FD', fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 0.5 }}>TEAMS</Text>
                    <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
                      <View>
                        <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 9 }}>Registrations</Text>
                        <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 18 }}>{auditData.summary?.teams?.count || 0}</Text>
                      </View>
                      <View>
                        <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 9 }}>Members</Text>
                        <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 18 }}>{auditData.summary?.teams?.members_total || 0}</Text>
                      </View>
                      <View>
                        <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 9 }}>Revenue</Text>
                        <Text style={{ color: '#86EFAC', fontFamily: FONTS.xbold, fontSize: 18 }}>{fmtAmt(auditData.summary?.teams?.revenue || 0)}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={{ flex: 1, backgroundColor: 'rgba(16,185,129,0.10)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)' }}>
                    <Text style={{ color: '#6EE7B7', fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 0.5 }}>INDIVIDUALS</Text>
                    <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
                      <View>
                        <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 9 }}>Registrations</Text>
                        <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 18 }}>{auditData.summary?.individuals?.count || 0}</Text>
                      </View>
                      <View>
                        <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 9 }}>Revenue</Text>
                        <Text style={{ color: '#86EFAC', fontFamily: FONTS.xbold, fontSize: 18 }}>{fmtAmt(auditData.summary?.individuals?.revenue || 0)}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Razorpay breakdown */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                  {[
                    { label: 'Razorpay Gross', value: fmtAmt(auditData.summary?.razorpay_gross || 0), color: '#C4B5FD' },
                    { label: 'Razorpay Fees', value: fmtAmt(auditData.summary?.razorpay_fees || 0), color: '#FCA5A5' },
                    { label: 'Razorpay Tax', value: fmtAmt(auditData.summary?.razorpay_tax || 0), color: '#FCA5A5' },
                    { label: 'Razorpay Settled', value: fmtAmt(auditData.summary?.razorpay_settled || 0), color: '#93C5FD' },
                    { label: 'Discrepancy', value: fmtAmt(auditData.summary?.discrepancy || 0), color: Math.abs(auditData.summary?.discrepancy || 0) > 100 ? '#F87171' : '#86EFAC' },
                  ].map((t) => (
                    <View key={t.label} style={{ flex: 1, minWidth: 110, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
                      <Text style={{ color: SAC.muted, fontFamily: FONTS.semi, fontSize: 9, letterSpacing: 0.3 }}>{t.label}</Text>
                      <Text style={{ color: t.color, fontFamily: FONTS.xbold, fontSize: 14, marginTop: 3 }}>{t.value}</Text>
                    </View>
                  ))}
                </View>

                {/* Total deduction from fetched RP fees */}
                {Object.keys(razorpayFees).length > 0 && (
                  <View style={{ flexDirection: 'row', gap: 16, marginBottom: 10, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' }}>
                    <Text style={{ color: '#FCA5A5', fontFamily: FONTS.xbold, fontSize: 10 }}>TOTAL DEDUCTIONS (per-transaction)</Text>
                    <Text style={{ color: '#FCA5A5', fontFamily: FONTS.med, fontSize: 10 }}>Fees: ₹{Object.values(razorpayFees).reduce((s, f) => s + (f.fee || 0), 0).toFixed(2)}</Text>
                    <Text style={{ color: '#FCA5A5', fontFamily: FONTS.med, fontSize: 10 }}>Tax: ₹{Object.values(razorpayFees).reduce((s, f) => s + (f.tax || 0), 0).toFixed(2)}</Text>
                    <Text style={{ color: '#EF4444', fontFamily: FONTS.xbold, fontSize: 10 }}>Total: ₹{(Object.values(razorpayFees).reduce((s, f) => s + (f.fee || 0) + (f.tax || 0), 0)).toFixed(2)}</Text>
                    <Text style={{ color: '#86EFAC', fontFamily: FONTS.med, fontSize: 10 }}>Net received: ₹{Object.values(razorpayFees).reduce((s, f) => s + (f.net || 0), 0).toFixed(2)}</Text>
                  </View>
                )}

                {/* Registration list with filters */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11 }}>REGISTRATIONS ({auditData.registrations?.length || 0})</Text>
                  <View style={{ flex: 1 }} />
                  <Pressable onPress={exportAuditCSV} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(34,197,94,0.15)', borderWidth: 1, borderColor: '#22C55E' }}>
                    <Text style={{ color: '#22C55E', fontFamily: FONTS.semi, fontSize: 9.5 }}>Export CSV</Text>
                  </Pressable>
                  {[
                    { key: 'all', label: 'All', count: auditData.registrations?.length || 0 },
                    { key: 'free', label: 'Free (₹0)', count: (auditData.registrations || []).filter((r: any) => r.fee <= 0 && r.status === 'paid' && !r.is_team_member && !r.is_admin_pay).length },
                    { key: 'admin', label: 'Admin Override', count: (auditData.registrations || []).filter((r: any) => r.is_admin_pay).length },
                    { key: 'paid', label: 'Paid', count: (auditData.registrations || []).filter((r: any) => r.status === 'paid' && r.fee > 0 && !r.is_admin_pay).length },
                    { key: 'team', label: 'Team Members', count: (auditData.registrations || []).filter((r: any) => r.is_team_member).length },
                    { key: 'pending', label: 'Pending', count: (auditData.registrations || []).filter((r: any) => r.status === 'pending').length },
                    { key: 'failed', label: 'Failed', count: (auditData.registrations || []).filter((r: any) => r.status === 'failed').length },
                  ].map((f) => (
                    <Pressable key={f.key} onPress={() => setAuditFilter(f.key as any)} style={{
                      paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
                      backgroundColor: auditFilter === f.key ? '#7C3AED' : 'rgba(255,255,255,0.06)',
                      borderWidth: 1, borderColor: auditFilter === f.key ? '#7C3AED' : 'rgba(255,255,255,0.1)',
                    }}>
                      <Text style={{ color: auditFilter === f.key ? '#fff' : SAC.muted, fontFamily: FONTS.semi, fontSize: 9.5 }}>
                        {f.label} ({f.count})
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {/* Per-event filter */}
                {auditData.registrations && (() => {
                  const slugs = [...new Set((auditData.registrations || []).map((r: any) => r.slug).filter(Boolean))] as string[];
                  if (slugs.length <= 1) return null;
                  return (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                      <Text style={{ color: SAC.muted, fontFamily: FONTS.semi, fontSize: 9 }}>Event:</Text>
                      <Pressable onPress={() => setAuditEventFilter('all')} style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, backgroundColor: auditEventFilter === 'all' ? '#3B82F6' : 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: auditEventFilter === 'all' ? '#3B82F6' : 'rgba(255,255,255,0.1)' }}>
                        <Text style={{ color: auditEventFilter === 'all' ? '#fff' : SAC.muted, fontFamily: FONTS.semi, fontSize: 8.5 }}>All</Text>
                      </Pressable>
                      {slugs.map((s) => (
                        <Pressable key={s} onPress={() => setAuditEventFilter(s)} style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, backgroundColor: auditEventFilter === s ? '#3B82F6' : 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: auditEventFilter === s ? '#3B82F6' : 'rgba(255,255,255,0.1)' }}>
                          <Text style={{ color: auditEventFilter === s ? '#fff' : SAC.muted, fontFamily: FONTS.semi, fontSize: 8.5 }}>{s}</Text>
                        </Pressable>
                      ))}
                    </View>
                  );
                })()}
                {/* Fetch Razorpay Fees button */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Pressable
                    onPress={async () => {
                      setFetchingFees(true);
                      try {
                        const pids = (auditData.registrations || [])
                          .map((r: any) => r.payment_id)
                          .filter((pid: string) => pid && !pid.startsWith('ADMIN_PAY_'));
                        const unique = [...new Set(pids)] as string[];
                        // Only fetch payment_ids not already in cache
                        const toFetch = unique.filter((pid: string) => !(pid in razorpayFees));
                        if (toFetch.length > 0) {
                          const res = await api.adminRazorpayPaymentFees(toFetch);
                          setRazorpayFees(prev => ({ ...prev, ...(res?.fees || {}) }));
                        }
                      } catch { /* ignore */ }
                      setFetchingFees(false);
                    }}
                    disabled={fetchingFees}
                    style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: fetchingFees ? 'rgba(255,255,255,0.06)' : 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: fetchingFees ? 'rgba(255,255,255,0.1)' : '#F59E0B' }}
                  >
                    <Text style={{ color: fetchingFees ? SAC.muted : '#F59E0B', fontFamily: FONTS.semi, fontSize: 9.5 }}>
                      {fetchingFees ? 'Fetching…' : Object.keys(razorpayFees).length > 0 ? `RP Fees Loaded (${Object.keys(razorpayFees).length})` : 'Fetch Razorpay Fees'}
                    </Text>
                  </Pressable>
                  {Object.keys(razorpayFees).length > 0 && (
                    <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 9 }}>
                      Total RP Fees: ₹{Object.values(razorpayFees).reduce((s, f) => s + (f.fee || 0), 0).toFixed(2)} · Tax: ₹{Object.values(razorpayFees).reduce((s, f) => s + (f.tax || 0), 0).toFixed(2)}
                    </Text>
                  )}
                </View>
                <ScrollView style={{ maxHeight: 360 }}>
                  {(auditData.registrations || []).filter((r: any) => {
                    if (auditEventFilter !== 'all' && r.slug !== auditEventFilter) return false;
                    if (auditFilter === 'all') return true;
                    if (auditFilter === 'free') return r.fee <= 0 && r.status === 'paid' && !r.is_team_member && !r.is_admin_pay;
                    if (auditFilter === 'admin') return r.is_admin_pay;
                    if (auditFilter === 'paid') return r.status === 'paid' && r.fee > 0 && !r.is_admin_pay;
                    if (auditFilter === 'team') return r.is_team_member;
                    if (auditFilter === 'pending') return r.status === 'pending';
                    if (auditFilter === 'failed') return r.status === 'failed';
                    return true;
                  }).map((r: any, i: number) => {
                    const rpFee = razorpayFees[r.payment_id];
                    const hasDiscrepancy = rpFee && !rpFee.error && r.fee > 0 && Math.abs(r.fee - rpFee.net) > 1;
                    return (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', gap: 6, backgroundColor: hasDiscrepancy ? 'rgba(239,68,68,0.08)' : undefined }}>
                      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: r.is_free ? '#C4B5FD' : r.is_admin_pay ? '#FBBF24' : r.status === 'paid' ? '#34D399' : r.status === 'pending' ? '#F59E0B' : '#EF4444' }} />
                      <View style={{ flex: 2, minWidth: 0 }}>
                        <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 10.5 }} numberOfLines={1}>{r.name}</Text>
                        <Text style={{ color: SAC.dim, fontFamily: FONTS.med, fontSize: 8 }} numberOfLines={1}>{r.email}</Text>
                      </View>
                      <Text style={{ width: 45, color: SAC.muted, fontFamily: FONTS.med, fontSize: 9 }} numberOfLines={1}>{r.reg_type}{r.team_size > 1 ? `(${r.team_size})` : ''}</Text>
                      <Text style={{ width: 50, color: r.fee > 0 ? '#86EFAC' : r.fee === 0 ? '#C4B5FD' : '#EF4444', fontFamily: FONTS.xbold, fontSize: 10 }}>₹{r.fee}</Text>
                      {razorpayFees[r.payment_id] && !razorpayFees[r.payment_id].error ? (
                        <Text style={{ width: 80, color: '#FCA5A5', fontFamily: FONTS.med, fontSize: 8.5 }} numberOfLines={1}>-₹{(razorpayFees[r.payment_id].fee || 0).toFixed(0)}f -₹{(razorpayFees[r.payment_id].tax || 0).toFixed(0)}t</Text>
                      ) : null}
                      {razorpayFees[r.payment_id] && !razorpayFees[r.payment_id].error ? (
                        <Text style={{ width: 55, color: '#86EFAC', fontFamily: FONTS.xbold, fontSize: 9.5 }}>₹{(razorpayFees[r.payment_id].net || 0).toFixed(0)}</Text>
                      ) : null}
                      <Text style={{ flex: 1, minWidth: 60, color: r.is_admin_pay ? '#FBBF24' : '#93C5FD', fontFamily: FONTS.med, fontSize: 8 }} numberOfLines={1}>{r.payment_id || '—'}</Text>
                      <Text style={{ width: 42, color: r.status === 'paid' ? '#34D399' : r.status === 'pending' ? '#FBBF24' : '#EF4444', fontFamily: FONTS.xbold, fontSize: 8, letterSpacing: 0.3 }}>{(r.status || '').slice(0, 4).toUpperCase()}</Text>
                    </View>
                    );
                  })}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      
    </View>
  );
}

// ── Volunteers Panel ──────────────────────────────────────────────────────────
function VolunteersPanel() {
  const { confirm } = useConfirm();
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
    const ok = await confirm({
      title: 'Remove volunteer',
      message: `Remove ${v.email} as ${v.role} for ${v.event_title || v.slug}?`,
      confirmText: 'Remove',
      danger: true,
    });
    if (!ok) return;
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
            <View style={{ minWidth: 760, flex: 1 }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderBottomWidth: 1, borderBottomColor: SAC.border }}>
                <Text style={{ flex: 1.5, minWidth: 200, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>VOLUNTEER</Text>
                <Text style={{ flex: 1.5, minWidth: 180, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>EVENT</Text>
                <Text style={{ width: 110, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>ROLE</Text>
                <Text style={{ width: 110, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>STATUS</Text>
                <Text style={{ width: 150, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>ADDED</Text>
                <Text style={{ width: 90, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5, textAlign: 'center' }}>ACTIONS</Text>
              </View>
              {filtered.map((v) => (
                <View key={v._id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                  <View style={{ flex: 1.5, minWidth: 200 }}>
                    <Text numberOfLines={1} style={{ fontFamily: FONTS.bold, fontSize: 12.5, color: '#fff' }}>{v.email}</Text>
                    <Text numberOfLines={1} style={{ fontFamily: FONTS.med, fontSize: 10.5, color: SAC.dim }}>{v.user_name || '—'}</Text>
                  </View>
                  <View style={{ flex: 1.5, minWidth: 180 }}>
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


// ── Main View ─────────────────────────────────────────────────────────────────
export function EchoShowcaseAdminView({ sub, onSub }: { sub?: string; onSub?: (s: string) => void }) {
  const [pageTab, setPageTab] = useSubTab<PageTab>(['all', 'create', 'drafts', 'registrations', 'volunteers', 'media'], 'all', { sub, onSub });
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
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;
  const { toast, flash, hide } = useToast();
  const { confirm } = useConfirm();
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

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, pageTab, items]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

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
    const ok = await confirm({
      title: 'Delete showcase',
      message: `Delete "${item.title}"? This cannot be undone.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
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
      <Toast text={toast.text} visible={toast.visible} kind={toast.kind} onDismiss={hide} />

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
            <>
              {paged.map((item) => (
                <ShowcaseCard key={item._id} item={item} onEdit={onEdit} onDelete={onDelete}
                  onPublish={onPublish} onDraft={onDraft} onArchive={onArchive} onPreview={onPreview} busy={busy} />
              ))}
              {/* Pagination */}
              {filtered.length > PER_PAGE && (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingVertical: 10, paddingHorizontal: 4,
                  borderTopWidth: 1, borderTopColor: SAC.border, flexWrap: 'wrap', gap: 10, marginTop: 6,
                }}>
                  <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.dim }}>
                    Showing {(safePage - 1) * PER_PAGE + 1}–{Math.min(safePage * PER_PAGE, filtered.length)} of {filtered.length}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <Pressable
                      onPress={() => setPage(safePage - 1)}
                      disabled={safePage === 1}
                      style={{
                        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7,
                        backgroundColor: safePage === 1 ? 'rgba(255,255,255,0.04)' : 'rgba(167,139,250,0.15)',
                        borderWidth: 1, borderColor: safePage === 1 ? SAC.border : 'rgba(167,139,250,0.3)',
                        opacity: safePage === 1 ? 0.4 : 1,
                      }}
                    >
                      <ChevronLeft size={14} color={SAC.text} />
                    </Pressable>
                    {Array.from({ length: totalPages }, (_, p) => p + 1).map((p) => {
                      if (totalPages > 7 && Math.abs(p - safePage) > 2 && p !== 1 && p !== totalPages) {
                        return null;
                      }
                      return (
                        <Pressable key={p} onPress={() => setPage(p)} style={{
                          minWidth: 30, alignItems: 'center', justifyContent: 'center',
                          paddingVertical: 6, borderRadius: 7,
                          backgroundColor: p === safePage ? '#7C3AED' : 'rgba(255,255,255,0.05)',
                          borderWidth: 1, borderColor: p === safePage ? '#7C3AED' : SAC.border,
                        }}>
                          <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: p === safePage ? '#fff' : SAC.text }}>{p}</Text>
                        </Pressable>
                      );
                    })}
                    <Pressable
                      onPress={() => setPage(safePage + 1)}
                      disabled={safePage >= totalPages}
                      style={{
                        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7,
                        backgroundColor: safePage >= totalPages ? 'rgba(255,255,255,0.04)' : 'rgba(167,139,250,0.15)',
                        borderWidth: 1, borderColor: safePage >= totalPages ? SAC.border : 'rgba(167,139,250,0.3)',
                        opacity: safePage >= totalPages ? 0.4 : 1,
                      }}
                    >
                      <ChevronRight size={14} color={SAC.text} />
                    </Pressable>
                  </View>
                </View>
              )}
            </>
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
