// showcase card, the create/edit modal, and the session passes overview — split verbatim from EchoShowcaseAdminView.tsx (audit Step 6a).
// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { getBaseUrl } from '@/src/lib/env';
import { api } from '@/src/models/services/api';
import { useConfirm } from '@/src/views/components';
import { DarkDropdown } from '@/src/views/web/components/DarkDropdown';
import { Card, GRAD, GradientButton, SecondaryButton, StatusPill, TopTabs } from '@/src/views/web/portals/superadmin/applekit';
import { FONTS, SAC } from '@/src/views/web/portals/superadmin/tokens';
import { CatalogOrdersManager } from '@/src/views/web/portals/superadmin/views/CatalogOrdersManager';
import { LinearGradient } from 'expo-linear-gradient';
import { Archive, ChevronUp, Clock, Coffee, Cookie, CupSoda, Eye, Globe, Images, Layout, Pencil, Phone, PlusCircle, Sandwich, Send, Star, Ticket, Trash2, Upload, UtensilsCrossed, X } from 'lucide-react-native';
import { ActivityIndicator, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Field, FieldDate, FieldRow, FieldTime, IsoDateField, SelectNative, Tip, cs, fi } from '../fields/echoCmsFields';
import { CATEGORY_OPTIONS, CustomVideosEditor, FORM_TABS, GALLERY_LAYOUT_OPTIONS, SESSION_PASS_ICONS, STATUS_BADGE_OPTIONS, STATUS_OPTIONS, STATUS_PILL_MAP, type FormTab } from '../shared/echoCmsShared';
import { BannerCarouselEditor, CategoriesEditor, DownloadsEditor, FaqsEditor, GalleryDropzone, ImageUploadWidget, ListEditor, PanelsEditor, PosterEditor, ScheduleEditor, SpeakersEditor, SponsorsEditor, StatsEditor, TestimonialsEditor } from '../widgets/echoCmsWidgets';

