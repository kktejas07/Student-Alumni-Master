/**
 * Page 2 — Manage Profile.
 * Sections: Profile Visibility, Resume & Documents, Profile Sections, Certifications, Earned Badges.
 */
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ActivityIndicator } from 'react-native';
import { Card, ToggleRow, C } from './primitives';
import { Globe, Users, Lock, FileUp, Download, Trash2, Plus, Award, Star } from 'lucide-react-native';
import { request } from '@/src/models/services/api';
import { CertificatesCard } from '@/src/views/web/CertificatesCard';
import { MaterialBadgeStack } from '@/src/views/components/MaterialBadgeChip';

const VISIBILITY = [
  { key: 'public', icon: Globe, title: 'Public', desc: 'Anyone can find your profile.' },
  { key: 'network', icon: Users, title: 'My Network Only', desc: 'Only your connections see you.' },
  { key: 'private', icon: Lock, title: 'Private', desc: 'Hidden from search & discover.' },
];

const SECTIONS = [
  { key: 'projects', label: 'Projects & Portfolio', desc: 'Showcase what you have built.' },
  { key: 'experience', label: 'Work Experience', desc: 'Internships, jobs, freelance gigs.' },
  { key: 'achievements', label: 'Achievements & Awards', desc: 'Hackathon wins, scholarships, honors.' },
  { key: 'certifications', label: 'Certifications', desc: 'Courses, professional credentials.' },
  { key: 'languages', label: 'Languages', desc: 'Spoken & programming languages you know.' },
  { key: 'extracurricular', label: 'Extracurricular Activities', desc: 'Clubs, sports, volunteering, leadership.' },
];

interface Props {
  draft: any;
  setDraft: (updater: (d: any) => any) => void;
  badges: any[];
  onCertChange: () => void;
  showToast: (m: string) => void;
}

