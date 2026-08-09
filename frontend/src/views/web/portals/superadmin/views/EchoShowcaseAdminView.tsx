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
  Image as ImageIcon, HardDrive, Calendar, Layout, ChevronUp, ChevronDown, Users,
} from 'lucide-react-native';
import {
  GRAD, GradientButton, SecondaryButton, Card,
  StatusPill, SearchField, KpiTile, useToast, Toast, TopTabs, IconBox,
} from '../applekit';
import { SAC, FONTS } from '../tokens';
import { api, resolveImageUrl } from '@/src/models/services/api';

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_PILL_MAP: Record<string, any> = {
  published: 'success', draft: 'warn', archived: 'neutral',
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

type PageTab = 'all' | 'create' | 'drafts' | 'media' | 'registrations';
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
      <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: SAC.muted, marginBottom: 5, letterSpacing: 0.4 }}>
        {label.toUpperCase()}
      </Text>
      {hint && (
        <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.dim, marginBottom: 5 }}>{hint}</Text>
      )}
      {children}
    </View>
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
        console.log('[CMS INSTANT PREVIEW]', { label, localPreview, fileName: file.name });
      } catch (e) {
        console.warn('Could not create local object URL for preview', e);
      }
    }

    setUploading(true);
    setProgress(`Uploading ${file.name}…`);
    onUploadStart?.();
    console.log('[CMS UPLOAD REQUEST]', { label, fileName: file.name, size: file.size, type: file.type });

    try {
      const fd = new FormData();
      fd.append('file', file, file.name);
      const res = await api.uploadEchoMedia(fd);
      console.log('[CMS UPLOAD RESPONSE]', res);

      if (res?.url) {
        onUpload(res.url);
        console.log('[CMS FORM STATE UPDATED]', { label, serverUrl: res.url });
        flash?.(`${label} uploaded ✓`);
      } else {
        throw new Error('Upload returned no URL');
      }
    } catch (err: any) {
      console.error('[CMS UPLOAD ERROR]', err);
      flash?.(`Upload failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
      setProgress('');
      onUploadEnd?.();
    }
  };

  const handleRemove = () => {
    console.log('[CMS REMOVE IMAGE]', { label, previousUrl: url });
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
            <Pressable onPress={() => move(i, i - 1)} style={[cs.iconBtn, { width: 26, height: 26 }]}><MoveUp size={11} color={SAC.muted} /></Pressable>
            <Pressable onPress={() => move(i, i + 1)} style={[cs.iconBtn, { width: 26, height: 26 }]}><MoveDown size={11} color={SAC.muted} /></Pressable>
          </View>
          <Pressable onPress={() => remove(i)} style={cs.iconBtn}><X size={12} color="#F87171" /></Pressable>
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
          <Pressable onPress={() => remove(i)} style={cs.iconBtn}><X size={12} color="#F87171" /></Pressable>
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
            <Pressable onPress={() => remove(i)} style={[cs.iconBtn, { borderColor: 'rgba(239,68,68,0.30)' }]}>
              <Trash2 size={13} color="#F87171" />
            </Pressable>
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
            <Pressable onPress={() => remove(i)} style={[cs.iconBtn, { borderColor: 'rgba(239,68,68,0.30)' }]}>
              <Trash2 size={13} color="#F87171" />
            </Pressable>
          </View>
          <TextInput value={dl.description || ''} onChangeText={(v) => update(i, 'description', v)}
            placeholder="Description" placeholderTextColor={SAC.dim} style={fi.input} />
          {/* File URL + upload */}
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TextInput value={dl.file_url || ''} onChangeText={(v) => update(i, 'file_url', v)}
              placeholder="File URL or paste link" placeholderTextColor={SAC.dim} style={[fi.input, { flex: 1 }]} />
            {Platform.OS === 'web' && (
              <label style={{ cursor: 'pointer' }}>
                <View style={[cs.iconBtn, { backgroundColor: 'rgba(123,61,191,0.15)', borderColor: 'rgba(123,61,191,0.40)' }]}>
                  <Upload size={13} color={GRAD.from} />
                </View>
                <input type="file" accept=".pdf,.docx,.xlsx,.pptx,.zip" style={{ display: 'none' }}
                  onChange={(e: any) => { const f = e.target.files?.[0]; if (f) handleFileUpload(i, f); }} />
              </label>
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
  const list = Array.isArray(posters) ? posters : [];
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

  return (
    <View style={{ gap: 10 }}>
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
              <Pressable onPress={() => move(i, -1)} disabled={i === 0} style={[cs.iconBtn, { opacity: i === 0 ? 0.35 : 1 }]}>
                <ChevronUp size={13} color="#CBD5E1" />
              </Pressable>
              <Pressable onPress={() => move(i, 1)} disabled={i === list.length - 1} style={[cs.iconBtn, { opacity: i === list.length - 1 ? 0.35 : 1 }]}>
                <ChevronDown size={13} color="#CBD5E1" />
              </Pressable>
              <Pressable onPress={() => remove(i)} style={[cs.iconBtn, { borderColor: 'rgba(239,68,68,0.30)' }]}>
                <Trash2 size={13} color="#F87171" />
              </Pressable>
            </View>
          </View>
          {url ? (
            <Text style={{ fontFamily: FONTS.med, fontSize: 10.5, color: SAC.muted }} numberOfLines={1}>
              🖼 {url}
            </Text>
          ) : null}
        </View>
      ))}
      <Pressable onPress={add}>
        <Text style={{ color: GRAD.from, fontFamily: FONTS.semi, fontSize: 12.5 }}>+ Add Poster Image</Text>
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
              <Pressable onPress={() => move(i, -1)} disabled={i === 0} style={[cs.iconBtn, { opacity: i === 0 ? 0.35 : 1 }]}>
                <ChevronUp size={13} color="#CBD5E1" />
              </Pressable>
              <Pressable onPress={() => move(i, 1)} disabled={i === list.length - 1} style={[cs.iconBtn, { opacity: i === list.length - 1 ? 0.35 : 1 }]}>
                <ChevronDown size={13} color="#CBD5E1" />
              </Pressable>
              <Pressable onPress={() => remove(i)} style={[cs.iconBtn, { borderColor: 'rgba(239,68,68,0.30)' }]}>
                <Trash2 size={13} color="#F87171" />
              </Pressable>
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
                <Pressable onPress={() => updateItem(i, 'featured', !item.featured)}
                  style={[cs.iconBtn, item.featured && { borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                  <Star size={14} color={item.featured ? '#F59E0B' : SAC.muted} fill={item.featured ? '#F59E0B' : 'transparent'} />
                </Pressable>
                {/* Hero marker */}
                <Pressable onPress={() => updateItem(i, 'hero', !item.hero)}
                  style={[cs.iconBtn, item.hero && { borderColor: GRAD.from, backgroundColor: 'rgba(123,61,191,0.15)' }]}>
                  <ImageIcon size={13} color={item.hero ? GRAD.from : SAC.muted} />
                </Pressable>
                {/* Order */}
                <View style={{ flexDirection: 'row', gap: 3 }}>
                  <Pressable onPress={() => moveItem(i, i - 1)} style={[cs.iconBtn, { width: 24, height: 24 }]}><MoveUp size={10} color={SAC.muted} /></Pressable>
                  <Pressable onPress={() => moveItem(i, i + 1)} style={[cs.iconBtn, { width: 24, height: 24 }]}><MoveDown size={10} color={SAC.muted} /></Pressable>
                </View>
                {/* Delete */}
                <Pressable onPress={() => removeItem(i)} style={[cs.iconBtn, { borderColor: 'rgba(239,68,68,0.30)' }]}>
                  <X size={13} color="#F87171" />
                </Pressable>
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
      const full = url.startsWith('http') ? url : `http://localhost:8000${url}`;
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
          <Pressable onPress={load} style={[cs.iconBtn, { width: 34, height: 34 }]}>
            <RefreshCw size={15} color={SAC.muted} />
          </Pressable>
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
                  <Pressable onPress={() => copyUrl(m.url)} style={cs.iconBtn}>
                    {copiedUrl === m.url ? <Check size={13} color="#34D399" /> : <Copy size={13} color={SAC.muted} />}
                  </Pressable>
                  <Pressable onPress={() => onDelete(m.filename)}
                    style={[cs.iconBtn, { borderColor: 'rgba(239,68,68,0.30)' }]}>
                    {deleting === m.filename ? <ActivityIndicator size={10} color="#F87171" /> : <Trash2 size={13} color="#F87171" />}
                  </Pressable>
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
            {item.date ? <Text style={cs.meta}>📅 {item.date}</Text> : null}
            {item.venue ? <Text style={cs.meta}>📍 {item.venue}</Text> : null}
            {item.category ? <Text style={cs.meta}>🏷 {item.category}</Text> : null}
            <Text style={cs.meta}>🔗 /{item.slug}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Pressable onPress={() => onPreview(item)} style={cs.iconBtn}><Eye size={14} color={SAC.muted} /></Pressable>
          <Pressable onPress={() => onEdit(item)} style={cs.iconBtn}><Pencil size={14} color={SAC.muted} /></Pressable>
          {item.status !== 'published' && (
            <Pressable onPress={() => onPublish(item)} style={[cs.iconBtn, { borderColor: 'rgba(16,185,129,0.35)' }]}>
              {busy === item._id ? <ActivityIndicator size={12} color={SAC.text} /> : <Send size={14} color="#34D399" />}
            </Pressable>
          )}
          {item.status === 'published' && (
            <Pressable onPress={() => onDraft(item)} style={cs.iconBtn}><Globe size={14} color={SAC.muted} /></Pressable>
          )}
          {item.status !== 'archived' && (
            <Pressable onPress={() => onArchive(item)} style={cs.iconBtn}><Archive size={14} color={SAC.muted} /></Pressable>
          )}
          <Pressable onPress={() => onDelete(item)} style={[cs.iconBtn, { borderColor: 'rgba(239,68,68,0.30)' }]}>
            <Trash2 size={14} color="#F87171" />
          </Pressable>
        </View>
      </View>
    </Card>
  );
}

