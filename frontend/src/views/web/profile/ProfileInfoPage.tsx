/**
 * Page 1 — Profile Information.
 * Sections: Profile Completion banner, Basic Info, Contact, Academic, Interests, Social, Skills.
 */
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Platform } from 'react-native';
import { Mail, Phone, MapPin, Building2, Link2, Link2 as GithubIcon, Globe, Camera, Sparkles, Check } from 'lucide-react-native';
import { CompletionRing } from './CompletionRing';
import { Card, Field, TF, TA, SF, ChipPicker, C } from './primitives';

const INTERESTS = [
  'Software Engineering', 'Product Management', 'Data Science', 'AI / ML',
  'Design / UX', 'Cybersecurity', 'Cloud / DevOps', 'Mobile Dev',
  'Web3 / Blockchain', 'Robotics', 'Finance', 'Consulting',
  'Marketing', 'Entrepreneurship', 'Civil Service', 'Research',
  'Healthcare', 'Education', 'Sustainability', 'Media',
];

const GRAD_YEARS = ['2024','2025','2026','2027','2028','2029','2030'];

interface Props {
  draft: any;
  setDraft: (updater: (d: any) => any) => void;
  completion: { percentage: number; items: { key: string; label: string; done: boolean }[] };
  onUploadPhoto: () => void;
}

