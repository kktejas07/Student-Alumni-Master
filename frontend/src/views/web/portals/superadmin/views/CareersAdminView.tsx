/**
 * Super Admin → Careers & Direct Opportunities Management
 *
 * Provides complete control over first-party Career Openings and Applications:
 *  - KPI tiles: Total Openings, Published, Drafts, Closed, Applications
 *  - Openings Table: CRUD, publish, close, delete, applicant counts
 *  - Candidate Applications Table: search, filter by role/status
 *  - Application Review Modal: Candidate profile, resume, private notes, status history audit
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  ScrollView,
  Platform,
  RefreshControl,
  Modal,
  ActivityIndicator,
} from 'react-native';
import {
  Briefcase,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  X,
  Building2,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  User,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Eye,
  AlertCircle,
} from 'lucide-react-native';

import { SAC, useSAC, FONTS, resolveColors } from '../tokens';
import {
  GRAD,
  GradientButton,
  SecondaryButton,
  Card,
  SectionLabel,
  StatusPill,
  KpiTile,
  EmptyState,
  useToast,
  Toast,
} from '../applekit';
import { api } from '@/src/models/services/api';

const Field = (props: any) => (
  <TextInput
    style={[
      {
        backgroundColor: SAC.cardSolid,
        color: SAC.text,
        borderWidth: 1,
        borderColor: SAC.border,
        borderRadius: 9,
        padding: 10,
        fontSize: 13,
        fontFamily: FONTS.regular,
        outlineWidth: 0 as any,
      },
      props.style,
    ]}
    placeholderTextColor={SAC.dim}
    {...props}
  />
);

const Label = ({ children }: { children: React.ReactNode }) => (
  <Text
    style={{
      color: SAC.muted,
      fontSize: 11,
      marginBottom: 5,
      fontFamily: FONTS.bold,
      letterSpacing: 0.3,
    }}
  >
    {children}
  </Text>
);

export function CareersAdminView() {
  const T = useSAC();
  Object.assign(s, resolveColors(s, T));
  const { toast, flash, hide } = useToast();

  const [activeTab, setActiveTab] = useState<'openings' | 'applications'>('openings');

  // Stats
  const [stats, setStats] = useState({
    total_openings: 0,
    published_openings: 0,
    draft_openings: 0,
    closed_openings: 0,
    total_applications: 0,
  });

  // Openings state
  const [openings, setOpenings] = useState<any[]>([]);
  const [openingsLoading, setOpeningsLoading] = useState(true);
  const [openingsFilterStatus, setOpeningsFilterStatus] = useState('ALL');
  const [openingsSearch, setOpeningsSearch] = useState('');

  // Applications state
  const [applications, setApplications] = useState<any[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [selectedOpeningFilter, setSelectedOpeningFilter] = useState('ALL');
  const [applicationStatusFilter, setApplicationStatusFilter] = useState('ALL');
  const [applicationSearch, setApplicationSearch] = useState('');

  // Create / Edit Opening modal
  const [openingModalVisible, setOpeningModalVisible] = useState(false);
  const [editingOpening, setEditingOpening] = useState<any | null>(null);
  const [openingForm, setOpeningForm] = useState({
    title: '',
    company_name: '',
    description: '',
    employment_type: 'FULL_TIME',
    work_mode: 'REMOTE',
    location: 'Remote',
    experience_level: 'ANY',
    salary_range: '',
    application_deadline: '',
    requirements: '',
    responsibilities: '',
    skills: '',
    benefits: '',
    status: 'DRAFT',
    featured: false,
  });
  const [savingOpening, setSavingOpening] = useState(false);

  // Review Application modal
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [appDetailLoading, setAppDetailLoading] = useState(false);
  const [appReviewStatus, setAppReviewStatus] = useState('APPLIED');
  const [appAdminNotes, setAppAdminNotes] = useState('');
  const [updatingApp, setUpdatingApp] = useState(false);

  // Load Stats
  const loadStats = useCallback(async () => {
    try {
      const data = await api.getCareerAdminStats();
      if (data) setStats(data);
    } catch (e) {
      console.error('Failed to load career stats', e);
    }
  }, []);

  // Load Openings
  const loadOpenings = useCallback(async () => {
    try {
      setOpeningsLoading(true);
      const res = await api.listAdminCareers({
        status: openingsFilterStatus,
        search: openingsSearch.trim() || undefined,
        limit: 100,
      });
      setOpenings(res?.openings || []);
    } catch (e: any) {
      flash(e?.message || 'Failed to load career openings', 'err');
    } finally {
      setOpeningsLoading(false);
    }
  }, [openingsFilterStatus, openingsSearch, flash]);

  // Load Applications
  const loadApplications = useCallback(async () => {
    try {
      setApplicationsLoading(true);
      const res = await api.listAdminCareerApplications({
        opening_id: selectedOpeningFilter,
        status: applicationStatusFilter,
        search: applicationSearch.trim() || undefined,
        limit: 100,
      });
      setApplications(res?.applications || []);
    } catch (e: any) {
      flash(e?.message || 'Failed to load applications', 'err');
    } finally {
      setApplicationsLoading(false);
    }
  }, [selectedOpeningFilter, applicationStatusFilter, applicationSearch, flash]);

  useEffect(() => {
    loadStats();
    loadOpenings();
  }, [loadStats, loadOpenings]);

  useEffect(() => {
    if (activeTab === 'applications') {
      loadApplications();
    }
  }, [activeTab, loadApplications]);

  // Handle opening modal open
  const openCreateOpeningModal = () => {
    setEditingOpening(null);
    setOpeningForm({
      title: '',
      company_name: 'StudentAlumni',
      description: '',
      employment_type: 'FULL_TIME',
      work_mode: 'REMOTE',
      location: 'Remote',
      experience_level: 'ANY',
      salary_range: '',
      application_deadline: '',
      requirements: '',
      responsibilities: '',
      skills: '',
      benefits: '',
      status: 'DRAFT',
      featured: false,
    });
    setOpeningModalVisible(true);
  };

  const openEditOpeningModal = (op: any) => {
    setEditingOpening(op);
    setOpeningForm({
      title: op.title || '',
      company_name: op.company_name || '',
      description: op.description || '',
      employment_type: op.employment_type || 'FULL_TIME',
      work_mode: op.work_mode || 'REMOTE',
      location: op.location || 'Remote',
      experience_level: op.experience_level || 'ANY',
      salary_range: op.salary_range || '',
      application_deadline: op.application_deadline ? op.application_deadline.slice(0, 10) : '',
      requirements: Array.isArray(op.requirements) ? op.requirements.join('\n') : op.requirements || '',
      responsibilities: Array.isArray(op.responsibilities) ? op.responsibilities.join('\n') : op.responsibilities || '',
      skills: Array.isArray(op.skills) ? op.skills.join(', ') : op.skills || '',
      benefits: Array.isArray(op.benefits) ? op.benefits.join('\n') : op.benefits || '',
      status: op.status || 'DRAFT',
      featured: !!op.featured,
    });
    setOpeningModalVisible(true);
  };

  // Save Opening
  const handleSaveOpening = async () => {
    if (!openingForm.title.trim() || !openingForm.company_name.trim() || !openingForm.description.trim()) {
      flash('Title, Company, and Description are required.', 'err');
      return;
    }

    setSavingOpening(true);
    try {
      const payload: any = {
        title: openingForm.title.trim(),
        company_name: openingForm.company_name.trim(),
        description: openingForm.description.trim(),
        employment_type: openingForm.employment_type,
        work_mode: openingForm.work_mode,
        location: openingForm.location.trim() || 'Remote',
        experience_level: openingForm.experience_level,
        salary_range: openingForm.salary_range.trim() || undefined,
        status: openingForm.status,
        featured: openingForm.featured,
        requirements: openingForm.requirements
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        responsibilities: openingForm.responsibilities
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        skills: openingForm.skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        benefits: openingForm.benefits
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      };

      if (openingForm.application_deadline.trim()) {
        payload.application_deadline = new Date(openingForm.application_deadline.trim()).toISOString();
      }

      if (editingOpening) {
        await api.updateAdminCareer(editingOpening.id, payload);
        flash('Career opening updated successfully.', 'ok');
      } else {
        await api.createAdminCareer(payload);
        flash('Career opening created successfully.', 'ok');
      }

      setOpeningModalVisible(false);
      loadOpenings();
      loadStats();
    } catch (e: any) {
      flash(e?.message || 'Failed to save opening', 'err');
    } finally {
      setSavingOpening(false);
    }
  };

  // Publish / Close / Delete Opening
  const handlePublishOpening = async (id: string) => {
    try {
      await api.publishAdminCareer(id);
      flash('Opening published successfully.', 'ok');
      loadOpenings();
      loadStats();
    } catch (e: any) {
      flash(e?.message || 'Failed to publish opening', 'err');
    }
  };

  const handleCloseOpening = async (id: string) => {
    try {
      await api.closeAdminCareer(id);
      flash('Opening closed successfully.', 'ok');
      loadOpenings();
      loadStats();
    } catch (e: any) {
      flash(e?.message || 'Failed to close opening', 'err');
    }
  };

  const handleDeleteOpening = async (id: string) => {
    if (Platform.OS === 'web' && !window.confirm('Are you sure you want to delete this opening?')) {
      return;
    }
    try {
      await api.deleteAdminCareer(id);
      flash('Career opening deleted.', 'ok');
      loadOpenings();
      loadStats();
    } catch (e: any) {
      flash(e?.message || 'Failed to delete opening', 'err');
    }
  };

  // Open Application Review
  const openApplicationReview = async (appId: string) => {
    try {
      setAppDetailLoading(true);
      const app = await api.getAdminCareerApplication(appId);
      setSelectedApp(app);
      setAppReviewStatus(app.status || 'APPLIED');
      setAppAdminNotes(app.admin_notes || '');
    } catch (e: any) {
      flash(e?.message || 'Failed to load application details', 'err');
    } finally {
      setAppDetailLoading(false);
    }
  };

  // Update Application Status
  const handleUpdateApplicationStatus = async () => {
    if (!selectedApp) return;
    setUpdatingApp(true);
    try {
      const updated = await api.updateAdminCareerApplicationStatus(selectedApp.id, {
        status: appReviewStatus,
        admin_notes: appAdminNotes.trim(),
      });
      setSelectedApp(updated);
      flash(`Application updated to ${appReviewStatus}.`, 'ok');
      loadApplications();
      loadStats();
    } catch (e: any) {
      flash(e?.message || 'Failed to update application', 'err');
    } finally {
      setUpdatingApp(false);
    }
  };

  return (
    <View style={s.root}>
      {toast && <Toast text={toast.text} type={toast.type} onDismiss={hide} />}

      {/* KPI Section */}
      <View style={s.kpiRow}>
        <KpiTile
          label="Total Openings"
          value={stats.total_openings}
          hint="First-party opportunities"
          Icon={Briefcase}
          tone="accent"
        />
        <KpiTile
          label="Published"
          value={stats.published_openings}
          hint="Live on public page"
          Icon={CheckCircle2}
          tone="emerald"
        />
        <KpiTile
          label="Drafts"
          value={stats.draft_openings}
          hint="Unpublished openings"
          Icon={Pencil}
          tone="amber"
        />
        <KpiTile
          label="Closed"
          value={stats.closed_openings}
          hint="Archived / expired"
          Icon={XCircle}
          tone="rose"
        />
        <KpiTile
          label="Applications"
          value={stats.total_applications}
          hint="Direct candidate submissions"
          Icon={FileText}
          tone="blue"
        />
      </View>

      {/* Navigation Subtabs */}
      <View style={s.tabsRow}>
        <Pressable
          style={[s.tabButton, activeTab === 'openings' && s.tabButtonActive]}
          onPress={() => setActiveTab('openings')}
        >
          <Briefcase size={15} color={activeTab === 'openings' ? '#FFFFFF' : SAC.muted} />
          <Text style={[s.tabButtonText, activeTab === 'openings' && s.tabButtonTextActive]}>
            Career Openings ({stats.total_openings})
          </Text>
        </Pressable>

        <Pressable
          style={[s.tabButton, activeTab === 'applications' && s.tabButtonActive]}
          onPress={() => setActiveTab('applications')}
        >
          <FileText size={15} color={activeTab === 'applications' ? '#FFFFFF' : SAC.muted} />
          <Text style={[s.tabButtonText, activeTab === 'applications' && s.tabButtonTextActive]}>
            Candidate Applications ({stats.total_applications})
          </Text>
        </Pressable>
      </View>

      {/* TAB 1: CAREER OPENINGS */}
      {activeTab === 'openings' && (
        <Card style={s.tableCard}>
          <View style={s.tableHeaderRow}>
            <View style={s.searchWrap}>
              <Search size={14} color={SAC.dim} style={{ marginRight: 8 }} />
              <TextInput
                style={s.searchInput}
                placeholder="Search openings..."
                placeholderTextColor={SAC.dim}
                value={openingsSearch}
                onChangeText={setOpeningsSearch}
                onSubmitEditing={loadOpenings}
              />
            </View>

            <View style={s.filterRow}>
              {['ALL', 'PUBLISHED', 'DRAFT', 'CLOSED'].map((st) => (
                <Pressable
                  key={st}
                  onPress={() => setOpeningsFilterStatus(st)}
                  style={[s.statusChip, openingsFilterStatus === st && s.statusChipActive]}
                >
                  <Text style={[s.statusChipText, openingsFilterStatus === st && s.statusChipTextActive]}>
                    {st === 'ALL' ? 'All' : st.charAt(0) + st.slice(1).toLowerCase()}
                  </Text>
                </Pressable>
              ))}

              <GradientButton title="Create Opening" Icon={Plus} onPress={openCreateOpeningModal} />
            </View>
          </View>

          {openingsLoading ? (
            <View style={s.centerLoading}>
              <ActivityIndicator size="small" color={SAC.accent} />
              <Text style={{ color: SAC.muted, fontSize: 13, marginTop: 8 }}>Loading openings...</Text>
            </View>
          ) : openings.length === 0 ? (
            <EmptyState
              title="No career openings found"
              hint="Create your first direct student career opening."
              Icon={Briefcase}
            />
          ) : (
            <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
              <View style={s.table}>
                {/* Table Header */}
                <View style={s.thRow}>
                  <Text style={[s.th, { width: 220 }]}>Role Title</Text>
                  <Text style={[s.th, { width: 150 }]}>Company</Text>
                  <Text style={[s.th, { width: 110 }]}>Type</Text>
                  <Text style={[s.th, { width: 100 }]}>Work Mode</Text>
                  <Text style={[s.th, { width: 100 }]}>Status</Text>
                  <Text style={[s.th, { width: 100, textAlign: 'center' }]}>Applicants</Text>
                  <Text style={[s.th, { width: 200, textAlign: 'right' }]}>Actions</Text>
                </View>

                {/* Table Body */}
                {openings.map((op) => {
                  const isDraft = op.status === 'DRAFT';
                  const isPub = op.status === 'PUBLISHED';
                  const isClosed = op.status === 'CLOSED';

                  return (
                    <View key={op.id || op._id} style={s.trRow}>
                      <View style={{ width: 220 }}>
                        <Text style={s.roleTitle} numberOfLines={1}>
                          {op.title}
                        </Text>
                        <Text style={s.roleSub} numberOfLines={1}>
                          {op.location || 'Remote'}
                        </Text>
                      </View>

                      <Text style={[s.td, { width: 150 }]} numberOfLines={1}>
                        {op.company_name}
                      </Text>

                      <Text style={[s.td, { width: 110 }]}>
                        {op.employment_type?.replace('_', ' ')}
                      </Text>

                      <Text style={[s.td, { width: 100 }]}>{op.work_mode}</Text>

                      <View style={{ width: 100 }}>
                        <StatusPill
                          tone={isPub ? 'emerald' : isDraft ? 'amber' : 'rose'}
                          label={op.status}
                        />
                      </View>

                      <View style={{ width: 100, alignItems: 'center' }}>
                        <Pressable
                          style={s.applicantCountBadge}
                          onPress={() => {
                            setSelectedOpeningFilter(op.id);
                            setActiveTab('applications');
                          }}
                        >
                          <Text style={s.applicantCountText}>{op.application_count || 0}</Text>
                        </Pressable>
                      </View>

                      <View style={[s.actionsCell, { width: 200 }]}>
                        <Pressable style={s.actionBtn} onPress={() => openEditOpeningModal(op)}>
                          <Pencil size={13} color={SAC.muted} />
                        </Pressable>

                        {isDraft && (
                          <Pressable
                            style={[s.actionBtnText, { backgroundColor: 'rgba(16,185,129,0.15)' }]}
                            onPress={() => handlePublishOpening(op.id)}
                          >
                            <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '700' }}>Publish</Text>
                          </Pressable>
                        )}

                        {isPub && (
                          <Pressable
                            style={[s.actionBtnText, { backgroundColor: 'rgba(239,68,68,0.15)' }]}
                            onPress={() => handleCloseOpening(op.id)}
                          >
                            <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700' }}>Close</Text>
                          </Pressable>
                        )}

                        {isClosed && (
                          <Pressable
                            style={[s.actionBtnText, { backgroundColor: 'rgba(124,92,252,0.15)' }]}
                            onPress={() => handlePublishOpening(op.id)}
                          >
                            <Text style={{ color: '#7C5CFC', fontSize: 11, fontWeight: '700' }}>Reopen</Text>
                          </Pressable>
                        )}

                        <Pressable style={s.actionBtn} onPress={() => handleDeleteOpening(op.id)}>
                          <Trash2 size={13} color="#EF4444" />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </Card>
      )}

      {/* TAB 2: CANDIDATE APPLICATIONS */}
      {activeTab === 'applications' && (
        <Card style={s.tableCard}>
          <View style={s.tableHeaderRow}>
            <View style={s.searchWrap}>
              <Search size={14} color={SAC.dim} style={{ marginRight: 8 }} />
              <TextInput
                style={s.searchInput}
                placeholder="Search candidate name or email..."
                placeholderTextColor={SAC.dim}
                value={applicationSearch}
                onChangeText={setApplicationSearch}
                onSubmitEditing={loadApplications}
              />
            </View>

            <View style={s.filterRow}>
              {['ALL', 'APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED'].map(
                (st) => (
                  <Pressable
                    key={st}
                    onPress={() => setApplicationStatusFilter(st)}
                    style={[s.statusChip, applicationStatusFilter === st && s.statusChipActive]}
                  >
                    <Text
                      style={[
                        s.statusChipText,
                        applicationStatusFilter === st && s.statusChipTextActive,
                      ]}
                    >
                      {st === 'ALL' ? 'All' : st.replace('_', ' ')}
                    </Text>
                  </Pressable>
                )
              )}

              {selectedOpeningFilter !== 'ALL' && (
                <Pressable
                  style={s.clearFilterBtn}
                  onPress={() => setSelectedOpeningFilter('ALL')}
                >
                  <Text style={s.clearFilterBtnText}>Clear Role Filter</Text>
                </Pressable>
              )}
            </View>
          </View>

          {applicationsLoading ? (
            <View style={s.centerLoading}>
              <ActivityIndicator size="small" color={SAC.accent} />
              <Text style={{ color: SAC.muted, fontSize: 13, marginTop: 8 }}>Loading applications...</Text>
            </View>
          ) : applications.length === 0 ? (
            <EmptyState
              title="No applications found"
              hint="Candidate submissions will appear here once students apply."
              Icon={FileText}
            />
          ) : (
            <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
              <View style={s.table}>
                <View style={s.thRow}>
                  <Text style={[s.th, { width: 200 }]}>Candidate</Text>
                  <Text style={[s.th, { width: 220 }]}>Opening Role</Text>
                  <Text style={[s.th, { width: 140 }]}>Applied Date</Text>
                  <Text style={[s.th, { width: 120 }]}>Status</Text>
                  <Text style={[s.th, { width: 120, textAlign: 'right' }]}>Review</Text>
                </View>

                {applications.map((app) => {
                  const tone =
                    app.status === 'SELECTED'
                      ? 'emerald'
                      : app.status === 'SHORTLISTED' || app.status === 'INTERVIEW'
                      ? 'accent'
                      : app.status === 'UNDER_REVIEW'
                      ? 'amber'
                      : app.status === 'REJECTED'
                      ? 'rose'
                      : 'muted';

                  return (
                    <View key={app.id || app._id} style={s.trRow}>
                      <View style={{ width: 200 }}>
                        <Text style={s.roleTitle} numberOfLines={1}>
                          {app.student_name}
                        </Text>
                        <Text style={s.roleSub} numberOfLines={1}>
                          {app.student_email}
                        </Text>
                      </View>

                      <View style={{ width: 220 }}>
                        <Text style={s.roleTitle} numberOfLines={1}>
                          {app.opening_title || 'Career Role'}
                        </Text>
                        <Text style={s.roleSub} numberOfLines={1}>
                          {app.company_name || 'StudentAlumni'}
                        </Text>
                      </View>

                      <Text style={[s.td, { width: 140 }]}>
                        {app.created_at ? new Date(app.created_at).toLocaleDateString() : 'N/A'}
                      </Text>

                      <View style={{ width: 120 }}>
                        <StatusPill tone={tone as any} label={app.status?.replace('_', ' ')} />
                      </View>

                      <View style={[s.actionsCell, { width: 120, justifyContent: 'flex-end' }]}>
                        <SecondaryButton
                          title="Review"
                          Icon={Eye}
                          onPress={() => openApplicationReview(app.id)}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </Card>
      )}

      {/* CREATE / EDIT OPENING MODAL */}
      {openingModalVisible && (
        <Modal visible={true} transparent={true} animationType="fade">
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>
                  {editingOpening ? 'Edit Career Opening' : 'Create First-Party Career Opening'}
                </Text>
                <Pressable onPress={() => setOpeningModalVisible(false)} style={s.closeModalBtn}>
                  <X size={18} color={SAC.text} />
                </Pressable>
              </View>

              <ScrollView style={s.modalScroll} contentContainerStyle={{ padding: 20, gap: 14 }}>
                <View style={s.formGrid}>
                  <View style={{ flex: 1 }}>
                    <Label>Role Title *</Label>
                    <Field
                      placeholder="e.g. Lead Software Engineer"
                      value={openingForm.title}
                      onChangeText={(v: string) => setOpeningForm((f) => ({ ...f, title: v }))}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Label>Company Name *</Label>
                    <Field
                      placeholder="e.g. StudentAlumni Labs"
                      value={openingForm.company_name}
                      onChangeText={(v: string) => setOpeningForm((f) => ({ ...f, company_name: v }))}
                    />
                  </View>
                </View>

                <View style={s.formGrid}>
                  <View style={{ flex: 1 }}>
                    <Label>Employment Type</Label>
                    <View style={s.chipsRow}>
                      {['FULL_TIME', 'INTERNSHIP', 'PART_TIME', 'CONTRACT'].map((t) => (
                        <Pressable
                          key={t}
                          style={[
                            s.choiceChip,
                            openingForm.employment_type === t && s.choiceChipActive,
                          ]}
                          onPress={() => setOpeningForm((f) => ({ ...f, employment_type: t }))}
                        >
                          <Text
                            style={[
                              s.choiceChipText,
                              openingForm.employment_type === t && s.choiceChipTextActive,
                            ]}
                          >
                            {t === 'FULL_TIME' ? 'Full-Time' : t === 'PART_TIME' ? 'Part-Time' : t.charAt(0) + t.slice(1).toLowerCase()}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Label>Work Mode</Label>
                    <View style={s.chipsRow}>
                      {['REMOTE', 'HYBRID', 'ON_SITE'].map((m) => (
                        <Pressable
                          key={m}
                          style={[s.choiceChip, openingForm.work_mode === m && s.choiceChipActive]}
                          onPress={() => setOpeningForm((f) => ({ ...f, work_mode: m }))}
                        >
                          <Text
                            style={[
                              s.choiceChipText,
                              openingForm.work_mode === m && s.choiceChipTextActive,
                            ]}
                          >
                            {m === 'ON_SITE' ? 'On-site' : m.charAt(0) + m.slice(1).toLowerCase()}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>

                <View style={s.formGrid}>
                  <View style={{ flex: 1 }}>
                    <Label>Location</Label>
                    <Field
                      placeholder="e.g. Bengaluru, India or Remote"
                      value={openingForm.location}
                      onChangeText={(v: string) => setOpeningForm((f) => ({ ...f, location: v }))}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Label>Salary / Stipend Range</Label>
                    <Field
                      placeholder="e.g. ₹18,00,000 - ₹24,00,000 P.A."
                      value={openingForm.salary_range}
                      onChangeText={(v: string) => setOpeningForm((f) => ({ ...f, salary_range: v }))}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Label>Application Deadline (YYYY-MM-DD)</Label>
                    <Field
                      placeholder="2026-12-31"
                      value={openingForm.application_deadline}
                      onChangeText={(v: string) =>
                        setOpeningForm((f) => ({ ...f, application_deadline: v }))
                      }
                    />
                  </View>
                </View>

                <View>
                  <Label>Job Description *</Label>
                  <Field
                    placeholder="Comprehensive overview of the role..."
                    value={openingForm.description}
                    onChangeText={(v: string) => setOpeningForm((f) => ({ ...f, description: v }))}
                    multiline={true}
                    numberOfLines={4}
                    style={{ minHeight: 90, textAlignVertical: 'top' }}
                  />
                </View>

                <View>
                  <Label>Key Responsibilities (one per line)</Label>
                  <Field
                    placeholder="Architect distributed systems&#10;Lead mentorship initiatives"
                    value={openingForm.responsibilities}
                    onChangeText={(v: string) =>
                      setOpeningForm((f) => ({ ...f, responsibilities: v }))
                    }
                    multiline={true}
                    numberOfLines={3}
                    style={{ minHeight: 70, textAlignVertical: 'top' }}
                  />
                </View>

                <View>
                  <Label>Requirements & Qualifications (one per line)</Label>
                  <Field
                    placeholder="Bachelor's in Computer Science or related&#10;Solid understanding of data structures"
                    value={openingForm.requirements}
                    onChangeText={(v: string) => setOpeningForm((f) => ({ ...f, requirements: v }))}
                    multiline={true}
                    numberOfLines={3}
                    style={{ minHeight: 70, textAlignVertical: 'top' }}
                  />
                </View>

                <View>
                  <Label>Skills (comma-separated)</Label>
                  <Field
                    placeholder="Python, FastAPI, MongoDB, React Native, Redis"
                    value={openingForm.skills}
                    onChangeText={(v: string) => setOpeningForm((f) => ({ ...f, skills: v }))}
                  />
                </View>

                <View>
                  <Label>Perks & Benefits (one per line)</Label>
                  <Field
                    placeholder="Health insurance&#10;Learning & conference budget"
                    value={openingForm.benefits}
                    onChangeText={(v: string) => setOpeningForm((f) => ({ ...f, benefits: v }))}
                    multiline={true}
                    numberOfLines={2}
                    style={{ minHeight: 60, textAlignVertical: 'top' }}
                  />
                </View>

                <View style={s.formGrid}>
                  <View style={{ flex: 1 }}>
                    <Label>Status</Label>
                    <View style={s.chipsRow}>
                      {['DRAFT', 'PUBLISHED', 'CLOSED'].map((st) => (
                        <Pressable
                          key={st}
                          style={[s.choiceChip, openingForm.status === st && s.choiceChipActive]}
                          onPress={() => setOpeningForm((f) => ({ ...f, status: st }))}
                        >
                          <Text
                            style={[
                              s.choiceChipText,
                              openingForm.status === st && s.choiceChipTextActive,
                            ]}
                          >
                            {st}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Pressable
                      style={s.featuredCheckbox}
                      onPress={() => setOpeningForm((f) => ({ ...f, featured: !f.featured }))}
                    >
                      <View
                        style={[
                          s.checkboxBox,
                          openingForm.featured && { backgroundColor: SAC.accent, borderColor: SAC.accent },
                        ]}
                      >
                        {openingForm.featured && <CheckCircle2 size={13} color="#FFFFFF" />}
                      </View>
                      <Text style={{ color: SAC.text, fontSize: 13, fontFamily: FONTS.medium }}>
                        Mark as Featured Opportunity
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </ScrollView>

              <View style={s.modalFooter}>
                <SecondaryButton
                  title="Cancel"
                  onPress={() => setOpeningModalVisible(false)}
                  disabled={savingOpening}
                />
                <GradientButton
                  title={savingOpening ? 'Saving...' : editingOpening ? 'Update Opening' : 'Create Opening'}
                  Icon={CheckCircle2}
                  onPress={handleSaveOpening}
                  disabled={savingOpening}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* REVIEW APPLICATION MODAL */}
      {selectedApp && (
        <Modal visible={true} transparent={true} animationType="fade">
          <View style={s.modalOverlay}>
            <View style={[s.modalCard, { maxWidth: 750 }]}>
              <View style={s.modalHeader}>
                <View>
                  <Text style={s.modalTitle}>Application Review</Text>
                  <Text style={{ color: SAC.muted, fontSize: 12 }}>
                    Candidate submission for {selectedApp.opening?.title || selectedApp.career_opening_id}
                  </Text>
                </View>
                <Pressable onPress={() => setSelectedApp(null)} style={s.closeModalBtn}>
                  <X size={18} color={SAC.text} />
                </Pressable>
              </View>

              <ScrollView style={s.modalScroll} contentContainerStyle={{ padding: 20, gap: 16 }}>
                {/* Candidate Profile Details */}
                <View style={s.reviewSection}>
                  <Text style={s.reviewSectionTitle}>Candidate Profile</Text>
                  <View style={s.profileGrid}>
                    <View style={s.profileItem}>
                      <User size={14} color={SAC.dim} />
                      <Text style={s.profileVal}>{selectedApp.student_name}</Text>
                    </View>
                    <View style={s.profileItem}>
                      <Mail size={14} color={SAC.dim} />
                      <Text style={s.profileVal}>{selectedApp.student_email}</Text>
                    </View>
                    {selectedApp.student_phone && (
                      <View style={s.profileItem}>
                        <Phone size={14} color={SAC.dim} />
                        <Text style={s.profileVal}>{selectedApp.student_phone}</Text>
                      </View>
                    )}
                    {selectedApp.student_profile?.college && (
                      <View style={s.profileItem}>
                        <Building2 size={14} color={SAC.dim} />
                        <Text style={s.profileVal}>{selectedApp.student_profile.college}</Text>
                      </View>
                    )}
                  </View>

                  {/* Resume Link */}
                  {selectedApp.resume_url ? (
                    <View style={{ marginTop: 12 }}>
                      <Label>Resume Attachment / Portfolio</Label>
                      <Pressable
                        style={s.resumeBtn}
                        onPress={() => {
                          if (Platform.OS === 'web') {
                            window.open(selectedApp.resume_url, '_blank');
                          }
                        }}
                      >
                        <FileText size={15} color={SAC.accent} />
                        <Text style={{ color: SAC.accent, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                          {selectedApp.resume_url}
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Text style={{ color: SAC.dim, fontSize: 12, marginTop: 8 }}>
                      No resume URL provided.
                    </Text>
                  )}

                  {/* Cover Letter */}
                  {selectedApp.cover_letter ? (
                    <View style={{ marginTop: 12 }}>
                      <Label>Cover Letter / Candidate Note</Label>
                      <View style={s.coverLetterBox}>
                        <Text style={{ color: SAC.text, fontSize: 13, lineHeight: 20 }}>
                          {selectedApp.cover_letter}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </View>

                {/* Status Update Controls */}
                <View style={s.reviewSection}>
                  <Text style={s.reviewSectionTitle}>Update Application Status</Text>
                  <View style={s.chipsRow}>
                    {[
                      'APPLIED',
                      'UNDER_REVIEW',
                      'SHORTLISTED',
                      'INTERVIEW',
                      'SELECTED',
                      'REJECTED',
                      'WITHDRAWN',
                    ].map((st) => (
                      <Pressable
                        key={st}
                        style={[s.choiceChip, appReviewStatus === st && s.choiceChipActive]}
                        onPress={() => setAppReviewStatus(st)}
                      >
                        <Text
                          style={[
                            s.choiceChipText,
                            appReviewStatus === st && s.choiceChipTextActive,
                          ]}
                        >
                          {st.replace('_', ' ')}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <View style={{ marginTop: 14 }}>
                    <Label>Private Internal Admin Notes (Hidden from Candidate)</Label>
                    <Field
                      placeholder="Candidate evaluation notes, interview schedule, reviewer remarks..."
                      value={appAdminNotes}
                      onChangeText={setAppAdminNotes}
                      multiline={true}
                      numberOfLines={3}
                      style={{ minHeight: 70, textAlignVertical: 'top' }}
                    />
                  </View>
                </View>

                {/* Status History Audit Log */}
                {selectedApp.status_history && selectedApp.status_history.length > 0 && (
                  <View style={s.reviewSection}>
                    <Text style={s.reviewSectionTitle}>Status History Audit</Text>
                    <View style={s.timeline}>
                      {selectedApp.status_history.map((h: any, idx: number) => (
                        <View key={h.id || idx} style={s.timelineItem}>
                          <View style={s.timelineDot} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: SAC.text, fontSize: 13, fontWeight: '600' }}>
                              Status set to {h.new_status}
                            </Text>
                            <Text style={{ color: SAC.dim, fontSize: 11 }}>
                              {h.changed_at ? new Date(h.changed_at).toLocaleString() : ''}
                              {h.note ? ` — ${h.note}` : ''}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>

              <View style={s.modalFooter}>
                <SecondaryButton title="Close" onPress={() => setSelectedApp(null)} />
                <GradientButton
                  title={updatingApp ? 'Updating...' : 'Save Status & Notes'}
                  Icon={CheckCircle2}
                  onPress={handleUpdateApplicationStatus}
                  disabled={updatingApp}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    gap: 16,
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: SAC.border,
    paddingBottom: 10,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: SAC.cardSolid,
    borderWidth: 1,
    borderColor: SAC.border,
  },
  tabButtonActive: {
    backgroundColor: SAC.accent,
    borderColor: SAC.accent,
  },
  tabButtonText: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: SAC.muted,
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  tableCard: {
    padding: 16,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SAC.cardSolid,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: SAC.border,
    paddingHorizontal: 10,
    width: 280,
  },
  searchInput: {
    flex: 1,
    height: 36,
    color: SAC.text,
    fontSize: 13,
    fontFamily: FONTS.regular,
    outlineWidth: 0 as any,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: SAC.cardSolid,
    borderWidth: 1,
    borderColor: SAC.border,
  },
  statusChipActive: {
    backgroundColor: SAC.accent,
    borderColor: SAC.accent,
  },
  statusChipText: {
    fontSize: 12,
    color: SAC.muted,
    fontFamily: FONTS.medium,
  },
  statusChipTextActive: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
  },
  clearFilterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  clearFilterBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  centerLoading: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  table: {
    minWidth: 900,
  },
  thRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: SAC.border,
    paddingVertical: 10,
  },
  th: {
    color: SAC.dim,
    fontSize: 11,
    fontFamily: FONTS.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  trRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: SAC.border,
    paddingVertical: 12,
  },
  td: {
    color: SAC.text,
    fontSize: 13,
    fontFamily: FONTS.regular,
  },
  roleTitle: {
    color: SAC.text,
    fontSize: 13.5,
    fontFamily: FONTS.semiBold,
  },
  roleSub: {
    color: SAC.dim,
    fontSize: 11.5,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  applicantCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(124, 92, 252, 0.15)',
  },
  applicantCountText: {
    color: SAC.accent,
    fontSize: 12,
    fontFamily: FONTS.bold,
  },
  actionsCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: SAC.cardSolid,
    borderWidth: 1,
    borderColor: SAC.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 820,
    maxHeight: '90%',
    backgroundColor: SAC.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: SAC.border,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: SAC.border,
  },
  modalTitle: {
    color: SAC.text,
    fontSize: 17,
    fontFamily: FONTS.bold,
  },
  closeModalBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    flex: 1,
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  choiceChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: SAC.cardSolid,
    borderWidth: 1,
    borderColor: SAC.border,
  },
  choiceChipActive: {
    backgroundColor: SAC.accent,
    borderColor: SAC.accent,
  },
  choiceChipText: {
    color: SAC.muted,
    fontSize: 12,
    fontFamily: FONTS.medium,
  },
  choiceChipTextActive: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
  },
  featuredCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: SAC.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: SAC.border,
  },

  // Review section
  reviewSection: {
    backgroundColor: SAC.cardSolid,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: SAC.border,
    padding: 14,
  },
  reviewSectionTitle: {
    color: SAC.text,
    fontSize: 13,
    fontFamily: FONTS.bold,
    marginBottom: 10,
  },
  profileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: SAC.bg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  profileVal: {
    color: SAC.text,
    fontSize: 12.5,
    fontFamily: FONTS.medium,
  },
  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(124, 92, 252, 0.12)',
    padding: 10,
    borderRadius: 8,
  },
  coverLetterBox: {
    backgroundColor: SAC.bg,
    borderRadius: 8,
    padding: 12,
  },
  timeline: {
    gap: 10,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: SAC.accent,
    marginTop: 5,
  },
});
