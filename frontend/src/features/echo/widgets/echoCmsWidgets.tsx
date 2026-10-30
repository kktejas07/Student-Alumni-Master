// the 15 content editors (stats, testimonials, sponsors, downloads, ...) — split verbatim from EchoShowcaseAdminView.tsx (audit Step 6a).
// @ts-nocheck
import { useState } from 'react';
import { api, resolveImageUrl } from '@/src/models/services/api';
import { GRAD } from '@/src/views/web/portals/superadmin/applekit';
import { FONTS, SAC } from '@/src/views/web/portals/superadmin/tokens';
import { ChevronDown, ChevronUp, Download, ImageIcon, Images, MoveDown, MoveUp, Star, Ticket, Trash2, Upload, X } from 'lucide-react-native';
import { ActivityIndicator, Image, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SelectNative, Tip, cs, fi } from '../fields/echoCmsFields';
import { DOWNLOAD_CATEGORY_OPTIONS, SPONSOR_TIER_OPTIONS } from '../shared/echoCmsShared';

export function ImageUploadWidget({
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
          <View style={{ flexDirection: 'row', gap: 8, padding: 8, backgroundColor: SAC.panel2 }}>
            {Platform.OS === 'web' && (
              <label style={{ cursor: 'pointer' }}>
                <span style={{
                  backgroundColor: 'rgba(123,61,191,0.30)', color: SAC.text,
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
                      backgroundColor: 'rgba(123,61,191,0.30)', color: SAC.text,
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
export function StarRating({ value = 5, onChange }: { value: number; onChange: (v: number) => void }) {
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
export function StatsEditor({ stats, onChange }: any) {
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
      {stats.map((statItem: any, i: number) => (
        <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput value={statItem.value || ''} onChangeText={(v) => update(i, 'value', v)} placeholder="Value" placeholderTextColor={SAC.dim} style={[fi.input, { flex: 0.4 }]} />
          <TextInput value={statItem.label || ''} onChangeText={(v) => update(i, 'label', v)} placeholder="Label" placeholderTextColor={SAC.dim} style={[fi.input, { flex: 1 }]} />
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
export function ListEditor({ items, fields, onChange, addLabel }: any) {
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
export function TestimonialsEditor({ testimonials, onChange }: any) {
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
export function SponsorsEditor({ sponsors, onChange }: any) {
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
export function DownloadsEditor({ downloads, onChange }: any) {
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
export function PosterEditor({ posters, onChange }: { posters: string[]; onChange: (p: string[]) => void }) {
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
                  backgroundColor: 'rgba(123,61,191,0.25)', color: SAC.text,
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
              <Image source={{ uri: resolveImageUrl(url) }} style={{ width: 44, height: 56, borderRadius: 6, backgroundColor: '#101019' }} resizeMode="cover" />
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
export function SpeakersEditor({ speakers, onChange }: any) {
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
export function CategoriesEditor({ categories, onChange }: any) {
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
export function ScheduleEditor({ schedule, onChange }: any) {
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
export function PanelsEditor({ panels, onChange }: any) {
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
export function FaqsEditor({ faqs, onChange }: any) {
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
export function BannerCarouselEditor({ banners, onChange }: { banners: string[]; onChange: (b: string[]) => void }) {
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
                  backgroundColor: 'rgba(123,61,191,0.25)', color: SAC.text,
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
                style={{ width: 80, height: 40, borderRadius: 6, backgroundColor: '#101019' }} resizeMode="cover" />
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
export function GalleryDropzone({ gallery, onChange }: { gallery: any[]; onChange: (g: any[]) => void }) {
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
              backgroundColor: 'rgba(123,61,191,0.30)', color: SAC.text,
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
