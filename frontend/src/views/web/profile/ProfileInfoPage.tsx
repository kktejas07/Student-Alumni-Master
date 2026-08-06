/**
 * Page 1 — Profile Information.
 * Sections: Profile Completion banner, Basic Info, Contact, Academic, Interests, Social, Skills.
 */
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Platform, Alert, Modal } from 'react-native';
import { Mail, Phone, MapPin, Building2, Link2, Link2 as GithubIcon, Globe, Sparkles, Check, X, Upload, Camera, TrendingUp, AlertCircle, Plus, Trash2, Folder, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { WebcamModal } from '@/src/views/components/WebcamModal';
import { CompletionRing } from './CompletionRing';
import { Card, Field, TF, TA, SF, ChipPicker, C, PhoneField } from './primitives';
import { request } from '@/src/models/services/api';
import { useToast } from '@/src/views/components';
import { SuggestionAutocomplete } from '@/src/views/web/SuggestionAutocomplete';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

const CITY_LIST = [
  'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata',
  'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Kanpur', 'Indore',
  'Bhopal', 'Coimbatore', 'Nagpur', 'Surat', 'Vadodara', 'Patna',
  'Visakhapatnam', 'Kochi', 'Thiruvananthapuram', 'Chandigarh',
  'Guwahati', 'Bhubaneswar', 'Mysuru', 'Mangaluru', 'Vijayawada'
];

const STATE_LIST = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', ' त्रिपुरा', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

const TAXONOMY_KEYS = [
  "React", "React Native", "Next.js", "Node.js", "TypeScript", "JavaScript", "Python", "Java", "C++", 
  "Docker", "AWS", "MongoDB", "PostgreSQL", "SQL", "HTML", "CSS", "Machine Learning", "Data Science", 
  "System Design", "Teamwork", "Time Management", "Problem Solving", "Critical Thinking", "Adaptability", 
  "Communication", "Public Speaking", "Presentation", "Writing", "Leadership", "Management", "Mentoring", 
  "Project Management", "Networking", "LinkedIn", "Interview Prep", "Mock Interviews", "Resume Building"
];

const INTERESTS = [
  'Software Engineering', 'Product Management', 'Data Science', 'AI / ML',
  'Design / UX', 'Cybersecurity', 'Cloud / DevOps', 'Mobile Dev',
  'Web3 / Blockchain', 'Robotics', 'Finance', 'Consulting',
  'Marketing', 'Entrepreneurship', 'Civil Service', 'Research',
  'Healthcare', 'Education', 'Sustainability', 'Media',
];

const GRAD_YEARS = ['2024','2025','2026','2027','2028','2029','2030'];

const YEAR_OPTIONS = [
  '1st Year', '2nd Year', '3rd Year', '4th Year (Final Year)', '5th Year',
  'Class 11', 'Class 12', 'Graduated / Passout',
];

const STREAMS = [
  'MPC (Maths, Physics, Chemistry)',
  'BiPC (Biology, Physics, Chemistry)',
  'MEC (Maths, Economics, Commerce)',
  'CEC (Civics, Economics, Commerce)',
  'HEC (History, Economics, Civics)',
  'Science (PCM)', 'Science (PCB)', 'Science (PCMB)',
  'Commerce', 'Commerce (with Maths)', 'Arts / Humanities',
  'Vocational', 'Other',
];

const DEPARTMENTS = [
  'Computer Science', 'Information Technology', 'Electronics & Communication',
  'Electrical', 'Mechanical', 'Civil', 'Chemical',
  'Aerospace', 'Biotech', 'Metallurgy', 'Mathematics & Computing',
  'Business Administration', 'Economics', 'Design', 'Architecture',
  'Liberal Arts', 'Other',
];

interface Props {
  draft: any;
  setDraft: (updater: (d: any) => any) => void;
  completion: { percentage: number; items: { key: string; label: string; done: boolean }[] };
  onUploadPhoto: () => void;
  onTakeSelfie?: () => void;
}

export function ProfileInfoPage({ draft, setDraft, completion, onUploadPhoto, onTakeSelfie }: Props) {
  const isCollege = draft.role === 'college' || useAuthStore.getState().user?.role === 'college';
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const photo = pendingPhoto || (isCollege ? draft.college_logo_data : (draft.photo_data || draft.face_image_base64));
  const initials = ((draft.full_name || '?').split(' ').slice(0,2).map((s: string) => s[0] || '').join('') || '?').toUpperCase();

  const isMentor = !!onTakeSelfie;
  const themeColor = isMentor ? '#14B8A6' : '#A78BFA';
  const themeBg = isMentor ? 'rgba(20,184,166,0.15)' : 'rgba(167,139,250,0.15)';
  const themeBadgeBg = isMentor ? '#14B8A6' : '#7C3AED';

  const [modalVisible, setModalVisible] = useState(false);

  const handleOpenMenu = () => setModalVisible(true);
  const handleCloseMenu = () => setModalVisible(false);

  const setField = (k: string, v: any) => setDraft((d: any) => ({ ...d, [k]: v }));
  const interests: string[] = draft.interests || [];
  const projects = draft.projects || [];
  const [skillInput, setSkillInput] = useState('');
  const [webcamVisible, setWebcamVisible] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [projModalVisible, setProjModalVisible] = useState(false);
  
  const toast = useToast();
  
  // Skill Intelligence State
  const [skillIntel, setSkillIntel] = useState<any>(null);
  const [loadingIntel, setLoadingIntel] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<any>(null); // For modal

  useEffect(() => {
    fetchSkillIntelligence();
  }, []);

  const fetchSkillIntelligence = async () => {
    setLoadingIntel(true);
    try {
      const res = await request<any>('/users/me/skill-intelligence');
      setSkillIntel(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingIntel(false);
    }
  };

  const takeSelfie = async () => {
    if (Platform.OS === 'web') {
      setWebcamVisible(true);
      return;
    }
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Denied', 'Camera permission is required to take a selfie.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        cameraType: ImagePicker.CameraType.front,
        quality: 0.5,
        base64: true,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (!res.canceled && res.assets[0]?.base64) {
        const base64Photo = `data:image/jpeg;base64,${res.assets[0].base64}`;
        setPendingPhoto(base64Photo);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not open camera.');
    }
  };

  const pickBannerImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 1],
        quality: 0.6,
        base64: true,
      });
      if (!result.canceled && result.assets[0]?.base64) {
        setDraft((d: any) => ({ ...d, banner_data: `data:image/jpeg;base64,${result.assets[0].base64}` }));
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not pick image.');
    }
  };

  const pickCollegeLogo = async () => {
    if (Platform.OS === 'web') {
      const input = (document as any).createElement('input');
      input.type = 'file';
      input.accept = 'image/png,image/jpeg,image/webp';
      input.onchange = (e: any) => {
        const f = e.target.files?.[0]; if (!f) return;
        const r = new FileReader();
        r.onload = () => { setDraft((d: any) => ({ ...d, college_logo_data: r.result })); };
        r.readAsDataURL(f);
      };
      input.click();
      return;
    }
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });
      if (!result.canceled && result.assets[0]?.base64) {
        setDraft((d: any) => ({ ...d, college_logo_data: `data:image/jpeg;base64,${result.assets[0].base64}` }));
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not pick image.');
    }
  };

  const confirmPhoto = () => {
    if (pendingPhoto) {
      if (isCollege) {
        setDraft((d: any) => ({ ...d, college_logo_data: pendingPhoto }));
      } else {
        setDraft((d: any) => ({ ...d, photo_data: pendingPhoto, face_image_base64: pendingPhoto }));
      }
      setPendingPhoto(null);
    }
  };

  const addSkillsFromInput = async (skillToAdd?: string) => {
    const raw = skillToAdd || skillInput.trim();
    if (!raw) return;
    
    // Optimistic clear
    setSkillInput('');

    try {
      const res = await request<any>('/users/me/skills', {
        method: 'POST',
        body: { skill: raw }
      });
      
      if (res.status === 'exists') {
        toast.info('Skill exists', `${raw} is already on your profile.`);
        return;
      }
      
      // Update local draft array for legacy sync
      const existing: string[] = draft.skills || [];
      if (!existing.some(s => s.toLowerCase() === raw.toLowerCase())) {
        setField('skills', [...existing, raw]);
      }
      
      // Re-fetch intelligence to update UI
      await fetchSkillIntelligence();
      
      // Show instant impact toast
      if (res.skill && res.skill.weight) {
        const bScore = res.before_score || 0;
        const aScore = res.after_score || 0;
        const delta = Math.max(0, aScore - bScore);
        const bLevel = res.before_level || 'Explorer';
        const aLevel = res.after_level || 'Explorer';

        // Map display_category to a human-friendly singular label
        const CAT_LABELS: Record<string, string> = {
          technical_skills: 'Technical Skill',
          communication: 'Communication',
          soft_skills: 'Soft Skill',
          interview_prep: 'Interview Prep',
          networking: 'Networking',
          leadership: 'Leadership',
        };
        const rawCat = (res.skill.display_category || 'skill').toLowerCase();
        const catLabel = CAT_LABELS[rawCat] || (res.skill.display_category || 'Skill');

        let msg = `+${res.skill.weight} ${catLabel} Points`;
        if (delta > 0) msg += `\nCareer Readiness: +${Math.round(delta)}%`;
        if (bLevel !== aLevel) {
          msg += `\nLevel: ${bLevel} → ${aLevel} 🎉`;
        }

        toast.success('✓ Skill Analyzed', msg);
      }
      
    } catch (e: any) {
      toast.error('Failed to add skill', e?.message || 'Try again.');
      if (!skillToAdd) setSkillInput(raw); // restore
    }
  };

  const removeSkill = async (skillName: string) => {
    try {
      await request(`/users/me/skills/${encodeURIComponent(skillName)}`, { method: 'DELETE' });
      
      const existing: string[] = draft.skills || [];
      setField('skills', existing.filter((s) => s.toLowerCase() !== skillName.toLowerCase()));
      
      await fetchSkillIntelligence();
      toast.info('Removed', `${skillName} removed from profile.`);
    } catch (e) {
      toast.error('Error', 'Could not remove skill.');
    }
  };

  const filteredSuggestions = skillInput.length >= 2 
    ? TAXONOMY_KEYS.filter(k => k.toLowerCase().includes(skillInput.toLowerCase()) && 
      !(skillIntel?.skills || []).some((s: any) => s.skill_name.toLowerCase() === k.toLowerCase()))
      .slice(0, 3)
    : [];

  return (
    <View style={{ gap: 16, zIndex: 10, position: 'relative' }}>
      {/* Completion Banner */}
      {!isCollege && (
        <View style={[st.banner, completion.percentage >= 100 && st.bannerComplete]}>
          <CompletionRing pct={completion.percentage} size={92} color={completion.percentage >= 100 ? '#10B981' : '#A78BFA'} />
          <View style={{ flex: 1, minWidth: 0, gap: 10 }}>
            <Text style={st.bannerTitle}>Profile Completion</Text>
            <Text style={st.bannerSub}>Complete your profile to unlock personalized recommendations & higher trust signals.</Text>
            <View style={st.itemsRow}>
              {completion.items.map((it) => (
                <View key={it.key} style={[st.itemPill, it.done && st.itemPillDone]}>
                  {it.done ? <Check size={11} color={C.green} /> : <View style={st.dot} />}
                  <Text style={[st.itemPillText, it.done && { color: C.green }]}>{it.label}</Text>
                </View>
              ))}
              {completion.percentage >= 100 && (
                <View style={st.completePill}><Sparkles size={11} color="#fff" /><Text style={st.completePillText}>Complete</Text></View>
              )}
            </View>
          </View>
        </View>
      )}


      {/* College Banner Block (Outside Card) */}
      {isCollege && (
        <View style={{ marginBottom: 24, position: 'relative', zIndex: 10 }}>
          {/* Banner Container */}
          <View style={{ width: '100%', height: 180, borderRadius: 16, backgroundColor: '#131938', borderWidth: 1, borderColor: C.border, position: 'relative' }}>
            
            {/* Banner Image / Placeholder */}
            <View style={{ width: '100%', height: '100%', borderRadius: 16, overflow: 'hidden' }}>
              {draft.banner_data ? (
                <Image source={{ uri: draft.banner_data }} style={StyleSheet.absoluteFillObject} />
              ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <ImageIcon size={32} color={C.text3} />
                  <Text style={{ color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 13, marginTop: 8 }}>Banner: 1200x400px</Text>
                </View>
              )}
            </View>

            {/* Banner Controls (Top Left) */}
            <View style={{ position: 'absolute', top: 16, left: 16, flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={pickBannerImage} style={{ backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Upload size={14} color="#FFF" />
                <Text style={{ color: '#FFF', fontSize: 13, fontFamily: 'DMSans_700Bold' }}>Upload Banner</Text>
              </Pressable>
              {draft.banner_data && (
                <Pressable onPress={() => setDraft((d: any) => ({ ...d, banner_data: '' }))} style={{ backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 20 }}>
                  <Trash2 size={14} color="#FFF" />
                </Pressable>
              )}
            </View>

            {/* Profile Photo (Logo) on the Bottom Right */}
            <View style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 20 }}>
              <View style={{ width: 84, height: 84, borderRadius: 16, backgroundColor: '#0a0f1e', overflow: 'hidden', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
                {photo ? (
                  <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Text style={{ color: '#C4B5FD', fontFamily: 'DMSans_800ExtraBold', fontSize: 32 }}>{initials}</Text>
                )}
              </View>
              {/* Small camera edit button */}
              <Pressable
                onPress={pickCollegeLogo}
                style={{ position: 'absolute', bottom: -6, right: -6, width: 28, height: 28, borderRadius: 14, backgroundColor: '#A78BFA', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#131938' }}
                testID="pf-college-logo-upload"
              >
                <Camera size={14} color="#FFF" />
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Basic Information */}
      <Card title="Basic Information" subtitle="Your name, photo, and a short tagline.">
        {!isCollege && (
          <View style={st.photoRow}>
            <View style={{ position: 'relative' }}>
              <Pressable onPress={handleOpenMenu} style={st.avatarLg} testID="profile-avatar-upload">
                {photo ? (
                  <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Text style={st.avatarLgText}>{initials}</Text>
                )}
              </Pressable>
              {photo && (
                <View style={st.avatarCheck}>
                  <Check size={11} color="#fff" />
                </View>
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
              <Text style={st.photoTitle}>Profile Photo</Text>
              <Text style={st.photoHint}>JPG, PNG up to 5MB. Recommended 400x400px.</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                {pendingPhoto ? (
                  <>
                    <Pressable onPress={confirmPhoto} style={st.btnConfirm} testID="pf-confirm-photo">
                      <Check size={14} color="#FFF" />
                      <Text style={st.btnPrimaryText}>Confirm</Text>
                    </Pressable>
                    <Pressable onPress={() => { setPendingPhoto(null); if (onTakeSelfie) { onTakeSelfie(); } else { takeSelfie(); } }} style={st.btnGhost} testID="pf-retake-photo">
                      <Camera size={14} color={themeColor} />
                      <Text style={st.btnGhostText}>Retake</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Pressable onPress={onUploadPhoto} style={st.btnPrimary} testID="pf-upload-photo">
                      <Upload size={14} color="#FFF" />
                      <Text style={st.btnPrimaryText}>Upload Photo</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        if (onTakeSelfie) {
                          onTakeSelfie();
                        } else {
                          takeSelfie();
                        }
                      }}
                      style={st.btnPrimary}
                      testID="pf-take-selfie"
                    >
                      <Camera size={14} color="#FFF" />
                      <Text style={st.btnPrimaryText}>Take Selfie</Text>
                    </Pressable>
                    {photo && (
                      <Pressable onPress={() => {
                        setDraft((d: any) => ({ ...d, photo_data: '', face_image_base64: '' }));
                      }} style={st.btnGhost}>
                        <Text style={st.btnGhostText}>Remove</Text>
                      </Pressable>
                    )}
                  </>
                )}
              </View>

              <Text style={st.photoHint}>JPG, PNG up to 5MB. Click Upload Photo to select a file from your system or capture a webcam selfie.</Text>
            </View>
          </View>
        )}

        {/* Inline Action Selection Modal (Replaces native Modal to bypass web overlay issues) */}
        {modalVisible && (
          <View style={st.modalBackdrop}>
            <View style={st.modalCard}>
              {/* Header */}
              <View style={st.modalHeader}>
                <Text style={st.modalTitle}>Update Profile Photo</Text>
                <Pressable onPress={handleCloseMenu} style={st.modalCloseBtn}>
                  <X size={18} color="rgba(255,255,255,0.7)" />
                </Pressable>
              </View>

              {/* Selection Items */}
              <View style={{ width: '100%', gap: 10 }}>
                <Pressable
                  onPress={() => {
                    handleCloseMenu();
                    if (onTakeSelfie) {
                      onTakeSelfie();
                    } else {
                      takeSelfie();
                    }
                  }}
                  style={st.menuItem}
                  testID="pf-select-take-selfie"
                >
                  <Camera size={18} color={themeColor} />
                  <Text style={st.menuItemText}>Take Selfie</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    handleCloseMenu();
                    onUploadPhoto();
                  }}
                  style={st.menuItem}
                  testID="pf-select-upload-photo"
                >
                  <Upload size={18} color={themeColor} />
                  <Text style={st.menuItemText}>Upload Photo</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
        <View style={[st.row, { zIndex: 20 }]}>
          <Field label="First Name" half><TF value={draft.first_name || (draft.full_name||'').split(' ')[0] || ''} onChangeText={(v) => setField('first_name', v)} placeholder="Aarav" testID="pf-first-name" /></Field>
          <Field label="Last Name" half><TF value={draft.last_name || (draft.full_name||'').split(' ').slice(1).join(' ') || ''} onChangeText={(v) => setField('last_name', v)} placeholder="Sharma" testID="pf-last-name" /></Field>
        </View>
        {isCollege && (
          <Field label="College / Institution" hint="The name of your institution.">
            <TF value={draft.institution || ''} onChangeText={(v) => setField('institution', v)} leftIcon={<Building2 size={14} color={C.text2} />} placeholder="e.g. IIT Bombay" testID="pf-college-name" />
          </Field>
        )}
        <Field label="Headline / Tagline" hint="Appears below your name on your public profile.">
          <TF value={draft.headline || ''} onChangeText={(v) => setField('headline', v.slice(0, 100))} placeholder="Aspiring AI Engineer · IIT Bombay '26" testID="pf-headline" />
        </Field>
        <Field label="About / Bio" hint="Tell us about you in a few sentences.">
          <TA value={draft.bio || ''} onChangeText={(v) => setField('bio', v)} rows={4} placeholder="Passionate about building products at the intersection of design and ML…" testID="pf-bio" />
        </Field>
      </Card>

      {/* Contact Details */}
      <View style={{ zIndex: 50, position: 'relative' }}>
      <Card title="Contact Details" subtitle="How others can reach you (visible based on privacy settings).">
        <View style={[st.row, { zIndex: 19 }]}>
          <Field label="Email" half><TF value={draft.email || ''} onChangeText={() => {}} leftIcon={<Mail size={14} color={C.text2} />} testID="pf-email" /></Field>
          <Field label="Phone" half><PhoneField value={draft.phone || ''} onChange={(v) => setField('phone', v)} placeholder="Phone number" testID="pf-phone" /></Field>
        </View>
        <View style={[st.row, { zIndex: 18 }]}>
          <View style={{ flex: 1 }}>
            <SuggestionAutocomplete
              label="City"
              value={draft.city || ''}
              onChangeText={(v) => setField('city', v)}
              placeholder="e.g. Mumbai"
              suggestions={CITY_LIST}
            />
          </View>
          <View style={{ flex: 1 }}>
            <SuggestionAutocomplete
              label="State"
              value={draft.state || ''}
              onChangeText={(v) => setField('state', v)}
              placeholder="e.g. Maharashtra"
              suggestions={STATE_LIST}
            />
          </View>
        </View>
      </Card>
      </View>

      {/* Academic Details */}
      {!isCollege && (
        <View style={{ zIndex: 40, position: 'relative' }}>
        <Card title="Academic Details" subtitle="Your education info — used for matching with peers.">
          <Field label="College / University"><TF value={draft.institution || ''} onChangeText={(v) => setField('institution', v)} leftIcon={<Building2 size={14} color={C.text2} />} placeholder="e.g. IIT Bombay" testID="pf-college" /></Field>
          <View style={[st.row, { zIndex: 19 }]}>
            <Field label="Stream" half hint="Class 11/12 stream (MPC, PCM, Commerce, etc.)"><SF value={String(draft.stream || draft.school_info?.stream || draft.school_info?.branch_or_stream || '')} onChange={(v) => setField('stream', v)} options={STREAMS} placeholder="Select stream" testID="pf-stream" /></Field>
            <Field label="Year of Study" half hint="Current year / class (1st Year, 2nd Year, etc.)"><SF value={String(draft.class_or_year || draft.year_of_study || draft.school_info?.class_or_year || '')} onChange={(v) => { setField('class_or_year', v); setField('year_of_study', v); }} options={YEAR_OPTIONS} placeholder="Select year of study" testID="pf-year-of-study" /></Field>
          </View>
          <View style={[st.row, { zIndex: 18 }]}>
            <Field label="Branch / Major" half><TF value={draft.branch || ''} onChangeText={(v) => setField('branch', v)} placeholder="Computer Science" testID="pf-branch" /></Field>
            <Field label="Department" half hint="College department / faculty"><SF value={String(draft.department || '')} onChange={(v) => setField('department', v)} options={DEPARTMENTS} placeholder="Select department" testID="pf-department" /></Field>
          </View>
          <View style={[st.row, { zIndex: 17 }]}>
            <Field label="Graduation Year" half><SF value={String(draft.graduation_year || '')} onChange={(v) => setField('graduation_year', v)} options={GRAD_YEARS} placeholder="Select year" testID="pf-grad-year" /></Field>
            <Field label="CGPA / GPA" half hint="Optional — out of 10 (or your scale)."><TF value={String(draft.cgpa || '')} onChangeText={(v) => setField('cgpa', v)} placeholder="8.5" testID="pf-cgpa" /></Field>
          </View>
        </Card>

        {/* Interests */}
        <Card title="Interests & Career Focus" subtitle={`Pick at least 3 — used for personalized matches. (${interests.length}/${INTERESTS.length} selected)`}>
          <ChipPicker options={INTERESTS} selected={interests} onToggle={(o) => {
            setField('interests', interests.includes(o) ? interests.filter((x: string) => x !== o) : [...interests, o]);
          }} />
        </Card>
        </View>
      )}

      {/* Social Links */}
      <Card title="Social Links" subtitle="Show up on your network cards & profile detail.">
        <View nativeID="linkedin">
        <Field label="LinkedIn"><TF value={draft.linkedin_url || ''} onChangeText={(v) => setField('linkedin_url', v)} leftIcon={<Link2 size={14} color={C.text2} />} placeholder="https://linkedin.com/in/username" testID="pf-linkedin" /></Field>
        </View>
        <View nativeID="github">
        <Field label="GitHub"><TF value={draft.github_url || ''} onChangeText={(v) => setField('github_url', v)} leftIcon={<GithubIcon size={14} color={C.text2} />} placeholder="https://github.com/username" testID="pf-github" /></Field>
        </View>
        <Field label="Portfolio / Website"><TF value={draft.portfolio_url || ''} onChangeText={(v) => setField('portfolio_url', v)} leftIcon={<Globe size={14} color={C.text2} />} placeholder="https://yoursite.com" testID="pf-portfolio" /></Field>
      </Card>

      {/* Projects */}
      {!isCollege && (
      <Card
        title="Projects"
        subtitle="Showcase technical or professional projects you have built."
        action={
          <Pressable onPress={() => setProjModalVisible(true)} style={st.projHeaderAddBtn} testID="pf-projects-add-btn">
            <Plus size={13} color="#fff" />
            <Text style={st.projHeaderAddBtnText}>Add</Text>
          </Pressable>
        }
      >
        {projects.length === 0 ? (
          <View style={st.emptyProj}>
            <Folder size={28} color={C.text3} />
            <Text style={st.emptyProjText}>No projects added yet. Click Add to add your first project.</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {projects.map((proj: any, idx: number) => (
              <View key={idx} style={st.projRow}>
                <View style={st.projIcon}>
                  <Folder size={16} color={C.purple} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={st.projName} numberOfLines={1}>{proj.name || 'Untitled Project'}</Text>
                  {!!proj.description && <Text style={st.projDesc}>{proj.description}</Text>}
                </View>
                <Pressable
                  onPress={() => {
                    const newProjList = projects.filter((_: any, i: number) => i !== idx);
                    setField('projects', newProjList);
                  }}
                  style={st.projDelBtn}
                  testID={`pf-project-delete-${idx}`}
                >
                  <Trash2 size={14} color={C.rose} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </Card>
      )}

      {/* Skill Intelligence Experience */}
      {!isCollege && (
      <View nativeID="skills" style={{ zIndex: 99, position: 'relative' }}>
      <Card title="Skill Intelligence" subtitle="Add skills to instantly see how AI categorizes them and impacts your career readiness.">
        
        {/* Typeahead Input */}
        <View style={{ zIndex: 999, position: 'relative' }}>
          <View style={st.skillInputRow}>
            <View style={{ flex: 1 }}>
              <TF
                value={skillInput}
                onChangeText={setSkillInput}
                onSubmitEditing={() => addSkillsFromInput()}
                placeholder="e.g. React, Docker, Leadership"
                testID="pf-skills"
              />
            </View>
            <Pressable onPress={() => addSkillsFromInput()} style={st.skillAddBtn}>
              <Text style={st.skillAddBtnText}>Analyze & Add</Text>
            </Pressable>
          </View>
          
          {/* Suggestions Dropdown */}
          {filteredSuggestions.length > 0 && (
            <View style={st.suggestionsBox}>
              {filteredSuggestions.map(sug => (
                <Pressable key={sug} onPress={() => addSkillsFromInput(sug)} style={st.suggestionItem}>
                  <Sparkles size={12} color="#A78BFA" />
                  <Text style={st.suggestionText}>{sug}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Rich Skill Chips */}
        <View style={st.chipsContainer}>
          {(skillIntel?.skills || []).map((sk: any, i: number) => {
            const isAI = sk.source === 'ai';
            return (
              <Pressable key={sk._id || i} onPress={() => setSelectedSkill(sk)} style={st.richChip}>
                <View style={st.richChipTop}>
                  <Text style={st.richChipName}>{sk.skill_name}</Text>
                  <Pressable onPress={(e) => { e.stopPropagation(); removeSkill(sk.skill_name); }} style={st.richChipDel}>
                    <X size={12} color="rgba(255,255,255,0.4)" />
                  </Pressable>
                </View>
                <View style={st.richChipBottom}>
                  <View style={[st.richBadge, { backgroundColor: isAI ? 'rgba(236,72,153,0.15)' : 'rgba(16,185,129,0.15)' }]}>
                    <Text style={[st.richBadgeText, { color: isAI ? '#F472B6' : '#34D399' }]}>{sk.subcategory || 'Uncategorized'}</Text>
                  </View>
                  <View style={st.richBadge}>
                    <Text style={st.richBadgeText}>+{sk.weight || 0} Pts</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Intelligence Panel */}
        {skillIntel && skillIntel.analytics && (
          <View style={st.intelPanel}>
            <View style={st.intelHeader}>
              <TrendingUp size={16} color="#A78BFA" />
              <Text style={st.intelTitle}>Career Readiness Impact</Text>
            </View>
            
            <View style={st.intelGrid}>
              {Object.entries(skillIntel.analytics.display_categories || {}).filter(([_,v]) => (v as number) > 0).map(([k, v]) => (
                <View key={k} style={st.intelStat}>
                  <Text style={st.intelStatLabel}>{k.split('_').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ')}</Text>
                  <Text style={st.intelStatValue}>+{Math.round(v as number)} Points</Text>
                </View>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 16, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={st.intelSubHeading}>Detected Strengths</Text>
                {skillIntel.analytics.strengths?.length > 0 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {skillIntel.analytics.strengths.map((s: string) => (
                      <View key={s} style={st.strengthBadge}><Check size={10} color="#10B981"/><Text style={st.strengthText}>{s}</Text></View>
                    ))}
                  </View>
                ) : <Text style={st.intelEmpty}>No clear strengths yet.</Text>}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={st.intelSubHeading}>Missing Areas (Gaps)</Text>
                {skillIntel.analytics.gaps?.length > 0 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {skillIntel.analytics.gaps.map((g: string) => (
                      <View key={g} style={st.gapBadge}><AlertCircle size={10} color="#F59E0B"/><Text style={st.gapText}>{g.split('_').join(' ')}</Text></View>
                    ))}
                  </View>
                ) : <Text style={st.intelEmpty}>No critical gaps!</Text>}
              </View>
            </View>
          </View>
        )}
      </Card>
      </View>
      )}

      {/* Skill Details Modal */}
      {selectedSkill && (
        <View style={st.modalBackdrop}>
          <View style={st.modalCard}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Skill Intelligence Data</Text>
              <Pressable onPress={() => setSelectedSkill(null)} style={st.modalCloseBtn}>
                <X size={18} color="rgba(255,255,255,0.7)" />
              </Pressable>
            </View>
            
            <View style={{ width: '100%', gap: 12, alignItems: 'flex-start' }}>
              <Text style={{ color: '#fff', fontSize: 24, fontFamily: 'DMSans_700Bold' }}>{selectedSkill.skill_name}</Text>
              
              <View style={st.modalDetailRow}>
                <Text style={st.modalDetailLabel}>Subcategory:</Text>
                <Text style={st.modalDetailValue}>{selectedSkill.subcategory}</Text>
              </View>
              <View style={st.modalDetailRow}>
                <Text style={st.modalDetailLabel}>Career Category:</Text>
                <Text style={st.modalDetailValue}>{selectedSkill.display_category}</Text>
              </View>
              <View style={st.modalDetailRow}>
                <Text style={st.modalDetailLabel}>Weight / Impact:</Text>
                <Text style={st.modalDetailValue}>+{selectedSkill.weight} Points</Text>
              </View>
              <View style={st.modalDetailRow}>
                <Text style={st.modalDetailLabel}>Classification Source:</Text>
                <Text style={st.modalDetailValue}>{selectedSkill.source === 'ai' ? 'Emergent AI' : 'Taxonomy Engine'}</Text>
              </View>
              <View style={st.modalDetailRow}>
                <Text style={st.modalDetailLabel}>AI Confidence:</Text>
                <Text style={st.modalDetailValue}>{Math.round(selectedSkill.confidence * 100)}%</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Add Project Modal */}
      <Modal
        transparent
        visible={projModalVisible}
        animationType="fade"
        onRequestClose={() => { setProjModalVisible(false); setNewProjName(''); setNewProjDesc(''); }}
      >
        <View style={st.modalBackdrop}>
          <View style={[st.modalCard, { maxWidth: 450, alignItems: 'stretch' }]}>
            {/* Header */}
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Add a New Project</Text>
              <Pressable onPress={() => { setProjModalVisible(false); setNewProjName(''); setNewProjDesc(''); }} style={st.modalCloseBtn}>
                <X size={18} color="rgba(255,255,255,0.7)" />
              </Pressable>
            </View>

            {/* Form Fields */}
            <View style={{ gap: 12, width: '100%' }}>
              <Field label="Project Title / Name">
                <TF
                  value={newProjName}
                  onChangeText={setNewProjName}
                  placeholder="e.g. Portfolio Website, E-commerce App"
                  testID="pf-modal-project-name"
                />
              </Field>
              <Field label="Project Description">
                <TA
                  value={newProjDesc}
                  onChangeText={setNewProjDesc}
                  rows={4}
                  placeholder="Briefly describe what you built, technologies used, and outcomes…"
                  testID="pf-modal-project-desc"
                />
              </Field>
              <Pressable
                onPress={() => {
                  const trimmedName = newProjName.trim();
                  if (!trimmedName) {
                    toast.error('Required', 'Please enter a project name.');
                    return;
                  }
                  const newProjList = [...projects, { name: trimmedName, description: newProjDesc.trim() }];
                  setField('projects', newProjList);
                  setNewProjName('');
                  setNewProjDesc('');
                  setProjModalVisible(false);
                  toast.success('Added', `Project "${trimmedName}" added successfully.`);
                }}
                style={st.projAddBtn}
                testID="pf-modal-project-submit"
              >
                <Plus size={14} color="#FFF" />
                <Text style={st.projAddBtnText}>Add Project</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <WebcamModal
        visible={webcamVisible}
        onClose={() => setWebcamVisible(false)}
        onCapture={(base64) => {
          setPendingPhoto(base64);
          setWebcamVisible(false);
        }}
      />
    </View>
  );
}

const st = StyleSheet.create({
  banner: {
    flexDirection: 'row', gap: 18, alignItems: 'center',
    padding: 20, borderRadius: 16,
    backgroundColor: 'rgba(167,139,250,0.07)',
    borderColor: 'rgba(167,139,250,0.25)', borderWidth: 1,
  },
  bannerComplete: {
    backgroundColor: 'rgba(16,185,129,0.07)',
    borderColor: 'rgba(16,185,129,0.30)',
  },
  bannerTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 17 },
  bannerSub:   { color: 'rgba(255,255,255,0.65)', fontFamily: 'DMSans_400Regular', fontSize: 12.5 },
  completePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#10B981', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  completePillText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 11 },
  itemsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  itemPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.10)', borderWidth: 1,
  },
  itemPillDone: { backgroundColor: 'rgba(16,185,129,0.10)', borderColor: 'rgba(16,185,129,0.35)' },
  itemPillText: { color: 'rgba(255,255,255,0.65)', fontFamily: 'DMSans_600SemiBold', fontSize: 11 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.30)' },

  // Profile Photo section (new layout matching spec)
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginBottom: 4 },
  avatarLg: {
    width: 92, height: 92, borderRadius: 46, overflow: 'hidden', position: 'relative',
    backgroundColor: 'rgba(167,139,250,0.20)', alignItems: 'center', justifyContent: 'center',
    ...({ cursor: 'pointer' } as any),
  },
  avatarLgText: { color: '#A78BFA', fontFamily: 'DMSans_800ExtraBold', fontSize: 28 },
  avatarCheck: {
    position: 'absolute', bottom: 2, right: 2,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#10B981',
    alignItems: 'center', justifyContent: 'center',
    borderColor: '#0B0717', borderWidth: 2,
  },
  avatarBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#7C3AED',
    alignItems: 'center', justifyContent: 'center',
    borderColor: '#0B0717', borderWidth: 2,
  },
  modalBackdrop: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute' as any,
    top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.80)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 9999,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.25)',
    backgroundColor: '#13091F',
    padding: 20,
    alignItems: 'center',
    ...({
      backgroundImage: 'linear-gradient(180deg, #1A0E2E 0%, #0A0512 100%)' as any,
      boxShadow: '0px 16px 60px rgba(91,33,182,0.45)' as any,
    } as any),
  },
  modalHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#FFF',
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
  },
  modalCloseBtn: {
    padding: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  menuItemText: {
    color: 'rgba(255,255,255,0.90)',
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionClickBox: {
    flex: 1,
    height: 80,
    borderRadius: 12,
    backgroundColor: 'rgba(167,139,250,0.06)',
    borderColor: 'rgba(167,139,250,0.20)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transition: 'all 0.2s ease' } as any) : {}),
  },
  actionClickBoxText: {
    color: 'rgba(255,255,255,0.90)',
    fontFamily: 'DMSans_700Bold',
    fontSize: 12,
    textAlign: 'center',
  },
  photoTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 14 },
  photoHint: { color: 'rgba(255,255,255,0.60)', fontFamily: 'DMSans_400Regular', fontSize: 12 },

  btnPrimary: { flexDirection: 'row', gap: 6, paddingHorizontal: 14, height: 34, borderRadius: 8, backgroundColor: '#A78BFA', alignItems: 'center', justifyContent: 'center', ...(Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 55%, #6D28D9 100%)', boxShadow: '0 6px 18px rgba(124,58,237,0.35)' } as any) : {}), ...({ cursor: 'pointer' } as any) },
  btnConfirm: { flexDirection: 'row', gap: 6, paddingHorizontal: 14, height: 34, borderRadius: 8, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', ...(Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(135deg, #34D399 0%, #10B981 55%, #059669 100%)', boxShadow: '0 6px 18px rgba(16,185,129,0.35)' } as any) : {}), ...({ cursor: 'pointer' } as any) },
  btnPrimaryText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12 },
  btnGhost: { paddingHorizontal: 14, height: 34, borderRadius: 8, backgroundColor: 'rgba(167,139,250,0.10)', borderColor: 'rgba(167,139,250,0.30)', borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...(Platform.OS === 'web' ? ({ boxShadow: '0 4px 14px rgba(124,58,237,0.20)' } as any) : {}), ...({ cursor: 'pointer' } as any) },
  btnGhostText: { color: 'rgba(255,255,255,0.85)', fontFamily: 'DMSans_700Bold', fontSize: 12 },

  // legacy (unused, kept to prevent runtime undef from any stray ref)
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

  skillInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  skillAddBtn: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    borderColor: '#8B5CF6',
    borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 10px 24px rgba(124,58,237,0.30)' } as any) : {}),
    ...({ cursor: 'pointer' } as any),
  },
  skillAddBtnText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12 },
  
  // Suggestions
  suggestionsBox: {
    position: 'absolute', top: 48, left: 0, right: 0,
    backgroundColor: '#13091F', borderColor: 'rgba(167,139,250,0.25)', borderWidth: 1, borderRadius: 10,
    padding: 6, gap: 4, zIndex: 9999,
    ...(Platform.OS === 'web' ? { boxShadow: '0 10px 25px rgba(0,0,0,0.5)' } : {}),
  },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.03)', ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) },
  suggestionText: { color: '#E0E7FF', fontFamily: 'DMSans_500Medium', fontSize: 13 },

  // Rich Chips
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  richChip: {
    width: 160, padding: 12, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(167,139,250,0.15)', borderWidth: 1,
    gap: 8,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all 0.2s' } : {}),
  },
  richChipTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  richChipName: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 14 },
  richChipDel: { padding: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 6 },
  richChipBottom: { flexDirection: 'row', gap: 6 },
  richBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: 'rgba(167,139,250,0.15)' },
  richBadgeText: { color: '#C4B5FD', fontFamily: 'DMSans_700Bold', fontSize: 10 },

  // Intel Panel
  intelPanel: {
    marginTop: 20, padding: 16, borderRadius: 14,
    backgroundColor: 'rgba(15,23,42,0.6)', borderColor: 'rgba(51,65,85,0.5)', borderWidth: 1,
  },
  intelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  intelTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 14 },
  intelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  intelStat: { flex: 1, minWidth: 120, padding: 12, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1 },
  intelStatLabel: { color: '#94A3B8', fontFamily: 'DMSans_500Medium', fontSize: 11, marginBottom: 4 },
  intelStatValue: { color: '#34D399', fontFamily: 'DMSans_800ExtraBold', fontSize: 16 },
  intelSubHeading: { color: '#94A3B8', fontFamily: 'DMSans_700Bold', fontSize: 12, marginTop: 8 },
  intelEmpty: { color: 'rgba(255,255,255,0.4)', fontFamily: 'DMSans_400Regular', fontSize: 12, marginTop: 6 },
  strengthBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(16,185,129,0.1)' },
  strengthText: { color: '#34D399', fontFamily: 'DMSans_600SemiBold', fontSize: 11 },
  gapBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(245,158,11,0.1)' },
  gapText: { color: '#FCD34D', fontFamily: 'DMSans_600SemiBold', fontSize: 11 },

  // Modal specifics
  modalDetailRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingVertical: 8, borderBottomColor: 'rgba(255,255,255,0.05)', borderBottomWidth: 1 },
  modalDetailLabel: { color: '#94A3B8', fontFamily: 'DMSans_500Medium', fontSize: 13 },
  modalDetailValue: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 13 },

  // Projects section styles
  emptyProj: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  emptyProjText: {
    color: 'rgba(255,255,255,0.45)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    textAlign: 'center',
  },
  projRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
  },
  projIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(167,139,250,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  projName: {
    color: '#fff',
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
  },
  projDesc: {
    color: 'rgba(255,255,255,0.55)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 11.5,
    marginTop: 2,
  },
  projDelBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(244,63,94,0.40)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  projForm: {
    marginTop: 10,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  projFormTitle: {
    color: '#fff',
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
    marginBottom: 4,
  },
  projAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#A78BFA',
    ...(Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 55%, #6D28D9 100%)', boxShadow: '0 6px 18px rgba(124,58,237,0.35)' } as any) : {}),
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  projAddBtnText: {
    color: '#fff',
    fontFamily: 'DMSans_700Bold',
    fontSize: 12,
  },
  projHeaderAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#A78BFA',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  projHeaderAddBtnText: {
    color: '#fff',
    fontFamily: 'DMSans_700Bold',
    fontSize: 12,
  },
});
