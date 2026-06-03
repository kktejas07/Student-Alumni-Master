/**
 * Mentor Portal — Profile & Settings View (Redesigned)
 * Matches the high-fidelity mockups with Manage Profile and Tools & Integrations tabs.
 * Built on top of unified project icon shims and MaterialCommunityIcons.
 */
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Image, Platform, ActivityIndicator, useWindowDimensions, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { CompletionRing } from '@/src/views/web/profile/CompletionRing';
import { useToast } from '@/src/views/components';
import { MC, FONTS } from '../tokens';
import { Av } from '../atoms';

// Import icons from student iconShims to prevent lucide-react-native undefined errors
import {
  User, Settings, Bell, ShieldCheck, IdCard, CheckCircle2, Award, Sparkles,
  CalendarCheck, UsersRound, Eye, Star, IndianRupee, Linkedin, Github, Globe2,
  MapPin, Briefcase, GraduationCap, Plus, X, Clock, MessageSquare, Gift,
  CreditCard, TrendingUp, Calendar, Users, Plug
} from '../../student/iconShims';

type TabKey = 'manage' | 'tools-integrations' | 'settings' | 'security' | 'notifications' | 'digital-id';

const TABS: { key: TabKey; label: string; Icon: any }[] = [
  { key: 'manage',             label: 'Manage Profile',       Icon: User },
  { key: 'tools-integrations', label: 'Tools & Integrations', Icon: Plug },
  { key: 'settings',           label: 'Settings',             Icon: Settings },
  { key: 'security',           label: 'Security',             Icon: ShieldCheck },
  { key: 'notifications',      label: 'Notifications',        Icon: Bell },
  { key: 'digital-id',         label: 'Digital ID Card',      Icon: IdCard },
];