export function ManageProfilePage({ draft, setDraft, badges, onCertChange, showToast }: Props) {
  const visibility: string = draft.profile_visibility || 'public';
  const sectionToggles: Record<string, boolean> = draft.section_toggles || { projects: true, experience: true, achievements: false, volunteer: false };

  const [resumes, setResumes] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const loadResumes = async () => {
    try {
      const r = await request<{ documents: any[] }>('/users/me/resume');
      setResumes(r.documents || []);
    } catch {}
  };
  useEffect(() => { loadResumes(); }, []);

  const handleResumeUpload = async () => {
    if (Platform.OS !== 'web') { showToast('Resume upload available on web'); return; }
    const input = (document as any).createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0]; if (!file) return;
      if (file.size > 5 * 1024 * 1024) { showToast('File too large (max 5MB)'); return; }
      const reader = new FileReader();
      reader.onload = async () => {
        setBusy(true);
        try {
          await request('/users/me/resume', { method: 'POST', body: { name: file.name, size: file.size, data_url: reader.result } } as any);
          showToast('Resume uploaded');
          loadResumes();
        } catch { showToast('Upload failed'); }
        setBusy(false);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleResumeDelete = async (id: string) => {
    try { await request(`/users/me/resume/${id}`, { method: 'DELETE' } as any); showToast('Deleted'); loadResumes(); } catch { showToast('Delete failed'); }
  };
  const handleResumeActivate = async (id: string) => {
    try { await request(`/users/me/resume/${id}/activate`, { method: 'POST' } as any); showToast('Set active'); loadResumes(); } catch { showToast('Failed'); }
  };
  const handleResumeDownload = async (id: string, name: string) => {
    if (Platform.OS !== 'web') { showToast('Download on web only'); return; }
    try {
      const r = await request<{ data_url: string }>(`/users/me/resume/${id}/raw`);
      const a = (document as any).createElement('a');
      a.href = r.data_url; a.download = name; a.click();
    } catch { showToast('Download failed'); }
  };

  return (
    <View style={{ gap: 16 }}>
      {/* Visibility */}
      <Card title="Profile Visibility" subtitle="Who can find and view your profile.">
        <View style={{ gap: 8 }}>
          {VISIBILITY.map((v) => {
            const Icon = v.icon; const isSel = visibility === v.key;
            return (
              <Pressable key={v.key} onPress={() => setDraft((d: any) => ({ ...d, profile_visibility: v.key }))} style={[st.visRow, isSel && st.visRowSel]} testID={`pf-vis-${v.key}`}>
                <View style={[st.visIcon, isSel && { backgroundColor: 'rgba(167,139,250,0.18)', borderColor: C.purple }]}>
                  <Icon size={15} color={isSel ? C.purple : C.text2} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={st.visTitle}>{v.title}</Text>
                  <Text style={st.visDesc}>{v.desc}</Text>
                </View>
                {isSel && <View style={st.selDot} />}
              </Pressable>
            );
          })}
        </View>
      </Card>

      {/* Resume & Documents */}
      <Card title="Resume & Documents" subtitle="PDF / Doc up to 5MB. The active one is shared with employers."
        action={<Pressable onPress={handleResumeUpload} disabled={busy} style={st.uploadBtn} testID="pf-resume-upload">{busy ? <ActivityIndicator size="small" color="#fff" /> : <FileUp size={13} color="#fff" />}<Text style={st.uploadBtnText}>{busy ? 'Uploading…' : 'Upload New'}</Text></Pressable>}>
        {resumes.length === 0 ? (
          <View style={st.empty}><FileUp size={28} color={C.text3} /><Text style={st.emptyText}>No resumes yet — upload one to get started.</Text></View>
        ) : (
          <View style={{ gap: 8 }}>
            {resumes.map((r) => (
              <View key={r.id} style={st.docRow}>
                <View style={st.docIcon}><FileUp size={16} color={C.cyan} /></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={st.docName} numberOfLines={1}>{r.name}</Text>
                    {r.active && <View style={st.activePill}><Text style={st.activePillText}>ACTIVE</Text></View>}
                  </View>
                  <Text style={st.docMeta}>{(r.size / 1024).toFixed(1)} KB · {new Date(r.uploaded_at).toLocaleDateString()}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {!r.active && <Pressable onPress={() => handleResumeActivate(r.id)} style={[st.iconBtn, { borderColor: 'rgba(34,211,238,0.40)' }]}><Star size={14} color={C.cyan} /></Pressable>}
                  <Pressable onPress={() => handleResumeDownload(r.id, r.name)} style={st.iconBtn}><Download size={14} color={C.text2} /></Pressable>
                  <Pressable onPress={() => handleResumeDelete(r.id)} style={[st.iconBtn, { borderColor: 'rgba(244,63,94,0.40)' }]}><Trash2 size={14} color={C.rose} /></Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* Profile Sections */}
      <Card title="Profile Sections" subtitle="Toggle which sections appear on your public profile.">
        {SECTIONS.map((s) => (
          <ToggleRow
            key={s.key}
            title={s.label}
            desc={s.desc}
            on={!!sectionToggles[s.key]}
            onChange={(v) => setDraft((d: any) => ({ ...d, section_toggles: { ...sectionToggles, [s.key]: v } }))}
            testID={`pf-section-${s.key}`}
          />
        ))}
      </Card>

      {/* Certifications (reuse existing CertificatesCard) */}
      <CertificatesCard onChanged={onCertChange} />

      {/* Earned Badges */}
      <Card title="Earned Badges" subtitle={`${badges.length} unlocked`}>
        {badges.length === 0 ? (
          <View style={st.empty}><Award size={28} color={C.text3} /><Text style={st.emptyText}>Earn badges by completing your profile and engaging with the platform.</Text></View>
        ) : (
          <MaterialBadgeStack badges={badges} size="md" />
        )}
      </Card>
    </View>
  );
}

const st = StyleSheet.create({
  visRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 14, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.09)', borderWidth: 1,
    ...({ cursor: 'pointer' } as any),
  },
  visRowSel: { backgroundColor: 'rgba(167,139,250,0.10)', borderColor: 'rgba(167,139,250,0.45)' },
  visIcon: { width: 36, height: 36, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.10)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  visTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 13 },
  visDesc: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_400Regular', fontSize: 11.5, marginTop: 2 },
  selDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#A78BFA' },

  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 32, borderRadius: 8, backgroundColor: '#A78BFA', ...({ cursor: 'pointer' } as any) },
  uploadBtnText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12 },

  empty: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  emptyText: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_400Regular', fontSize: 12, textAlign: 'center', paddingHorizontal: 30 },

  docRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.09)', borderWidth: 1 },
  docIcon: { width: 34, height: 34, borderRadius: 8, backgroundColor: 'rgba(34,211,238,0.10)', alignItems: 'center', justifyContent: 'center' },
  docName: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12.5 },
  docMeta: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_500Medium', fontSize: 11, marginTop: 2 },
  activePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: 'rgba(16,185,129,0.18)', borderColor: 'rgba(16,185,129,0.40)', borderWidth: 1 },
  activePillText: { color: '#34D399', fontFamily: 'DMSans_700Bold', fontSize: 9, letterSpacing: 0.5 },
  iconBtn: { width: 28, height: 28, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.09)', borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...({ cursor: 'pointer' } as any) },

  badgeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(245,158,11,0.10)', borderColor: 'rgba(245,158,11,0.30)', borderWidth: 1 },
  badgeChipText: { color: '#FCD34D', fontFamily: 'DMSans_700Bold', fontSize: 11 },
});
