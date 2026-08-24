/**
 * Mentor Portal — Profile & Settings View (Redesigned)
 * Matches the high-fidelity mockups with Manage Profile and Tools & Integrations tabs.
 * Built on top of unified project icon shims and MaterialCommunityIcons.
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, Image, Platform, ActivityIndicator, useWindowDimensions, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { CompletionRing } from '@/src/views/web/profile/CompletionRing';
import { useToast, useConfirm } from '@/src/views/components';
import { MC, FONTS } from '../tokens';
import { Av } from '../atoms';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';
import QRCode from 'react-native-qrcode-svg';
import * as ImagePicker from 'expo-image-picker';
import { WebcamModal } from '@/src/views/components/WebcamModal';
import { request } from '@/src/models/services/api';

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

const LANGUAGES = ['English', 'हिन्दी', 'Tamil', 'Telugu', 'Kannada', 'Marathi'];
const TIMEZONES = ['Asia/Kolkata (IST)', 'Asia/Dubai (GST)', 'America/New_York (EST)', 'Europe/London (BST)', 'America/Los_Angeles (PST)', 'Asia/Singapore (SGT)'];

export function MentorProfileSettingsView({ 
  initialTab, demoMode = false, setDemoMode 
}: { 
  initialTab?: TabKey;
  demoMode?: boolean;
  setDemoMode?: (val: boolean) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const { confirm } = useConfirm();
  const user = useAuthStore((u) => u.user);
  const refreshUser = useAuthStore((u) => u.refreshUser);
  
  const { width: winW } = useWindowDimensions();
  const stack = winW < 1100;

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab || 'manage');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // --- Digital ID Card state & animation ---
  const cardRotation = useSharedValue(0);
  const cardFlipped = useSharedValue(0); // 0 = front, 1 = back

  const handleFlipCard = () => {
    const next = cardFlipped.value === 0 ? 180 : 0;
    cardFlipped.value = cardFlipped.value === 0 ? 1 : 0;
    cardRotation.value = withTiming(next, {
      duration: 700,
      easing: Easing.bezier(0.4, 0.0, 0.2, 1),
    });
  };

  const frontAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${cardRotation.value}deg` }] as any,
    backfaceVisibility: 'hidden' as any,
  }));

  const backAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${cardRotation.value + 180}deg` }] as any,
    backfaceVisibility: 'hidden' as any,
  }));

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
  const [photo, setPhoto] = useState<string | null>(null);
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [webcamVisible, setWebcamVisible] = useState(false);
  
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
  const [mentoringPaused, setMentoringPaused] = useState(false);

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

  // --- Security tab state variables ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessions, setSessions] = useState([
    { id: '1', device: 'Chrome · MacBook Pro', location: 'Mumbai, India · Now', type: 'desktop', isCurrent: true },
    { id: '2', device: 'Safari · iPhone 15', location: 'Mumbai, India · 2h ago', type: 'mobile', isCurrent: false },
    { id: '3', device: 'Chrome · Windows PC', location: 'Bengaluru, India · 3d ago', type: 'desktop', isCurrent: false },
  ]);
  const [loginActivity] = useState([
    { id: '1', event: 'Signed in', details: 'Chrome · MacBook Pro · Mumbai · Today, 9:42 AM', type: 'success' },
    { id: '2', event: 'Password changed', details: 'Chrome · MacBook Pro · Mumbai · Jan 15, 2026', type: 'success' },
    { id: '3', event: 'Failed login attempt', details: 'Unknown device · Unknown · Dec 3, 2025', type: 'failed' },
  ]);

  // --- Notifications tab state variables ---
  const [notifyNewBooking, setNotifyNewBooking] = useState(true);
  const [notifyReminders, setNotifyReminders] = useState(true);
  const [notifyEventRSVPs, setNotifyEventRSVPs] = useState(true);
  const [notifyStudentMessages, setNotifyStudentMessages] = useState(true);
  const [notifyConnectionRequests, setNotifyConnectionRequests] = useState(true);
  const [notifyNetworkUpdates, setNotifyNetworkUpdates] = useState(false);
  const [notifyWeeklyReport, setNotifyWeeklyReport] = useState(true);
  const [notifyPaymentAlerts, setNotifyPaymentAlerts] = useState(true);
  const [notifyStudentReviews, setNotifyStudentReviews] = useState(true);
  const [notifyPlatformNews, setNotifyPlatformNews] = useState(false);

  const [savedNotifications, setSavedNotifications] = useState({
    notifyNewBooking: true,
    notifyReminders: true,
    notifyEventRSVPs: true,
    notifyStudentMessages: true,
    notifyConnectionRequests: true,
    notifyNetworkUpdates: false,
    notifyWeeklyReport: true,
    notifyPaymentAlerts: true,
    notifyStudentReviews: true,
    notifyPlatformNews: false
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
      if (u.photo_data || u.face_image_base64) setPhoto(u.photo_data || u.face_image_base64);

      // Load settings and notifications from user preferences
      const p = u.preferences || {};
      const priv = p.privacy || {};
      const ai = p.ai || {};
      const app = p.app || {};
      const notif = p.notifications || {};

      // Privacy Controls
      const sEmail = priv.show_email ?? false;
      const sPhone = priv.show_phone ?? false;
      const sRecent = priv.show_online ?? true;
      const sConn = priv.show_connections ?? true;
      const sSearch = priv.appear_in_search ?? true;
      const sDMs = priv.allow_dm ?? true;
      setShowEmail(sEmail);
      setShowPhone(sPhone);
      setShowRecentActivity(sRecent);
      setShowConnections(sConn);
      setAppearInSearch(sSearch);
      setAcceptDMs(sDMs);

      // AI & Suggestions
      const aSum = ai.ai_summaries ?? true;
      const aMatch = ai.student_match ?? true;
      const aWeekly = ai.weekly_reports ?? false;
      setAiSummaries(aSum);
      setStudentMatch(aMatch);
      setWeeklyReports(aWeekly);

      // App Preferences
      const appLang = app.language || 'English';
      const appTz = app.timezone || 'Asia/Kolkata (IST)';
      const appTheme = (app.theme || 'Dark') as 'Dark' | 'Light' | 'System';
      setLanguage(appLang);
      setTimezone(appTz);
      setTheme(appTheme);

      // Mentoring status
      setMentoringPaused(p.mentoring?.paused ?? false);

      // Update savedSettings so dirty checking works correctly
      setSavedSettings({
        showEmail: sEmail,
        showPhone: sPhone,
        showRecentActivity: sRecent,
        showConnections: sConn,
        appearInSearch: sSearch,
        acceptDMs: sDMs,
        aiSummaries: aSum,
        studentMatch: aMatch,
        weeklyReports: aWeekly,
        language: appLang,
        timezone: appTz,
        theme: appTheme,
      });

      // Notification Preferences
      const nBooking = notif.new_booking ?? true;
      const nReminders = notif.reminders ?? true;
      const nRSVPs = notif.event_rsvps ?? true;
      const nMessages = notif.student_messages ?? true;
      const nRequests = notif.connection_requests ?? true;
      const nNetwork = notif.network_updates ?? false;
      const nWeekly = notif.weekly_report ?? true;
      const nPayment = notif.payment_alerts ?? true;
      const nReviews = notif.student_reviews ?? true;
      const nNews = notif.platform_news ?? false;

      setNotifyNewBooking(nBooking);
      setNotifyReminders(nReminders);
      setNotifyEventRSVPs(nRSVPs);
      setNotifyStudentMessages(nMessages);
      setNotifyConnectionRequests(nRequests);
      setNotifyNetworkUpdates(nNetwork);
      setNotifyWeeklyReport(nWeekly);
      setNotifyPaymentAlerts(nPayment);
      setNotifyStudentReviews(nReviews);
      setNotifyPlatformNews(nNews);

      setSavedNotifications({
        notifyNewBooking: nBooking,
        notifyReminders: nReminders,
        notifyEventRSVPs: nRSVPs,
        notifyStudentMessages: nMessages,
        notifyConnectionRequests: nRequests,
        notifyNetworkUpdates: nNetwork,
        notifyWeeklyReport: nWeekly,
        notifyPaymentAlerts: nPayment,
        notifyStudentReviews: nReviews,
        notifyPlatformNews: nNews,
      });
    }
  }, [user]);

  useEffect(() => {
    const userPhoto = user?.photo_data || user?.face_image_base64 || null;
    if (photo !== userPhoto) {
      useAuthStore.getState().setPhotoOverride(photo);
    } else {
      useAuthStore.getState().setPhotoOverride(null);
    }
  }, [photo, user]);

  useEffect(() => {
    return () => {
      useAuthStore.getState().setPhotoOverride(null);
    };
  }, []);

  // Check if anything is dirty
  const isDirty = () => {
    if (activeTab === 'manage') {
      const u = user as any;
      const isUserChanged = u ? (
        fullName !== (u.full_name || 'Dr. Suresh Rao') ||
        bio !== (u.bio || '') ||
        linkedinUrl !== (u.linkedin_url || '') ||
        githubUrl !== (u.github_url || '') ||
        photo !== (u.photo_data || u.face_image_base64 || null)
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
    if (activeTab === 'notifications') {
      return (
        notifyNewBooking !== savedNotifications.notifyNewBooking ||
        notifyReminders !== savedNotifications.notifyReminders ||
        notifyEventRSVPs !== savedNotifications.notifyEventRSVPs ||
        notifyStudentMessages !== savedNotifications.notifyStudentMessages ||
        notifyConnectionRequests !== savedNotifications.notifyConnectionRequests ||
        notifyNetworkUpdates !== savedNotifications.notifyNetworkUpdates ||
        notifyWeeklyReport !== savedNotifications.notifyWeeklyReport ||
        notifyPaymentAlerts !== savedNotifications.notifyPaymentAlerts ||
        notifyStudentReviews !== savedNotifications.notifyStudentReviews ||
        notifyPlatformNews !== savedNotifications.notifyPlatformNews
      );
    }
    return false;
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword) {
      toast.error('Validation Error', 'Please enter your current password.');
      return;
    }
    if (!newPassword) {
      toast.error('Validation Error', 'Please enter your new password.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Validation Error', 'New password must be at least 8 characters.');
      return;
    }
    if (!confirmPassword) {
      toast.error('Validation Error', 'Please confirm your new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Validation Error', 'New passwords do not match.');
      return;
    }
    try {
      await request('/users/me/password', {
        method: 'POST',
        body: { current_password: currentPassword, new_password: newPassword }
      } as any);
      toast.success('Password Updated', 'Your account password has been updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      toast.error('Update Failed', e?.message || 'Failed to update password.');
    }
  };

  const handleRevokeSession = (id: string) => {
    setSessions(sessions.filter((s) => s.id !== id));
    toast.success('Session Revoked', 'The device session has been terminated.');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (activeTab === 'settings') {
        const payload = {
          privacy: {
            show_email: showEmail,
            show_phone: showPhone,
            show_online: showRecentActivity,
            show_connections: showConnections,
            appear_in_search: appearInSearch,
            allow_dm: acceptDMs,
          },
          ai: {
            ai_summaries: aiSummaries,
            student_match: studentMatch,
            weekly_reports: weeklyReports,
          },
          app: {
            language: language,
            timezone: timezone,
            theme: theme,
          }
        };
        await request('/users/me/preferences', { method: 'PATCH', body: payload } as any);
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
        if (refreshUser) {
          await refreshUser();
        }
        toast.success('Saved', 'Settings saved successfully.');
      } else if (activeTab === 'notifications') {
        const payload = {
          notifications: {
            new_booking: notifyNewBooking,
            reminders: notifyReminders,
            event_rsvps: notifyEventRSVPs,
            student_messages: notifyStudentMessages,
            connection_requests: notifyConnectionRequests,
            network_updates: notifyNetworkUpdates,
            weekly_report: notifyWeeklyReport,
            payment_alerts: notifyPaymentAlerts,
            student_reviews: notifyStudentReviews,
            platform_news: notifyPlatformNews,
          }
        };
        await request('/users/me/preferences', { method: 'PATCH', body: payload } as any);
        setSavedNotifications({
          notifyNewBooking,
          notifyReminders,
          notifyEventRSVPs,
          notifyStudentMessages,
          notifyConnectionRequests,
          notifyNetworkUpdates,
          notifyWeeklyReport,
          notifyPaymentAlerts,
          notifyStudentReviews,
          notifyPlatformNews
        });
        if (refreshUser) {
          await refreshUser();
        }
        toast.success('Saved', 'Notification preferences saved successfully.');
      } else {
        const payload: any = {
          full_name: fullName,
          bio: bio,
          linkedin_url: linkedinUrl,
          github_url: githubUrl,
          photo_data: photo,
          face_image_base64: photo,
          skills: expertise,
        };
        await request('/users/me', { method: 'PUT', body: payload } as any);
        if (refreshUser) {
          await refreshUser();
        }
        toast.success('Saved', 'Profile updated successfully.');
      }
      const now = new Date();
      setLastSavedAt(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (e: any) {
      toast.error('Save failed', e?.message || 'Failed to save changes.');
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
      setExpertise(u?.skills || ['System Design', 'Career Guidance', 'Startup Advice']);
      setPhoto(u?.photo_data || u?.face_image_base64 || null);
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
    } else if (activeTab === 'notifications') {
      setNotifyNewBooking(savedNotifications.notifyNewBooking);
      setNotifyReminders(savedNotifications.notifyReminders);
      setNotifyEventRSVPs(savedNotifications.notifyEventRSVPs);
      setNotifyStudentMessages(savedNotifications.notifyStudentMessages);
      setNotifyConnectionRequests(savedNotifications.notifyConnectionRequests);
      setNotifyNetworkUpdates(savedNotifications.notifyNetworkUpdates);
      setNotifyWeeklyReport(savedNotifications.notifyWeeklyReport);
      setNotifyPaymentAlerts(savedNotifications.notifyPaymentAlerts);
      setNotifyStudentReviews(savedNotifications.notifyStudentReviews);
      setNotifyPlatformNews(savedNotifications.notifyPlatformNews);
    }
    toast.info('Reverted', 'Changes discarded.');
  };

  // Photo helpers
  const handleUploadPhoto = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png,image/jpeg,image/webp';
      input.onchange = (e: any) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (f.size > 5 * 1024 * 1024) {
          toast.error('Too large', 'Max 5 MB');
          return;
        }
        const r = new FileReader();
        r.onload = () => {
          setPhoto(r.result as string);
        };
        r.readAsDataURL(f);
      };
      input.click();
    } else {
      try {
        const res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.7,
          base64: true,
        });
        if (!res.canceled && res.assets[0]?.base64) {
          const base64Photo = `data:image/jpeg;base64,${res.assets[0].base64}`;
          setPhoto(base64Photo);
        }
      } catch {
        toast.error('Error', 'Failed to pick image');
      }
    }
  };

  const handleTakeSelfie = async () => {
    if (Platform.OS === 'web') {
      setWebcamVisible(true);
    } else {
      try {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          toast.error('Camera', 'Permission denied.');
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
          setPhoto(base64Photo);
        }
      } catch {
        toast.error('Camera', 'Could not open camera.');
      }
    }
  };

  const handleRemovePhoto = () => {
    setPhoto(null);
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

  // --- Digital ID Card handlers ---
  const handleCopyId = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText('SM-8-687562');
        toast.success('Copied', 'Mentor ID copied to clipboard.');
      } else {
        toast.success('Mentor ID', 'SM-8-687562');
      }
    } catch {
      toast.error('Copy failed', 'Please try again.');
    }
  };

  const handleDownloadCard = () => {
    toast.success('Downloading', 'Preparing your Digital ID card...');
  };

  const handleShareProfile = async () => {
    const text = `Connect with me on Student Alumni! 🎓\nProfile: studentalumni.in/mentor/SM-8-687562`;
    try {
      if (Platform.OS === 'web' && (navigator as any).share) {
        await (navigator as any).share({ title: 'My SA Mentor Profile', text });
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        toast.success('Link Copied', 'Share link copied to clipboard.');
      }
    } catch {
      toast.error('Share failed', 'Please try again.');
    }
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
  const initials = ((fullName || '?').split(' ').slice(0, 2).map((s: string) => s[0] || '').join('') || '?').toUpperCase();

  return (
    <View style={{ gap: 16 }}>
      
      {/* Dynamic Header Card */}
      <View style={[{backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 16, padding: 18}, stack && { flexDirection: 'column' }]}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 16, minWidth: 0 }}>
          <View style={{ position: 'relative' }}>
            <View style={{width: 72, height: 72, borderRadius: 36, backgroundColor: MC.teal + '20', alignItems: 'center', justifyContent: 'center', borderColor: MC.teal + '40', borderWidth: 2}}>
              {photo ? (
                <Image source={{ uri: photo }} style={{ width: '100%', height: '100%', borderRadius: 36 }} />
              ) : (
                <Text className="text-white font-display-bold text-2xl">{initials}</Text>
              )}
            </View>
            <View style={{position: 'absolute', bottom: 1, right: 1, width: 20, height: 20, borderRadius: 10, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', borderColor: MC.bg, borderWidth: 2}}><CheckCircle2 size={11} color="#fff" /></View>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text className="text-white font-display-bold text-xl tracking-tight">{fullName}</Text>
            <Text className="text-muted font-body-semibold text-sm mt-0.5">{role} - {company}</Text>
            
            <View className="flex-row flex-wrap gap-1.5 mt-2 items-center">
              <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-2xl border" style={{backgroundColor: 'rgba(245,158,11,0.14)', borderColor: 'rgba(245,158,11,0.4)'}}>
                <Star size={11} color="#F59E0B" fill="#F59E0B" />
                <Text className="font-body-bold text-[10.5px]" style={{color: '#F59E0B'}}>4.9 rating</Text>
              </View>
              <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-2xl border" style={{backgroundColor: 'rgba(34,197,94,0.14)', borderColor: 'rgba(34,197,94,0.4)'}}>
                <Text className="font-body-bold text-[10.5px]" style={{color: '#4ADE80'}}>142 sessions</Text>
              </View>
              <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-2xl border" style={{backgroundColor: 'rgba(20,184,166,0.14)', borderColor: 'rgba(20,184,166,0.4)'}}>
                <CheckCircle2 size={11} color={MC.tealP} />
                <Text className="font-body-bold text-[10.5px]" style={{color: MC.tealP}}>Verified Mentor</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Tabs list */}
      <View style={{backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 12, padding: 6}}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 6 }}>
          {TABS.map((t) => {
            const Icon = t.Icon;
            const active = activeTab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => {
                  setActiveTab(t.key);
                }}
                className="flex-row items-center gap-1.5 px-3 py-2 rounded-lg" style={active ? {backgroundColor: MC.tealP} : undefined}
              >
                <Icon size={14} color={active ? '#0F2922' : MC.muted} />
                <Text className="text-muted font-body-bold text-[11.5px]" style={active ? { color: '#0F2922', fontFamily: FONTS.bold } : undefined}>{t.label}</Text>
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
              <View style={{backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 16}}>
                <Text className="text-muted font-display-bold text-[10.5px] tracking-widest uppercase mb-3">BASIC INFORMATION</Text>
                
                {/* Photo editor */}
                <View className="flex-row items-center gap-3.5 mb-3.5">
                  <Pressable style={{width: 64, height: 64, borderRadius: 32, backgroundColor: MC.tealP + '18', borderColor: MC.tealP + '35', borderWidth: 2, alignItems: 'center', justifyContent: 'center'}} onPress={() => setOptionsModalVisible(true)}>
                    {photo ? (
                      <Image source={{ uri: photo }} style={{ width: '100%', height: '100%', borderRadius: 32 }} />
                    ) : (
                      <Text className="text-white font-display-bold text-[22px]">{initials}</Text>
                    )}
                  </Pressable>
                  <View style={{ gap: 6 }}>
                    <Text className="text-white font-body-bold text-[13.5px]">Profile Photo</Text>
                    <Text className="text-dim font-body-semibold text-[11px]">JPG, PNG up to 5MB · Recommended 400×400px</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                      <Pressable className="h-7 rounded-md items-center justify-center" style={{paddingHorizontal: 11, backgroundColor: MC.tealP}} onPress={() => setOptionsModalVisible(true)}><Text className="text-bg font-body-bold text-[11.5px]">Upload Photo</Text></Pressable>
                      {photo ? (
                        <Pressable className="h-7 rounded-md items-center justify-center" style={{paddingHorizontal: 11, borderWidth: 1, borderColor: MC.border2, backgroundColor: 'rgba(255,255,255,0.02)'}} onPress={handleRemovePhoto}><Text className="text-muted font-body-semibold text-[11.5px]">Remove</Text></Pressable>
                      ) : null}
                    </View>
                  </View>
                </View>

                {/* Name & Role Title row */}
                <View className="flex-row gap-3">
                  <View style={{ flex: 1 }}>
                    <Text className="text-muted font-body-bold text-[11.5px] mb-[5px]">Full Name</Text>
                    <View style={{backgroundColor: MC.bg2, borderColor: MC.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4, height: 38}}>
                      <TextInput value={fullName} onChangeText={setFullName} placeholder="Dr. Suresh Rao" className="text-white font-body-semibold text-[12.5px] py-1.5 w-full" placeholderTextColor={MC.dim} />
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text className="text-muted font-body-bold text-[11.5px] mb-[5px]">Role / Title</Text>
                    <View style={{backgroundColor: MC.bg2, borderColor: MC.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4, height: 38}}>
                      <TextInput value={role} onChangeText={setRole} placeholder="CTO" className="text-white font-body-semibold text-[12.5px] py-1.5 w-full" placeholderTextColor={MC.dim} />
                    </View>
                  </View>
                </View>

                {/* Company & Alma Mater row */}
                <View className="flex-row gap-3">
                  <View style={{ flex: 1 }}>
                    <Text className="text-muted font-body-bold text-[11.5px] mb-[5px]">Company</Text>
                    <View style={{backgroundColor: MC.bg2, borderColor: MC.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4, height: 38}}>
                      <TextInput value={company} onChangeText={setCompany} placeholder="Zepto" className="text-white font-body-semibold text-[12.5px] py-1.5 w-full" placeholderTextColor={MC.dim} />
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text className="text-muted font-body-bold text-[11.5px] mb-[5px]">Alma Mater</Text>
                    <View style={{backgroundColor: MC.bg2, borderColor: MC.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4, height: 38}}>
                      <TextInput value={college} onChangeText={setCollege} placeholder="IIT Bombay" className="text-white font-body-semibold text-[12.5px] py-1.5 w-full" placeholderTextColor={MC.dim} />
                    </View>
                  </View>
                </View>

                {/* Bio text field */}
                <View style={{ marginTop: 12 }}>
                  <Text className="text-muted font-body-bold text-[11.5px] mb-[5px]">Bio</Text>
                  <View style={{backgroundColor: MC.bg2, borderColor: MC.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4, height: 38, minHeight: 80, alignItems: 'flex-start'}}>
                    <TextInput
                      value={bio}
                      onChangeText={setBio}
                      multiline
                      numberOfLines={3}
                      placeholder="Tell students about your background and what you offer as a mentor."
                      placeholderTextColor={MC.dim}
                      className="text-white font-body-semibold text-[12.5px] py-1.5 w-full" style={{ flex: 1, height: '100%', textAlignVertical: 'top' }}
                    />
                  </View>
                  <Text className="text-dim font-body-semibold text-[10.5px] mt-1">Tell students about your background and what you offer as a mentor.</Text>
                </View>
              </View>

              {/* Social Links & Session Price */}
              <View style={{backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 16}}>
                <Text className="text-muted font-display-bold text-[10.5px] tracking-widest uppercase mb-3">SOCIAL LINKS & SESSION PRICE</Text>

                <View className="flex-row gap-3">
                  <View style={{ flex: 1 }}>
                    <Text className="text-muted font-body-bold text-[11.5px] mb-[5px]">LinkedIn</Text>
                    <View style={{backgroundColor: MC.bg2, borderColor: MC.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', height: 38}}>
                      <Linkedin size={14} color={MC.dim} style={{ marginRight: 8 }} />
                      <TextInput value={linkedinUrl} onChangeText={setLinkedinUrl} placeholder="linkedin.com/in/sureshrao" className="text-white font-body-semibold text-[12.5px] py-1.5 w-full" style={{ flex: 1 }} placeholderTextColor={MC.dim} />
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text className="text-muted font-body-bold text-[11.5px] mb-[5px]">GitHub</Text>
                    <View style={{backgroundColor: MC.bg2, borderColor: MC.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', height: 38}}>
                      <Github size={14} color={MC.dim} style={{ marginRight: 8 }} />
                      <TextInput value={githubUrl} onChangeText={setGithubUrl} placeholder="github.com/sureshrao" className="text-white font-body-semibold text-[12.5px] py-1.5 w-full" style={{ flex: 1 }} placeholderTextColor={MC.dim} />
                    </View>
                  </View>
                </View>

                <View style={{ marginTop: 12 }}>
                  <Text className="text-muted font-body-bold text-[11.5px] mb-[5px]">Session Price (₹)</Text>
                  <View style={{backgroundColor: MC.bg2, borderColor: MC.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', height: 38}}>
                    <IndianRupee size={14} color={MC.dim} style={{ marginRight: 6 }} />
                    <TextInput value={sessionPrice} onChangeText={setSessionPrice} keyboardType="numeric" placeholder="999" className="text-white font-body-semibold text-[12.5px] py-1.5 w-full" style={{ flex: 1 }} placeholderTextColor={MC.dim} />
                  </View>
                  <Text className="text-dim font-body-semibold text-[10.5px] mt-1">Shown to students when booking a session with you.</Text>
                </View>
              </View>

              {/* Areas of Expertise */}
              <View style={{backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 16}}>
                <Text className="text-muted font-display-bold text-[10.5px] tracking-widest uppercase mb-3">AREAS OF EXPERTISE</Text>
                
                {/* Pills list */}
                <View className="flex-row flex-wrap gap-1.5 mb-2.5">
                  {expertise.map((tag) => (
                    <View key={tag} className="flex-row items-center gap-1.5 rounded-lg pl-2.5 pr-1.5 h-7" style={{backgroundColor: 'rgba(20,184,166,0.1)', borderColor: MC.border2, borderWidth: 1}}>
                      <Text className="text-teal font-body-bold text-[11.5px]">{tag}</Text>
                      <Pressable onPress={() => handleRemoveExpertise(tag)} className="p-0.5 rounded bg-white/[0.02]">
                        <X size={11} color={MC.tealP} />
                      </Pressable>
                    </View>
                  ))}
                </View>

                {/* Add Input */}
                <View className="flex-row gap-2.5">
                  <View style={{backgroundColor: MC.bg2, borderColor: MC.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4, height: 38, flex: 1}}>
                    <TextInput
                      value={newExpertiseInput}
                      onChangeText={setNewExpertiseInput}
                      placeholder="Add expertise..."
                      placeholderTextColor={MC.dim}
                      onSubmitEditing={handleAddExpertise}
                      className="text-white font-body-semibold text-[12.5px] py-1.5 w-full"
                    />
                  </View>
                  <Pressable onPress={handleAddExpertise} className="flex-row items-center gap-1 px-3 rounded-lg" style={{backgroundColor: MC.tealP}}>
                    <Plus size={14} color={MC.bg} />
                    <Text className="text-bg font-body-bold text-xs">Add</Text>
                  </Pressable>
                </View>
              </View>

              {/* Profile Visibility */}
              <View style={{backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 16}}>
                <Text className="text-muted font-display-bold text-[10.5px] tracking-widest uppercase mb-3">PROFILE VISIBILITY</Text>
                <Text className="text-dim font-body-semibold text-xs -mt-2 mb-3">Control who can see your mentor profile.</Text>

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
              <View style={{backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 16}}>
                <Text className="text-muted font-display-bold text-[10.5px] tracking-widest uppercase mb-3">PROFILE SECTIONS</Text>
                <Text className="text-dim font-body-semibold text-xs -mt-2 mb-3">Choose which sections appear on your public mentor profile.</Text>

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
              <View style={{backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 16}}>
                <Text className="text-muted font-display-bold text-[10.5px] tracking-widest uppercase mb-3">PROFILE STRENGTH ANALYSIS</Text>
                <Text className="text-dim font-body-semibold text-xs -mt-2 mb-3">Get AI recommendations to improve your profile and increase session bookings.</Text>
                
                <View style={{ marginTop: 12, gap: 10, alignItems: 'flex-start' }}>
                  <Pressable
                    onPress={handleAnalyzeProfile}
                    disabled={aiAnalyzing}
                    className="flex-row items-center gap-1.5 px-3 h-8 rounded-lg border" style={{borderColor: MC.border2, backgroundColor: 'rgba(255,255,255,0.02)'}}
                  >
                    {aiAnalyzing ? (
                      <ActivityIndicator size="small" color={MC.tealP} />
                    ) : (
                      <>
                        <Sparkles size={14} color={MC.tealP} />
                        <Text className="text-teal font-body-bold text-[11.5px]">Analyze Profile Strength</Text>
                      </>
                    )}
                  </Pressable>

                  {aiError && (
                    <Text className="text-rose font-body-bold text-[11px]">AI unavailable. Please try again.</Text>
                  )}
                </View>
              </View>

            </View>
          )}

          {activeTab === 'tools-integrations' && (
            // TOOLS & INTEGRATIONS TAB CONTENT (Screens 4, 5)
            <View style={{ gap: 16 }}>
              
              {/* Main title banner */}
              <View style={{backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 16}}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View className="w-[34px] h-[34px] rounded-[17px] items-center justify-center" style={{backgroundColor: MC.tealP + '14', borderColor: MC.tealP + '30', borderWidth: 1}}>
                    <MaterialCommunityIcons name="briefcase-edit-outline" size={16} color={MC.tealP} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 15 }}>Tools & Integrations</Text>
                    <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 2 }}>Connect your video, calendar and productivity tools to streamline your mentoring sessions.</Text>
                  </View>
                </View>
              </View>

              {/* Video Conferencing */}
              <View style={{backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 16}}>
                <Text className="text-muted font-display-bold text-[10.5px] tracking-widest uppercase mb-3">VIDEO CONFERENCING</Text>

                <View style={{ gap: 12, marginTop: 4 }}>
                  
                  {/* Google Meet (Connected) */}
                  <View className="flex-row items-center justify-between py-3" style={{borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)'}}>
                    <View className="flex-row gap-3 flex-1 min-w-0">
                      <View className="w-9 h-9 rounded-lg items-center justify-center" style={{backgroundColor: 'rgba(255,255,255,0.03)'}}>
                        <MaterialCommunityIcons name="video-outline" size={18} color={googleMeetConnected ? MC.tealP : MC.dim} />
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text className="text-white font-body-bold text-[13px]">Google Meet</Text>
                          {googleMeetConnected && <View className="px-1.5 py-0.5 rounded" style={{backgroundColor: 'rgba(34,197,94,0.12)'}}><Text className="text-[#4ADE80] font-body-bold text-[9.5px]">Connected</Text></View>}
                        </View>
                        {!googleMeetConnected && (
                          <View style={{backgroundColor: MC.bg2, borderColor: MC.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4, height: 38}}>
                            <TextInput value={googleMeetEmail} onChangeText={setGoogleMeetEmail} placeholder="your@email.com" placeholderTextColor={MC.dim} className="text-white font-body-semibold text-[12.5px] py-1.5 w-full" />
                          </View>
                        )}
                        {googleMeetConnected && <Text className="text-teal font-body-semibold text-[11.5px] mt-px">{googleMeetEmail}</Text>}
                      </View>
                    </View>
                    <Pressable
                      onPress={() => {
                        if (googleMeetConnected) { setGoogleMeetConnected(false); setGoogleMeetEmail(''); }
                        else { if (!googleMeetEmail) { toast.warning('Email required', 'Please enter Google Meet email'); return; } setGoogleMeetConnected(true); }
                      }}
                      className="h-7 rounded-md items-center justify-center" style={[{paddingHorizontal: 12, backgroundColor: MC.tealP}, googleMeetConnected && {backgroundColor: 'rgba(239,68,68,0.05)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)'}]}
                    >
                      <Text className="text-bg font-body-bold text-[11px]" style={googleMeetConnected ? { color: MC.red } : undefined}>{googleMeetConnected ? 'Disconnect' : 'Connect'}</Text>
                    </Pressable>
                  </View>

                  {/* Zoom */}
                  <View className="flex-row items-center justify-between py-3" style={{borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)'}}>
                    <View className="flex-row gap-3 flex-1 min-w-0">
                      <View className="w-9 h-9 rounded-lg items-center justify-center" style={{backgroundColor: 'rgba(255,255,255,0.03)'}}>
                        <MaterialCommunityIcons name="video-outline" size={18} color={MC.dim} />
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text className="text-white font-body-bold text-[13px]">Zoom</Text>
                        <Text className="text-dim font-body-semibold text-[11px] mt-px">Host sessions on Zoom with auto-generated links</Text>
                        {!zoomConnected && (
                          <View style={{backgroundColor: MC.bg2, borderColor: MC.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4, height: 38}}>
                            <TextInput value={zoomEmail} onChangeText={setZoomEmail} placeholder="your@email.com" placeholderTextColor={MC.dim} className="text-white font-body-semibold text-[12.5px] py-1.5 w-full" />
                          </View>
                        )}
                        {zoomConnected && <Text className="text-teal font-body-semibold text-[11.5px] mt-px">{zoomEmail}</Text>}
                      </View>
                    </View>
                    <Pressable
                      onPress={() => {
                        if (zoomConnected) { setZoomConnected(false); setZoomEmail(''); }
                        else { if (!zoomEmail) { toast.warning('Email required', 'Please enter Zoom email'); return; } setZoomConnected(true); }
                      }}
                      className="h-7 rounded-md items-center justify-center" style={[{paddingHorizontal: 12, backgroundColor: MC.tealP}, zoomConnected && {backgroundColor: 'rgba(239,68,68,0.05)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)'}]}
                    >
                      <Text className="text-bg font-body-bold text-[11px]" style={zoomConnected ? { color: MC.red } : undefined}>{zoomConnected ? 'Disconnect' : 'Connect'}</Text>
                    </Pressable>
                  </View>

                  {/* Microsoft Teams */}
                  <View className="flex-row items-center justify-between py-3" style={{borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)'}}>
                    <View className="flex-row gap-3 flex-1 min-w-0">
                      <View className="w-9 h-9 rounded-lg items-center justify-center" style={{backgroundColor: 'rgba(255,255,255,0.03)'}}>
                        <MaterialCommunityIcons name="microsoft-teams" size={18} color={MC.dim} />
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text className="text-white font-body-bold text-[13px]">Microsoft Teams</Text>
                        <Text className="text-dim font-body-semibold text-[11px] mt-px">Schedule and host via Microsoft Teams</Text>
                        {!teamsConnected && (
                          <View style={{backgroundColor: MC.bg2, borderColor: MC.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4, height: 38}}>
                            <TextInput value={teamsEmail} onChangeText={setTeamsEmail} placeholder="your@email.com" placeholderTextColor={MC.dim} className="text-white font-body-semibold text-[12.5px] py-1.5 w-full" />
                          </View>
                        )}
                        {teamsConnected && <Text className="text-teal font-body-semibold text-[11.5px] mt-px">{teamsEmail}</Text>}
                      </View>
                    </View>
                    <Pressable
                      onPress={() => {
                        if (teamsConnected) { setTeamsConnected(false); setTeamsEmail(''); }
                        else { if (!teamsEmail) { toast.warning('Email required', 'Please enter Teams email'); return; } setTeamsConnected(true); }
                      }}
                      className="h-7 rounded-md items-center justify-center" style={[{paddingHorizontal: 12, backgroundColor: MC.tealP}, teamsConnected && {backgroundColor: 'rgba(239,68,68,0.05)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)'}]}
                    >
                      <Text className="text-bg font-body-bold text-[11px]" style={teamsConnected ? { color: MC.red } : undefined}>{teamsConnected ? 'Disconnect' : 'Connect'}</Text>
                    </Pressable>
                  </View>

                </View>
              </View>

              {/* Calendar & Productivity */}
              <View style={{backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 16}}>
                <Text className="text-muted font-display-bold text-[10.5px] tracking-widest uppercase mb-3">CALENDAR & PRODUCTIVITY</Text>

                <View style={{ gap: 12, marginTop: 4 }}>
                  
                  {/* Google Calendar */}
                  <View className="flex-row items-center justify-between py-3" style={{borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)'}}>
                    <View className="flex-row gap-3 flex-1 min-w-0">
                      <View className="w-9 h-9 rounded-lg items-center justify-center" style={{backgroundColor: 'rgba(255,255,255,0.03)'}}>
                        <MaterialCommunityIcons name="calendar-outline" size={18} color={googleCalendarConnected ? MC.tealP : MC.dim} />
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text className="text-white font-body-bold text-[13px]">Google Calendar</Text>
                          {googleCalendarConnected && <View className="px-1.5 py-0.5 rounded" style={{backgroundColor: 'rgba(34,197,94,0.12)'}}><Text className="text-[#4ADE80] font-body-bold text-[9.5px]">Connected</Text></View>}
                        </View>
                        {!googleCalendarConnected && (
                          <View style={{backgroundColor: MC.bg2, borderColor: MC.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4, height: 38}}>
                            <TextInput value={googleCalendarEmail} onChangeText={setGoogleCalendarEmail} placeholder="your@email.com" placeholderTextColor={MC.dim} className="text-white font-body-semibold text-[12.5px] py-1.5 w-full" />
                          </View>
                        )}
                        {googleCalendarConnected && <Text className="text-teal font-body-semibold text-[11.5px] mt-px">{googleCalendarEmail}</Text>}
                      </View>
                    </View>
                    <Pressable
                      onPress={() => {
                        if (googleCalendarConnected) { setGoogleCalendarConnected(false); setGoogleCalendarEmail(''); }
                        else { if (!googleCalendarEmail) { toast.warning('Email required', 'Please enter Google Calendar email'); return; } setGoogleCalendarConnected(true); }
                      }}
                      className="h-7 rounded-md items-center justify-center" style={[{paddingHorizontal: 12, backgroundColor: MC.tealP}, googleCalendarConnected && {backgroundColor: 'rgba(239,68,68,0.05)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)'}]}
                    >
                      <Text className="text-bg font-body-bold text-[11px]" style={googleCalendarConnected ? { color: MC.red } : undefined}>{googleCalendarConnected ? 'Disconnect' : 'Connect'}</Text>
                    </Pressable>
                  </View>

                  {/* Notion */}
                  <View className="flex-row items-center justify-between py-3" style={{borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)'}}>
                    <View className="flex-row gap-3 flex-1 min-w-0">
                      <View className="w-9 h-9 rounded-lg items-center justify-center" style={{backgroundColor: 'rgba(255,255,255,0.03)'}}>
                        <MaterialCommunityIcons name="notebook-outline" size={18} color={MC.dim} />
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text className="text-white font-body-bold text-[13px]">Notion</Text>
                        <Text className="text-dim font-body-semibold text-[11px] mt-px">Auto-create session notes in Notion</Text>
                        {!notionConnected && (
                          <View style={{backgroundColor: MC.bg2, borderColor: MC.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4, height: 38}}>
                            <TextInput value={notionEmail} onChangeText={setNotionEmail} placeholder="your@email.com" placeholderTextColor={MC.dim} className="text-white font-body-semibold text-[12.5px] py-1.5 w-full" />
                          </View>
                        )}
                        {notionConnected && <Text className="text-teal font-body-semibold text-[11.5px] mt-px">{notionEmail}</Text>}
                      </View>
                    </View>
                    <Pressable
                      onPress={() => {
                        if (notionConnected) { setNotionConnected(false); setNotionEmail(''); }
                        else { if (!notionEmail) { toast.warning('Email required', 'Please enter Notion email'); return; } setNotionConnected(true); }
                      }}
                      className="h-7 rounded-md items-center justify-center" style={[{paddingHorizontal: 12, backgroundColor: MC.tealP}, notionConnected && {backgroundColor: 'rgba(239,68,68,0.05)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)'}]}
                    >
                      <Text className="text-bg font-body-bold text-[11px]" style={notionConnected ? { color: MC.red } : undefined}>{notionConnected ? 'Disconnect' : 'Connect'}</Text>
                    </Pressable>
                  </View>

                  {/* Slack */}
                  <View className="flex-row items-center justify-between py-3" style={{borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)'}}>
                    <View className="flex-row gap-3 flex-1 min-w-0">
                      <View className="w-9 h-9 rounded-lg items-center justify-center" style={{backgroundColor: 'rgba(255,255,255,0.03)'}}>
                        <MaterialCommunityIcons name="slack" size={18} color={MC.dim} />
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text className="text-white font-body-bold text-[13px]">Slack</Text>
                        <Text className="text-dim font-body-semibold text-[11px] mt-px">Get session reminders and alerts on Slack</Text>
                        {!slackConnected && (
                          <View style={{backgroundColor: MC.bg2, borderColor: MC.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4, height: 38}}>
                            <TextInput value={slackEmail} onChangeText={setSlackEmail} placeholder="your@email.com" placeholderTextColor={MC.dim} className="text-white font-body-semibold text-[12.5px] py-1.5 w-full" />
                          </View>
                        )}
                        {slackConnected && <Text className="text-teal font-body-semibold text-[11.5px] mt-px">{slackEmail}</Text>}
                      </View>
                    </View>
                    <Pressable
                      onPress={() => {
                        if (slackConnected) { setSlackConnected(false); setSlackEmail(''); }
                        else { if (!slackEmail) { toast.warning('Email required', 'Please enter Slack email'); return; } setSlackConnected(true); }
                      }}
                      className="h-7 rounded-md items-center justify-center" style={[{paddingHorizontal: 12, backgroundColor: MC.tealP}, slackConnected && {backgroundColor: 'rgba(239,68,68,0.05)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)'}]}
                    >
                      <Text className="text-bg font-body-bold text-[11px]" style={slackConnected ? { color: MC.red } : undefined}>{slackConnected ? 'Disconnect' : 'Connect'}</Text>
                    </Pressable>
                  </View>

                </View>
              </View>

              {/* Default Session Platform */}
              <View style={{backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 16}}>
                <Text className="text-muted font-display-bold text-[10.5px] tracking-widest uppercase mb-3">DEFAULT SESSION PLATFORM</Text>
                <Text className="text-dim font-body-semibold text-xs -mt-2 mb-3">When a student books a session, links will be auto-generated using your default platform.</Text>
                
                <View className="flex-row gap-2.5 mt-2">
                  {['Google Meet', 'Zoom', 'Microsoft Teams'].map((plat: any) => {
                    const isSelected = defaultSessionPlatform === plat;
                    return (
                      <Pressable
                        key={plat}
                        onPress={() => setDefaultSessionPlatform(plat)}
                        className="flex-1 flex-row items-center justify-center h-9 rounded-lg border"
                        style={[{borderColor: MC.border, backgroundColor: MC.bg2}, isSelected && { backgroundColor: MC.tealP + '14', borderColor: MC.tealP }]}
                      >
                        <View style={{
                          width: 14, height: 14, borderRadius: 7, borderWidth: 2,
                          borderColor: isSelected ? MC.tealP : MC.dim, alignItems: 'center', justifyContent: 'center',
                          marginRight: 6
                        }}>
                          {isSelected && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: MC.tealP }} />}
                        </View>
                        <Text className="text-dim font-body-bold text-[11.5px]" style={isSelected ? { color: '#fff', fontFamily: FONTS.bold } : undefined}>{plat}</Text>
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
              <View style={{backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 16}}>
                <Text className="text-muted font-display-bold text-[10.5px] tracking-widest uppercase mb-3">PRIVACY CONTROLS</Text>
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
              <View style={{backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 16}}>
                <Text className="text-muted font-display-bold text-[10.5px] tracking-widest uppercase mb-3">AI & SUGGESTIONS</Text>
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
              <View style={{backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 16}}>
                <Text className="text-muted font-display-bold text-[10.5px] tracking-widest uppercase mb-3">APP PREFERENCES</Text>
                <View className="flex-row gap-3">
                  <CustomDropdown
                    label="Language"
                    value={language}
                    options={LANGUAGES}
                    onSelect={setLanguage}
                  />
                  <CustomDropdown
                    label="Timezone"
                    value={timezone}
                    options={TIMEZONES}
                    onSelect={setTimezone}
                  />
                </View>
                <View style={{ marginTop: 12 }}>
                  <Text className="text-muted font-body-bold text-[11.5px] mb-[5px]">Theme</Text>
                  <View className="flex-row gap-2.5 mt-2">
                    {(['Dark', 'Light', 'System'] as const).map((t) => {
                      const isSelected = theme === t;
                      const emoji = t === 'Dark' ? '🌙' : t === 'Light' ? '☀️' : '💻';
                      return (
                        <Pressable
                          key={t}
                          onPress={() => setTheme(t)}
                          className="flex-1 flex-row items-center justify-center h-9 rounded-lg border"
                          style={[{borderColor: MC.border, backgroundColor: MC.bg2}, isSelected && { backgroundColor: MC.tealP + '14', borderColor: MC.tealP }]}
                        >
                          <Text className="text-dim font-body-bold text-[11.5px]" style={isSelected ? { color: '#fff', fontFamily: FONTS.bold } : undefined}>
                            {emoji} {t}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* ACCOUNT */}
              <View style={{backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 16}}>
                <Text className="text-muted font-display-bold text-[10.5px] tracking-widest uppercase mb-3">ACCOUNT</Text>
                <View style={{ gap: 4 }}>
                  <AccountActionRow
                    title="Change Password"
                    subtext="Last changed 3 months ago"
                    btnText="Update"
                    onPress={() => setActiveTab('security')}
                  />
                  <AccountActionRow
                    title="Download My Data"
                    subtext="Export all your data as a JSON file"
                    btnText="Export"
                    onPress={() => {
                      try {
                        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(user || {}, null, 2));
                        const downloadAnchor = document.createElement('a');
                        downloadAnchor.setAttribute("href", dataStr);
                        downloadAnchor.setAttribute("download", `sa-data-export-${user?.unique_id || 'profile'}.json`);
                        document.body.appendChild(downloadAnchor);
                        downloadAnchor.click();
                        downloadAnchor.remove();
                        toast.success('Export Completed', 'Your personal data package has been downloaded.');
                      } catch (e) {
                        toast.error('Export Failed', 'Unable to generate export package.');
                      }
                    }}
                  />
                  <AccountActionRow
                    title="Pause Mentoring"
                    subtext={mentoringPaused ? "Mentoring is currently paused. Resume to accept bookings" : "Temporarily stop accepting new bookings"}
                    btnText={mentoringPaused ? "Resume" : "Pause"}
                    onPress={async () => {
                      const nextState = !mentoringPaused;
                      try {
                        await request('/users/me/preferences', { method: 'PATCH', body: { mentoring: { paused: nextState } } } as any);
                        setMentoringPaused(nextState);
                        if (refreshUser) {
                          await refreshUser();
                        }
                        toast.success(
                          nextState ? 'Mentoring Paused' : 'Mentoring Resumed',
                          nextState ? 'Your bookings have been temporarily paused.' : 'Your bookings have been resumed.'
                        );
                      } catch (e: any) {
                        toast.error('Error', e?.message || 'Failed to update mentoring status.');
                      }
                    }}
                  />
                  <AccountActionRow
                    title="Delete Account"
                    subtext="Permanently delete your account and all data"
                    btnText="Delete"
                    isDelete
                    isLast
                    onPress={async () => {
                      const ok = await confirm({
                        title: 'Delete account',
                        message: 'Are you sure you want to permanently delete your account and all data? This action is irreversible.',
                        confirmText: 'Delete',
                        danger: true,
                      });
                      if (ok) {
                        toast.info('Account action', 'Account deletion request submitted. Please check email to confirm.');
                      }
                    }}
                  />
                </View>
              </View>

              {/* DEMO SANDBOX SETTINGS */}
              {setDemoMode && (
                <View style={{backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 16}}>
                  <Text className="text-muted font-display-bold text-[10.5px] tracking-widest uppercase mb-3">DEMO SANDBOX SETTINGS</Text>
                  <View style={{ gap: 4 }}>
                    <ToggleRow
                      label="Enable Demo Mode"
                      subtext="Display pre-populated mock/sample records in portal views to preview dashboard layouts"
                      value={demoMode}
                      onValueChange={setDemoMode}
                      isLast
                    />
                  </View>
                </View>
              )}

            </View>
          )}

          {activeTab === 'security' && (
            <View style={{ gap: 16 }}>
              
              {/* PASSWORD */}
              <View style={{backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 16}}>
                <Text className="text-muted font-display-bold text-[10.5px] tracking-widest uppercase mb-3">PASSWORD</Text>
                
                <View className="flex-row gap-3">
                  <View style={{ flex: 1 }}>
                    <Text className="text-muted font-body-bold text-[11.5px] mb-[5px]">Current Password</Text>
                    <View style={{backgroundColor: MC.bg2, borderColor: MC.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', height: 38}}>
                      <MaterialCommunityIcons name="lock-outline" size={14} color={MC.dim} style={{ marginRight: 8 }} />
                      <TextInput
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        placeholder="Enter current password"
                        secureTextEntry
                        className="text-white font-body-semibold text-[12.5px] py-1.5 w-full"
                        placeholderTextColor={MC.dim}
                      />
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text className="text-muted font-body-bold text-[11.5px] mb-[5px]">New Password</Text>
                    <View style={{backgroundColor: MC.bg2, borderColor: MC.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', height: 38}}>
                      <MaterialCommunityIcons name="lock-outline" size={14} color={MC.dim} style={{ marginRight: 8 }} />
                      <TextInput
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="Enter new password"
                        secureTextEntry
                        className="text-white font-body-semibold text-[12.5px] py-1.5 w-full"
                        placeholderTextColor={MC.dim}
                      />
                    </View>
                  </View>
                </View>

                <View className="flex-row gap-3" style={{ marginTop: 12, alignItems: 'flex-end' }}>
                  <View style={{ flex: 1 }}>
                    <Text className="text-muted font-body-bold text-[11.5px] mb-[5px]">Confirm New Password</Text>
                    <View style={{backgroundColor: MC.bg2, borderColor: MC.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', height: 38}}>
                      <MaterialCommunityIcons name="lock-outline" size={14} color={MC.dim} style={{ marginRight: 8 }} />
                      <TextInput
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Re-enter new password"
                        secureTextEntry
                        className="text-white font-body-semibold text-[12.5px] py-1.5 w-full"
                        placeholderTextColor={MC.dim}
                      />
                    </View>
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Pressable onPress={handleUpdatePassword} className="px-4 h-[38px] rounded-lg items-center justify-center" style={{backgroundColor: MC.tealP}}>
                      <Text className="text-bg font-body-bold text-[12.5px]">Update Password</Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* TWO-FACTOR AUTHENTICATION */}
              <View style={{backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 16}}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text className="text-muted font-display-bold text-[10.5px] tracking-widest uppercase mb-3">TWO-FACTOR AUTHENTICATION</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View className="px-2 py-[3px] rounded border" style={twoFactorEnabled ? {backgroundColor: 'rgba(34,197,94,0.06)', borderColor: 'rgba(34,197,94,0.2)'} : {backgroundColor: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.2)'}}>
                      <Text className={twoFactorEnabled ? 'text-[#4ADE80] font-body-bold text-[10.5px]' : 'text-[#F59E0B] font-body-bold text-[10.5px]'}>
                        {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => {
                        const newState = !twoFactorEnabled;
                        setTwoFactorEnabled(newState);
                        if (newState) {
                          toast.success('2FA Enabled', 'Two-factor authentication has been enabled.');
                        } else {
                          toast.info('2FA Disabled', 'Two-factor authentication has been disabled.');
                        }
                      }}
                      className="w-9 h-5 rounded-full border items-center px-0.5"
                      style={twoFactorEnabled ? { backgroundColor: MC.tealP, borderColor: MC.tealP } : { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: MC.border }}
                    >
                      <View className="w-3.5 h-3.5 rounded-full bg-white" style={{ transform: [{ translateX: twoFactorEnabled ? 16 : 0 }] }} />
                    </Pressable>
                  </View>
                </View>
                <Text className="text-dim font-body-semibold text-xs" style={{ marginBottom: 0, marginTop: 4 }}>Add an extra layer of security to your account.</Text>
              </View>

              {/* ACTIVE SESSIONS */}
              <View style={{backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 16}}>
                <Text className="text-muted font-display-bold text-[10.5px] tracking-widest uppercase mb-3">ACTIVE SESSIONS</Text>
                <Text className="text-dim font-body-semibold text-xs -mt-2 mb-3">Devices currently signed into your account.</Text>
                <View style={{ gap: 12, marginTop: 4 }}>
                  {sessions.map((s, idx) => (
                    <View key={s.id} className="flex-row items-center justify-between py-3" style={idx < sessions.length - 1 ? { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' } : undefined}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                        <View className="w-9 h-9 rounded-lg items-center justify-center" style={{backgroundColor: 'rgba(255,255,255,0.03)'}}>
                          <MaterialCommunityIcons
                            name={s.type === 'desktop' ? 'monitor' : 'cellphone'}
                            size={18}
                            color={s.isCurrent ? MC.tealP : MC.dim}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text className="text-white font-body-bold text-[13px]">{s.device}</Text>
                          <Text className="text-dim font-body-semibold text-[11.5px] mt-0.5">{s.location}</Text>
                        </View>
                      </View>
                      {s.isCurrent ? (
                        <View className="px-2.5 py-[5px] rounded-md" style={{backgroundColor: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.25)', borderWidth: 1}}>
                          <Text className="text-[#4ADE80] font-body-bold text-[11px]">This device</Text>
                        </View>
                      ) : (
                        <Pressable onPress={() => handleRevokeSession(s.id)} className="h-7 rounded-md items-center justify-center" style={{backgroundColor: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)', borderWidth: 1, paddingHorizontal: 12}}>
                          <Text className="text-rose font-body-bold text-[11px]">Revoke</Text>
                        </Pressable>
                      )}
                    </View>
                  ))}
                </View>
              </View>

              {/* LOGIN ACTIVITY */}
              <View style={{backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 16}}>
                <Text className="text-muted font-display-bold text-[10.5px] tracking-widest uppercase mb-3">LOGIN ACTIVITY</Text>
                <View style={{ gap: 14, marginTop: 4 }}>
                  {loginActivity.map((act) => (
                    <View key={act.id} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                      <View className="w-[22px] h-[22px] rounded-[11px] items-center justify-center mt-0.5" style={act.type === 'success' ? {backgroundColor: 'rgba(34,197,94,0.12)'} : {backgroundColor: 'rgba(239,68,68,0.12)'}}>
                        <MaterialCommunityIcons
                          name={act.type === 'success' ? 'check' : 'alert-circle-outline'}
                          size={13}
                          color={act.type === 'success' ? '#4ADE80' : MC.red}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text className="text-white font-body-bold text-[12.5px]">{act.event}</Text>
                        <Text className="text-dim font-body-semibold text-[11.5px] mt-0.5">{act.details}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

            </View>
          )}

          {activeTab === 'notifications' && (
            <View style={{ gap: 16 }}>
              
              {/* SESSION & BOOKING ALERTS */}
              <View style={{backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 16}}>
                <Text className="text-muted font-display-bold text-[10.5px] tracking-widest uppercase mb-3">SESSION & BOOKING ALERTS</Text>
                <View style={{ gap: 4 }}>
                  <ToggleRow
                    label="New Session Booking"
                    subtext="When a student books a session with you"
                    value={notifyNewBooking}
                    onValueChange={setNotifyNewBooking}
                  />
                  <ToggleRow
                    label="Session Reminders"
                    subtext="Reminders 24h and 1h before each session"
                    value={notifyReminders}
                    onValueChange={setNotifyReminders}
                  />
                  <ToggleRow
                    label="Event RSVPs"
                    subtext="When students register for your events"
                    value={notifyEventRSVPs}
                    onValueChange={setNotifyEventRSVPs}
                    isLast
                  />
                </View>
              </View>

              {/* MESSAGES & CONNECTIONS */}
              <View style={{backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 16}}>
                <Text className="text-muted font-display-bold text-[10.5px] tracking-widest uppercase mb-3">MESSAGES & CONNECTIONS</Text>
                <View style={{ gap: 4 }}>
                  <ToggleRow
                    label="Student Messages"
                    subtext="When a student sends you a message"
                    value={notifyStudentMessages}
                    onValueChange={setNotifyStudentMessages}
                  />
                  <ToggleRow
                    label="Connection Requests"
                    subtext="When someone wants to connect with you"
                    value={notifyConnectionRequests}
                    onValueChange={setNotifyConnectionRequests}
                  />
                  <ToggleRow
                    label="Mentor Network Updates"
                    subtext="Activity from mentors you follow"
                    value={notifyNetworkUpdates}
                    onValueChange={setNotifyNetworkUpdates}
                    isLast
                  />
                </View>
              </View>

              {/* REPORTS & EARNINGS */}
              <View style={{backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 16}}>
                <Text className="text-muted font-display-bold text-[10.5px] tracking-widest uppercase mb-3">REPORTS & EARNINGS</Text>
                <View style={{ gap: 4 }}>
                  <ToggleRow
                    label="Weekly Performance Report"
                    subtext="Summary of sessions, earnings and ratings every Monday"
                    value={notifyWeeklyReport}
                    onValueChange={setNotifyWeeklyReport}
                  />
                  <ToggleRow
                    label="Payment Received Alerts"
                    subtext="When a student payment is confirmed or settled"
                    value={notifyPaymentAlerts}
                    onValueChange={setNotifyPaymentAlerts}
                  />
                  <ToggleRow
                    label="New Student Reviews"
                    subtext="When a student leaves a review after a session"
                    value={notifyStudentReviews}
                    onValueChange={setNotifyStudentReviews}
                    isLast
                  />
                </View>
              </View>

              {/* PLATFORM & MARKETING */}
              <View style={{backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 16}}>
                <Text className="text-muted font-display-bold text-[10.5px] tracking-widest uppercase mb-3">PLATFORM & MARKETING</Text>
                <View style={{ gap: 4 }}>
                  <ToggleRow
                    label="Platform News & Updates"
                    subtext="Product updates and new features from Student Alumni"
                    value={notifyPlatformNews}
                    onValueChange={setNotifyPlatformNews}
                    isLast
                  />
                </View>
              </View>

            </View>
          )}

          {activeTab === 'digital-id' && (
            <View style={{ gap: 16 }}>
              {/* Interactive Flip Card */}
              <View className="items-center gap-3">
                <Pressable onPress={handleFlipCard} className="w-full max-w-[440px] h-[240px] cursor-pointer">
                  <View className="w-full h-full relative">
                    
                    {/* FRONT OF CARD */}
                    <Animated.View style={[{width: '100%', height: 240, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(20,184,166,0.25)', padding: 18, position: 'absolute', top: 0, left: 0, overflow: 'hidden', justifyContent: 'space-between', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 8}, frontAnimatedStyle as any]}>
                      <LinearGradient
                        colors={['#062E25', '#0B4D3F']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                      />
                      
                      <View className="flex-row items-center justify-between z-[2]">
                        <View className="flex-row items-center gap-2">
                          <View className="w-8 h-8 rounded-lg items-center justify-center" style={{backgroundColor: '#14B8A6'}}>
                            <Text className="text-[#0F2922] font-display-bold text-sm">SA</Text>
                          </View>
                          <View style={{ gap: 1 }}>
                            <Text className="text-white font-body-bold text-[12.5px]">Student Alumni</Text>
                            <Text className="text-[rgba(20,184,166,0.75)] font-body-bold text-[9px] tracking-wide mt-px">MENTOR ID · 2028</Text>
                          </View>
                        </View>
                        <View className="flex-row items-center gap-1 px-2 py-[3px] rounded-[12px] border" style={{backgroundColor: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.4)'}}>
                          <View className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: '#10B981'}} />
                          <Text className="text-[#10B981] font-body-bold text-[9.5px] tracking-wide">VERIFIED</Text>
                        </View>
                      </View>

                      <View className="flex-row items-center gap-3.5 z-[2] -mt-2.5">
                        <View className="w-[60px] h-[60px] rounded-[30px] items-center justify-center border-[1.5px]" style={{backgroundColor: 'rgba(20,184,166,0.1)', borderColor: '#14B8A6'}}>
                          {photo ? (
                            <Image source={{ uri: photo }} style={{ width: '100%', height: '100%', borderRadius: 30 }} />
                          ) : (
                            <Text className="text-white font-display-bold text-xl">{initials}</Text>
                          )}
                        </View>
                        <View className="flex-1 gap-0.5">
                          <Text className="text-white font-body-bold text-[17px]">{fullName}</Text>
                          <Text className="text-white/70 font-body-semibold text-xs">{role} · {company}</Text>
                          <Text className="text-white/70 font-body-semibold text-xs">{college} · Batch of 2008</Text>
                        </View>
                      </View>

                      <View className="flex-row items-end justify-between z-[2]">
                        <View>
                          <Text className="text-white/45 font-body-bold text-[8.5px] tracking-widest">MENTOR ID</Text>
                          <Text className="text-white font-display-bold text-base tracking-wide mt-0.5">SM-8-687562</Text>
                        </View>
                        <View className="opacity-90">
                          <Svg width={28} height={20} viewBox="0 0 28 20">
                            <Rect x={0} y={0} width={28} height={20} rx={4} fill="#e5c158" opacity={0.8} />
                            <Rect x={4} y={3} width={8} height={14} rx={1} fill="none" stroke="#2c2c2c" strokeWidth={1} />
                            <Rect x={16} y={3} width={8} height={14} rx={1} fill="none" stroke="#2c2c2c" strokeWidth={1} />
                            <Rect x={10} y={6} width={8} height={8} rx={1} fill="none" stroke="#2c2c2c" strokeWidth={1} />
                          </Svg>
                        </View>
                      </View>
                    </Animated.View>

                    {/* BACK OF CARD */}
                    <Animated.View style={[{width: '100%', height: 240, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(20,184,166,0.25)', padding: 18, position: 'absolute', top: 0, left: 0, overflow: 'hidden', justifyContent: 'space-between', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 8}, backAnimatedStyle as any]}>
                      <LinearGradient
                        colors={['#062E25', '#0B4D3F']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                      />
                      
                      <View className="flex-row items-center justify-between z-[2]">
                        <View className="flex-row items-center gap-2">
                          <View className="w-8 h-8 rounded-lg items-center justify-center" style={{backgroundColor: '#14B8A6'}}>
                            <Text className="text-[#0F2922] font-display-bold text-sm">SA</Text>
                          </View>
                          <View style={{ gap: 1 }}>
                            <Text className="text-white font-body-bold text-[12.5px]">Student Alumni</Text>
                            <Text className="text-[rgba(20,184,166,0.75)] font-body-bold text-[9px] tracking-wide mt-px">MENTOR ID · 2028</Text>
                          </View>
                        </View>
                        <View className="flex-row items-center gap-1 px-2 py-[3px] rounded-[12px] border" style={{backgroundColor: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.4)'}}>
                          <View className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: '#10B981'}} />
                          <Text className="text-[#10B981] font-body-bold text-[9.5px] tracking-wide">VERIFIED</Text>
                        </View>
                      </View>

                      <View className="z-[2] mt-2.5 gap-1">
                        <Text className="text-white/45 font-body-bold text-[9px] tracking-widest">MEMBER ID</Text>
                        <Text className="text-white font-display-bold text-xl tracking-widest">SM-8-687562</Text>
                        <View className="rounded-lg p-2 mt-1.5" style={{backgroundColor: 'rgba(0,0,0,0.25)'}}>
                          <Barcode value="SM-8-687562" color={MC.tealP} height={50} />
                        </View>
                      </View>

                      <View className="flex-row justify-between items-center z-[2]">
                        <Text className="text-white/60 font-body-semibold text-[10.5px]">Valid from 2008 · Lifetime membership</Text>
                        <Text className="text-white/40 font-body-semibold text-[10.5px]">Tap to flip</Text>
                      </View>
                    </Animated.View>

                  </View>
                </Pressable>
                
                <Text className="text-white/40 font-body-semibold text-[11px] text-center mt-1">Tap card to flip · Front & back</Text>
              </View>

              {/* YOUR MENTOR ID Display */}
              <View className="px-4 py-3 flex-row items-center justify-between w-full max-w-[440px] self-center rounded-xl" style={{backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1}}>
                <View>
                  <Text className="text-dim font-body-bold text-[10.5px] tracking-wide">YOUR MENTOR ID</Text>
                  <Text className="text-white font-display-bold text-base tracking-wide mt-0.5">SM-8-687562</Text>
                </View>
                <Pressable onPress={handleCopyId} className="flex-row items-center gap-1.5 px-3 py-2 rounded-lg" style={{backgroundColor: 'rgba(255,255,255,0.05)', borderColor: MC.border, borderWidth: 1}}>
                  <MaterialCommunityIcons name="content-copy" size={14} color="#ffffff" />
                  <Text className="text-white font-body-bold text-xs">Copy ID</Text>
                </Pressable>
              </View>

              {/* Action Buttons Row */}
              <View className="flex-row gap-2 w-full max-w-[440px] self-center">
                <Pressable onPress={handleDownloadCard} className="flex-[1.3] flex-row items-center justify-center gap-1.5 h-[38px] rounded-lg cursor-pointer" style={{backgroundColor: MC.tealP}}>
                  <MaterialCommunityIcons name="download" size={15} color="#0F2922" />
                  <Text className="text-[#0F2922] font-body-bold text-xs">Download ID Card</Text>
                </Pressable>
                
                <Pressable onPress={handleShareProfile} className="flex-1 flex-row items-center justify-center gap-1.5 h-[38px] rounded-lg border cursor-pointer" style={{borderColor: MC.border, backgroundColor: 'transparent'}}>
                  <MaterialCommunityIcons name="share-variant-outline" size={14} color="#ffffff" />
                  <Text className="text-white font-body-bold text-xs">Share Profile</Text>
                </Pressable>

                <Pressable onPress={handleFlipCard} className="flex-1 flex-row items-center justify-center gap-1.5 h-[38px] rounded-lg border cursor-pointer" style={{borderColor: MC.border, backgroundColor: 'transparent'}}>
                  <MaterialCommunityIcons name="refresh" size={14} color="#ffffff" />
                  <Text className="text-white font-body-bold text-xs">Flip Card</Text>
                </Pressable>
              </View>

              {/* Scan to Connect Block */}
              <View className="px-4 py-4 flex-row items-center gap-4 w-full max-w-[440px] self-center rounded-xl" style={{backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1}}>
                <View className="p-2 bg-white rounded-lg items-center justify-center">
                  <QRCode
                    value="https://studentalumni.in/mentor/SM-8-687562"
                    size={80}
                    backgroundColor="#ffffff"
                    color="#000000"
                  />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text className="text-white font-body-bold text-sm">Scan to Connect</Text>
                  <Text className="text-dim font-body-semibold text-[11px] leading-[15.5px]">
                    Students scan this QR to view your mentor profile, book a session, or register for your events.
                  </Text>
                  <Text className="text-teal font-body-bold text-[11.5px] mt-0.5">studentalumni.in/mentor/SM-8-687562</Text>
                </View>
              </View>

              {/* Grid Header & Grid */}
              <Text className="text-dim font-display-bold text-[10px] tracking-widest text-center mt-2 mb-1">THIS ID WORKS ACROSS THE PLATFORM</Text>
              
              <View className="flex-row flex-wrap gap-3 w-full max-w-[440px] self-center">
                <View className="w-[48.5%] rounded-xl p-3 flex-row items-start gap-2.5" style={[{backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1}, stack && { width: '100%' }]}>
                  <View className="w-[30px] h-[30px] rounded-md items-center justify-center border" style={{backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)'}}>
                    <MaterialCommunityIcons name="calendar-clock" size={16} color={MC.tealP} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text className="text-white font-body-bold text-xs">Session Booking</Text>
                    <Text className="text-dim font-body-semibold text-[10px] leading-[13.5px] mt-[3px]">Students book you via your verified mentor link</Text>
                  </View>
                </View>
                
                <View className="w-[48.5%] rounded-xl p-3 flex-row items-start gap-2.5" style={[{backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1}, stack && { width: '100%' }]}>
                  <View className="w-[30px] h-[30px] rounded-md items-center justify-center border" style={{backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)'}}>
                    <MaterialCommunityIcons name="shield-check-outline" size={16} color="#F59E0B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text className="text-white font-body-bold text-xs">Institution Badge</Text>
                    <Text className="text-dim font-body-semibold text-[10px] leading-[13.5px] mt-[3px]">Verified by SA as a trusted industry mentor</Text>
                  </View>
                </View>

                <View className="w-[48.5%] rounded-xl p-3 flex-row items-start gap-2.5" style={[{backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1}, stack && { width: '100%' }]}>
                  <View className="w-[30px] h-[30px] rounded-md items-center justify-center border" style={{backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)'}}>
                    <MaterialCommunityIcons name="qrcode-scan" size={16} color="#3B82F6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text className="text-white font-body-bold text-xs">Instant Share</Text>
                    <Text className="text-dim font-body-semibold text-[10px] leading-[13.5px] mt-[3px]">Share QR at talks, panels, or networking events</Text>
                  </View>
                </View>

                <View className="w-[48.5%] rounded-xl p-3 flex-row items-start gap-2.5" style={[{backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1}, stack && { width: '100%' }]}>
                  <View className="w-[30px] h-[30px] rounded-md items-center justify-center border" style={{backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)'}}>
                    <MaterialCommunityIcons name="check-decagram-outline" size={16} color="#10B981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text className="text-white font-body-bold text-xs">Trusted Identity</Text>
                    <Text className="text-dim font-body-semibold text-[10px] leading-[13.5px] mt-[3px]">Students trust your profile is verified & authentic</Text>
                  </View>
                </View>
              </View>

            </View>
          )}

          {/* Action buttons (Manage Profile, Integrations, Settings & Notifications) */}
          {(activeTab === 'manage' || activeTab === 'tools-integrations' || activeTab === 'settings' || activeTab === 'notifications') && (
            <View className="flex-row items-center justify-between px-4 py-3 rounded-xl" style={{backgroundColor: 'rgba(20,184,166,0.08)', borderColor: 'rgba(20,184,166,0.24)', borderWidth: 1}}>
              <Text className="text-muted font-body-semibold text-[11.5px]">
                {isDirty() ? 'You have unsaved changes' : (lastSavedAt ? `Last saved at ${lastSavedAt}` : 'All changes saved')}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable onPress={handleDiscard} disabled={!isDirty()} className="px-3.5 h-[34px] rounded-lg items-center justify-center" style={[{backgroundColor: 'rgba(255,255,255,0.04)', borderColor: MC.border, borderWidth: 1}, !isDirty() && { opacity: 0.5 }]}>
                  <Text className="text-muted font-body-bold text-xs">Discard</Text>
                </Pressable>
                <Pressable onPress={handleSave} disabled={saving} className="px-4 h-[34px] rounded-lg items-center justify-center" style={{backgroundColor: MC.tealP}}>
                  <Text className="text-bg font-body-bold text-xs">{saving ? 'Saving...' : 'Save Changes'}</Text>
                </Pressable>
              </View>
            </View>
          )}

        </View>

        {/* Right Column (Sidebar) */}
        <View style={{ width: stack ? '100%' : 320, gap: 16 }}>
          
          {/* Profile Score Card */}
          <View style={{backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 16}}>
            <View style={{ alignItems: 'center', gap: 10 }}>
              <CompletionRing
                pct={completionPct}
                size={110}
                stroke={8}
                color={completionPct >= 100 ? '#10B981' : MC.tealP}
              />
              <Text className="text-white font-body-bold text-[13.5px] mt-1">Profile Score</Text>
              <Text className="text-muted font-body-semibold text-[11px]">{completionPct >= 100 ? 'All complete!' : `${100 - completionPct}% to go`}</Text>
              <View className="px-2 py-[3px] rounded" style={{backgroundColor: 'rgba(20,184,166,0.08)', borderColor: 'rgba(20,184,166,0.3)', borderWidth: 1, marginTop: 6}}>
                <Text className="text-teal font-body-bold text-[11px] tracking-wide">SA-08-438291</Text>
              </View>
            </View>
          </View>

          {/* Mentor Stats Card */}
          <View style={{backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 16}}>
            <Text className="text-dim font-display-bold text-[10.5px] tracking-widest">MENTOR STATS</Text>
            <View style={{ marginTop: 8, gap: 2 }}>
              <SidebarStatRow Icon={CalendarCheck} label="Sessions Hosted" value="142 completed" color="#10B981" />
              <SidebarStatRow Icon={UsersRound} label="Active Mentees" value="18" color="#3B82F6" />
              <SidebarStatRow Icon={Eye} label="Profile Views" value="1,248" color={MC.tealP} />
              <SidebarStatRow Icon={Star} label="Avg Rating" value="4.9★" color="#F59E0B" />
              <SidebarStatRow Icon={IndianRupee} label="Earnings (Month)" value="₹500" color="#22C55E" isLast />
            </View>
          </View>

          {/* Mentor ID Card */}
          <View style={{backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 16}}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <ShieldCheck size={14} color={MC.tealP} />
              <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13 }}>Mentor ID</Text>
            </View>
            <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 18, letterSpacing: 0.5 }}>SA-08-438291</Text>
            <Text style={{ color: MC.dim, fontFamily: FONTS.med, fontSize: 11, marginTop: 4 }}>Verified · since 2008</Text>
            <Pressable
              onPress={() => router.push('/member-id')}
              className="mt-3 flex-row items-center justify-center gap-1.5 py-2.5 rounded-lg" style={{backgroundColor: MC.tealP}}
            >
              <IdCard size={14} color="#0F2922" />
              <Text className="text-[#0F2922] font-body-bold text-[11.5px]">View Digital ID Card →</Text>
            </Pressable>
          </View>

        </View>

      </View>

      {/* Inline Action Selection Modal */}
      {optionsModalVisible && (
        <View style={{position: Platform.OS === 'web' ? 'fixed' : 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.80)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, zIndex: 9999}}>
          <View style={{width: '100%', maxWidth: 320, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(20,184,166,0.30)', backgroundColor: '#0F1E1A', padding: 20, alignItems: 'center', ...(Platform.OS === 'web' ? { backgroundImage: 'linear-gradient(180deg, #0C2822 0%, #061411 100%)', boxShadow: '0px 16px 60px rgba(6,77,63,0.45)' } : {})}}>
            {/* Header */}
            <View className="w-full flex-row items-center justify-between mb-4">
              <Text className="text-white font-body-bold text-base">Update Profile Photo</Text>
              <Pressable onPress={() => setOptionsModalVisible(false)} className="p-1 rounded-full" style={{backgroundColor: 'rgba(255,255,255,0.06)'}}>
                <MaterialCommunityIcons name="close" size={18} color="rgba(255,255,255,0.7)" />
              </Pressable>
            </View>

            {/* Selection Items */}
            <View style={{ width: '100%', gap: 10 }}>
              <Pressable
                onPress={() => {
                  setOptionsModalVisible(false);
                  handleTakeSelfie();
                }}
                className="flex-row items-center gap-3 w-full py-3 px-3.5 rounded-[10px]" style={{backgroundColor: 'rgba(255,255,255,0.03)', ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {})}}
                testID="pf-select-take-selfie"
              >
                <MaterialCommunityIcons name="camera" size={18} color={MC.tealP} />
                <Text className="text-white/90 font-body-bold text-sm">Take Selfie</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setOptionsModalVisible(false);
                  handleUploadPhoto();
                }}
                className="flex-row items-center gap-3 w-full py-3 px-3.5 rounded-[10px]" style={{backgroundColor: 'rgba(255,255,255,0.03)', ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {})}}
                testID="pf-select-upload-photo"
              >
                <MaterialCommunityIcons name="upload" size={18} color={MC.tealP} />
                <Text className="text-white/90 font-body-bold text-sm">Upload Photo</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      <WebcamModal
        visible={webcamVisible}
        onClose={() => setWebcamVisible(false)}
        onCapture={(base64) => {
          setPhoto(base64);
          setWebcamVisible(false);
          toast.success('Selfie captured!', 'Save profile to update.');
        }}
      />
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
    <View className="flex-row items-center justify-between py-2" style={[subtext ? {paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'} : null, !isLast && subtext ? { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' } : null]}>
      <View style={{ flex: 1, marginRight: 16 }}>
        <Text className="text-muted font-body-semibold text-[12.5px]" style={subtext ? { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 } : null}>{label}</Text>
        {subtext ? <Text style={{ color: MC.dim, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 3 }}>{subtext}</Text> : null}
      </View>
      <Pressable
        onPress={() => onValueChange(!value)}
        className="w-9 h-5 rounded-full border items-center px-0.5"
        style={value ? { backgroundColor: MC.tealP, borderColor: MC.tealP } : { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: MC.border }}
      >
        <View className="w-3.5 h-3.5 rounded-full bg-white" style={{ transform: [{ translateX: value ? 16 : 0 }] }} />
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
      <Text className="text-muted font-body-bold text-[11.5px] mb-[5px]">{label}</Text>
      <Pressable
        style={[{backgroundColor: MC.bg2, borderColor: MC.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', height: 38}, open && { borderColor: MC.tealP, backgroundColor: MC.tealP + '08' }]}
        onPress={() => setOpen((o) => !o)}
      >
        <Text style={{ color: '#fff', fontFamily: FONTS.med, fontSize: 12.5, flex: 1 }}>{value}</Text>
        <MaterialCommunityIcons name={open ? "chevron-up" : "chevron-down"} size={16} color={MC.dim} />
      </Pressable>
      {open && (
        <View style={{position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, backgroundColor: MC.bg2, borderColor: MC.border, borderWidth: 1, borderRadius: 10, overflow: 'hidden', zIndex: 9999, ...(Platform.OS === 'web' ? { boxShadow: '0 8px 32px rgba(0,0,0,0.5)' } : { elevation: 8 })}}>
          <ScrollView nestedScrollEnabled={true} keyboardShouldPersistTaps="handled" style={{ maxHeight: 220 }}>
            {options.map((o) => (
              <Pressable
                key={o}
                onPress={() => {
                  onSelect(o);
                  setOpen(false);
                }}
                className="px-3 py-2.5" style={{borderBottomColor: 'rgba(255,255,255,0.05)', borderBottomWidth: 1}}
              >
                <Text className="text-white font-body-semibold text-[12.5px]" style={value === o ? { color: MC.tealP, fontFamily: FONTS.bold } : undefined}>{o}</Text>
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
    <View className="flex-row items-center justify-between py-3.5" style={!isLast ? { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' } : undefined}>
      <View style={{ flex: 1, marginRight: 16 }}>
        <Text className="text-white font-body-bold text-[13px]">{title}</Text>
        <Text className="text-dim font-body-semibold text-[11.5px] mt-[3px]">{subtext}</Text>
      </View>
      <Pressable
        onPress={onPress}
        className="px-4 h-8 rounded-lg items-center justify-center min-w-[80px]"
        style={isDelete ? {backgroundColor: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)', borderWidth: 1} : {backgroundColor: 'rgba(255,255,255,0.04)', borderColor: MC.border, borderWidth: 1}}
      >
        <Text className="text-muted font-body-bold text-[11.5px]" style={isDelete ? { color: MC.red } : undefined}>{btnText}</Text>
      </Pressable>
    </View>
  );
}

function CustomRadio({ selected, onPress, label, sub }: { selected: boolean; onPress: () => void; label: string; sub: string }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center rounded-[10px] p-3"
      style={[{borderWidth: 1, borderColor: MC.border, backgroundColor: MC.bg2}, selected && { borderColor: MC.tealP, backgroundColor: MC.tealP + '0a' }]}
    >
      <View className="w-4 h-4 rounded-full border-[1.5px] items-center justify-center mr-2.5" style={[{borderColor: MC.dim}, selected && { borderColor: MC.tealP }]}>
        {selected && <View className="w-2 h-2 rounded-full" style={{backgroundColor: MC.tealP}} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text className="text-muted font-body-bold text-[12.5px]" style={selected ? { color: '#fff', fontFamily: FONTS.bold } : undefined}>{label}</Text>
        <Text className="text-dim font-body-semibold text-[11px] mt-0.5">{sub}</Text>
      </View>
    </Pressable>
  );
}

function SidebarStatRow({ Icon, label, value, color, isLast }: { Icon: any; label: string; value: string; color: string; isLast?: boolean }) {
  return (
    <View className="flex-row items-center gap-2.5 py-2.5" style={!isLast ? { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' } : undefined}>
      <View className="w-7 h-7 rounded-md items-center justify-center border" style={{ backgroundColor: color + '15', borderColor: color + '30' }}>
        <Icon size={13} color={color} />
      </View>
      <Text className="flex-1 text-muted font-body-semibold text-xs">{label}</Text>
      <Text className="text-white font-body-bold text-[13.5px]">{value}</Text>
    </View>
  );
}

function Barcode({ value, color = '#14B8A6', height = 64 }: { value: string; color?: string; height?: number }) {
  const bars = useMemo(() => {
    const pattern: Array<{ w: number; gap: number }> = [];
    const chars = (value || 'SA').split('');
    let i = 0;
    while (pattern.length < 56) {
      const c = chars[i % chars.length].charCodeAt(0);
      pattern.push({ w: (c % 4) + 1, gap: ((c >> 2) % 3) + 1 });
      i += 1;
    }
    return pattern;
  }, [value]);

  const totalUnits = bars.reduce((acc, b) => acc + b.w + b.gap, 0);
  const viewW = totalUnits;

  let x = 0;
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${viewW} ${height}`} preserveAspectRatio="none">
      {bars.map((b, idx) => {
        const rect = <Rect key={idx} x={x} y={0} width={b.w} height={height} fill={color} />;
        x += b.w + b.gap;
        return rect;
      })}
    </Svg>
  );
}


export default MentorProfileSettingsView;

