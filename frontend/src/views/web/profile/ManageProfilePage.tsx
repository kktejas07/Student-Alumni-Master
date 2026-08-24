/**
 * Page 2 — Manage Profile.
 * Sections: Profile Visibility, Resume & Documents, Profile Sections, Certifications, Earned Badges.
 */
import { useEffect, useState } from 'react';
import { View, Text, Pressable, Platform, ActivityIndicator } from 'react-native';
import { Card, ToggleRow, C } from './primitives';
import { Globe, Users, Lock, FileUp, Download, Trash2, Plus, Award, Star } from 'lucide-react-native';
import { request } from '@/src/models/services/api';
import { CertificatesCard } from '@/src/views/web/CertificatesCard';
import { MaterialBadgeStack } from '@/src/views/components/MaterialBadgeChip';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

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
  const isCollege = useAuthStore.getState().user?.role === 'college';

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
      {!isCollege && (
      <View nativeID="resume">
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
      </View>
      )}

      {/* Profile Sections */}
      <View nativeID="projects">
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
      </View>

      {/* Certifications (reuse existing CertificatesCard) */}
      {!isCollege && (
      <View nativeID="certifications">
        <CertificatesCard onChanged={onCertChange} />
      </View>
      )}

      {/* Earned Badges */}
      {!isCollege && (
      <Card title="Earned Badges" subtitle={`${badges.length} unlocked`}>
        {badges.length === 0 ? (
          <View style={st.empty}><Award size={28} color={C.text3} /><Text style={st.emptyText}>Earn badges by completing your profile and engaging with the platform.</Text></View>
        ) : (
          <MaterialBadgeStack badges={badges} size="sm" />
        )}
      </Card>
      )}
    </View>
  );
}
;
