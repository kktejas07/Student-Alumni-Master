// shared constants, types, tab definitions and the video upload editor — split verbatim from EchoShowcaseAdminView.tsx (audit Step 6a).
// @ts-nocheck
import { useState } from 'react';
import { getBaseUrl } from '@/src/lib/env';
import { api } from '@/src/models/services/api';
import { useToast } from '@/src/views/web/portals/superadmin/applekit';
import { FONTS, SAC } from '@/src/views/web/portals/superadmin/tokens';
import { Award, Coffee, Cookie, CupSoda, FileText, Images, Layout, Plus, PlusCircle, Sandwich, Trash2, Upload, UserCheck, Users, UtensilsCrossed } from 'lucide-react-native';
import { Image, Platform, Pressable, Text, TextInput, View } from 'react-native';

export function CustomVideosEditor({ videos, onChange }: { videos: any[]; onChange: (v: any[]) => void }) {
  const { flash } = useToast();
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  const inputStyle = {
    borderWidth: 1,
    borderColor: SAC.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: SAC.text,
    backgroundColor: SAC.bg,
  };

  const updateItem = (index: number, key: string, val: any) => {
    const list = [...(videos || [])];
    list[index] = { ...list[index], [key]: val };
    onChange(list);
  };

  const addItem = () => {
    onChange([
      ...(videos || []),
      {
        title: 'New Event Video / Clip',
        video_url: '',
        thumbnail_url: '/images/hackwave/hackwave_main_poster.png',
        description: 'Uploaded event teaser video clip.',
        platform: 'native',
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

        return (
          <View key={idx} style={{ borderWidth: 1, borderColor: SAC.border, borderRadius: 14, padding: 18, backgroundColor: SAC.panel, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: SAC.text }}>Video / Clip #{idx + 1}</Text>
              <Pressable onPress={() => removeItem(idx)} style={{ padding: 4 }}>
                <Trash2 size={16} color="#EF4444" />
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              <TextInput
                style={[inputStyle, { flex: 1, minWidth: 200 }]}
                placeholder="Video Title (e.g. SNIST HackWave Teaser)"
                value={vid.title || ''}
                onChangeText={(t) => updateItem(idx, 'title', t)}
              />
              <TextInput
                style={[inputStyle, { flex: 1.5, minWidth: 260 }]}
                placeholder="Direct Video URL (.mp4, .webm) or Upload Local File"
                value={isYt ? '' : (vid.video_url || '')}
                onChangeText={(t) => updateItem(idx, 'video_url', t)}
              />
              {Platform.OS === 'web' && (
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, background: '#7C3AED', color: '#FFF', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                  {uploadingIdx === idx ? 'Uploading Video...' : '🎥 Upload Local Video File'}
                  <input type="file" accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/*" onChange={(e) => handleFileUpload(idx, e)} style={{ display: 'none' }} />
                </label>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              <TextInput
                style={[inputStyle, { flex: 1, minWidth: 200 }]}
                placeholder="Thumbnail Image URL (optional)"
                value={vid.thumbnail_url || ''}
                onChangeText={(t) => updateItem(idx, 'thumbnail_url', t)}
              />
              <TextInput
                style={[inputStyle, { flex: 1.5, minWidth: 260 }]}
                placeholder="Short Description / Caption (optional)"
                value={vid.description || ''}
                onChangeText={(t) => updateItem(idx, 'description', t)}
              />
            </View>

            {/* Native HTML5 Video Preview Box */}
            {vid.video_url && !isYt ? (
              <View style={{ marginTop: 6, borderRadius: 10, overflow: 'hidden', backgroundColor: '#000', maxHeight: 220, alignItems: 'center', justifyContent: 'center' }}>
                <video
                  controls
                  playsInline
                  preload="metadata"
                  poster={vid.thumbnail_url}
                  src={vid.video_url}
                  style={{ width: '100%', maxHeight: '220px', objectFit: 'contain' }}
                />
              </View>
            ) : isYt ? (
              <View style={{ marginTop: 6, padding: 12, borderRadius: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: '#EF4444' }}>
                <Text style={{ fontSize: 12, color: '#FCA5A5', fontFamily: FONTS.med }}>
                  Legacy YouTube URL detected. Please click <strong>🎥 Upload Local Video File</strong> above to upload your local MP4 video.
                </Text>
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
export const triggerExportCsv = (slugVal?: string, statusVal?: string) => {
  let base = '';
  try {
    base = getBaseUrl();
  } catch {}
  if (!base || base === '') {
    if (typeof window !== 'undefined') {
      const hn = window.location.hostname;
      if (hn === 'localhost' || hn === '127.0.0.1') {
        base = `${window.location.protocol}//${hn}:8000`;
      } else {
        base = window.location.origin;
      }
    }
  }
  if (!base) base = 'http://localhost:8000';

  const params: string[] = [];
  if (slugVal && slugVal !== 'all') params.push(`slug=${encodeURIComponent(slugVal)}`);
  if (statusVal && statusVal !== 'all') params.push(`status=${encodeURIComponent(statusVal)}`);
  const queryStr = params.length > 0 ? `?${params.join('&')}` : '';

  const exportUrl = `${base}/api/echo/admin/export-csv${queryStr}`;
  if (typeof window !== 'undefined') {
    window.open(exportUrl, '_blank');
  }
};

// ── Constants ─────────────────────────────────────────────────────────────────
export const STATUS_PILL_MAP: Record<string, any> = {
  published: 'success', draft: 'warn', archived: 'neutral',
};

export const SESSION_PASS_ICONS: Record<string, any> = {
  breakfast: CupSoda,
  lunch: UtensilsCrossed,
  snacks: Cookie,
  dinner: UtensilsCrossed,
  tiffin: Sandwich,
  coffee: Coffee,
};

export const CATEGORY_OPTIONS = [
  'college-event', 'hackathon', 'workshop', 'bootcamp', 'alumni-meet',
  'career-guidance', 'industrial-visit', 'placement-training',
];
export const STATUS_OPTIONS = ['draft', 'published', 'archived'];
export const STATUS_BADGE_OPTIONS = ['Upcoming', 'Live', 'Completed'];
export const SPONSOR_TIER_OPTIONS = ['Title Sponsor', 'Platinum Sponsor', 'Gold Sponsor', 'Silver Sponsor', 'Associate Sponsor', 'Partner'];
export const GALLERY_LAYOUT_OPTIONS = ['grid', 'masonry', 'mixed', 'featured-grid', 'carousel'];
export const VIDEO_PLATFORM_OPTIONS = ['youtube', 'vimeo', 'mp4'];
export const DOWNLOAD_CATEGORY_OPTIONS = ['Brochure', 'Schedule', 'Certificate', 'Presentation', 'Report', 'Document'];

export type PageTab = 'all' | 'create' | 'drafts' | 'media' | 'registrations' | 'interns' | 'volunteers' | 'scan-monitor';
export type StatusFilter = 'all' | 'published' | 'draft' | 'archived';
export type FormTab =
  | 'general' | 'hero' | 'statistics' | 'about' | 'gallery'
  | 'testimonials' | 'highlights' | 'speakers' | 'categories' | 'schedule'
  | 'panels' | 'faqs' | 'sponsors' | 'videos' | 'downloads'
  | 'sections' | 'registration' | 'catalog' | 'seo' | 'publish';

export const PAGE_TABS: Array<{ id: PageTab; label: string; icon?: any }> = [
  { id: 'registrations', label: 'Registrations & Payments', icon: Users },
  { id: 'scan-monitor', label: 'Live Scan & Certificates', icon: Award },
  { id: 'all', label: 'All Showcases', icon: Layout },
  { id: 'create', label: 'Create Showcase', icon: PlusCircle },
  { id: 'drafts', label: 'Drafts', icon: FileText },
  { id: 'interns', label: 'Internal Hiring & Interns', icon: UserCheck },
  { id: 'volunteers', label: 'Volunteers', icon: Users },
  { id: 'media', label: 'Media Library', icon: Images },
];

export const FILTER_TABS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'published', label: 'Published' },
  { id: 'draft', label: 'Draft' },
  { id: 'archived', label: 'Archived' },
];

export const FORM_TABS: Array<{ id: FormTab; label: string }> = [
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
  { id: 'catalog',      label: 'Catalog & Orders' },
  { id: 'seo',          label: 'SEO' },
  { id: 'publish',      label: 'Publish' },
];
