/**
 * Page 1 — Profile Information.
 * Sections: Profile Completion banner, Basic Info, Contact, Academic, Interests, Social, Skills.
 */
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Image, Platform, Modal } from 'react-native';
import {
  Mail, Phone, MapPin, Building2, Link2, Link2 as GithubIcon, Globe, Sparkles, Check, X, Upload, Camera,
  TrendingUp, AlertCircle, Plus, Trash2, Folder, Image as ImageIcon, ShieldCheck, Shield, Lock, Eye, EyeOff
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { WebcamModal } from '@/src/views/components/WebcamModal';
import { CompletionRing } from './CompletionRing';
import { Card, Field, TF, TA, SF, ChipPicker, C, PhoneField } from './primitives';
import { request } from '@/src/models/services/api';
import { useToast } from '@/src/views/components';
import { SuggestionAutocomplete } from '@/src/views/web/SuggestionAutocomplete';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { DigiLockerOAuthModal } from './DigiLockerOAuthModal';

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

  // Identity & DigiLocker Verification State
  const [showAadhaar, setShowAadhaar] = useState(false);
  const [aadhaarVerifying, setAadhaarVerifying] = useState(false);
  const [digilockerSyncing, setDigilockerSyncing] = useState(false);
  const [digilockerModalVisible, setDigilockerModalVisible] = useState(false);

  const handleDigiLockerOAuthSuccess = (res: any) => {
    const fields = res.auto_filled_fields || {};
    setDraft((d: any) => ({
      ...d,
      aadhaar_number: fields.aadhaar_number || d.aadhaar_number,
      aadhaar_masked: fields.aadhaar_masked || d.aadhaar_masked,
      aadhaar_verified: true,
      digilocker_id: fields.digilocker_id || d.digilocker_id,
      digilocker_verified: true,
      digilocker_doc_count: fields.digilocker_doc_count || 3,
      institution: d.institution || fields.institution,
      board_or_university: d.board_or_university || fields.board_or_university,
      city: d.city || fields.city,
      state: d.state || fields.state,
    }));
    toast.success('DigiLocker & Aadhaar e-KYC Synced', 'Official identity and 3 academic credentials uploaded.');
  };

  const handleVerifyAadhaar = async () => {
    // Launch the official MeriPehchaan DigiLocker / Aadhaar OTP gateway
    setDigilockerModalVisible(true);
  };

  const handleLinkDigiLocker = async () => {
    // Launch the official MeriPehchaan DigiLocker / Aadhaar OTP gateway
    setDigilockerModalVisible(true);
  };

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
        toast.error('Permission denied', 'Camera permission is required to take a selfie.');
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
      toast.error('Camera error', 'Could not open camera.');
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
      toast.error('Image error', 'Could not pick image.');
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
      toast.error('Image error', 'Could not pick image.');
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

      {/* Government Identity & DigiLocker Verification */}
      <View style={{ zIndex: 45, position: 'relative' }}>
      <Card
        title="Government Identity & DigiLocker Verification"
        subtitle="Authenticate your National Identity (Aadhaar UIDAI) and link DigiLocker for instant academic credential verification."
      >
        <View style={{ gap: 14 }}>
          {/* Aadhaar Number Input & Verification */}
          <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={18} color="#10B981" />
                <Text style={{ color: '#F1F5F9', fontFamily: 'DMSans_700Bold', fontSize: 14 }}>Aadhaar Number (UIDAI)</Text>
              </View>
              {draft.aadhaar_verified ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(16,185,129,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(16,185,129,0.35)' }}>
                  <Check size={12} color="#10B981" />
                  <Text style={{ color: '#10B981', fontFamily: 'DMSans_700Bold', fontSize: 11 }}>UIDAI Authenticated</Text>
                </View>
              ) : (
                <View style={{ backgroundColor: 'rgba(245,158,11,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(245,158,11,0.35)' }}>
                  <Text style={{ color: '#F59E0B', fontFamily: 'DMSans_700Bold', fontSize: 11 }}>Pending Verification</Text>
                </View>
              )}
            </View>

            <Text style={{ color: '#94A3B8', fontSize: 12, lineHeight: 16 }}>
              Enter your 12-digit Aadhaar number. In compliance with UIDAI security standards, your Aadhaar is stored encrypted and auto-masked as <Text style={{ color: '#CBD5E1', fontFamily: 'DMSans_700Bold' }}>•••• •••• {String(draft.aadhaar_number || '').replace(/\D/g, '').slice(-4) || 'XXXX'}</Text>.
            </Text>

            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <View style={{ flex: 1, position: 'relative' }}>
                <TF
                  value={
                    showAadhaar
                      ? (draft.aadhaar_number || '')
                      : (draft.aadhaar_masked || (draft.aadhaar_number ? `•••• •••• ${String(draft.aadhaar_number).replace(/\D/g, '').slice(-4)}` : ''))
                  }
                  onChangeText={(v) => {
                    const clean = v.replace(/\D/g, '').slice(0, 12);
                    setField('aadhaar_number', clean);
                    if (clean.length >= 4) {
                      setField('aadhaar_masked', `•••• •••• ${clean.slice(-4)}`);
                    }
                  }}
                  leftIcon={<Lock size={14} color={C.text2} />}
                  placeholder="12-digit Aadhaar (e.g. 5489 2310 9874)"
                  testID="pf-aadhaar"
                />
              </View>

              <Pressable
                onPress={() => setShowAadhaar(!showAadhaar)}
                style={{ height: 42, paddingHorizontal: 12, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}
                testID="pf-toggle-aadhaar"
              >
                {showAadhaar ? <EyeOff size={16} color="#94A3B8" /> : <Eye size={16} color="#94A3B8" />}
              </Pressable>

              <Pressable
                onPress={handleVerifyAadhaar}
                disabled={aadhaarVerifying || !draft.aadhaar_number}
                style={{
                  height: 42,
                  paddingHorizontal: 14,
                  borderRadius: 10,
                  backgroundColor: draft.aadhaar_verified ? 'rgba(16,185,129,0.20)' : '#7C3AED',
                  borderWidth: 1,
                  borderColor: draft.aadhaar_verified ? '#10B981' : '#8B5CF6',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: (aadhaarVerifying || !draft.aadhaar_number) ? 0.6 : 1
                }}
                testID="pf-verify-aadhaar-btn"
              >
                <Text style={{ color: '#FFF', fontFamily: 'DMSans_700Bold', fontSize: 12 }}>
                  {aadhaarVerifying ? 'Verifying…' : (draft.aadhaar_verified ? 'Re-Verify' : 'Verify UIDAI')}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* DigiLocker Account Linking */}
          <View style={{ backgroundColor: 'rgba(124,58,237,0.04)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(124,58,237,0.22)', gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Globe size={18} color="#8B5CF6" />
                <Text style={{ color: '#F1F5F9', fontFamily: 'DMSans_700Bold', fontSize: 14 }}>DigiLocker & Academic Bank of Credits (ABC)</Text>
              </View>
              {draft.digilocker_verified ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(16,185,129,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(16,185,129,0.35)' }}>
                  <Check size={12} color="#10B981" />
                  <Text style={{ color: '#10B981', fontFamily: 'DMSans_700Bold', fontSize: 11 }}>Linked ({draft.digilocker_doc_count || 3} Docs)</Text>
                </View>
              ) : (
                <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
                  <Text style={{ color: '#94A3B8', fontFamily: 'DMSans_700Bold', fontSize: 11 }}>Not Connected</Text>
                </View>
              )}
            </View>

            <Text style={{ color: '#94A3B8', fontSize: 12, lineHeight: 16 }}>
              Connect your Government DigiLocker account to automatically pull & verify your official degrees, marksheets, and Academic Bank of Credits (ABC) credentials.
            </Text>

            {draft.digilocker_verified && (
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                <View style={{ backgroundColor: 'rgba(16,185,129,0.10)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)' }}>
                  <Text style={{ color: '#34D399', fontSize: 11, fontWeight: '600' }}>✓ NAD Degree Certificate</Text>
                </View>
                <View style={{ backgroundColor: 'rgba(16,185,129,0.10)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)' }}>
                  <Text style={{ color: '#34D399', fontSize: 11, fontWeight: '600' }}>✓ ABC ID (Ministry of Education)</Text>
                </View>
                <View style={{ backgroundColor: 'rgba(16,185,129,0.10)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)' }}>
                  <Text style={{ color: '#34D399', fontSize: 11, fontWeight: '600' }}>✓ 10th & 12th Board Marksheet</Text>
                </View>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 2 }}>
              <Pressable
                onPress={handleLinkDigiLocker}
                disabled={digilockerSyncing}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                  borderRadius: 10,
                  backgroundColor: draft.digilocker_verified ? 'rgba(124,58,237,0.18)' : '#7C3AED',
                  borderWidth: 1,
                  borderColor: '#8B5CF6',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6
                }}
                testID="pf-digilocker-link-btn"
              >
                <Globe size={14} color="#FFF" />
                <Text style={{ color: '#FFF', fontFamily: 'DMSans_700Bold', fontSize: 12 }}>
                  {digilockerSyncing ? 'Connecting to DigiLocker…' : (draft.digilocker_verified ? 'Re-Sync DigiLocker Documents' : 'Connect DigiLocker (1-Click)')}
                </Text>
              </Pressable>

              {draft.digilocker_verified && (
                <Pressable
                  onPress={() => {
                    setField('digilocker_verified', false);
                    setField('digilocker_id', null);
                    setField('digilocker_doc_count', 0);
                    toast.info('DigiLocker Unlinked', 'Document connection has been removed.');
                  }}
                  style={{ paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.10)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)' }}
                >
                  <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '600' }}>Disconnect</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Card>
      </View>

      {/* Academic Details */}
      {!isCollege && (
        <View style={{ zIndex: 40, position: 'relative' }}>
        <Card title="Academic Details" subtitle="Your education info — used for matching with peers.">
          <Field label="College / University"><TF value={draft.institution || ''} onChangeText={(v) => setField('institution', v)} leftIcon={<Building2 size={14} color={C.text2} />} placeholder="e.g. IIT Bombay" testID="pf-college" /></Field>
          <Field label="Board / University" hint="Affiliating board or university"><TF value={String(draft.board_or_university || draft.school_info?.board_or_university || '')} onChangeText={(v) => setField('board_or_university', v)} leftIcon={<Building2 size={14} color={C.text2} />} placeholder="e.g. CBSE, State Board, JNTUH" testID="pf-board" /></Field>
          <View style={[st.row, { zIndex: 19 }]}>
            <Field label="Stream" half hint="Class 11/12 stream (MPC, PCM, Commerce, etc.)"><SF value={String(draft.stream || draft.school_info?.stream || draft.school_info?.branch_or_stream || '')} onChange={(v) => setField('stream', v)} options={STREAMS} placeholder="Select stream" testID="pf-stream" /></Field>
            <Field label="Year of Study" half hint="Current year / class (1st Year, 2nd Year, etc.)"><SF value={String(draft.class_or_year || draft.year_of_study || draft.year || draft.school_info?.class_or_year || '')} onChange={(v) => { setField('class_or_year', v); setField('year_of_study', v); setField('year', v); }} options={YEAR_OPTIONS} placeholder="Select year of study" testID="pf-year-of-study" /></Field>
          </View>
          <View style={[st.row, { zIndex: 18 }]}>
            <Field label="Branch / Major" half><TF value={draft.branch || ''} onChangeText={(v) => setField('branch', v)} placeholder="Computer Science" testID="pf-branch" /></Field>
            <Field label="Department" half hint="College department / faculty"><SF value={String(draft.department || draft.school_info?.department || '')} onChange={(v) => setField('department', v)} options={DEPARTMENTS} placeholder="Select department" testID="pf-department" /></Field>
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
                <Text style={st.modalDetailValue}>{selectedSkill.source === 'ai' ? 'AI' : 'Taxonomy Engine'}</Text>
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

      <DigiLockerOAuthModal
        visible={digilockerModalVisible}
        onClose={() => setDigilockerModalVisible(false)}
        userId={draft.id || draft._id}
        onSuccess={handleDigiLockerOAuthSuccess}
      />
    </View>
  );
}
;
