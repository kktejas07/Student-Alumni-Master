import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Modal,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Briefcase,
  Building2,
  MapPin,
  Clock,
  Search,
  CheckCircle2,
  X,
  AlertCircle,
  Calendar,
  ChevronRight,
  ArrowRight,
  FileText,
  Send,
  Sparkles,
  DollarSign,
  User,
  Phone,
  Mail,
} from 'lucide-react-native';

import { Navbar } from '@/src/views/web/nexus-glow-landing/Navbar';
import { Footer } from '@/src/views/web/nexus-glow-landing/Footer';
import { SAWatermark } from '@/src/views/web/components/SAWatermark';
import { useTheme } from '@/src/theme/ThemeContext';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { api } from '@/src/models/services/api';

export default function CareersPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const user = useAuthStore((s) => s.user);

  const isMobile = width < 768;
  const isTablet = width < 1024;

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [selectedWorkMode, setSelectedWorkMode] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedLevel, setSelectedLevel] = useState('ALL');

  // Openings state
  const [openings, setOpenings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Selected opening modal
  const [selectedOpening, setSelectedOpening] = useState<any | null>(null);

  // Application modal state
  const [applyOpening, setApplyOpening] = useState<any | null>(null);
  const [phone, setPhone] = useState(user?.phone || '');
  const [resumeUrl, setResumeUrl] = useState((user as any)?.resume_url || (user as any)?.resumeUrl || '');
  const [coverLetter, setCoverLetter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState(false);

  // Fetch public openings
  const fetchOpenings = async () => {
    try {
      setLoading(true);
      const res = await api.listPublicCareers({
        search: search.trim() || undefined,
        work_mode: selectedWorkMode,
        employment_type: selectedType,
        experience_level: selectedLevel,
        limit: 50,
      });
      setOpenings(res?.openings || []);
      setTotal(res?.total || 0);
    } catch (err) {
      console.error('Failed to load career openings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpenings();
  }, [selectedWorkMode, selectedType, selectedLevel]);

  // Handle deep link / search param for specific opening
  useEffect(() => {
    if (params.openingId && openings.length > 0) {
      const match = openings.find((o) => o.id === params.openingId || o._id === params.openingId);
      if (match) setSelectedOpening(match);
    }
  }, [params.openingId, openings]);

  const handleSearchSubmit = () => {
    fetchOpenings();
  };

  const handleOpenApply = (opening: any) => {
    if (!user) {
      // Redirect to login preserving destination
      const returnUrl = `/careers?openingId=${opening.id}`;
      router.push(`/(auth)/login?returnUrl=${encodeURIComponent(returnUrl)}` as any);
      return;
    }
    setApplyOpening(opening);
    setApplyError(null);
    setApplySuccess(false);
  };

  const handleSubmitApplication = async () => {
    if (!applyOpening) return;
    setSubmitting(true);
    setApplyError(null);
    try {
      await api.applyToCareer(applyOpening.id, {
        cover_letter: coverLetter.trim(),
        resume_url: resumeUrl.trim(),
        phone: phone.trim(),
      });
      setApplySuccess(true);
    } catch (err: any) {
      const msg = err?.message || err?.detail || 'Failed to submit application. Please try again.';
      setApplyError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Theme colors
  const bg = isDark ? '#0A0A14' : '#F8F9FA';
  const cardBg = isDark ? '#121224' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const textColor = isDark ? '#FFFFFF' : '#111827';
  const textSec = isDark ? '#9CA3AF' : '#6B7280';
  const inputBg = isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6';
  const primaryPurple = '#7C5CFC';

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <Navbar activeTab="careers" />
      <SAWatermark />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Header */}
        <View style={styles.heroSection}>
          <View style={styles.badgeRow}>
            <View style={styles.heroBadge}>
              <Sparkles size={14} color={primaryPurple} />
              <Text style={styles.heroBadgeText}>First-Party StudentAlumni Opportunities</Text>
            </View>
          </View>

          <Text style={[styles.heroTitle, { color: textColor }]}>
            Shape Your Future with Direct Career Openings
          </Text>
          <Text style={[styles.heroSubtitle, { color: textSec }]}>
            Verified opportunities, campus recruitment programs, and official partner roles.
            Apply directly with your StudentAlumni credentials.
          </Text>

          {/* Search & Filter Bar */}
          <View style={[styles.searchContainer, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.searchInputWrap}>
              <Search size={18} color={textSec} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: textColor }]}
                placeholder="Search roles, skills, or companies..."
                placeholderTextColor={textSec}
                value={search}
                onChangeText={setSearch}
                onSubmitEditing={handleSearchSubmit}
              />
              {search.length > 0 && (
                <Pressable onPress={() => { setSearch(''); fetchOpenings(); }} style={styles.clearBtn}>
                  <X size={16} color={textSec} />
                </Pressable>
              )}
            </View>

            <Pressable style={styles.searchActionBtn} onPress={handleSearchSubmit}>
              <Text style={styles.searchActionBtnText}>Search</Text>
            </Pressable>
          </View>

          {/* Filter Chips */}
          <View style={styles.filtersRow}>
            {/* Work Mode */}
            <View style={styles.filterGroup}>
              <Text style={[styles.filterGroupLabel, { color: textSec }]}>Work Mode:</Text>
              {['ALL', 'REMOTE', 'HYBRID', 'ON_SITE'].map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => setSelectedWorkMode(mode)}
                  style={[
                    styles.chip,
                    selectedWorkMode === mode
                      ? { backgroundColor: primaryPurple, borderColor: primaryPurple }
                      : { backgroundColor: inputBg, borderColor: cardBorder },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: selectedWorkMode === mode ? '#FFFFFF' : textSec },
                    ]}
                  >
                    {mode === 'ALL' ? 'All Modes' : mode === 'ON_SITE' ? 'On-site' : mode.charAt(0) + mode.slice(1).toLowerCase()}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Employment Type */}
            <View style={styles.filterGroup}>
              <Text style={[styles.filterGroupLabel, { color: textSec }]}>Type:</Text>
              {['ALL', 'FULL_TIME', 'INTERNSHIP', 'PART_TIME', 'CONTRACT'].map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setSelectedType(type)}
                  style={[
                    styles.chip,
                    selectedType === type
                      ? { backgroundColor: primaryPurple, borderColor: primaryPurple }
                      : { backgroundColor: inputBg, borderColor: cardBorder },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: selectedType === type ? '#FFFFFF' : textSec },
                    ]}
                  >
                    {type === 'ALL' ? 'All Types' : type === 'FULL_TIME' ? 'Full-Time' : type === 'PART_TIME' ? 'Part-Time' : type.charAt(0) + type.slice(1).toLowerCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.mainContent}>
          <View style={styles.contentHeader}>
            <Text style={[styles.resultsCount, { color: textColor }]}>
              {loading ? 'Searching openings...' : `${total} Available ${total === 1 ? 'Opening' : 'Openings'}`}
            </Text>
            <View style={styles.systemNotice}>
              <CheckCircle2 size={14} color="#10B981" />
              <Text style={[styles.systemNoticeText, { color: textSec }]}>
                Direct Hiring Portal
              </Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={primaryPurple} />
              <Text style={[styles.loadingText, { color: textSec }]}>Loading career opportunities...</Text>
            </View>
          ) : openings.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Briefcase size={44} color={textSec} />
              <Text style={[styles.emptyTitle, { color: textColor }]}>
                No career opportunities are currently available.
              </Text>
              <Text style={[styles.emptySubtitle, { color: textSec }]}>
                Check back soon or adjust your search filters to explore other roles.
              </Text>
              {(search || selectedWorkMode !== 'ALL' || selectedType !== 'ALL') && (
                <Pressable
                  style={styles.resetFiltersBtn}
                  onPress={() => {
                    setSearch('');
                    setSelectedWorkMode('ALL');
                    setSelectedType('ALL');
                    setSelectedLevel('ALL');
                  }}
                >
                  <Text style={styles.resetFiltersBtnText}>Reset Filters</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.grid}>
              {openings.map((opening) => (
                <View
                  key={opening.id || opening._id}
                  style={[
                    styles.card,
                    { backgroundColor: cardBg, borderColor: cardBorder },
                    opening.featured && styles.featuredCard,
                  ]}
                >
                  {opening.featured && (
                    <View style={styles.featuredTag}>
                      <Sparkles size={11} color="#FFFFFF" />
                      <Text style={styles.featuredTagText}>FEATURED</Text>
                    </View>
                  )}

                  <View style={styles.cardHeader}>
                    <View style={styles.companyAvatar}>
                      <Building2 size={20} color={primaryPurple} />
                    </View>
                    <View style={styles.cardHeaderInfo}>
                      <Text style={[styles.companyName, { color: textSec }]}>{opening.company_name}</Text>
                      <Text style={[styles.roleTitle, { color: textColor }]} numberOfLines={2}>
                        {opening.title}
                      </Text>
                    </View>
                  </View>

                  {/* Badges */}
                  <View style={styles.cardBadges}>
                    <View style={[styles.badgePill, { backgroundColor: inputBg }]}>
                      <MapPin size={12} color={textSec} />
                      <Text style={[styles.badgePillText, { color: textSec }]}>{opening.location || 'Remote'}</Text>
                    </View>
                    <View style={[styles.badgePill, { backgroundColor: inputBg }]}>
                      <Briefcase size={12} color={textSec} />
                      <Text style={[styles.badgePillText, { color: textSec }]}>
                        {opening.employment_type?.replace('_', ' ')}
                      </Text>
                    </View>
                    <View style={[styles.badgePill, { backgroundColor: inputBg }]}>
                      <Clock size={12} color={textSec} />
                      <Text style={[styles.badgePillText, { color: textSec }]}>{opening.work_mode}</Text>
                    </View>
                  </View>

                  {/* Description snippet */}
                  <Text style={[styles.cardSnippet, { color: textSec }]} numberOfLines={3}>
                    {opening.description}
                  </Text>

                  {/* Skills tags */}
                  {opening.skills && opening.skills.length > 0 && (
                    <View style={styles.skillsRow}>
                      {opening.skills.slice(0, 4).map((skill: string, idx: number) => (
                        <View key={idx} style={[styles.skillChip, { backgroundColor: inputBg }]}>
                          <Text style={[styles.skillChipText, { color: textSec }]}>{skill}</Text>
                        </View>
                      ))}
                      {opening.skills.length > 4 && (
                        <Text style={[styles.skillMoreText, { color: textSec }]}>
                          +{opening.skills.length - 4} more
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Compensation & Deadline */}
                  <View style={styles.cardMeta}>
                    {opening.salary_range && (
                      <View style={styles.salaryWrap}>
                        <DollarSign size={13} color="#10B981" />
                        <Text style={styles.salaryText}>{opening.salary_range}</Text>
                      </View>
                    )}
                    {opening.application_deadline && (
                      <View style={styles.deadlineWrap}>
                        <Calendar size={12} color={textSec} />
                        <Text style={[styles.deadlineText, { color: textSec }]}>
                          Due {new Date(opening.application_deadline).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Card Actions */}
                  <View style={styles.cardActions}>
                    <Pressable
                      style={[styles.btnOutline, { borderColor: cardBorder }]}
                      onPress={() => setSelectedOpening(opening)}
                    >
                      <Text style={[styles.btnOutlineText, { color: textColor }]}>View Details</Text>
                    </Pressable>

                    <Pressable
                      style={styles.btnPrimary}
                      onPress={() => handleOpenApply(opening)}
                    >
                      <Text style={styles.btnPrimaryText}>Apply Now</Text>
                      <ChevronRight size={15} color="#FFFFFF" />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <Footer />
      </ScrollView>

      {/* DETAIL MODAL */}
      {selectedOpening && (
        <Modal visible={true} transparent={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              {/* Modal Header */}
              <View style={[styles.modalHeader, { borderBottomColor: cardBorder }]}>
                <View style={styles.modalHeaderInfo}>
                  <Text style={[styles.modalCompany, { color: textSec }]}>{selectedOpening.company_name}</Text>
                  <Text style={[styles.modalTitle, { color: textColor }]}>{selectedOpening.title}</Text>
                </View>
                <Pressable
                  style={[styles.closeModalBtn, { backgroundColor: inputBg }]}
                  onPress={() => setSelectedOpening(null)}
                >
                  <X size={18} color={textColor} />
                </Pressable>
              </View>

              <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
                {/* Meta badges */}
                <View style={styles.modalMetaRow}>
                  <View style={[styles.badgePill, { backgroundColor: inputBg }]}>
                    <MapPin size={13} color={primaryPurple} />
                    <Text style={[styles.badgePillText, { color: textColor }]}>{selectedOpening.location}</Text>
                  </View>
                  <View style={[styles.badgePill, { backgroundColor: inputBg }]}>
                    <Briefcase size={13} color={primaryPurple} />
                    <Text style={[styles.badgePillText, { color: textColor }]}>
                      {selectedOpening.employment_type?.replace('_', ' ')}
                    </Text>
                  </View>
                  <View style={[styles.badgePill, { backgroundColor: inputBg }]}>
                    <Clock size={13} color={primaryPurple} />
                    <Text style={[styles.badgePillText, { color: textColor }]}>{selectedOpening.work_mode}</Text>
                  </View>
                  {selectedOpening.salary_range && (
                    <View style={[styles.badgePill, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                      <DollarSign size={13} color="#10B981" />
                      <Text style={[styles.badgePillText, { color: '#10B981', fontWeight: '700' }]}>
                        {selectedOpening.salary_range}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Description */}
                <View style={styles.detailSection}>
                  <Text style={[styles.sectionHeading, { color: textColor }]}>Role Overview</Text>
                  <Text style={[styles.sectionBody, { color: textSec }]}>{selectedOpening.description}</Text>
                </View>

                {/* Responsibilities */}
                {selectedOpening.responsibilities && selectedOpening.responsibilities.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.sectionHeading, { color: textColor }]}>Key Responsibilities</Text>
                    {selectedOpening.responsibilities.map((r: string, idx: number) => (
                      <View key={idx} style={styles.bulletItem}>
                        <View style={styles.bulletDot} />
                        <Text style={[styles.bulletText, { color: textSec }]}>{r}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Requirements */}
                {selectedOpening.requirements && selectedOpening.requirements.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.sectionHeading, { color: textColor }]}>Requirements & Qualifications</Text>
                    {selectedOpening.requirements.map((req: string, idx: number) => (
                      <View key={idx} style={styles.bulletItem}>
                        <View style={[styles.bulletDot, { backgroundColor: primaryPurple }]} />
                        <Text style={[styles.bulletText, { color: textSec }]}>{req}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Skills */}
                {selectedOpening.skills && selectedOpening.skills.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.sectionHeading, { color: textColor }]}>Required Skills</Text>
                    <View style={styles.skillsGrid}>
                      {selectedOpening.skills.map((s: string, idx: number) => (
                        <View key={idx} style={[styles.skillChipLarge, { backgroundColor: inputBg }]}>
                          <Text style={[styles.skillChipLargeText, { color: textColor }]}>{s}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Benefits */}
                {selectedOpening.benefits && selectedOpening.benefits.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.sectionHeading, { color: textColor }]}>Perks & Benefits</Text>
                    {selectedOpening.benefits.map((b: string, idx: number) => (
                      <View key={idx} style={styles.bulletItem}>
                        <CheckCircle2 size={15} color="#10B981" style={{ marginTop: 2 }} />
                        <Text style={[styles.bulletText, { color: textSec, marginLeft: 8 }]}>{b}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>

              {/* Modal Footer */}
              <View style={[styles.modalFooter, { borderTopColor: cardBorder }]}>
                <Pressable
                  style={[styles.btnOutline, { borderColor: cardBorder, flex: 1 }]}
                  onPress={() => setSelectedOpening(null)}
                >
                  <Text style={[styles.btnOutlineText, { color: textColor }]}>Close</Text>
                </Pressable>

                <Pressable
                  style={[styles.btnPrimary, { flex: 2 }]}
                  onPress={() => {
                    const op = selectedOpening;
                    setSelectedOpening(null);
                    handleOpenApply(op);
                  }}
                >
                  <Text style={styles.btnPrimaryText}>Apply for this Role</Text>
                  <ArrowRight size={16} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* APPLICATION SUBMISSION MODAL */}
      {applyOpening && (
        <Modal visible={true} transparent={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.applyCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={[styles.modalHeader, { borderBottomColor: cardBorder }]}>
                <View style={styles.modalHeaderInfo}>
                  <Text style={[styles.modalCompany, { color: textSec }]}>Apply to {applyOpening.company_name}</Text>
                  <Text style={[styles.modalTitle, { color: textColor }]}>{applyOpening.title}</Text>
                </View>
                <Pressable
                  style={[styles.closeModalBtn, { backgroundColor: inputBg }]}
                  onPress={() => setApplyOpening(null)}
                >
                  <X size={18} color={textColor} />
                </Pressable>
              </View>

              {applySuccess ? (
                <View style={styles.successContainer}>
                  <CheckCircle2 size={54} color="#10B981" />
                  <Text style={[styles.successTitle, { color: textColor }]}>Application Submitted Successfully</Text>
                  <Text style={[styles.successSubtitle, { color: textSec }]}>
                    Your application for {applyOpening.title} has been recorded directly in StudentAlumni's database.
                    Super Admin and hiring reviewers will update you on next steps.
                  </Text>
                  <Pressable
                    style={[styles.btnPrimary, { marginTop: 20 }]}
                    onPress={() => setApplyOpening(null)}
                  >
                    <Text style={styles.btnPrimaryText}>Done</Text>
                  </Pressable>
                </View>
              ) : (
                <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
                  {applyError && (
                    <View style={styles.errorBanner}>
                      <AlertCircle size={18} color="#EF4444" />
                      <Text style={styles.errorBannerText}>{applyError}</Text>
                    </View>
                  )}

                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: textColor }]}>Candidate Name</Text>
                    <View style={[styles.readonlyField, { backgroundColor: inputBg }]}>
                      <User size={16} color={textSec} />
                      <Text style={[styles.readonlyText, { color: textColor }]}>
                        {user?.name || (user as any)?.fullName || 'Verified Student'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: textColor }]}>Email Address</Text>
                    <View style={[styles.readonlyField, { backgroundColor: inputBg }]}>
                      <Mail size={16} color={textSec} />
                      <Text style={[styles.readonlyText, { color: textColor }]}>{user?.email || ''}</Text>
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: textColor }]}>Phone Number</Text>
                    <View style={[styles.formInputWrap, { backgroundColor: inputBg, borderColor: cardBorder }]}>
                      <Phone size={16} color={textSec} style={{ marginLeft: 12 }} />
                      <TextInput
                        style={[styles.formInput, { color: textColor }]}
                        placeholder="+91 9876543210"
                        placeholderTextColor={textSec}
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: textColor }]}>Resume URL / Link</Text>
                    <View style={[styles.formInputWrap, { backgroundColor: inputBg, borderColor: cardBorder }]}>
                      <FileText size={16} color={textSec} style={{ marginLeft: 12 }} />
                      <TextInput
                        style={[styles.formInput, { color: textColor }]}
                        placeholder="https://drive.google.com/... or portfolio link"
                        placeholderTextColor={textSec}
                        value={resumeUrl}
                        onChangeText={setResumeUrl}
                      />
                    </View>
                    <Text style={[styles.fieldHint, { color: textSec }]}>
                      Include a direct link to your PDF resume or updated portfolio.
                    </Text>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: textColor }]}>Cover Letter / Note to Hiring Team</Text>
                    <TextInput
                      style={[
                        styles.formTextArea,
                        { backgroundColor: inputBg, borderColor: cardBorder, color: textColor },
                      ]}
                      placeholder="Explain why you are a great fit for this opening..."
                      placeholderTextColor={textSec}
                      value={coverLetter}
                      onChangeText={setCoverLetter}
                      multiline={true}
                      numberOfLines={5}
                    />
                  </View>
                </ScrollView>
              )}

              {!applySuccess && (
                <View style={[styles.modalFooter, { borderTopColor: cardBorder }]}>
                  <Pressable
                    style={[styles.btnOutline, { borderColor: cardBorder, flex: 1 }]}
                    onPress={() => setApplyOpening(null)}
                    disabled={submitting}
                  >
                    <Text style={[styles.btnOutlineText, { color: textColor }]}>Cancel</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.btnPrimary, { flex: 2 }, submitting && { opacity: 0.7 }]}
                    onPress={handleSubmitApplication}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.btnPrimaryText}>Submit Application</Text>
                        <Send size={15} color="#FFFFFF" />
                      </>
                    )}
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: '100%',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 80,
    paddingBottom: 40,
  },
  heroSection: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 24,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(124, 92, 252, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(124, 92, 252, 0.25)',
  },
  heroBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C5CFC',
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 720,
    marginBottom: 28,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 6,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    marginLeft: 14,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    outlineWidth: 0 as any,
  },
  clearBtn: {
    padding: 8,
    marginRight: 6,
  },
  searchActionBtn: {
    backgroundColor: '#7C5CFC',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  filtersRow: {
    flexDirection: 'column',
    gap: 12,
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterGroupLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  mainContent: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 48,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  resultsCount: {
    fontSize: 18,
    fontWeight: '700',
  },
  systemNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  systemNoticeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
  },
  emptyContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 440,
    lineHeight: 20,
    marginBottom: 20,
  },
  resetFiltersBtn: {
    backgroundColor: '#7C5CFC',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resetFiltersBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -10,
  },
  card: {
    width: Platform.OS === 'web' ? 'calc(50% - 20px)' as any : '100%',
    margin: 10,
    borderRadius: 16,
    borderWidth: 1,
    padding: 22,
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  featuredCard: {
    borderWidth: 1.5,
    borderColor: '#7C5CFC',
  },
  featuredTag: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#7C5CFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  featuredTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  companyAvatar: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(124, 92, 252, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  roleTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  cardBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgePillText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardSnippet: {
    fontSize: 13.5,
    lineHeight: 20,
    marginBottom: 14,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  skillChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  skillChipText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  skillMoreText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 12,
    marginBottom: 16,
  },
  salaryWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  salaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },
  deadlineWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  deadlineText: {
    fontSize: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  btnOutline: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutlineText: {
    fontSize: 13,
    fontWeight: '600',
  },
  btnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#7C5CFC',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 780,
    maxHeight: '85%',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  applyCard: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalHeaderInfo: {
    flex: 1,
    marginRight: 16,
  },
  modalCompany: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  closeModalBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 24,
  },
  modalMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 22,
  },
  detailSection: {
    marginBottom: 22,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 22,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7C5CFC',
    marginTop: 8,
    marginRight: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChipLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  skillChipLargeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 18,
    borderTopWidth: 1,
  },

  // Apply Form
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  formGroup: {
    marginBottom: 18,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  readonlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readonlyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  formInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  formInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    outlineWidth: 0 as any,
  },
  formTextArea: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 110,
    textAlignVertical: 'top',
    outlineWidth: 0 as any,
  },
  fieldHint: {
    fontSize: 12,
    marginTop: 5,
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 36,
  },
  successTitle: {
    fontSize: 19,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
});