export function MentorProfileSettingsView() {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((u) => u.user);
  
  const { width: winW } = useWindowDimensions();
  const stack = winW < 1100;

  const [activeTab, setActiveTab] = useState<TabKey>('manage');
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // --- Profile state variables (Manage Profile Tab) ---
  const [fullName, setFullName] = useState('Dr. Suresh Rao');
  const [role, setRole] = useState('CTO');
  const [company, setCompany] = useState('Zepto');
  const [college, setCollege] = useState('IIT Bombay');
  const [bio, setBio] = useState('CTO at Zepto with 15+ years building distributed systems at scale. IIT Bombay alumnus passionate about mentoring the next generation of engineers and entrepreneurs.');
  
  const [linkedinUrl, setLinkedinUrl] = useState('linkedin.com/in/sureshrao');
  const [githubUrl, setGithubUrl] = useState('github.com/sureshrao');
  const [sessionPrice, setSessionPrice] = useState('999');
  
  const [expertise, setExpertise] = useState<string[]>(['System Design', 'Career Guidance', 'Startup Advice']);
  const [newExpertiseInput, setNewExpertiseInput] = useState('');
  
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'network' | 'private'>('public');
  
  const [sectionToggles, setSectionToggles] = useState({
    expertise: true,
    history: true,
    reviews: true,
    awards: true,
    calendar: true
  });

  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiError, setAiError] = useState(false);

  // --- Tools & Integrations state variables ---
  const [googleMeetEmail, setGoogleMeetEmail] = useState('sureshrao@gmail.com');
  const [googleMeetConnected, setGoogleMeetConnected] = useState(true);

  const [zoomEmail, setZoomEmail] = useState('');
  const [zoomConnected, setZoomConnected] = useState(false);

  const [teamsEmail, setTeamsEmail] = useState('');
  const [teamsConnected, setTeamsConnected] = useState(false);

  const [googleCalendarEmail, setGoogleCalendarEmail] = useState('sureshrao@gmail.com');
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(true);

  const [notionEmail, setNotionEmail] = useState('');
  const [notionConnected, setNotionConnected] = useState(false);

  const [slackEmail, setSlackEmail] = useState('');
  const [slackConnected, setSlackConnected] = useState(false);

  const [defaultSessionPlatform, setDefaultSessionPlatform] = useState<'Google Meet' | 'Zoom' | 'Microsoft Teams'>('Google Meet');

  // --- Settings tab state variables ---
  const [showEmail, setShowEmail] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [showRecentActivity, setShowRecentActivity] = useState(true);
  const [showConnections, setShowConnections] = useState(true);
  const [appearInSearch, setAppearInSearch] = useState(true);
  const [acceptDMs, setAcceptDMs] = useState(true);

  const [aiSummaries, setAiSummaries] = useState(true);
  const [studentMatch, setStudentMatch] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(false);

  const [language, setLanguage] = useState('English');
  const [timezone, setTimezone] = useState('Asia/Kolkata (IST)');
  const [theme, setTheme] = useState<'Dark' | 'Light' | 'System'>('Dark');

  const [savedSettings, setSavedSettings] = useState({
    showEmail: false,
    showPhone: false,
    showRecentActivity: true,
    showConnections: true,
    appearInSearch: true,
    acceptDMs: true,
    aiSummaries: true,
    studentMatch: true,
    weeklyReports: false,
    language: 'English',
    timezone: 'Asia/Kolkata (IST)',
    theme: 'Dark' as 'Dark' | 'Light' | 'System'
  });

  // Load from initial user context if available
  useEffect(() => {
    if (user) {
      const u = user as any;
      if (u.full_name) setFullName(u.full_name);
      if (u.bio) setBio(u.bio);
      if (u.linkedin_url) setLinkedinUrl(u.linkedin_url);
      if (u.github_url) setGithubUrl(u.github_url);
      if (u.skills && u.skills.length > 0) setExpertise(u.skills);
    }
  }, [user]);

  // Check if anything is dirty
  const isDirty = () => {
    if (activeTab === 'manage') {
      const u = user as any;
      const isUserChanged = u ? (
        fullName !== (u.full_name || 'Dr. Suresh Rao') ||
        bio !== (u.bio || '') ||
        linkedinUrl !== (u.linkedin_url || '') ||
        githubUrl !== (u.github_url || '')
      ) : true;
      return isUserChanged || role !== 'CTO' || company !== 'Zepto' || college !== 'IIT Bombay' || sessionPrice !== '999' || profileVisibility !== 'public';
    }
    if (activeTab === 'settings') {
      return (
        showEmail !== savedSettings.showEmail ||
        showPhone !== savedSettings.showPhone ||
        showRecentActivity !== savedSettings.showRecentActivity ||
        showConnections !== savedSettings.showConnections ||
        appearInSearch !== savedSettings.appearInSearch ||
        acceptDMs !== savedSettings.acceptDMs ||
        aiSummaries !== savedSettings.aiSummaries ||
        studentMatch !== savedSettings.studentMatch ||
        weeklyReports !== savedSettings.weeklyReports ||
        language !== savedSettings.language ||
        timezone !== savedSettings.timezone ||
        theme !== savedSettings.theme
      );
    }
    return false;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));
      const now = new Date();
      setLastSavedAt(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      
      if (activeTab === 'settings') {
        setSavedSettings({
          showEmail,
          showPhone,
          showRecentActivity,
          showConnections,
          appearInSearch,
          acceptDMs,
          aiSummaries,
          studentMatch,
          weeklyReports,
          language,
          timezone,
          theme
        });
        toast.success('Saved', 'Settings saved successfully.');
      } else {
        toast.success('Saved', 'Profile updated successfully.');
      }
    } catch {
      toast.error('Save failed', 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (activeTab === 'manage') {
      const u = user as any;
      setFullName(u?.full_name || 'Dr. Suresh Rao');
      setRole('CTO');
      setCompany('Zepto');
      setCollege('IIT Bombay');
      setBio(u?.bio || 'CTO at Zepto with 15+ years building distributed systems at scale. IIT Bombay alumnus passionate about mentoring the next generation of engineers and entrepreneurs.');
      setLinkedinUrl(u?.linkedin_url || 'linkedin.com/in/sureshrao');
      setGithubUrl(u?.github_url || 'github.com/sureshrao');
      setSessionPrice('999');
      setProfileVisibility('public');
      setSectionToggles({
        expertise: true,
        history: true,
        reviews: true,
        awards: true,
        calendar: true
      });
      setExpertise(['System Design', 'Career Guidance', 'Startup Advice']);
    } else if (activeTab === 'settings') {
      setShowEmail(savedSettings.showEmail);
      setShowPhone(savedSettings.showPhone);
      setShowRecentActivity(savedSettings.showRecentActivity);
      setShowConnections(savedSettings.showConnections);
      setAppearInSearch(savedSettings.appearInSearch);
      setAcceptDMs(savedSettings.acceptDMs);
      setAiSummaries(savedSettings.aiSummaries);
      setStudentMatch(savedSettings.studentMatch);
      setWeeklyReports(savedSettings.weeklyReports);
      setLanguage(savedSettings.language);
      setTimezone(savedSettings.timezone);
      setTheme(savedSettings.theme);
    }
    toast.info('Reverted', 'Changes discarded.');
  };

  // Expertise helpers
  const handleAddExpertise = () => {
    if (newExpertiseInput.trim() && !expertise.includes(newExpertiseInput.trim())) {
      setExpertise([...expertise, newExpertiseInput.trim()]);
      setNewExpertiseInput('');
    }
  };

  const handleRemoveExpertise = (tag: string) => {
    setExpertise(expertise.filter((e) => e !== tag));
  };

  // AI Profile Strength Analysis Simulator
  const handleAnalyzeProfile = () => {
    setAiAnalyzing(true);
    setAiError(false);
    setTimeout(() => {
      setAiAnalyzing(false);
      setAiError(true);
    }, 700);
  };

  // Profile Score calculation based on filled elements
  const getProfileCompletionScore = () => {
    let score = 50; // base score
    if (fullName.trim()) score += 10;
    if (role.trim() && company.trim()) score += 10;
    if (college.trim()) score += 10;
    if (bio.length > 30) score += 10;
    if (linkedinUrl.trim() || githubUrl.trim()) score += 10;
    return Math.min(100, score);
  };

  const completionPct = getProfileCompletionScore();

  return (
    <View style={{ gap: 16 }}>
      
      {/* Dynamic Header Card */}
      <View style={[st.headerCard, stack && { flexDirection: 'column' }]}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 16, minWidth: 0 }}>
          <View style={{ position: 'relative' }}>
            <View style={st.avatar}>
              <Text style={st.avatarText}>SR</Text>
            </View>
            <View style={st.avatarCheck}><CheckCircle2 size={11} color="#fff" /></View>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.name}>{fullName}</Text>
            <Text style={st.subline}>{role} - {company}</Text>
            
            <View style={st.badgeRow}>
              <View style={[st.headerBadge, { backgroundColor: 'rgba(245,158,11,0.14)', borderColor: 'rgba(245,158,11,0.4)' }]}>
                <Star size={11} color="#F59E0B" fill="#F59E0B" />
                <Text style={[st.headerBadgeText, { color: '#F59E0B' }]}>4.9 rating</Text>
              </View>
              <View style={[st.headerBadge, { backgroundColor: 'rgba(34,197,94,0.14)', borderColor: 'rgba(34,197,94,0.4)' }]}>
                <Text style={[st.headerBadgeText, { color: '#4ADE80' }]}>142 sessions</Text>
              </View>
              <View style={[st.headerBadge, { backgroundColor: 'rgba(20,184,166,0.14)', borderColor: 'rgba(20,184,166,0.4)' }]}>
                <CheckCircle2 size={11} color={MC.tealP} />
                <Text style={[st.headerBadgeText, { color: MC.tealP }]}>Verified Mentor</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Tabs list */}
      <View style={st.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 6 }}>
          {TABS.map((t) => {
            const Icon = t.Icon;
            const active = activeTab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => {
                  if (t.key === 'digital-id') { router.push('/member-id'); return; }
                  setActiveTab(t.key);
                }}
                style={[st.tab, active && st.tabActive]}
              >
                <Icon size={14} color={active ? '#0F2922' : MC.muted} />
                <Text style={[st.tabText, active && { color: '#0F2922', fontFamily: FONTS.bold }]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Main split grid */}
      <View style={[stack ? { flexDirection: 'column' } : { flexDirection: 'row' }, { gap: 16, alignItems: 'flex-start' }]}>
        
        {/* Left Column (Forms) */}
        <View style={{ flex: 1, minWidth: 0, gap: 16 }}>

          {activeTab === 'manage' && (
            // MANAGE PROFILE TAB CONTENT (Screens 1, 2, 3)
            <View style={{ gap: 16 }}>
              
              {/* Basic Information */}
              <View style={st.formSectionCard}>
                <Text style={st.sectionTitle}>BASIC INFORMATION</Text>
                
                {/* Photo editor */}
                <View style={st.photoEditBox}>
                  <View style={st.photoPill}>
                    <Text style={st.photoPillText}>SR</Text>
                  </View>
                  <View style={{ gap: 6 }}>
                    <Text style={st.photoTitle}>Profile Photo</Text>
                    <Text style={st.photoMeta}>JPG, PNG up to 5MB · Recommended 400×400px</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                      <Pressable style={st.uploadBtn} onPress={() => alert('Mock: Uploading Profile Photo')}><Text style={st.uploadBtnText}>Upload Photo</Text></Pressable>
                      <Pressable style={st.removeBtn} onPress={() => alert('Mock: Removed Photo')}><Text style={st.removeBtnText}>Remove</Text></Pressable>
                    </View>
                  </View>
                </View>

                {/* Name & Role Title row */}
                <View style={st.inputGridRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.inputLabel}>Full Name</Text>
                    <View style={st.inputBox}>
                      <TextInput value={fullName} onChangeText={setFullName} placeholder="Dr. Suresh Rao" style={st.input} placeholderTextColor={MC.dim} />
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.inputLabel}>Role / Title</Text>
                    <View style={st.inputBox}>
                      <TextInput value={role} onChangeText={setRole} placeholder="CTO" style={st.input} placeholderTextColor={MC.dim} />
                    </View>
                  </View>
                </View>

                {/* Company & Alma Mater row */}
                <View style={st.inputGridRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.inputLabel}>Company</Text>
                    <View style={st.inputBox}>
                      <TextInput value={company} onChangeText={setCompany} placeholder="Zepto" style={st.input} placeholderTextColor={MC.dim} />
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.inputLabel}>Alma Mater</Text>
                    <View style={st.inputBox}>
                      <TextInput value={college} onChangeText={setCollege} placeholder="IIT Bombay" style={st.input} placeholderTextColor={MC.dim} />
                    </View>
                  </View>
                </View>

                {/* Bio text field */}
                <View style={{ marginTop: 12 }}>
                  <Text style={st.inputLabel}>Bio</Text>
                  <View style={[st.inputBox, { minHeight: 80, alignItems: 'flex-start' }]}>
                    <TextInput
                      value={bio}
                      onChangeText={setBio}
                      multiline
                      numberOfLines={3}
                      placeholder="Tell students about your background and what you offer as a mentor."
                      placeholderTextColor={MC.dim}
                      style={[st.input, { flex: 1, height: '100%', textAlignVertical: 'top' }]}
                    />
                  </View>
                  <Text style={st.inputHelpText}>Tell students about your background and what you offer as a mentor.</Text>
                </View>
              </View>

              {/* Social Links & Session Price */}
              <View style={st.formSectionCard}>
                <Text style={st.sectionTitle}>SOCIAL LINKS & SESSION PRICE</Text>

                <View style={st.inputGridRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.inputLabel}>LinkedIn</Text>
                    <View style={st.inputBoxIcon}>
                      <Linkedin size={14} color={MC.dim} style={{ marginRight: 8 }} />
                      <TextInput value={linkedinUrl} onChangeText={setLinkedinUrl} placeholder="linkedin.com/in/sureshrao" style={[st.input, { flex: 1 }]} placeholderTextColor={MC.dim} />
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.inputLabel}>GitHub</Text>
                    <View style={st.inputBoxIcon}>
                      <Github size={14} color={MC.dim} style={{ marginRight: 8 }} />
                      <TextInput value={githubUrl} onChangeText={setGithubUrl} placeholder="github.com/sureshrao" style={[st.input, { flex: 1 }]} placeholderTextColor={MC.dim} />
                    </View>
                  </View>
                </View>

                <View style={{ marginTop: 12 }}>
                  <Text style={st.inputLabel}>Session Price (₹)</Text>
                  <View style={st.inputBoxIcon}>
                    <IndianRupee size={14} color={MC.dim} style={{ marginRight: 6 }} />
                    <TextInput value={sessionPrice} onChangeText={setSessionPrice} keyboardType="numeric" placeholder="999" style={[st.input, { flex: 1 }]} placeholderTextColor={MC.dim} />
                  </View>
                  <Text style={st.inputHelpText}>Shown to students when booking a session with you.</Text>
                </View>
              </View>

              {/* Areas of Expertise */}
              <View style={st.formSectionCard}>
                <Text style={st.sectionTitle}>AREAS OF EXPERTISE</Text>
                
                {/* Pills list */}
                <View style={st.skillsRow}>
                  {expertise.map((tag) => (
                    <View key={tag} style={st.skillPill}>
                      <Text style={st.skillPillText}>{tag}</Text>
                      <Pressable onPress={() => handleRemoveExpertise(tag)} style={st.skillRemoveBtn}>
                        <X size={11} color={MC.tealP} />
                      </Pressable>
                    </View>
                  ))}
                </View>

                {/* Add Input */}
                <View style={st.addExpertiseRow}>
                  <View style={[st.inputBox, { flex: 1 }]}>
                    <TextInput
                      value={newExpertiseInput}
                      onChangeText={setNewExpertiseInput}
                      placeholder="Add expertise..."
                      placeholderTextColor={MC.dim}
                      onSubmitEditing={handleAddExpertise}
                      style={st.input}
                    />
                  </View>
                  <Pressable onPress={handleAddExpertise} style={st.addBtn}>
                    <Plus size={14} color={MC.bg} />
                    <Text style={st.addBtnText}>Add</Text>
                  </Pressable>
                </View>
              </View>

              {/* Profile Visibility */}
              <View style={st.formSectionCard}>
                <Text style={st.sectionTitle}>PROFILE VISIBILITY</Text>
                <Text style={st.sectionHelpText}>Control who can see your mentor profile.</Text>

                <View style={{ gap: 10, marginTop: 4 }}>
                  <CustomRadio
                    selected={profileVisibility === 'public'}
                    onPress={() => setProfileVisibility('public')}
                    label="Public"
                    sub="Visible to all students, alumni and mentors on the platform."
                  />
                  <CustomRadio
                    selected={profileVisibility === 'network'}
                    onPress={() => setProfileVisibility('network')}
                    label="My Network Only"
                    sub="Only people you're connected with can see your full profile."
                  />
                  <CustomRadio
                    selected={profileVisibility === 'private'}
                    onPress={() => setProfileVisibility('private')}
                    label="Private"
                    sub="Only you can see your profile. New bookings will be paused."
                  />
                </View>
              </View>

              {/* Profile Sections Toggles */}
              <View style={st.formSectionCard}>
                <Text style={st.sectionTitle}>PROFILE SECTIONS</Text>
                <Text style={st.sectionHelpText}>Choose which sections appear on your public mentor profile.</Text>

                <View style={{ gap: 12, marginTop: 12 }}>
                  <ToggleRow
                    label="Areas of Expertise"
                    value={sectionToggles.expertise}
                    onValueChange={(val) => setSectionToggles({ ...sectionToggles, expertise: val })}
                  />
                  <ToggleRow
                    label="Session History"
                    value={sectionToggles.history}
                    onValueChange={(val) => setSectionToggles({ ...sectionToggles, history: val })}
                  />
                  <ToggleRow
                    label="Student Reviews"
                    value={sectionToggles.reviews}
                    onValueChange={(val) => setSectionToggles({ ...sectionToggles, reviews: val })}
                  />
                  <ToggleRow
                    label="Achievements & Awards"
                    value={sectionToggles.awards}
                    onValueChange={(val) => setSectionToggles({ ...sectionToggles, awards: val })}
                  />
                  <ToggleRow
                    label="Availability Calendar"
                    value={sectionToggles.calendar}
                    onValueChange={(val) => setSectionToggles({ ...sectionToggles, calendar: val })}
                  />
                </View>
              </View>

              {/* Profile Strength Analysis */}
              <View style={st.formSectionCard}>
                <Text style={st.sectionTitle}>PROFILE STRENGTH ANALYSIS</Text>
                <Text style={st.sectionHelpText}>Get AI recommendations to improve your profile and increase session bookings.</Text>
                
                <View style={{ marginTop: 12, gap: 10, alignItems: 'flex-start' }}>
                  <Pressable
                    onPress={handleAnalyzeProfile}
                    disabled={aiAnalyzing}
                    style={st.aiAnalyzeBtn}
                  >
                    {aiAnalyzing ? (
                      <ActivityIndicator size="small" color={MC.tealP} />
                    ) : (
                      <>
                        <Sparkles size={14} color={MC.tealP} />
                        <Text style={st.aiAnalyzeBtnText}>Analyze Profile Strength</Text>
                      </>
                    )}
                  </Pressable>

                  {aiError && (
                    <Text style={st.aiErrorText}>AI unavailable. Please try again.</Text>
                  )}
                </View>
              </View>

            </View>
          )}

          {activeTab === 'tools-integrations' && (
            // TOOLS & INTEGRATIONS TAB CONTENT (Screens 4, 5)
            <View style={{ gap: 16 }}>
              
              {/* Main title banner */}
              <View style={st.formSectionCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={st.toolsIconCircle}>
                    <MaterialCommunityIcons name="briefcase-edit-outline" size={16} color={MC.tealP} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 15 }}>Tools & Integrations</Text>
                    <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 2 }}>Connect your video, calendar and productivity tools to streamline your mentoring sessions.</Text>
                  </View>
                </View>
              </View>

              {/* Video Conferencing */}
              <View style={st.formSectionCard}>
                <Text style={st.sectionTitle}>VIDEO CONFERENCING</Text>

                <View style={{ gap: 12, marginTop: 4 }}>
                  
                  {/* Google Meet (Connected) */}
                  <View style={st.integrationRow}>
                    <View style={st.integrationLeft}>
                      <View style={st.integrationIconSquare}>
                        <MaterialCommunityIcons name="video-outline" size={18} color={MC.tealP} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={st.integrationName}>Google Meet</Text>
                          <View style={st.connectedBadge}><Text style={st.connectedBadgeText}>Connected</Text></View>
                        </View>
                        <Text style={st.integrationEmail}>{googleMeetEmail}</Text>
                      </View>
                    </View>
                    <Pressable onPress={() => { setGoogleMeetConnected(false); setGoogleMeetEmail(''); }} style={st.disconnectBtn}>
                      <Text style={st.disconnectBtnText}>Disconnect</Text>
                    </Pressable>
                  </View>

                  {/* Zoom */}
                  <View style={st.integrationRow}>
                    <View style={st.integrationLeft}>
                      <View style={st.integrationIconSquare}>
                        <MaterialCommunityIcons name="video-outline" size={18} color={MC.dim} />
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={st.integrationName}>Zoom</Text>
                        <Text style={st.integrationDesc}>Host sessions on Zoom with auto-generated links</Text>
                        {!zoomConnected && (
                          <View style={st.inputBox}>
                            <TextInput value={zoomEmail} onChangeText={setZoomEmail} placeholder="your@email.com" placeholderTextColor={MC.dim} style={st.input} />
                          </View>
                        )}
                        {zoomConnected && <Text style={st.integrationEmail}>{zoomEmail}</Text>}
                      </View>
                    </View>
                    <Pressable
                      onPress={() => {
                        if (zoomConnected) { setZoomConnected(false); setZoomEmail(''); }
                        else { if (!zoomEmail) { alert('Please enter Zoom email'); return; } setZoomConnected(true); }
                      }}
                      style={[st.connectBtnStyle, zoomConnected && st.disconnectBtnStyle]}
                    >
                      <Text style={[st.connectBtnStyleText, zoomConnected && { color: MC.red }]}>{zoomConnected ? 'Disconnect' : 'Connect'}</Text>
                    </Pressable>
                  </View>

                  {/* Microsoft Teams */}
                  <View style={st.integrationRow}>
                    <View style={st.integrationLeft}>
                      <View style={st.integrationIconSquare}>
                        <MaterialCommunityIcons name="microsoft-teams" size={18} color={MC.dim} />
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={st.integrationName}>Microsoft Teams</Text>
                        <Text style={st.integrationDesc}>Schedule and host via Microsoft Teams</Text>
                        {!teamsConnected && (
                          <View style={st.inputBox}>
                            <TextInput value={teamsEmail} onChangeText={setTeamsEmail} placeholder="your@email.com" placeholderTextColor={MC.dim} style={st.input} />
                          </View>
                        )}
                        {teamsConnected && <Text style={st.integrationEmail}>{teamsEmail}</Text>}
                      </View>
                    </View>
                    <Pressable
                      onPress={() => {
                        if (teamsConnected) { setTeamsConnected(false); setTeamsEmail(''); }
                        else { if (!teamsEmail) { alert('Please enter Teams email'); return; } setTeamsConnected(true); }
                      }}
                      style={[st.connectBtnStyle, teamsConnected && st.disconnectBtnStyle]}
                    >
                      <Text style={[st.connectBtnStyleText, teamsConnected && { color: MC.red }]}>{teamsConnected ? 'Disconnect' : 'Connect'}</Text>
                    </Pressable>
                  </View>

                </View>
              </View>

              {/* Calendar & Productivity */}
              <View style={st.formSectionCard}>
                <Text style={st.sectionTitle}>CALENDAR & PRODUCTIVITY</Text>

                <View style={{ gap: 12, marginTop: 4 }}>
                  
                  {/* Google Calendar */}
                  <View style={st.integrationRow}>
                    <View style={st.integrationLeft}>
                      <View style={st.integrationIconSquare}>
                        <MaterialCommunityIcons name="calendar-outline" size={18} color={MC.tealP} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={st.integrationName}>Google Calendar</Text>
                          <View style={st.connectedBadge}><Text style={st.connectedBadgeText}>Connected</Text></View>
                        </View>
                        <Text style={st.integrationEmail}>{googleCalendarEmail}</Text>
                      </View>
                    </View>
                    <Pressable onPress={() => { setGoogleCalendarConnected(false); setGoogleCalendarEmail(''); }} style={st.disconnectBtn}>
                      <Text style={st.disconnectBtnText}>Disconnect</Text>
                    </Pressable>
                  </View>

                  {/* Notion */}
                  <View style={st.integrationRow}>
                    <View style={st.integrationLeft}>
                      <View style={st.integrationIconSquare}>
                        <MaterialCommunityIcons name="notebook-outline" size={18} color={MC.dim} />
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={st.integrationName}>Notion</Text>
                        <Text style={st.integrationDesc}>Auto-create session notes in Notion</Text>
                        {!notionConnected && (
                          <View style={st.inputBox}>
                            <TextInput value={notionEmail} onChangeText={setNotionEmail} placeholder="your@email.com" placeholderTextColor={MC.dim} style={st.input} />
                          </View>
                        )}
                        {notionConnected && <Text style={st.integrationEmail}>{notionEmail}</Text>}
                      </View>
                    </View>
                    <Pressable
                      onPress={() => {
                        if (notionConnected) { setNotionConnected(false); setNotionEmail(''); }
                        else { if (!notionEmail) { alert('Please enter Notion email'); return; } setNotionConnected(true); }
                      }}
                      style={[st.connectBtnStyle, notionConnected && st.disconnectBtnStyle]}
                    >
                      <Text style={[st.connectBtnStyleText, notionConnected && { color: MC.red }]}>{notionConnected ? 'Disconnect' : 'Connect'}</Text>
                    </Pressable>
                  </View>

                  {/* Slack */}
                  <View style={st.integrationRow}>
                    <View style={st.integrationLeft}>
                      <View style={st.integrationIconSquare}>
                        <MaterialCommunityIcons name="slack" size={18} color={MC.dim} />
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={st.integrationName}>Slack</Text>
                        <Text style={st.integrationDesc}>Get session reminders and alerts on Slack</Text>
                        {!slackConnected && (
                          <View style={st.inputBox}>
                            <TextInput value={slackEmail} onChangeText={setSlackEmail} placeholder="your@email.com" placeholderTextColor={MC.dim} style={st.input} />
                          </View>
                        )}
                        {slackConnected && <Text style={st.integrationEmail}>{slackEmail}</Text>}
                      </View>
                    </View>
                    <Pressable
                      onPress={() => {
                        if (slackConnected) { setSlackConnected(false); setSlackEmail(''); }
                        else { if (!slackEmail) { alert('Please enter Slack email'); return; } setSlackConnected(true); }
                      }}
                      style={[st.connectBtnStyle, slackConnected && st.disconnectBtnStyle]}
                    >
                      <Text style={[st.connectBtnStyleText, slackConnected && { color: MC.red }]}>{slackConnected ? 'Disconnect' : 'Connect'}</Text>
                    </Pressable>
                  </View>

                </View>
              </View>

              {/* Default Session Platform */}
              <View style={st.formSectionCard}>
                <Text style={st.sectionTitle}>DEFAULT SESSION PLATFORM</Text>
                <Text style={st.sectionHelpText}>When a student books a session, links will be auto-generated using your default platform.</Text>
                
                <View style={st.platformSelectorRow}>
                  {['Google Meet', 'Zoom', 'Microsoft Teams'].map((plat: any) => {
                    const isSelected = defaultSessionPlatform === plat;
                    return (
                      <Pressable
                        key={plat}
                        onPress={() => setDefaultSessionPlatform(plat)}
                        style={[
                          st.platformTab,
                          isSelected && { backgroundColor: MC.tealP + '14', borderColor: MC.tealP }
                        ]}
                      >
                        <View style={{
                          width: 14, height: 14, borderRadius: 7, borderWidth: 2,
                          borderColor: isSelected ? MC.tealP : MC.dim, alignItems: 'center', justifyContent: 'center',
                          marginRight: 6
                        }}>
                          {isSelected && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: MC.tealP }} />}
                        </View>
                        <Text style={[st.platformTabText, isSelected && { color: '#fff', fontFamily: FONTS.bold }]}>{plat}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

            </View>
          )}

          {activeTab === 'settings' && (
            <View style={{ gap: 16 }}>
              
              {/* PRIVACY CONTROLS */}
              <View style={st.formSectionCard}>
                <Text style={st.sectionTitle}>PRIVACY CONTROLS</Text>
                <View style={{ gap: 4 }}>
                  <ToggleRow
                    label="Show Email on Profile"
                    subtext="Students and alumni can see your email address"
                    value={showEmail}
                    onValueChange={setShowEmail}
                  />
                  <ToggleRow
                    label="Show Phone Number"
                    subtext="Your phone number is visible on your profile"
                    value={showPhone}
                    onValueChange={setShowPhone}
                  />
                  <ToggleRow
                    label="Show Recent Activity"
                    subtext="Others can see when you were last active"
                    value={showRecentActivity}
                    onValueChange={setShowRecentActivity}
                  />
                  <ToggleRow
                    label="Show My Connections"
                    subtext="Your connections list is visible to others"
                    value={showConnections}
                    onValueChange={setShowConnections}
                  />
                  <ToggleRow
                    label="Appear in Search Results"
                    subtext="Your profile shows up when students search for mentors"
                    value={appearInSearch}
                    onValueChange={setAppearInSearch}
                  />
                  <ToggleRow
                    label="Accept Direct Messages"
                    subtext="Allow students to message you before booking"
                    value={acceptDMs}
                    onValueChange={setAcceptDMs}
                    isLast
                  />
                </View>
              </View>

              {/* AI & SUGGESTIONS */}
              <View style={st.formSectionCard}>
                <Text style={st.sectionTitle}>AI & SUGGESTIONS</Text>
                <View style={{ gap: 4 }}>
                  <ToggleRow
                    label="AI Session Summaries"
                    subtext="Auto-generate session summaries after each call"
                    value={aiSummaries}
                    onValueChange={setAiSummaries}
                  />
                  <ToggleRow
                    label="Student Match Suggestions"
                    subtext="AI recommends students whose goals fit your expertise"
                    value={studentMatch}
                    onValueChange={setStudentMatch}
                  />
                  <ToggleRow
                    label="Weekly Insight Reports"
                    subtext="Get a weekly AI report on your mentoring performance"
                    value={weeklyReports}
                    onValueChange={setWeeklyReports}
                    isLast
                  />
                </View>
              </View>

              {/* APP PREFERENCES */}
              <View style={st.formSectionCard}>
                <Text style={st.sectionTitle}>APP PREFERENCES</Text>
                <View style={st.inputGridRow}>
                  <CustomDropdown
                    label="Language"
                    value={language}
                    options={['English']}
                    onSelect={setLanguage}
                  />
                  <CustomDropdown
                    label="Timezone"
                    value={timezone}
                    options={['Asia/Kolkata (IST)']}
                    onSelect={setTimezone}
                  />
                </View>
                <View style={{ marginTop: 12 }}>
                  <Text style={st.inputLabel}>Theme</Text>
                  <View style={st.themeSelectorRow}>
                    {(['Dark', 'Light', 'System'] as const).map((t) => {
                      const isSelected = theme === t;
                      const emoji = t === 'Dark' ? '🌙' : t === 'Light' ? '☀️' : '💻';
                      return (
                        <Pressable
                          key={t}
                          onPress={() => setTheme(t)}
                          style={[
                            st.themeTab,
                            isSelected && { backgroundColor: MC.tealP + '14', borderColor: MC.tealP }
                          ]}
                        >
                          <Text style={[st.themeTabText, isSelected && { color: '#fff', fontFamily: FONTS.bold }]}>
                            {emoji} {t}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* ACCOUNT */}
              <View style={st.formSectionCard}>
                <Text style={st.sectionTitle}>ACCOUNT</Text>
                <View style={{ gap: 4 }}>
                  <AccountActionRow
                    title="Change Password"
                    subtext="Last changed 3 months ago"
                    btnText="Update"
                    onPress={() => toast.info('Update Password', 'Check your email for the password reset link.')}
                  />
                  <AccountActionRow
                    title="Download My Data"
                    subtext="Export all your data as a JSON file"
                    btnText="Export"
                    onPress={() => toast.success('Export Triggered', 'Exporting your personal data package...')}
                  />
                  <AccountActionRow
                    title="Pause Mentoring"
                    subtext="Temporarily stop accepting new bookings"
                    btnText="Pause"
                    onPress={() => toast.info('Mentoring status updated', 'Your bookings have been temporarily paused.')}
                  />
                  <AccountActionRow
                    title="Delete Account"
                    subtext="Permanently delete your account and all data"
                    btnText="Delete"
                    isDelete
                    isLast
                    onPress={() => toast.error('Account Action', 'Account deletion request submitted. Please check email to confirm.')}
                  />
                </View>
              </View>

            </View>
          )}

          {activeTab === 'security' && (
            <View style={st.comingSoonCard}>
              <MaterialCommunityIcons name="shield-check-outline" size={32} color={MC.tealP} />
              <Text style={st.comingSoonTitle}>Security Centre</Text>
              <Text style={st.comingSoonDesc}>Two-factor authentication setup, session history tracking and password settings land in Phase 2.</Text>
            </View>
          )}

          {activeTab === 'notifications' && (
            <View style={st.comingSoonCard}>
              <MaterialCommunityIcons name="bell-outline" size={32} color={MC.tealP} />
              <Text style={st.comingSoonTitle}>Notification Preferences</Text>
              <Text style={st.comingSoonDesc}>Fine-tune your email, SMS and push notification alerts inside the dashboard in Phase 2.</Text>
            </View>
          )}

          {/* Action buttons (Manage Profile, Integrations & Settings) */}
          {(activeTab === 'manage' || activeTab === 'tools-integrations' || activeTab === 'settings') && (
            <View style={st.saveBar}>
              <Text style={st.saveBarStatusText}>
                {lastSavedAt ? `Last saved at ${lastSavedAt}` : (isDirty() ? 'You have unsaved changes' : 'All changes saved')}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable onPress={handleDiscard} disabled={!isDirty()} style={[st.discardBtn, !isDirty() && { opacity: 0.5 }]}>
                  <Text style={st.discardBtnText}>Discard</Text>
                </Pressable>
                <Pressable onPress={handleSave} disabled={saving} style={[st.saveBtn, { backgroundColor: MC.tealP }]}>
                  <Text style={st.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
                </Pressable>
              </View>
            </View>
          )}

        </View>

        {/* Right Column (Sidebar) */}
        <View style={{ width: stack ? '100%' : 320, gap: 16 }}>
          
          {/* Profile Score Card */}
          <View style={st.sidebarCard}>
            <View style={{ alignItems: 'center', gap: 10 }}>
              <CompletionRing
                pct={completionPct}
                size={110}
                stroke={8}
                color={completionPct >= 100 ? '#10B981' : MC.tealP}
              />
              <Text style={st.sidebarCardTitle}>Profile Score</Text>
              <Text style={st.sidebarCardSub}>{completionPct >= 100 ? 'All complete!' : `${100 - completionPct}% to go`}</Text>
              <View style={st.saIdBadge}>
                <Text style={st.saIdText}>SA-08-438291</Text>
              </View>
            </View>
          </View>

          {/* Mentor Stats Card */}
          <View style={st.sidebarCard}>
            <Text style={st.sidebarHeading}>MENTOR STATS</Text>
            <View style={{ marginTop: 8, gap: 2 }}>
              <SidebarStatRow Icon={CalendarCheck} label="Sessions Hosted" value="142 completed" color="#10B981" />
              <SidebarStatRow Icon={UsersRound} label="Active Mentees" value="18" color="#3B82F6" />
              <SidebarStatRow Icon={Eye} label="Profile Views" value="1,248" color={MC.tealP} />
              <SidebarStatRow Icon={Star} label="Avg Rating" value="4.9★" color="#F59E0B" />
              <SidebarStatRow Icon={IndianRupee} label="Earnings (Month)" value="₹28,500" color="#22C55E" isLast />
            </View>
          </View>

          {/* Mentor ID Card */}
          <View style={st.sidebarCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <ShieldCheck size={14} color={MC.tealP} />
              <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13 }}>Mentor ID</Text>
            </View>
            <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 18, letterSpacing: 0.5 }}>SA-08-438291</Text>
            <Text style={{ color: MC.dim, fontFamily: FONTS.med, fontSize: 11, marginTop: 4 }}>Verified · since 2008</Text>
            <Pressable
              onPress={() => router.push('/member-id')}
              style={st.viewIdBtn}
            >
              <IdCard size={14} color="#0F2922" />
              <Text style={st.viewIdBtnText}>View Digital ID Card →</Text>
            </Pressable>
          </View>

        </View>

      </View>
    </View>
  );
}