// ── Empty showcase form ───────────────────────────────────────────────────────
const EMPTY: any = {
  title: '', slug: '', subtitle: '', description: '',
  date: '', time: '', venue: '', college: '', category: 'college-event',
  status: 'draft', event_status_badge: 'Upcoming',
  hero_image_url: '', hero_cover_url: '', hero_thumbnail_url: '', hero_bg_url: '',
  hero_banners: [],
  organizer_name: '', organizer_logo_url: '',
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
function ShowcaseModal({ visible, editing, onClose, onSave, saving, flash }: any) {
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
                  ✓ Autosaved at {lastSaved}
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
                  <FieldRow label="Date">
                    <Field value={form.date} onChangeText={(v: string) => set('date', v)} placeholder="August 15, 2026" />
                  </FieldRow>
                </View>
                <View style={{ flex: 1, minWidth: 150 }}>
                  <FieldRow label="Time">
                    <Field value={form.time} onChangeText={(v: string) => set('time', v)} placeholder="10:00 AM – 4:30 PM" />
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
                  <Field value={(form.registration || {}).deadline || ''} onChangeText={(v: string) => set('registration', { ...(form.registration || {}), deadline: v })} placeholder="2026-08-14" />
                </FieldRow>
                <FieldRow label="Payment / Registration Note" hint="Shown to attendees on the registration page.">
                  <Field value={(form.registration || {}).payment_note || ''} onChangeText={(v: string) => set('registration', { ...(form.registration || {}), payment_note: v })} placeholder="Free entry for VNR students…" multiline rows={3} />
                </FieldRow>
                <FieldRow label="Payment Gateway Link" hint="Optional external payment URL (Razorpay, PayU, etc.). When set, attendees are redirected here and the register API records a payment_method of 'external'.">
                  <Field value={(form.registration || {}).payment_url || ''} onChangeText={(v: string) => set('registration', { ...(form.registration || {}), payment_url: v })} placeholder="https://razorpay.com/payment-link/…" />
                </FieldRow>
                <FieldRow label="Poster Images" hint="Left-column carousel on the register page. Falls back to gallery/hero images when empty.">
                  <PosterEditor
                    posters={(form.registration || {}).poster_images || []}
                    onChange={(p: string[]) => set('registration', { ...(form.registration || {}), poster_images: p })}
                  />
                </FieldRow>
                <FieldRow label="Ticket / Pass Template" hint="Style of the entry pass emailed to attendees and shown in the app.">
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {[
                      { id: 'aurora', name: 'Aurora', desc: 'Dark gradient pass with glow accents', gradient: 'linear-gradient(135deg,#312e81,#4C1D95)' },
                      { id: 'classic', name: 'Classic', desc: 'White ticket with purple header', gradient: 'linear-gradient(135deg,#fff,#f3f4f6)' },
                      { id: 'minimal', name: 'Minimal', desc: 'Bare-bones borderless pass', gradient: 'linear-gradient(135deg,#f9fafb,#e5e7eb)' },
                    ].map((tpl) => {
                      const active = (form.registration || {}).ticket_template === tpl.id;
                      return (
                        <Pressable
                          key={tpl.id}
                          onPress={() => set('registration', { ...(form.registration || {}), ticket_template: tpl.id })}
                          style={{
                            flex: 1, borderRadius: 10, borderWidth: 2, borderColor: active ? '#7C3AED' : 'rgba(255,255,255,0.1)',
                            backgroundColor: active ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.03)',
                            padding: 12, cursor: 'pointer',
                          }}
                        >
                          <View style={{ height: 6, borderRadius: 3, marginBottom: 8, background: tpl.gradient }} />
                          <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: active ? '#C4B5FD' : SAC.text }}>{tpl.name}</Text>
                          <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.dim, marginTop: 2 }}>{tpl.desc}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </FieldRow>
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
                    ⚠️ Status is "{form.status}" — set to Published to make it visible to students.
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
function RegistrationsPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any>({ events: [], totals: {} });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [eventSlug, setEventSlug] = useState('all');
  const { flash } = useToast();

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

  const uniqueEvents = Array.from(new Set(rows.map((r: any) => r.slug).filter(Boolean)))
    .map((slug) => rows.find((r: any) => r.slug === slug))
    .filter(Boolean)
    .map((r: any) => ({ slug: r.slug, title: r.event_title || r.slug }));

  const fmtAmt = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
  const paid = filtered.filter((r) => r.payment_status === 'paid');
  const revenueTotal = paid.reduce((a, r) => a + Number(r.fee || 0), 0);

  return (
    <View>
      {/* Revenue KPIs */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <KpiTile Icon={Users} label="Total Registrations" value={String(filtered.length)} />
        <KpiTile Icon={Check} label="Paid" value={String(paid.length)} />
        <KpiTile Icon={Zap} label="Revenue (filtered)" value={fmtAmt(revenueTotal)} delta="real-time" deltaKind="success" />
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
            <View style={{ minWidth: 760 }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderBottomWidth: 1, borderBottomColor: SAC.border }}>
                {['Attendee', 'Event', 'College / Branch', 'Amount', 'Payment', 'SA Account', 'Date'].map((h) => (
                  <Text key={h} style={{ width: h === 'Attendee' ? 180 : h === 'Event' ? 200 : 120, fontFamily: FONTS.xbold, fontSize: 10.5, color: SAC.muted, letterSpacing: 0.5 }}>{h.toUpperCase()}</Text>
                ))}
              </View>
              {filtered.map((r: any, i: number) => (
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
                      kind={r.payment_status === 'paid' ? 'success' : r.payment_status === 'pending' ? 'warn' : 'neutral'}
                      label={(r.payment_status || '—').toUpperCase()}
                    />
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
export function EchoShowcaseAdminView() {
  const [pageTab, setPageTab] = useState<PageTab>('all');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [editing, setEditing] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast, flash } = useToast();

  const load = useCallback(async () => {
    try {
      const res = await api.adminListEchoShowcases();
      setItems(res?.items || []);
    } catch {
      flash('Failed to load showcases');
    } finally {
      setLoading(false);
    }
  }, []);

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
    console.log('[CMS SAVE PAYLOAD]', {
      id: editing?._id,
      title: form.title,
      slug: form.slug,
      status: form.status,
      hero_image_url: form.hero_image_url,
      hero_cover_url: form.hero_cover_url,
      hero_thumbnail_url: form.hero_thumbnail_url,
      gallery_count: form.gallery?.length,
    });

    try {
      if (editing) {
        const res = await api.updateEchoShowcase(editing._id, form);
        console.log('[CMS UPDATE RESPONSE]', res);
        flash('Showcase updated ✓');
      } else {
        const res = await api.createEchoShowcase(form);
        console.log('[CMS CREATE RESPONSE]', res);
        flash('Showcase created ✓');
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
    try { await api.publishEchoShowcase(item._id); flash(`"${item.title}" published ✓`); await load(); }
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
      <ShowcaseModal visible={modalOpen} editing={editing} onClose={onClose} onSave={onSave} saving={saving} flash={flash} />
    </View>
  );
}