export function ShowcaseCard({ item, onEdit, onDelete, onPublish, onDraft, onArchive, onPreview, busy }: any) {
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
            {(!item.registration || item.registration?.enabled === false || String(item.registration?.enabled).toLowerCase() === 'false') ? (
              <StatusPill label="Registrations Closed" kind="danger" />
            ) : item.event_status_badge ? (
              <StatusPill label={item.event_status_badge} kind={item.event_status_badge === 'Live' ? 'danger' : item.event_status_badge === 'Completed' ? 'success' : 'warn'} />
            ) : null}
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
export const EMPTY: any = {
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
export const AUTOSAVE_KEY = 'echo_cms_autosave';

// ── Showcase Editor Modal ─────────────────────────────────────────────────────
export function ShowcaseModal({ visible, editing, onClose, onSave, saving, flash, onPreview }: any) {
  const { confirm } = useConfirm();
  const [tab, setTab] = useState<FormTab>('general');
  const [form, setForm] = useState<any>({ ...EMPTY });
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [activeUploads, setActiveUploads] = useState(0);
  const autosaveTimer = useRef<any>(null);

  const [tempOpenMin, setTempOpenMin] = useState('60');
  const [tempOpening, setTempOpening] = useState(false);

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

  const onTemporaryOpen = async () => {
    if (!editing?._id) return;
    const mins = Math.max(1, Math.min(Number(tempOpenMin) || 60, 7 * 24 * 60));
    setTempOpening(true);
    try {
      const res = await api.temporaryOpenEchoShowcase(editing._id, mins);
      const reg = res?.registration || {};
      const closeAt = res?.temporary_open?.closes_at || reg.temporary_close_at || '';
      set('registration', {
        ...(form.registration || {}),
        enabled: true,
        temporary_open: true,
        temporary_close_at: closeAt,
      });
      flash(`Registration opened temporarily — auto-closes in ${mins} min`);
    } catch (e: any) {
      flash(e?.message || 'Failed to open temporarily');
    } finally {
      setTempOpening(false);
    }
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
            <TopTabs tabs={FORM_TABS} active={tab} onChange={setTab as any} />
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
                    onChangeText={(v: string) => set('prize_pool', { ...(form.prize_pool || {}), other_prizes: v.split(',').map((strItem: string) => strItem.trim()).filter(Boolean) })}
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
                        <Text style={{ color: SAC.text, fontFamily: FONTS.semi, fontSize: 13 }}>{sec.label}</Text>
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
                    <Pressable onPress={() => {
                      const cur = form.registration || {};
                      const nextEnabled = !cur.enabled;
                      set('registration', {
                        ...cur,
                        enabled: nextEnabled,
                        ...(nextEnabled ? {} : { temporary_open: false, temporary_close_at: '' }),
                      });
                    }} style={{
                      width: 44, height: 24, borderRadius: 12, padding: 2, backgroundColor: (form.registration || {}).enabled ? '#10B981' : '#334155',
                    }}>
                      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', transform: [{ translateX: (form.registration || {}).enabled ? 20 : 0 }] }} />
                    </Pressable>
                    <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 12 }}>
                      Allow users to register + pay on the public page
                    </Text>
                  </View>
                </FieldRow>

                <View style={{ borderTopWidth: 1, borderTopColor: SAC.border, paddingTop: 12, gap: 8 }}>
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: SAC.text }}>Open temporarily (auto-close)</Text>
                  <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.dim }}>
                    Re-enable registration now for a limited window. It re-opens only until the countdown ends, then closes automatically — no need to remember to switch it off.
                  </Text>
                  {(form.registration || {}).temporary_open && (form.registration || {}).temporary_close_at ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(16,185,129,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 }}>
                      <Clock size={14} color="#34D399" />
                      <Text style={{ fontFamily: FONTS.semi, fontSize: 12, color: '#34D399', flex: 1 }}>
                        Active — auto-closes at {new Date((form.registration || {}).temporary_close_at).toLocaleString()}
                      </Text>
                    </View>
                  ) : (
                    <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.muted }}>No temporary window active.</Text>
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <Field
                      value={tempOpenMin}
                      onChangeText={(v: string) => setTempOpenMin(v.replace(/[^0-9]/g, ''))}
                      placeholder="60"
                      keyboardType="number-pad"
                      style={{ width: 90 }}
                    />
                    <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.muted }}>minutes</Text>
                    <Pressable
                      onPress={onTemporaryOpen}
                      disabled={tempOpening || !editing?._id}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 6,
                        backgroundColor: tempOpening || !editing?._id ? 'rgba(16,185,129,0.2)' : '#059669',
                        borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9,
                        opacity: tempOpening || !editing?._id ? 0.6 : 1,
                      }}
                    >
                      {tempOpening ? <ActivityIndicator size="small" color="#fff" /> : <Clock size={14} color="#fff" />}
                      <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: SAC.text }}>
                        {tempOpening ? 'Opening…' : 'Open for this long'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
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
                ].map((sessKeyObj) => {
                  const sessions = (form.sessions || []);
                  const existing = sessions.find((x: any) => x.key === sessKeyObj.key);
                  const enabled = existing?.enabled ?? false;
                  const locked = existing?.locked ?? false;
                  const day = existing?.day ?? 1;
                  const maxDay = Math.max(1, Math.min(7, parseInt(form.end_date && form.date ? '2' : '1', 10) || 1));
                  const dayOptions = Array.from({ length: Math.max(2, maxDay) }, (_, i) => String(i + 1));
                  return (
                    <View key={sessKeyObj.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                      <View style={{ width: 28, alignItems: 'center', justifyContent: 'center' }}>
                        <sessKeyObj.Icon size={18} color={enabled ? GRAD.from : SAC.dim} />
                      </View>
                      <Text style={{ flex: 1, fontFamily: FONTS.med, fontSize: 13, color: SAC.text }}>{sessKeyObj.label}</Text>
                      {enabled && (
                        <>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.dim }}>Day</Text>
                            <select
                              value={String(day)}
                              onChange={(e: any) => {
                                const current = [...(form.sessions || [])];
                                const idx = current.findIndex((x: any) => x.key === sessKeyObj.key);
                                if (idx >= 0) {
                                  current[idx] = { ...current[idx], day: Number(e.target.value) || 1 };
                                  set('sessions', current);
                                }
                              }}
                              style={{ backgroundColor: '#101019', border: `1px solid ${SAC.border}`, borderRadius: 6, padding: '3px 6px', fontFamily: FONTS.med, fontSize: 11, color: SAC.text, appearance: 'none' } as any}
                            >
                              {dayOptions.map((d) => <option key={d} value={d} style={{ backgroundColor: '#101019' }}>{d}</option>)}
                            </select>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: locked ? '#F59E0B' : SAC.dim }}>
                              {locked ? 'Locked' : 'Active'}
                            </Text>
                            <Pressable onPress={() => {
                              const current = [...(form.sessions || [])];
                              const idx = current.findIndex((x: any) => x.key === sessKeyObj.key);
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
                        const idx = current.findIndex((x: any) => x.key === sessKeyObj.key);
                        if (idx >= 0) {
                          current[idx] = { ...current[idx], enabled: !enabled, locked: false };
                        } else {
                          current.push({ key: sessKeyObj.key, label: sessKeyObj.label, day: 1, enabled: true, locked: false });
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

            {/* ── CATALOG TAB ── */}
            {tab === 'catalog' && (
              <CatalogOrdersManager showcaseId={form._id || form.id} slug={form.slug} />
            )}

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
              <Text style={{ color: SAC.text, fontFamily: FONTS.bold, fontSize: 13 }}>
                {activeUploads > 0 ? 'Uploading…' : editing ? 'Save Changes' : 'Create Showcase'}
              </Text>
            </GradientButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export const ml = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: SAC.panel2 },
  box: {
    width: '96%', maxWidth: 900, maxHeight: '95%',
    backgroundColor: '#101019', borderRadius: 18,
    borderWidth: 1, borderColor: SAC.border,
    overflow: 'hidden', zIndex: 2,
    ...(Platform.OS === 'web' ? { boxShadow: '0 24px 80px rgba(0,0,0,0.60)' } as any : {}),
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 16, color: SAC.text },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: SAC.border },
});

// ── Registrations & Payments panel ───────────────────────────────────────────
// ── Session Passes Overview ───────────────────────────────────────────────────
export function SessionPassesOverview({ events, onRefresh }: { events: any[]; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<Record<string, any[]>>({});
  const [toggling, setToggling] = useState<string | null>(null);

  const loadSessions = async (slug: string) => {
    try {
      const base = getBaseUrl();
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
      const base = getBaseUrl();
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
                              {daySessions.map((sessItem: any) => {
                                const locked = sessItem.locked ?? false;
                                const enabled = sessItem.enabled ?? false;
                                const SessionIcon = SESSION_PASS_ICONS[sessItem.key] || Ticket;
                                return (
                                  <View key={`${sessItem.key}-${day}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                                    <SessionIcon size={16} color={enabled ? '#A78BFA' : SAC.dim} />
                                    <Text style={{ flex: 1, fontFamily: FONTS.med, fontSize: 12, color: SAC.text }}>{sessItem.label}</Text>
                                    {enabled && (
                                      <>
                                        <StatusPill kind={locked ? 'warn' : 'success'} label={locked ? 'Locked' : 'Active'} />
                                        <Pressable onPress={() => toggleLock(ev.slug, sessItem.key, locked)} disabled={toggling === `${ev.slug}:${sessItem.key}`} style={{
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