// --- Helper Components ---

function ToggleRow({
  label,
  subtext,
  value,
  onValueChange,
  isLast,
}: {
  label: string;
  subtext?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  isLast?: boolean;
}) {
  return (
    <View style={[st.toggleRow, subtext ? st.settingToggleRow : null, !isLast && subtext ? st.settingRowDivider : null]}>
      <View style={{ flex: 1, marginRight: 16 }}>
        <Text style={[st.toggleRowLabel, subtext ? { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 } : null]}>{label}</Text>
        {subtext ? <Text style={{ color: MC.dim, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 3 }}>{subtext}</Text> : null}
      </View>
      <Pressable
        onPress={() => onValueChange(!value)}
        style={[
          st.switchTrack,
          value ? { backgroundColor: MC.tealP, borderColor: MC.tealP } : { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: MC.border }
        ]}
      >
        <View style={[st.switchThumb, { transform: [{ translateX: value ? 16 : 0 }] }]} />
      </Pressable>
    </View>
  );
}

function CustomDropdown({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleClick = (e: MouseEvent) => {
      if (wrapRef.current && wrapRef.current.contains && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
    }
    return () => {
      if (Platform.OS === 'web') document.removeEventListener('mousedown', handleClick);
    };
  }, [open]);

  return (
    <View ref={wrapRef} style={[{ flex: 1, position: 'relative' }, Platform.OS === 'web' ? { zIndex: open ? 9999 : 1 } as any : { zIndex: open ? 9999 : 1 }]}>
      <Text style={st.inputLabel}>{label}</Text>
      <Pressable
        style={[st.inputBoxIcon, open && { borderColor: MC.tealP, backgroundColor: MC.tealP + '08' }]}
        onPress={() => setOpen((o) => !o)}
      >
        <Text style={{ color: '#fff', fontFamily: FONTS.med, fontSize: 12.5, flex: 1 }}>{value}</Text>
        <MaterialCommunityIcons name={open ? "chevron-up" : "chevron-down"} size={16} color={MC.dim} />
      </Pressable>
      {open && (
        <View style={st.ddMenu}>
          <ScrollView nestedScrollEnabled={true} keyboardShouldPersistTaps="handled" style={{ maxHeight: 220 }}>
            {options.map((o) => (
              <Pressable
                key={o}
                onPress={() => {
                  onSelect(o);
                  setOpen(false);
                }}
                style={st.ddItem}
              >
                <Text style={[st.ddText, value === o && { color: MC.tealP, fontFamily: FONTS.bold }]}>{o}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function AccountActionRow({
  title,
  subtext,
  btnText,
  onPress,
  isDelete,
  isLast,
}: {
  title: string;
  subtext: string;
  btnText: string;
  onPress: () => void;
  isDelete?: boolean;
  isLast?: boolean;
}) {
  return (
    <View style={[st.accountRow, !isLast && st.settingRowDivider]}>
      <View style={{ flex: 1, marginRight: 16 }}>
        <Text style={st.accountRowTitle}>{title}</Text>
        <Text style={st.accountRowSub}>{subtext}</Text>
      </View>
      <Pressable
        onPress={onPress}
        style={[
          st.accountBtn,
          isDelete ? st.accountBtnDelete : st.accountBtnNormal
        ]}
      >
        <Text style={[st.accountBtnText, isDelete && { color: MC.red }]}>{btnText}</Text>
      </Pressable>
    </View>
  );
}

function CustomRadio({ selected, onPress, label, sub }: { selected: boolean; onPress: () => void; label: string; sub: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        st.radioOption,
        selected && { borderColor: MC.tealP, backgroundColor: MC.tealP + '0a' }
      ]}
    >
      <View style={[st.radioOutline, selected && { borderColor: MC.tealP }]}>
        {selected && <View style={st.radioCircle} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[st.radioLabel, selected && { color: '#fff', fontFamily: FONTS.bold }]}>{label}</Text>
        <Text style={st.radioSub}>{sub}</Text>
      </View>
    </Pressable>
  );
}

function SidebarStatRow({ Icon, label, value, color, isLast }: { Icon: any; label: string; value: string; color: string; isLast?: boolean }) {
  return (
    <View style={[st.statRow, !isLast && st.statRowDivider]}>
      <View style={[st.statIconContainer, { backgroundColor: color + '15', borderColor: color + '30' }]}>
        <Icon size={13} color={color} />
      </View>
      <Text style={st.statLabel}>{label}</Text>
      <Text style={st.statValue}>{value}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  headerCard: {
    backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1,
    borderRadius: 16, padding: 18,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: MC.teal + '20', alignItems: 'center', justifyContent: 'center',
    borderColor: MC.teal + '40', borderWidth: 2
  },
  avatarText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 24 },
  avatarCheck: {
    position: 'absolute', bottom: 1, right: 1,
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#10B981',
    alignItems: 'center', justifyContent: 'center', borderColor: MC.bg, borderWidth: 2
  },
  name: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 20, letterSpacing: -0.4 },
  subline: { color: MC.muted, fontFamily: FONTS.med, fontSize: 13, marginTop: 2 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, alignItems: 'center' },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1,
  },
  headerBadgeText: { fontFamily: FONTS.bold, fontSize: 10.5 },

  // Tab bar styles
  tabBar: {
    backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1,
    borderRadius: 12, padding: 6,
  },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    ...({ cursor: 'pointer' } as any)
  },
  tabActive: { backgroundColor: MC.tealP },
  tabText: { color: MC.muted, fontFamily: FONTS.bold, fontSize: 11.5 },

  // Left Column Content card
  formSectionCard: { backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 16 },
  sectionTitle: { color: MC.muted, fontFamily: FONTS.xbold, fontSize: 10.5, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 },
  sectionHelpText: { color: MC.dim, fontFamily: FONTS.med, fontSize: 12, marginTop: -8, marginBottom: 12 },
  
  // Basic Info details
  photoEditBox: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  photoPill: { width: 64, height: 64, borderRadius: 32, backgroundColor: MC.tealP + '18', borderColor: MC.tealP + '35', borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  photoPillText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 22 },
  photoTitle: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13.5 },
  photoMeta: { color: MC.dim, fontFamily: FONTS.med, fontSize: 11 },
  uploadBtn: { paddingHorizontal: 11, height: 28, borderRadius: 6, backgroundColor: MC.tealP, alignItems: 'center', justifyContent: 'center', ...({ cursor: 'pointer' } as any) },
  uploadBtnText: { color: MC.bg, fontFamily: FONTS.bold, fontSize: 11.5 },
  removeBtn: { paddingHorizontal: 11, height: 28, borderRadius: 6, borderWidth: 1, borderColor: MC.border2, backgroundColor: 'rgba(255,255,255,0.02)', alignItems: 'center', justifyContent: 'center', ...({ cursor: 'pointer' } as any) },
  removeBtnText: { color: MC.muted, fontFamily: FONTS.med, fontSize: 11.5 },

  // Inputs
  inputGridRow: { flexDirection: 'row', gap: 12 },
  inputLabel: { color: MC.muted, fontFamily: FONTS.bold, fontSize: 11.5, marginBottom: 5 },
  inputBox: { backgroundColor: MC.bg2, borderColor: MC.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4, height: 38 },
  inputBoxIcon: { backgroundColor: MC.bg2, borderColor: MC.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', height: 38 },
  input: { color: '#fff', fontFamily: FONTS.med, fontSize: 12.5, paddingVertical: 6, width: '100%', ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  inputHelpText: { color: MC.dim, fontFamily: FONTS.med, fontSize: 10.5, marginTop: 4 },

  // Skills Section
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  skillPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(20,184,166,0.1)', borderColor: MC.border2, borderWidth: 1, borderRadius: 8, paddingLeft: 10, paddingRight: 6, height: 28 },
  skillPillText: { color: MC.tealP, fontFamily: FONTS.bold, fontSize: 11.5 },
  skillRemoveBtn: { padding: 2, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.02)', ...({ cursor: 'pointer' } as any) },
  addExpertiseRow: { flexDirection: 'row', gap: 10 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, borderRadius: 8, backgroundColor: MC.tealP, ...({ cursor: 'pointer' } as any) },
  addBtnText: { color: MC.bg, fontFamily: FONTS.bold, fontSize: 12 },

  // Radio button visibility options
  radioOption: { flexDirection: 'row', alignItems: 'center', borderWithValue: 1, borderColor: MC.border, borderWidth: 1, borderRadius: 10, padding: 12, backgroundColor: MC.bg2, ...({ cursor: 'pointer' } as any) },
  radioOutline: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: MC.dim, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  radioCircle: { width: 8, height: 8, borderRadius: 4, backgroundColor: MC.tealP },
  radioLabel: { color: MC.muted, fontFamily: FONTS.bold, fontSize: 12.5 },
  radioSub: { color: MC.dim, fontFamily: FONTS.med, fontSize: 11, marginTop: 2 },

  // Toggle switch row
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  toggleRowLabel: { color: MC.muted, fontFamily: FONTS.med, fontSize: 12.5 },
  switchTrack: { width: 36, height: 20, borderRadius: 10, borderWidth: 1, justifyContent: 'center', paddingHorizontal: 2, ...({ cursor: 'pointer', transitionDuration: '180ms' } as any) },
  switchThumb: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#fff', ...({ transitionDuration: '180ms' } as any) },

  // AI profile strength
  aiAnalyzeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 32, borderRadius: 8, borderWidth: 1, borderColor: MC.border2, backgroundColor: 'rgba(255,255,255,0.02)', ...({ cursor: 'pointer' } as any) },
  aiAnalyzeBtnText: { color: MC.tealP, fontFamily: FONTS.bold, fontSize: 11.5 },
  aiErrorText: { color: MC.red, fontFamily: FONTS.bold, fontSize: 11 },

  // Tools icon banner header
  toolsIconCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: MC.tealP + '14', borderColor: MC.tealP + '30', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  // Integration card details
  integrationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  integrationLeft: { flexDirection: 'row', gap: 12, flex: 1, minWidth: 0 },
  integrationIconSquare: { width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center' },
  integrationName: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },
  integrationEmail: { color: MC.tealP, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 1 },
  integrationDesc: { color: MC.dim, fontFamily: FONTS.med, fontSize: 11, marginTop: 1 },
  connectedBadge: { backgroundColor: 'rgba(34,197,94,0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  connectedBadgeText: { color: '#4ADE80', fontFamily: FONTS.bold, fontSize: 9.5 },
  disconnectBtn: { paddingHorizontal: 10, paddingVertical: 6, ...({ cursor: 'pointer' } as any) },
  disconnectBtnText: { color: MC.red, fontFamily: FONTS.bold, fontSize: 12 },
  connectBtnStyle: { paddingHorizontal: 12, height: 28, borderRadius: 6, backgroundColor: MC.tealP, alignItems: 'center', justifyContent: 'center', ...({ cursor: 'pointer' } as any) },
  connectBtnStyleText: { color: MC.bg, fontFamily: FONTS.bold, fontSize: 11 },
  disconnectBtnStyle: { backgroundColor: 'rgba(239,68,68,0.05)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },

  // Default Session platform tabs
  platformSelectorRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  platformTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 36, borderRadius: 8, borderWidth: 1, borderColor: MC.border, backgroundColor: MC.bg2, ...({ cursor: 'pointer' } as any) },
  platformTabText: { color: MC.dim, fontFamily: FONTS.bold, fontSize: 11.5 },

  // Discard & Save changes footer bar
  saveBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'rgba(20,184,166,0.08)', borderColor: 'rgba(20,184,166,0.24)', borderWidth: 1, borderRadius: 12 },
  saveBarStatusText: { color: MC.muted, fontFamily: FONTS.med, fontSize: 11.5 },
  discardBtn: { paddingHorizontal: 14, height: 34, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderColor: MC.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...({ cursor: 'pointer' } as any) },
  discardBtnText: { color: MC.muted, fontFamily: FONTS.bold, fontSize: 12 },
  saveBtn: { paddingHorizontal: 16, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', ...({ cursor: 'pointer' } as any) },
  saveBtnText: { color: MC.bg, fontFamily: FONTS.bold, fontSize: 12 },

  // Sidebar cards
  sidebarCard: { backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 16 },
  sidebarCardTitle: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13.5, marginTop: 4 },
  sidebarCardSub: { color: MC.muted, fontFamily: FONTS.med, fontSize: 11 },
  saIdBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, backgroundColor: 'rgba(20,184,166,0.08)', borderColor: 'rgba(20,184,166,0.3)', borderWidth: 1, marginTop: 6 },
  saIdText: { color: MC.tealP, fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 0.3 },
  sidebarHeading: { color: MC.dim, fontFamily: FONTS.xbold, fontSize: 10.5, letterSpacing: 0.8 },

  // Sidebar stats
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  statRowDivider: { borderBottomColor: 'rgba(255,255,255,0.04)', borderBottomWidth: 1 },
  statIconContainer: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  statLabel: { flex: 1, color: MC.muted, fontFamily: FONTS.med, fontSize: 12 },
  statValue: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13.5 },

  // ID View button
  viewIdBtn: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8, backgroundColor: MC.tealP, ...({ cursor: 'pointer' } as any) },
  viewIdBtnText: { color: '#0F2922', fontFamily: FONTS.bold, fontSize: 11.5 },

  // Placeholder views
  comingSoonCard: { backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 36, alignItems: 'center', gap: 8 },
  comingSoonTitle: { color: '#fff', fontFamily: FONTS.bold, fontSize: 15 },
  comingSoonDesc: { color: MC.muted, fontFamily: FONTS.med, fontSize: 12, textAlign: 'center' },

  // Settings custom styles
  settingToggleRow: { paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingRowDivider: { borderBottomColor: 'rgba(255,255,255,0.04)', borderBottomWidth: 1 },
  themeSelectorRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  themeTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 36, borderRadius: 8, borderWidth: 1, borderColor: MC.border, backgroundColor: MC.bg2, ...({ cursor: 'pointer' } as any) },
  themeTabText: { color: MC.dim, fontFamily: FONTS.bold, fontSize: 11.5 },
  ddMenu: {
    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
    backgroundColor: MC.bg2, borderColor: MC.border, borderWidth: 1, borderRadius: 10,
    overflow: 'hidden', zIndex: 9999,
    ...(Platform.OS === 'web' ? { boxShadow: '0 8px 32px rgba(0,0,0,0.5)' } as any : { elevation: 8 }),
  },
  ddItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomColor: 'rgba(255,255,255,0.05)', borderBottomWidth: 1 },
  ddText: { color: '#fff', fontFamily: FONTS.med, fontSize: 12.5 },
  accountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  accountRowTitle: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },
  accountRowSub: { color: MC.dim, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 3 },
  accountBtn: { paddingHorizontal: 16, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', minWidth: 80, ...({ cursor: 'pointer' } as any) },
  accountBtnNormal: { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: MC.border, borderWidth: 1 },
  accountBtnDelete: { backgroundColor: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)', borderWidth: 1 },
  accountBtnText: { color: MC.muted, fontFamily: FONTS.bold, fontSize: 11.5 }
});

export default MentorProfileSettingsView;