export function ProfileInfoPage({ draft, setDraft, completion, onUploadPhoto }: Props) {
  const photo = draft.photo_data || draft.face_image_base64;
  const initials = ((draft.full_name || '?').split(' ').slice(0,2).map((s: string) => s[0] || '').join('') || '?').toUpperCase();

  const setField = (k: string, v: any) => setDraft((d) => ({ ...d, [k]: v }));
  const interests: string[] = draft.interests || [];
  const skillsText = (draft.skills || []).join(', ');

  return (
    <View style={{ gap: 16 }}>
      {/* Completion Banner */}
      <View style={st.banner}>
        <CompletionRing pct={completion.percentage} size={88} />
        <View style={{ flex: 1, minWidth: 0, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={st.bannerTitle}>Profile Completion</Text>
            {completion.percentage >= 100 && (
              <View style={st.completePill}><Sparkles size={11} color="#fff" /><Text style={st.completePillText}>Complete</Text></View>
            )}
          </View>
          <Text style={st.bannerSub}>Complete your profile to unlock personalized recommendations & higher trust signals.</Text>
          <View style={st.itemsRow}>
            {completion.items.map((it) => (
              <View key={it.key} style={[st.itemPill, it.done && st.itemPillDone]}>
                {it.done ? <Check size={10} color={C.green} /> : <View style={st.dot} />}
                <Text style={[st.itemPillText, it.done && { color: C.green }]}>{it.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Basic Information */}
      <Card title="Basic Information" subtitle="Your name, photo, and a short tagline.">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Pressable onPress={onUploadPhoto} style={st.avatar} testID="profile-avatar-upload">
            {photo ? (
              <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <Text style={st.avatarText}>{initials}</Text>
            )}
            <View style={st.avatarOver}>
              <Camera size={16} color="#fff" />
              <Text style={st.avatarOverText}>{photo ? 'CHANGE' : 'UPLOAD'}</Text>
            </View>
          </Pressable>
          <View style={{ gap: 6 }}>
            <Pressable onPress={onUploadPhoto} style={st.btnSm}><Text style={st.btnSmText}>Upload Photo</Text></Pressable>
            {photo && (
              <Pressable onPress={() => setField('photo_data', '') || setField('face_image_base64', '')} style={[st.btnSm, st.btnSmDanger]}><Text style={[st.btnSmText, { color: C.rose }]}>Remove</Text></Pressable>
            )}
          </View>
        </View>
        <View style={st.row}>
          <Field label="First Name" half><TF value={draft.first_name || (draft.full_name||'').split(' ')[0] || ''} onChangeText={(v) => setField('first_name', v)} placeholder="Aarav" testID="pf-first-name" /></Field>
          <Field label="Last Name" half><TF value={draft.last_name || (draft.full_name||'').split(' ').slice(1).join(' ') || ''} onChangeText={(v) => setField('last_name', v)} placeholder="Sharma" testID="pf-last-name" /></Field>
        </View>
        <Field label="Headline / Tagline" hint="A short professional summary (max 100 chars).">
          <TF value={draft.headline || ''} onChangeText={(v) => setField('headline', v.slice(0, 100))} placeholder="Aspiring AI Engineer · IIT Bombay '26" testID="pf-headline" />
        </Field>
        <Field label="About / Bio" hint="Tell us about you in a few sentences.">
          <TA value={draft.bio || ''} onChangeText={(v) => setField('bio', v)} rows={4} placeholder="Passionate about building products at the intersection of design and ML…" testID="pf-bio" />
        </Field>
      </Card>

      {/* Contact Details */}
      <Card title="Contact Details" subtitle="How others can reach you (visible based on privacy settings).">
        <View style={st.row}>
          <Field label="Email" half><TF value={draft.email || ''} onChangeText={() => {}} leftIcon={<Mail size={14} color={C.text2} />} testID="pf-email" /></Field>
          <Field label="Phone" half><TF value={draft.phone || ''} onChangeText={(v) => setField('phone', v)} leftIcon={<Phone size={14} color={C.text2} />} placeholder="+91 …" testID="pf-phone" /></Field>
        </View>
        <Field label="Location"><TF value={draft.location || draft.city || ''} onChangeText={(v) => setField('location', v)} leftIcon={<MapPin size={14} color={C.text2} />} placeholder="City, State" testID="pf-location" /></Field>
      </Card>

      {/* Academic Details */}
      <Card title="Academic Details" subtitle="Your education info — used for matching with peers.">
        <Field label="College / University"><TF value={draft.institution || ''} onChangeText={(v) => setField('institution', v)} leftIcon={<Building2 size={14} color={C.text2} />} placeholder="e.g. IIT Bombay" testID="pf-college" /></Field>
        <View style={st.row}>
          <Field label="Branch / Major" half><TF value={draft.branch || ''} onChangeText={(v) => setField('branch', v)} placeholder="Computer Science" testID="pf-branch" /></Field>
          <Field label="Graduation Year" half><SF value={String(draft.graduation_year || '')} onChange={(v) => setField('graduation_year', v)} options={GRAD_YEARS} placeholder="Select year" testID="pf-grad-year" /></Field>
        </View>
        <Field label="CGPA / GPA" hint="Optional — out of 10 (or your scale)."><TF value={String(draft.cgpa || '')} onChangeText={(v) => setField('cgpa', v)} placeholder="8.5" testID="pf-cgpa" /></Field>
      </Card>

      {/* Interests */}
      <Card title="Interests & Career Focus" subtitle={`Pick at least 3 — used for personalized matches. (${interests.length}/${INTERESTS.length} selected)`}>
        <ChipPicker options={INTERESTS} selected={interests} onToggle={(o) => {
          setField('interests', interests.includes(o) ? interests.filter((x: string) => x !== o) : [...interests, o]);
        }} />
      </Card>

      {/* Social Links */}
      <Card title="Social Links" subtitle="Show up on your network cards & profile detail.">
        <Field label="LinkedIn"><TF value={draft.linkedin_url || ''} onChangeText={(v) => setField('linkedin_url', v)} leftIcon={<Link2 size={14} color={C.text2} />} placeholder="https://linkedin.com/in/username" testID="pf-linkedin" /></Field>
        <Field label="GitHub"><TF value={draft.github_url || ''} onChangeText={(v) => setField('github_url', v)} leftIcon={<GithubIcon size={14} color={C.text2} />} placeholder="https://github.com/username" testID="pf-github" /></Field>
        <Field label="Portfolio / Website"><TF value={draft.portfolio_url || ''} onChangeText={(v) => setField('portfolio_url', v)} leftIcon={<Globe size={14} color={C.text2} />} placeholder="https://yoursite.com" testID="pf-portfolio" /></Field>
      </Card>

      {/* Skills */}
      <Card title="Skills" subtitle="Comma-separated. These appear as chips on your network card.">
        <TA
          value={skillsText}
          onChangeText={(v) => setField('skills', v.split(',').map((s: string) => s.trim()).filter(Boolean))}
          rows={3}
          placeholder="e.g. Python, Figma, React, Public Speaking"
          testID="pf-skills"
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
          {(draft.skills || []).map((sk: string, i: number) => (
            <View key={`${sk}-${i}`} style={st.skillChip}><Text style={st.skillChipText}>{sk}</Text></View>
          ))}
        </View>
      </Card>
    </View>
  );
}

const st = StyleSheet.create({
  banner: {
    flexDirection: 'row', gap: 16, alignItems: 'center',
    padding: 18, borderRadius: 16,
    backgroundColor: 'rgba(167,139,250,0.10)',
    borderColor: 'rgba(167,139,250,0.30)', borderWidth: 1,
  },
  bannerTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 16 },
  bannerSub:   { color: 'rgba(255,255,255,0.65)', fontFamily: 'DMSans_400Regular', fontSize: 12 },
  completePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#10B981', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  completePillText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 10 },
  itemsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  itemPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.10)', borderWidth: 1,
  },
  itemPillDone: { backgroundColor: 'rgba(16,185,129,0.10)', borderColor: 'rgba(16,185,129,0.30)' },
  itemPillText: { color: 'rgba(255,255,255,0.65)', fontFamily: 'DMSans_500Medium', fontSize: 10.5 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.30)' },

  avatar: {
    width: 84, height: 84, borderRadius: 42, overflow: 'hidden', position: 'relative',
    backgroundColor: 'rgba(167,139,250,0.20)', alignItems: 'center', justifyContent: 'center',
    ...({ cursor: 'pointer' } as any),
  },
  avatarText: { color: '#A78BFA', fontFamily: 'DMSans_800ExtraBold', fontSize: 26 },
  avatarOver: {
    position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4,
  },
  avatarOverText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 9, letterSpacing: 0.6 },

  btnSm: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.09)', borderWidth: 1, ...({ cursor: 'pointer' } as any) },
  btnSmDanger: { backgroundColor: 'rgba(244,63,94,0.10)', borderColor: 'rgba(244,63,94,0.40)' },
  btnSmText: { color: 'rgba(255,255,255,0.85)', fontFamily: 'DMSans_700Bold', fontSize: 11 },

  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },

  skillChip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(167,139,250,0.10)', borderColor: 'rgba(167,139,250,0.30)', borderWidth: 1 },
  skillChipText: { color: '#C4B5FD', fontFamily: 'DMSans_500Medium', fontSize: 11 },
});
