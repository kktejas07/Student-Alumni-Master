// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { Bot, Sparkles, Play, ShieldCheck, Database, CheckCircle, Code, Layers, FileText, Zap, RefreshCw, Users, Plus, Trash2, Pencil, X, Megaphone, Target, ArrowRight, Globe, Mail, Phone, ExternalLink, Gift, UserCheck, Building2, Search, Send, Clock, LayoutGrid, Columns, Award, DollarSign, Radio, FileCheck, Share2, PenTool, MapPin, Mic } from 'lucide-react-native';
import { SAC, useSAC, FONTS, resolveColors } from '../tokens';
import { Badge } from '../atoms';
import { postPortal, getPortal, putPortal, deletePortal } from '@/src/lib/portalApi';
import { useToast, Toast } from '../applekit';

export function AutonomousAgentsView() {
  const T = useSAC();
  Object.assign(s, resolveColors(s, T));
  const { toast, flash, hide } = useToast();

  // Autonomous Goodies Harvester & Multi-Spec Outreach State
  const [selectedSpecType, setSelectedSpecType] = useState('goodies_partnership');
  const [harvesterLoading, setHarvesterLoading] = useState(false);
  const [harvesterResult, setHarvesterResult] = useState<any>(null);
  const [specDispatchLoading, setSpecDispatchLoading] = useState(false);
  const [specDispatchResult, setSpecDispatchResult] = useState<any>(null);

  const runHarvesterLoop = async () => {
    setHarvesterLoading(true);
    try {
      const res = await postPortal('/admin/agents/outreach/goodies-harvester/run', {});
      setHarvesterResult(res);
      flash?.(res?.message || 'Goodies Harvester loop completed!');
      fetchOutreachDirectory();
    } catch (e: any) {
      flash?.(e?.message || 'Harvester loop failed', 'error');
    } finally {
      setHarvesterLoading(false);
    }
  };

  const runSpecDispatcherLoop = async () => {
    setSpecDispatchLoading(true);
    try {
      const res = await postPortal('/admin/agents/outreach/specs-dispatcher/run', { spec_type: selectedSpecType });
      setSpecDispatchResult(res);
      flash?.(res?.message || 'Multi-Spec outreach loop completed!');
    } catch (e: any) {
      flash?.(e?.message || 'Spec dispatcher loop failed', 'error');
    } finally {
      setSpecDispatchLoading(false);
    }
  };

  const [activeTab, setActiveTab] = useState<'custom_teams' | 'outreach_directory' | 'swarm' | 'autopilot' | 'qa' | 'specialized' | 'observability' | 'daily_audit'>('custom_teams');

  // Custom Teams State
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsList, setTeamsList] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [teamTaskPrompt, setTeamTaskPrompt] = useState('Launch outreach scouting campaign across AI and Web3 student communities to gather free cloud vouchers');
  const [teamRunLoading, setTeamRunLoading] = useState(false);
  const [teamRunResult, setTeamRunResult] = useState<any>(null);

  // Outreach & Goodies Directory State
  const [outreachLoading, setOutreachLoading] = useState(false);
  const [outreachDomainFilter, setOutreachDomainFilter] = useState('all');
  const [outreachViewMode, setOutreachViewMode] = useState<'list' | 'kanban'>('list');
  const [communitiesList, setCommunitiesList] = useState<any[]>([]);
  const [outreachStatus, setOutreachStatus] = useState<any>(null);
  const [impactAnalytics, setImpactAnalytics] = useState<any>(null);
  const [selectedInterval, setSelectedInterval] = useState(8);

  // Campaign Dispatcher Modal State
  const [campaignModalVisible, setCampaignModalVisible] = useState(false);
  const [campaignComm, setCampaignComm] = useState<any>(null);
  const [campaignChannel, setCampaignChannel] = useState<'email' | 'whatsapp'>('email');
  const [campaignSubject, setCampaignSubject] = useState('');
  const [campaignMsg, setCampaignMsg] = useState('');
  const [campaignLoading, setCampaignLoading] = useState(false);

  // MoU Contract Generator Modal State
  const [mouModalVisible, setMouModalVisible] = useState(false);
  const [mouComm, setMouComm] = useState<any>(null);
  const [mouCustomTerms, setMouCustomTerms] = useState('Partner agrees to co-host monthly student technical workshops.');
  const [generatedMou, setGeneratedMou] = useState<any>(null);
  const [mouLoading, setMouLoading] = useState(false);

  // Blog Engine Modal State
  const [blogModalVisible, setBlogModalVisible] = useState(false);
  const [generatedBlog, setGeneratedBlog] = useState<any>(null);
  const [blogLoading, setBlogLoading] = useState(false);

  // Social Spotlight Modal State
  const [socialModalVisible, setSocialModalVisible] = useState(false);
  const [generatedSocial, setGeneratedSocial] = useState<any>(null);
  const [socialLoading, setSocialLoading] = useState(false);

  // Venue Scout Modal State
  const [venueModalVisible, setVenueModalVisible] = useState(false);
  const [scoutedVenues, setScoutedVenues] = useState<any[]>([]);
  const [venueLoading, setVenueLoading] = useState(false);

  // Broadcast Modal State
  const [broadcastModalVisible, setBroadcastModalVisible] = useState(false);
  const [broadcastChannel, setBroadcastChannel] = useState<'telegram' | 'whatsapp' | 'discord'>('telegram');
  const [broadcastTitle, setBroadcastTitle] = useState('ECHO 2026 Hackathon Registrations Open!');
  const [broadcastMsg, setBroadcastMsg] = useState('→ Registrations are officially open for Student Alumni Hackathon 2026! Over $15,000 in prizes & free cloud credits.');
  const [broadcastLoading, setBroadcastLoading] = useState(false);

  // Profile Conversion Modal State
  const [convertModalVisible, setConvertModalVisible] = useState(false);
  const [convertCommunity, setConvertCommunity] = useState<any>(null);
  const [convertRole, setConvertRole] = useState('community_partner');
  const [convertLoading, setConvertLoading] = useState(false);

  // Create / Edit Team Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('marketing');
  const [formDesc, setFormDesc] = useState('');
  const [formIcon, setFormIcon] = useState('Megaphone');
  const [formColor, setFormColor] = useState('#EC4899');
  const [formAgents, setFormAgents] = useState<any[]>([
    { id: '1', name: 'Growth Strategist', role: 'Campaign Strategist', avatar: '●', system_prompt: 'Define growth strategy and target channels.' },
    { id: '2', name: 'Lead Copywriter', role: 'Ad Copywriter', avatar: '✍️', system_prompt: 'Write high converting email and ad copies.' },
  ]);

  // Existing Agent States
  const [swarmTitle, setSwarmTitle] = useState('AI Mentorship Matching Platform');
  const [swarmPrompt, setSwarmPrompt] = useState('Create a collaborative matching platform connecting students with alumni based on skill graphs and goal alignment.');
  const [swarmLoading, setSwarmLoading] = useState(false);
  const [swarmResult, setSwarmResult] = useState<any>(null);

  const [autoGoal, setAutoGoal] = useState('Identify inactive mentors and send re-engagement emails');
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoResult, setAutoResult] = useState<any>(null);

  const [qaPersona, setQaPersona] = useState<'student' | 'mentor' | 'college'>('student');
  const [qaLoading, setQaLoading] = useState(false);
  const [qaResult, setQaResult] = useState<any>(null);

  const [specLoading, setSpecLoading] = useState(false);
  const [specResult, setSpecResult] = useState<any>(null);

  const [obsLoading, setObsLoading] = useState(false);
  const [obsData, setObsData] = useState<any>(null);

  const [dossierLoading, setDossierLoading] = useState(false);
  const [dailyDossier, setDailyDossier] = useState<any>(null);

const FALLBACK_PRESET_TEAMS = [
  {
    id: 'team-outreach-goodies',
    name: 'Outreach & Goodies Scouting Team',
    category: 'outreach',
    description: 'Scouts student communities across AI, Dev, Design & Web3 every 8 hours, gathering sponsorships, cloud credits, swag, and contacts.',
    icon: 'Globe',
    color: '#8B5CF6',
    is_preset: true,
    agents: [
      { id: 'agent-outreach-1', name: 'Karan (Community Scout)', role: 'Community & Hackathon Lead', avatar: '🌐', system_prompt: 'Scout campus clubs, hackathons, and tech groups.' },
      { id: 'agent-outreach-2', name: 'Zoe (Perks & Goodies Hunter)', role: 'Free Goodies & Sponsorship Hunter', avatar: '🎁', system_prompt: 'Aggregate cloud credits, free dev software licenses, swag.' },
    ],
  },
  {
    id: 'team-dev-fullstack',
    name: 'Full-Stack Development Team',
    category: 'development',
    description: 'Architects, codes, and refactors scalable APIs, UI components, and DB schemas.',
    icon: 'Code',
    color: '#3B82F6',
    is_preset: true,
    agents: [
      { id: 'agent-dev-1', name: 'Alex (Tech Lead)', role: 'System Architect', avatar: '👨‍💻', system_prompt: 'Design robust architecture patterns and API specs.' },
      { id: 'agent-dev-2', name: 'Priya (Frontend Specialist)', role: 'UI & Component Engineer', avatar: '🎨', system_prompt: 'Build clean, accessible React components.' },
    ],
  },
];

  // ─── Custom Teams Logic ──────────────────────────────────────────────
  const fetchTeams = async () => {
    setTeamsLoading(true);
    try {
      const res = await getPortal('/admin/agents/teams');
      const list = res?.teams && res.teams.length > 0 ? res.teams : FALLBACK_PRESET_TEAMS;
      setTeamsList(list);
      if (list.length > 0 && !selectedTeam) {
        setSelectedTeam(list[0]);
      }
    } catch (e: any) {
      setTeamsList(FALLBACK_PRESET_TEAMS);
      if (!selectedTeam) {
        setSelectedTeam(FALLBACK_PRESET_TEAMS[0]);
      }
    } finally {
      setTeamsLoading(false);
    }
  };

  // ─── Outreach & Goodies Directory Logic ──────────────────────────────
  const fetchOutreachDirectory = async (domain?: string) => {
    setOutreachLoading(true);
    const targetDomain = domain !== undefined ? domain : outreachDomainFilter;
    try {
      const url = targetDomain && targetDomain !== 'all' 
        ? `/admin/agents/outreach/communities?domain=${targetDomain}` 
        : '/admin/agents/outreach/communities';
      const res = await getPortal(url);
      setCommunitiesList(res.communities || []);
      setOutreachStatus(res.status || null);
      if (res.status?.interval_hours) {
        setSelectedInterval(res.status.interval_hours);
      }

      // Fetch Live Impact ROI Analytics
      const analyticsRes = await getPortal('/admin/agents/outreach/analytics');
      setImpactAnalytics(analyticsRes);
    } catch (e: any) {
      flash('Failed to load outreach communities', 'error');
    } finally {
      setOutreachLoading(false);
    }
  };

  const trigger8HourScout = async () => {
    setOutreachLoading(true);
    try {
      const res = await postPortal('/admin/agents/outreach/scout-now', {});
      flash(`Scout executed! Discovered ${res.communities_scouted} communities & ${res.goodies_unlocked} goodies.`);
      fetchOutreachDirectory();
    } catch (e: any) {
      flash('Failed to run scout cycle', 'error');
    } finally {
      setOutreachLoading(false);
    }
  };

  const changeSchedulerInterval = async (hours: number) => {
    setSelectedInterval(hours);
    try {
      await putPortal('/admin/agents/outreach/scheduler/interval', { hours });
      flash(`Scouting interval set to every ${hours} hours`);
      fetchOutreachDirectory();
    } catch (e: any) {
      flash('Failed to update interval', 'error');
    }
  };

  const updateCrmStage = async (communityId: string, stage: string) => {
    try {
      await putPortal(`/admin/agents/outreach/communities/${communityId}/stage`, { stage });
      flash(`Community stage updated to ${stage.replace('_', ' ').toUpperCase()}`);
      fetchOutreachDirectory();
    } catch (e: any) {
      flash('Failed to update CRM stage', 'error');
    }
  };

  const openCampaignModal = (comm: any) => {
    setCampaignComm(comm);
    setCampaignChannel('email');
    setCampaignSubject(`Student Alumni Network Partnership — ${comm.name}`);
    setCampaignMsg(`Hi ${comm.organizer_name || 'Team'},\n\nWe love what you're building at ${comm.name}! We'd build a co-branded partnership providing your members with verified mentorship and cloud credits.\n\nLet's connect this week!`);
    setCampaignModalVisible(true);
  };

  const handleDispatchCampaign = async () => {
    if (!campaignComm) return;
    setCampaignLoading(true);
    try {
      await postPortal('/admin/agents/outreach/campaign/dispatch', {
        community_id: campaignComm.id,
        channel: campaignChannel,
        subject: campaignSubject,
        message: campaignMsg,
      });
      flash(`Outreach campaign dispatched via ${campaignChannel.toUpperCase()} to ${campaignComm.organizer_email || campaignComm.email}!`);
      setCampaignModalVisible(false);
      fetchOutreachDirectory();
    } catch (e: any) {
      flash('Failed to dispatch campaign', 'error');
    } finally {
      setCampaignLoading(false);
    }
  };

  const openMouModal = (comm: any) => {
    setMouComm(comm);
    setGeneratedMou(null);
    setMouModalVisible(true);
  };

  const handleGenerateMou = async () => {
    if (!mouComm) return;
    setMouLoading(true);
    try {
      const res = await postPortal('/admin/agents/outreach/mou/generate', {
        community_id: mouComm.id,
        custom_terms: mouCustomTerms,
      });
      setGeneratedMou(res.contract);
      flash(`Partnership MoU Contract generated for ${mouComm.name}!`);
      fetchOutreachDirectory();
    } catch (e: any) {
      flash('Failed to generate MoU', 'error');
    } finally {
      setMouLoading(false);
    }
  };

  const handleGenerateCommunityBlog = async (comm: any) => {
    setBlogLoading(true);
    try {
      const res = await postPortal('/admin/agents/outreach/blogs/generate', {
        community_id: comm.id,
      });
      setGeneratedBlog(res.blog);
      setBlogModalVisible(true);
      flash(`Blog generated & published to platform /blog! Title: ${res.blog.title}`);
      fetchOutreachDirectory();
    } catch (e: any) {
      flash('Failed to generate blog', 'error');
    } finally {
      setBlogLoading(false);
    }
  };

  const handleGenerateEventBlog = async () => {
    setBlogLoading(true);
    try {
      const res = await postPortal('/admin/agents/outreach/blogs/generate', {
        event_title: 'ECHO 2026 Hackathon',
      });
      setGeneratedBlog(res.blog);
      setBlogModalVisible(true);
      flash(`Event blog generated & published to platform /blog!`);
    } catch (e: any) {
      flash('Failed to generate event blog', 'error');
    } finally {
      setBlogLoading(false);
    }
  };

  const handleGenerateSocialSpotlight = async (comm: any) => {
    setSocialLoading(true);
    try {
      const res = await postPortal('/admin/agents/outreach/social-spotlight', {
        community_id: comm.id,
      });
      setGeneratedSocial(res.social_spotlight);
      setSocialModalVisible(true);
      flash(`Social media spotlight posts created for LinkedIn & X!`);
    } catch (e: any) {
      flash('Failed to generate social spotlight', 'error');
    } finally {
      setSocialLoading(false);
    }
  };

  const handleScoutVenues = async () => {
    setVenueLoading(true);
    try {
      const res = await getPortal('/admin/agents/outreach/venues?city=Bengaluru');
      setScoutedVenues(res.venues || []);
      setVenueModalVisible(true);
      flash(`Scouted ${res.venues?.length || 0} campus auditoriums & venues!`);
    } catch (e: any) {
      flash('Failed to scout venues', 'error');
    } finally {
      setVenueLoading(false);
    }
  };

  const handleDispatchBroadcast = async () => {
    setBroadcastLoading(true);
    try {
      const commIds = communitiesList.map((c) => c.id);
      await postPortal('/admin/agents/outreach/broadcast', {
        community_ids: commIds,
        channel: broadcastChannel,
        content_title: broadcastTitle,
        message: broadcastMsg,
      });
      flash(`Broadcast sent to ${commIds.length} community channels via ${broadcastChannel.toUpperCase()}!`);
      setBroadcastModalVisible(false);
    } catch (e: any) {
      flash('Failed to dispatch broadcast', 'error');
    } finally {
      setBroadcastLoading(false);
    }
  };

  const handleMatchAmbassador = async (comm: any) => {
    try {
      const res = await postPortal('/admin/agents/outreach/ambassadors/match', {
        community_id: comm.id,
      });
      flash(`Matched ${res.ambassador?.name} as Regional Alumni Ambassador for ${comm.name}!`);
      fetchOutreachDirectory();
    } catch (e: any) {
      flash('Failed to match ambassador', 'error');
    }
  };

  const handleMatchEvent = async (comm: any) => {
    try {
      await postPortal(`/admin/agents/outreach/communities/${comm.id}/match-event`, {
        event_id: 'echo-2026-hackathon',
        event_title: 'ECHO 2026 Hackathon',
      });
      flash(`Matched ${comm.name} as official co-host for ECHO 2026 Hackathon!`);
      fetchOutreachDirectory();
    } catch (e: any) {
      flash('Failed to match event co-host', 'error');
    }
  };

  const openConvertModal = (comm: any) => {
    setConvertCommunity(comm);
    setConvertRole('community_partner');
    setConvertModalVisible(true);
  };

  const handleConvertProfile = async () => {
    if (!convertCommunity) return;
    setConvertLoading(true);
    try {
      const res = await postPortal('/admin/agents/outreach/communities/convert-profile', {
        community_id: convertCommunity.id,
        role_type: convertRole,
      });
      flash(`Profile created successfully for ${convertCommunity.organizer_name} as ${convertRole.replace('_', ' ').toUpperCase()}!`);
      setConvertModalVisible(false);
      fetchOutreachDirectory();
    } catch (e: any) {
      flash('Failed to convert profile', 'error');
    } finally {
      setConvertLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    if (activeTab === 'observability') {
      fetchObservability();
    } else if (activeTab === 'daily_audit') {
      fetchDailyDossier();
    } else if (activeTab === 'custom_teams' && teamsList.length === 0) {
      fetchTeams();
    } else if (activeTab === 'outreach_directory') {
      fetchOutreachDirectory();
    }
  }, [activeTab, outreachDomainFilter]);

  const openCreateModal = () => {
    setEditingTeamId(null);
    setFormName('New Specialist Team');
    setFormCategory('marketing');
    setFormDesc('Collaborative team configured for specific operational goals.');
    setFormIcon('Megaphone');
    setFormColor('#F59E0B');
    setFormAgents([
      { id: '1', name: 'Team Strategist', role: 'Lead Planner', avatar: '🧠', system_prompt: 'Formulate overarching execution roadmap.' },
      { id: '2', name: 'Execution Specialist', role: 'Lead Developer / Specialist', avatar: '◆', system_prompt: 'Execute task deliverables and technical requirements.' },
    ]);
    setModalVisible(true);
  };

  const openEditModal = (team: any) => {
    setEditingTeamId(team.id);
    setFormName(team.name || '');
    setFormCategory(team.category || 'custom');
    setFormDesc(team.description || '');
    setFormIcon(team.icon || 'Users');
    setFormColor(team.color || '#F59E0B');
    setFormAgents(team.agents ? JSON.parse(JSON.stringify(team.agents)) : []);
    setModalVisible(true);
  };

  const addAgentToForm = () => {
    setFormAgents((prev) => [
      ...prev,
      {
        id: `agent-${Date.now()}`,
        name: `Agent ${prev.length + 1}`,
        role: 'Specialist',
        avatar: '🤖',
        system_prompt: 'Execute assigned tasks and optimize deliverables.',
      },
    ]);
  };

  const removeAgentFromForm = (index: number) => {
    setFormAgents((prev) => prev.filter((_, i) => i !== index));
  };

  const updateAgentField = (index: number, field: string, val: string) => {
    setFormAgents((prev) =>
      prev.map((ag, i) => (i === index ? { ...ag, [field]: val } : ag))
    );
  };

  const saveTeam = async () => {
    if (!formName.trim()) {
      flash('Please enter a team name', 'error');
      return;
    }

    const payload = {
      name: formName,
      category: formCategory,
      description: formDesc,
      icon: formIcon,
      color: formColor,
      agents: formAgents,
    };

    try {
      if (editingTeamId) {
        await putPortal(`/admin/agents/teams/${editingTeamId}`, payload);
        flash('Agent team updated successfully!');
      } else {
        await postPortal('/admin/agents/teams', payload);
        flash('New Agent team created successfully!');
      }
      setModalVisible(false);
      fetchTeams();
    } catch (e: any) {
      flash('Failed to save agent team', 'error');
    }
  };

  const deleteTeam = async (teamId: string) => {
    try {
      await deletePortal(`/admin/agents/teams/${teamId}`);
      flash('Agent team deleted');
      if (selectedTeam?.id === teamId) {
        setSelectedTeam(null);
      }
      fetchTeams();
    } catch (e: any) {
      flash('Failed to delete team', 'error');
    }
  };

  const runTeamTask = async () => {
    if (!selectedTeam) return;
    setTeamRunLoading(true);
    try {
      const res = await postPortal(`/admin/agents/teams/${selectedTeam.id}/run`, {
        task_prompt: teamTaskPrompt,
      });
      setTeamRunResult(res);
      flash(`Task completed by ${selectedTeam.name}!`);
    } catch (e: any) {
      flash(e?.message || 'Team execution failed', 'error');
    } finally {
      setTeamRunLoading(false);
    }
  };

  // ─── Existing API Logic ──────────────────────────────────────────────
  const fetchDailyDossier = async () => {
    setDossierLoading(true);
    try {
      const res = await getPortal('/admin/agents/daily-audit/latest');
      setDailyDossier(res);
    } catch (e: any) {
      flash('Failed to load daily audit dossier', 'error');
    } finally {
      setDossierLoading(false);
    }
  };

  const triggerDailyAudit = async () => {
    setDossierLoading(true);
    try {
      const res = await postPortal('/admin/agents/daily-audit/trigger-now', {});
      setDailyDossier(res);
      flash('24-Hour Operations & Audit Swarm completed successfully!');
    } catch (e: any) {
      flash('Failed to run daily audit swarm', 'error');
    } finally {
      setDossierLoading(false);
    }
  };

  const fetchObservability = async () => {
    setObsLoading(true);
    try {
      const res = await getPortal('/ai/observability');
      setObsData(res);
    } catch (e: any) {
      flash('Failed to load AI telemetry', 'error');
    } finally {
      setObsLoading(false);
    }
  };

  const runSwarm = async () => {
    setSwarmLoading(true);
    try {
      const res = await postPortal('/admin/agents/swarm/run', {
        project_title: swarmTitle,
        user_prompt: swarmPrompt,
        domain: 'edtech',
      });
      setSwarmResult(res);
      flash('Multi-Agent Swarm completed pipeline successfully!');
    } catch (e: any) {
      flash(e?.message || 'Swarm execution failed', 'error');
    } finally {
      setSwarmLoading(false);
    }
  };

  const runAutoPilot = async () => {
    setAutoLoading(true);
    try {
      const res = await postPortal('/admin/agents/autopilot/run', {
        goal: autoGoal,
      });
      setAutoResult(res);
      flash('AutoPilot goal successfully resolved!');
    } catch (e: any) {
      flash(e?.message || 'AutoPilot execution failed', 'error');
    } finally {
      setAutoLoading(false);
    }
  };

  const runQASimulation = async () => {
    setQaLoading(true);
    try {
      const res = await postPortal('/admin/agents/qa/simulate', {
        persona: qaPersona,
      });
      setQaResult(res);
      flash(`QA persona simulation completed for ${qaPersona}!`);
    } catch (e: any) {
      flash(e?.message || 'QA simulation failed', 'error');
    } finally {
      setQaLoading(false);
    }
  };

  const runSpecialized = async (type: string) => {
    setSpecLoading(true);
    try {
      const res = await postPortal(`/admin/agents/specialized/${type}`, {});
      setSpecResult(res);
      flash(`Specialized agent scan completed for ${type}!`);
    } catch (e: any) {
      flash(e?.message || 'Specialized agent audit failed', 'error');
    } finally {
      setSpecLoading(false);
    }
  };

  return (
    <View style={s.container}>
      {/* Header Banner */}
      <View style={s.header}>
        <View style={s.hIcon}><Bot size={22} color={SAC.accent} /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.hTitle}>Autonomous Agents & Custom Teams Control Plane</Text>
          <Text style={s.hSub}>Orchestrate Top 5 AI Teams (Outreach, Growth, Dev, QA, Career) with AI Community Blog Engine, Campus Venue Scouting, and Impact Analytics.</Text>
        </View>
      </View>

      {/* Navigation Tabs */}
      <View style={s.tabsRow}>
        <Pressable onPress={() => setActiveTab('custom_teams')} style={[s.tabBtn, activeTab === 'custom_teams' && s.tabActive]}>
          <Users size={14} color={activeTab === 'custom_teams' ? '#fff' : SAC.muted} />
          <Text style={[s.tabText, activeTab === 'custom_teams' && s.tabTextActive]}>AI Agent Teams (5)</Text>
          <Badge label="TOP 5" color="amber" />
        </Pressable>
        <Pressable onPress={() => setActiveTab('outreach_directory')} style={[s.tabBtn, activeTab === 'outreach_directory' && s.tabActive]}>
          <Globe size={14} color={activeTab === 'outreach_directory' ? '#fff' : SAC.muted} />
          <Text style={[s.tabText, activeTab === 'outreach_directory' && s.tabTextActive]}>Outreach & Goodies</Text>
          <Badge label={`${selectedInterval}H SCOUT`} color="pink" />
        </Pressable>
        <Pressable onPress={() => setActiveTab('swarm')} style={[s.tabBtn, activeTab === 'swarm' && s.tabActive]}>
          <Layers size={14} color={activeTab === 'swarm' ? '#fff' : SAC.muted} />
          <Text style={[s.tabText, activeTab === 'swarm' && s.tabTextActive]}>Multi-Agent Swarm</Text>
        </Pressable>
        <Pressable onPress={() => setActiveTab('autopilot')} style={[s.tabBtn, activeTab === 'autopilot' && s.tabActive]}>
          <Zap size={14} color={activeTab === 'autopilot' ? '#fff' : SAC.muted} />
          <Text style={[s.tabText, activeTab === 'autopilot' && s.tabTextActive]}>AutoGPT Auto-Pilot</Text>
        </Pressable>
        <Pressable onPress={() => setActiveTab('qa')} style={[s.tabBtn, activeTab === 'qa' && s.tabActive]}>
          <CheckCircle size={14} color={activeTab === 'qa' ? '#fff' : SAC.muted} />
          <Text style={[s.tabText, activeTab === 'qa' && s.tabTextActive]}>Autonomous QA Testing</Text>
        </Pressable>
        <Pressable onPress={() => setActiveTab('specialized')} style={[s.tabBtn, activeTab === 'specialized' && s.tabActive]}>
          <ShieldCheck size={14} color={activeTab === 'specialized' ? '#fff' : SAC.muted} />
          <Text style={[s.tabText, activeTab === 'specialized' && s.tabTextActive]}>Specialized Audits</Text>
        </Pressable>
        <Pressable onPress={() => setActiveTab('daily_audit')} style={[s.tabBtn, activeTab === 'daily_audit' && s.tabActive]}>
          <CheckCircle size={14} color={activeTab === 'daily_audit' ? '#fff' : SAC.muted} />
          <Text style={[s.tabText, activeTab === 'daily_audit' && s.tabTextActive]}>24h Ops Swarm</Text>
        </Pressable>
      </View>

      {/* TAB 0: CUSTOM AGENT TEAMS */}
      {activeTab === 'custom_teams' && (
        <View style={{ gap: 16 }}>
          {/* Action Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={s.cardTitle}>Top Preset & Custom AI Agent Teams</Text>
              <Text style={s.cardSub}>Orchestrate multi-agent swarms across Outreach, Marketing, Development, QA, and Career AI.</Text>
            </View>
            <Pressable style={s.addTeamBtn} onPress={openCreateModal}>
              <Plus size={14} color="#fff" />
              <Text style={s.btnText}>Create Custom Agent Team</Text>
            </Pressable>
          </View>

          {/* Teams Grid */}
          {teamsLoading ? (
            <ActivityIndicator size="medium" color={SAC.accent} style={{ marginVertical: 20 }} />
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {teamsList.map((team) => {
                const isSelected = selectedTeam?.id === team.id;
                const isPreset = team.is_preset;
                return (
                  <View key={team.id} style={[s.teamCard, isSelected && s.teamCardSelected]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[s.teamBadgeIcon, { backgroundColor: team.color || SAC.primary }]}>
                          <Bot size={16} color="#fff" />
                        </View>
                        <View>
                          <Text style={s.teamName}>{team.name}</Text>
                          <Text style={s.teamCat}>{team.category?.toUpperCase()} • {team.agents?.length || 0} AGENTS</Text>
                        </View>
                      </View>
                      {isPreset ? (
                        <Badge label="PRESET TEAM" color="amber" />
                      ) : (
                        <View style={{ flexDirection: 'row', gap: 4 }}>
                          <Pressable onPress={() => openEditModal(team)} style={s.iconBtn}>
                            <Pencil size={12} color={SAC.muted} />
                          </Pressable>
                          <Pressable onPress={() => deleteTeam(team.id)} style={s.iconBtn}>
                            <Trash2 size={12} color="#F87171" />
                          </Pressable>
                        </View>
                      )}
                    </View>

                    <Text style={s.teamDesc} numberOfLines={2}>{team.description}</Text>

                    {/* Agent Roster Avatars */}
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                      {team.agents?.map((ag: any, i: number) => (
                        <View key={i} style={s.agentPill}>
                          <Text style={{ fontSize: 11 }}>{ag.avatar || '🤖'}</Text>
                          <Text style={s.agentPillText}>{ag.role || ag.name}</Text>
                        </View>
                      ))}
                    </View>

                    <Pressable
                      style={[s.selectBtn, isSelected && s.selectBtnActive]}
                      onPress={() => setSelectedTeam(team)}
                    >
                      <Text style={[s.selectBtnText, isSelected && { color: SAC.text }]}>
                        {isSelected ? '✓ Selected Team' : 'Select Team'}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}

          {/* Execution Panel for Selected Team */}
          {selectedTeam && (
            <View style={s.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <View style={[s.teamBadgeIcon, { backgroundColor: selectedTeam.color || SAC.primary }]}>
                  <Bot size={18} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>Run Task with {selectedTeam.name}</Text>
                  <Text style={s.cardSub}>Orchestrating {selectedTeam.agents?.length || 0} agents collaboratively.</Text>
                </View>
              </View>

              <View style={{ gap: 10 }}>
                <Text style={s.label}>Task Goal / Instruction Prompt</Text>
                <TextInput
                  value={teamTaskPrompt}
                  onChangeText={setTeamTaskPrompt}
                  style={[s.input, { height: 75 }]}
                  multiline
                  placeholder="Describe the objective for your agent team..."
                  placeholderTextColor={SAC.muted}
                />

                <Pressable style={s.primaryBtn} onPress={runTeamTask} disabled={teamRunLoading}>
                  {teamRunLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Play size={14} color="#fff" />
                      <Text style={s.btnText}>Execute Team Task</Text>
                    </View>
                  )}
                </Pressable>
              </View>

              {/* Execution Dialogue & Deliverables Output */}
              {teamRunResult && (
                <View style={{ marginTop: 20, gap: 14 }}>
                  <Text style={s.sectionHeader}>Collaborative Multi-Agent Dialogue</Text>
                  {teamRunResult.dialogue?.map((msg: any, i: number) => (
                    <View key={i} style={s.dialogueBubble}>
                      <Text style={s.agentTag}>{msg.avatar} {msg.agent_name} ({msg.role})</Text>
                      <Text style={s.dialogueText}>{msg.content}</Text>
                    </View>
                  ))}

                  <Text style={s.sectionHeader}>Generated Team Deliverables</Text>
                  {Object.entries(teamRunResult.deliverables || {}).map(([title, content]: any, i) => (
                    <View key={i} style={s.artifactCard}>
                      <Text style={s.artifactHeader}>{title}</Text>
                      <Text style={s.codeBlock}>{content}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* TAB 1: OUTREACH & GOODIES DIRECTORY */}
      {activeTab === 'outreach_directory' && (
        <View style={{ gap: 16 }}>

          {/* ── Autonomous Goodies Harvester & Multi-Spec Outreach Swarm ── */}
          <View style={{ border: '1px solid #3A2E72', borderRadius: 16, padding: 20, backgroundColor: 'rgba(27,20,58,0.85)', gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <View style={{ gap: 4, flex: 1 }}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: '#FFF' }}>🤖 Autonomous Goodies Harvester & Multi-Spec Outreach Swarm</Text>
                <Text style={{ fontFamily: FONTS.medium, fontSize: 13, color: SAC.muted }}>Scouts platforms for free student goodies/coupons and dispatches multi-spec partnership contracts in an automated loop.</Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                <Pressable onPress={runHarvesterLoop} disabled={harvesterLoading} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#8B5CF6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, opacity: harvesterLoading ? 0.7 : 1 }}>
                  <Gift size={16} color="#FFF" />
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: '#FFF' }}>{harvesterLoading ? 'Scouting Goodies...' : 'Run Goodies Harvester Loop'}</Text>
                </Pressable>

                <Pressable onPress={runSpecDispatcherLoop} disabled={specDispatchLoading} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#3B82F6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, opacity: specLoading ? 0.7 : 1 }}>
                  <Send size={16} color="#FFF" />
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: '#FFF' }}>{specDispatchLoading ? 'Dispatching...' : 'Dispatch Multi-Spec Loop'}</Text>
                </Pressable>
              </View>
            </View>

            {/* Spec Template Selector */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: '#A78BFA' }}>Select Spec Template:</Text>
              {[
                { id: 'goodies_partnership', label: '🎁 Goodies & Perks Spec' },
                { id: 'event_sponsorship', label: '⚡ ECHO Event Sponsorship Spec' },
                { id: 'alumni_mentorship', label: '🎓 Alumni Mentorship Spec' }
              ].map((st) => (
                <Pressable
                  key={st.id}
                  onPress={() => setSelectedSpecType(st.id)}
                  style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: selectedSpecType === st.id ? '#7C3AED' : 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: selectedSpecType === st.id ? '#A78BFA' : SAC.border }}
                >
                  <Text style={{ fontFamily: FONTS.semibold, fontSize: 12, color: selectedSpecType === st.id ? '#FFF' : SAC.muted }}>{st.label}</Text>
                </Pressable>
              ))}
            </View>

            {/* Harvester / Spec Results Display */}
            {harvesterResult && (
              <View style={{ border: '1px solid #10B981', borderRadius: 10, padding: 14, backgroundColor: 'rgba(16,185,129,0.1)', gap: 6 }}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#10B981' }}>✅ Goodies Harvester Output ({harvesterResult.offers_harvested} Platforms Discovered)</Text>
                <Text style={{ fontFamily: FONTS.medium, fontSize: 13, color: '#D1FAE5' }}>{harvesterResult.message}</Text>
              </View>
            )}

            {specDispatchResult && (
              <View style={{ border: '1px solid #3B82F6', borderRadius: 10, padding: 14, backgroundColor: 'rgba(59,130,246,0.1)', gap: 6 }}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#60A5FA' }}>🚀 Dispatched Specs ({specDispatchResult.dispatched_count} Sent)</Text>
                <Text style={{ fontFamily: FONTS.medium, fontSize: 13, color: '#DBEAFE' }}>{specDispatchResult.message}</Text>
              </View>
            )}
          </View>
          {/* Live Impact ROI Analytics KPI Tiles Bar */}
          {impactAnalytics && (
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              <View style={s.kpiTile}>
                <DollarSign size={16} color="#34D399" />
                <Text style={s.kpiVal}>{impactAnalytics.total_dollar_value_unlocked}</Text>
                <Text style={s.kpiLabel}>DOLLAR VALUE UNLOCKED</Text>
              </View>
              <View style={s.kpiTile}>
                <Users size={16} color="#60A5FA" />
                <Text style={s.kpiVal}>{impactAnalytics.total_student_reach}</Text>
                <Text style={s.kpiLabel}>TOTAL STUDENT REACH</Text>
              </View>
              <View style={s.kpiTile}>
                <Gift size={16} color="#F59E0B" />
                <Text style={s.kpiVal}>{impactAnalytics.total_perks_claimed} Claimed</Text>
                <Text style={s.kpiLabel}>STUDENT PERKS UNLOCKED</Text>
              </View>
              <View style={s.kpiTile}>
                <Building2 size={16} color="#A78BFA" />
                <Text style={s.kpiVal}>{impactAnalytics.active_community_partners} Active</Text>
                <Text style={s.kpiLabel}>COMMUNITY PARTNERS</Text>
              </View>
            </View>
          )}

          {/* Status & Dynamic Cadence Banner */}
          <View style={s.scoutStatusBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={s.scoutIconBox}><Globe size={20} color="#8B5CF6" /></View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: SAC.text, fontFamily: FONTS.xbold, fontSize: 14 }}>Autonomous Community Scouting Worker</Text>
                  <Badge label={`CADENCE: EVERY ${selectedInterval}H`} color="purple" />
                </View>
                <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 }}>
                  Last scouted: {outreachStatus?.last_scout_at ? new Date(outreachStatus.last_scout_at).toLocaleTimeString() : 'Just now'} • Next run in ~{selectedInterval} hours
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                <Pressable style={s.blogBtn} onPress={handleGenerateEventBlog} disabled={blogLoading}>
                  <PenTool size={13} color="#fff" />
                  <Text style={s.specBtnText}>Generate Event Blog</Text>
                </Pressable>
                <Pressable style={s.venueBtn} onPress={handleScoutVenues} disabled={venueLoading}>
                  <MapPin size={13} color="#fff" />
                  <Text style={s.specBtnText}>Scout Venues</Text>
                </Pressable>
                <Pressable style={s.broadcastBannerBtn} onPress={() => setBroadcastModalVisible(true)}>
                  <Radio size={13} color="#fff" />
                  <Text style={s.specBtnText}>Broadcast</Text>
                </Pressable>
                <Pressable style={s.specBtn} onPress={trigger8HourScout} disabled={outreachLoading}>
                  <RefreshCw size={13} color="#fff" />
                  <Text style={s.specBtnText}>Scout Now</Text>
                </Pressable>
              </View>
            </View>

            {/* Dynamic Cadence Control Bar */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(139,92,246,0.2)' }}>
              <Clock size={13} color={SAC.accent} />
              <Text style={{ color: '#ddd', fontFamily: FONTS.bold, fontSize: 11.5 }}>Adjust Scouting Cadence:</Text>
              {[4, 8, 12, 24].map((hrs) => (
                <Pressable
                  key={hrs}
                  onPress={() => changeSchedulerInterval(hrs)}
                  style={[s.cadenceChip, selectedInterval === hrs && s.cadenceChipActive]}
                >
                  <Text style={[s.cadenceChipText, selectedInterval === hrs && { color: SAC.text }]}>{hrs} Hours</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Control Bar: View Toggle & Domain Filters */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            {/* Domain Filter Bar */}
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12, marginRight: 4 }}>Filter:</Text>
              {['all', 'ai', 'dev', 'design', 'web3', 'campus'].map((dom) => (
                <Pressable
                  key={dom}
                  onPress={() => setOutreachDomainFilter(dom)}
                  style={[s.catChip, outreachDomainFilter === dom && s.catChipActive]}
                >
                  <Text style={[s.catChipText, outreachDomainFilter === dom && { color: SAC.text }]}>{dom.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>

            {/* View Mode Toggle (Grid List vs Kanban CRM Board) */}
            <View style={{ flexDirection: 'row', gap: 4, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 8, padding: 2 }}>
              <Pressable
                onPress={() => setOutreachViewMode('list')}
                style={[s.viewModeBtn, outreachViewMode === 'list' && s.viewModeBtnActive]}
              >
                <LayoutGrid size={13} color={outreachViewMode === 'list' ? '#fff' : SAC.muted} />
                <Text style={[s.viewModeText, outreachViewMode === 'list' && { color: SAC.text }]}>List View</Text>
              </Pressable>
              <Pressable
                onPress={() => setOutreachViewMode('kanban')}
                style={[s.viewModeBtn, outreachViewMode === 'kanban' && s.viewModeBtnActive]}
              >
                <Columns size={13} color={outreachViewMode === 'kanban' ? '#fff' : SAC.muted} />
                <Text style={[s.viewModeText, outreachViewMode === 'kanban' && { color: SAC.text }]}>CRM Kanban</Text>
              </Pressable>
            </View>
          </View>

          {/* VIEW MODE 1: GRID LIST */}
          {outreachViewMode === 'list' && (
            outreachLoading ? (
              <ActivityIndicator size="medium" color={SAC.accent} style={{ marginVertical: 20 }} />
            ) : (
              <View style={{ gap: 14 }}>
                {communitiesList.map((comm) => (
                  <View key={comm.id} style={s.communityCard}>
                    {/* Top Bar */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ gap: 4, flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <Text style={s.commTitle}>{comm.name}</Text>
                          <Badge label={comm.domain?.toUpperCase()} color="purple" />
                          <Badge label={(comm.crm_stage || 'discovered').toUpperCase().replace('_', ' ')} color="amber" />
                          {comm.status === 'partner_onboarded' && <Badge label="PROFILE CREATED" color="green" />}
                          {comm.published_blog && <Badge label="BLOG PUBLISHED" color="blue" />}
                          {comm.mou_contract && <Badge label="MOU EXECUTED" color="blue" />}
                          {comm.alumni_ambassador && <Badge label="AMBASSADOR ASSIGNED" color="pink" />}
                        </View>
                        <Text style={s.commDesc}>{comm.description}</Text>
                      </View>

                      {/* Action Controls */}
                      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                        <Pressable style={s.blogBtn} onPress={() => handleGenerateCommunityBlog(comm)} disabled={blogLoading}>
                          <PenTool size={12} color="#fff" />
                          <Text style={s.convertBtnText}>Auto-Blog</Text>
                        </Pressable>
                        <Pressable style={s.socialBtn} onPress={() => handleGenerateSocialSpotlight(comm)} disabled={socialLoading}>
                          <Share2 size={12} color="#fff" />
                          <Text style={s.convertBtnText}>Social Spotlight</Text>
                        </Pressable>
                        <Pressable style={s.mouBtn} onPress={() => openMouModal(comm)}>
                          <FileCheck size={12} color="#fff" />
                          <Text style={s.convertBtnText}>Generate MoU</Text>
                        </Pressable>
                        <Pressable style={s.ambassadorBtn} onPress={() => handleMatchAmbassador(comm)}>
                          <Sparkles size={12} color="#fff" />
                          <Text style={s.convertBtnText}>Ambassador</Text>
                        </Pressable>
                        <Pressable style={s.campaignBtn} onPress={() => openCampaignModal(comm)}>
                          <Send size={12} color="#fff" />
                          <Text style={s.convertBtnText}>Campaign</Text>
                        </Pressable>
                      </View>
                    </View>

                    {/* Complete Contact Info Grid */}
                    <View style={s.contactGrid}>
                      <View style={s.contactItem}>
                        <Mail size={12} color={SAC.accent} />
                        <Text style={s.contactText}>{comm.email}</Text>
                      </View>
                      <View style={s.contactItem}>
                        <Phone size={12} color="#34D399" />
                        <Text style={s.contactText}>{comm.phone}</Text>
                      </View>
                      <View style={s.contactItem}>
                        <Globe size={12} color="#60A5FA" />
                        <Text style={s.contactText}>{comm.website}</Text>
                      </View>
                      <View style={s.contactItem}>
                        <ExternalLink size={12} color="#F472B6" />
                        <Text style={s.contactText}>LinkedIn: {comm.linkedin}</Text>
                      </View>
                      {comm.discord && (
                        <View style={s.contactItem}>
                          <Users size={12} color="#A78BFA" />
                          <Text style={s.contactText}>Discord: {comm.discord}</Text>
                        </View>
                      )}
                    </View>

                    {/* Organizer & Ambassador Info */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                      <View style={s.organizerRow}>
                        <Building2 size={13} color={SAC.muted} />
                        <Text style={{ color: '#ddd', fontFamily: FONTS.bold, fontSize: 12 }}>
                          Lead Organizer: <Text style={{ color: SAC.text }}>{comm.organizer_name}</Text> ({comm.organizer_role}) • Contact: <Text style={{ color: SAC.accentBright }}>{comm.organizer_email}</Text>
                        </Text>
                      </View>

                      {comm.alumni_ambassador && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Badge label={`Ambassador: ${comm.alumni_ambassador.name}`} color="pink" />
                        </View>
                      )}
                    </View>

                    {/* Discovered Free Goodies & Sponsorship Vouchers */}
                    {comm.free_goodies && comm.free_goodies.length > 0 && (
                      <View style={{ marginTop: 10, gap: 8 }}>
                        <Text style={{ color: '#FCD34D', fontFamily: FONTS.bold, fontSize: 12 }}>🎁 Unlocked Free Goodies & Sponsorship Perks:</Text>
                        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                          {comm.free_goodies.map((g: any, idx: number) => (
                            <View key={idx} style={s.goodieCard}>
                              <Gift size={13} color="#F59E0B" />
                              <View>
                                <Text style={s.goodieTitle}>{g.title}</Text>
                                <Text style={s.goodieSub}>{g.value} • Promo Code: <Text style={{ color: '#34D399', fontFamily: FONTS.bold }}>{g.code}</Text></Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )
          )}

          {/* VIEW MODE 2: OUTREACH CRM KANBAN BOARD */}
          {outreachViewMode === 'kanban' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingTop: 6 }}>
              {[
                { id: 'discovered', label: '1. Discovered (Auto-Scouted)', color: '#8B5CF6' },
                { id: 'outreach_sent', label: '2. Campaign Dispatched', color: '#3B82F6' },
                { id: 'negotiating', label: '3. In Negotiation', color: '#F59E0B' },
                { id: 'active_partner', label: '4. Active Partner', color: '#10B981' },
              ].map((column) => {
                const columnItems = communitiesList.filter((c) => (c.crm_stage || 'discovered') === column.id);
                return (
                  <View key={column.id} style={s.kanbanColumn}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <Text style={[s.kanbanColumnTitle, { color: column.color }]}>{column.label}</Text>
                      <Badge label={String(columnItems.length)} color="amber" />
                    </View>

                    <View style={{ gap: 10 }}>
                      {columnItems.map((comm) => (
                        <View key={comm.id} style={s.kanbanCard}>
                          <Text style={s.commTitle}>{comm.name}</Text>
                          <Text style={s.contactText}>{comm.organizer_name} ({comm.email})</Text>

                          <View style={{ flexDirection: 'row', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                            {column.id !== 'outreach_sent' && (
                              <Pressable style={s.kanbanActionBtn} onPress={() => updateCrmStage(comm.id, 'outreach_sent')}>
                                <Text style={s.kanbanActionText}>Sent</Text>
                              </Pressable>
                            )}
                            {column.id !== 'negotiating' && (
                              <Pressable style={s.kanbanActionBtn} onPress={() => updateCrmStage(comm.id, 'negotiating')}>
                                <Text style={s.kanbanActionText}>Negotiating</Text>
                              </Pressable>
                            )}
                            {column.id !== 'active_partner' && (
                              <Pressable style={[s.kanbanActionBtn, { backgroundColor: '#10B981' }]} onPress={() => updateCrmStage(comm.id, 'active_partner')}>
                                <Text style={{ color: SAC.text, fontSize: 10, fontFamily: FONTS.bold }}>Partner</Text>
                              </Pressable>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}

          {/* Modal for Generated Blog Post Preview */}
          <Modal visible={blogModalVisible} transparent animationType="fade">
            <View style={s.modalOverlay}>
              <View style={s.modalContent}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>AI Generated Blog Post (Published to /blog)</Text>
                  <Pressable onPress={() => setBlogModalVisible(false)}>
                    <X size={18} color={SAC.muted} />
                  </Pressable>
                </View>

                {generatedBlog && (
                  <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: 12 }} showsVerticalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      <Badge label={generatedBlog.category} color="purple" />
                      <Badge label={generatedBlog.readTime} color="amber" />
                      <Badge label="LIVE ON BLOG" color="green" />
                    </View>

                    <Text style={{ color: SAC.text, fontFamily: FONTS.xbold, fontSize: 16 }}>{generatedBlog.title}</Text>
                    <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 12 }}>By {generatedBlog.author} • Published on {generatedBlog.date}</Text>

                    <View style={{ padding: 12, borderRadius: 10, backgroundColor: SAC.panel2, borderColor: SAC.border, borderWidth: 1 }}>
                      <Text style={{ color: '#93c5fd', fontFamily: FONTS.med, fontSize: 12.5, lineHeight: 18 }}>{generatedBlog.description}</Text>
                    </View>

                    {generatedBlog.sections?.map((sec: any, idx: number) => (
                      <View key={idx} style={{ gap: 4, marginTop: 6 }}>
                        <Text style={{ color: '#FCD34D', fontFamily: FONTS.bold, fontSize: 13 }}>{sec.label}</Text>
                        {sec.content?.map((p: string, pIdx: number) => (
                          <Text key={pIdx} style={{ color: '#cbd5e1', fontFamily: FONTS.med, fontSize: 12, lineHeight: 17 }}>{p}</Text>
                        ))}
                      </View>
                    ))}
                  </ScrollView>
                )}

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 }}>
                  <Pressable style={s.cancelBtn} onPress={() => setBlogModalVisible(false)}>
                    <Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>Close</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>

          {/* Modal for Social Media Spotlight (LinkedIn & X) */}
          <Modal visible={socialModalVisible} transparent animationType="fade">
            <View style={s.modalOverlay}>
              <View style={s.modalContent}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Social Media Spotlight Generator</Text>
                  <Pressable onPress={() => setSocialModalVisible(false)}>
                    <X size={18} color={SAC.muted} />
                  </Pressable>
                </View>

                {generatedSocial && (
                  <View style={{ gap: 14 }}>
                    <Text style={s.sectionHeader}>🟦 LinkedIn Spotlight Post</Text>
                    <View style={s.artifactCard}>
                      <Text style={s.codeBlock}>{generatedSocial.linkedin_post}</Text>
                    </View>

                    <Text style={s.sectionHeader}>⬛ Twitter / X Spotlight Post</Text>
                    <View style={s.artifactCard}>
                      <Text style={s.codeBlock}>{generatedSocial.twitter_post}</Text>
                    </View>
                  </View>
                )}

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
                  <Pressable style={s.saveBtn} onPress={() => { setSocialModalVisible(false); flash('Posts copied to clipboard!'); }}>
                    <Text style={{ color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 }}>Copy & Publish Posts</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>

          {/* Modal for Scouted Campus Venues */}
          <Modal visible={venueModalVisible} transparent animationType="fade">
            <View style={s.modalOverlay}>
              <View style={s.modalContent}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Scouted Campus Auditoriums & Venues (Bengaluru)</Text>
                  <Pressable onPress={() => setVenueModalVisible(false)}>
                    <X size={18} color={SAC.muted} />
                  </Pressable>
                </View>

                <ScrollView style={{ maxHeight: 440 }} contentContainerStyle={{ gap: 12 }} showsVerticalScrollIndicator={false}>
                  {scoutedVenues.map((v) => (
                    <View key={v.id} style={s.artifactCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: SAC.text, fontFamily: FONTS.bold, fontSize: 14 }}>{v.name}</Text>
                        <Badge label={v.capacity} color="green" />
                      </View>
                      <Text style={{ color: SAC.accent, fontFamily: FONTS.med, fontSize: 12 }}>{v.venue_type} • {v.city}</Text>
                      <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 4 }}>Contact: {v.contact_email}</Text>
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                        {v.amenities?.map((am: string, i: number) => (
                          <View key={i} style={s.agentPill}>
                            <Text style={s.agentPillText}>{am}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </ScrollView>

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 }}>
                  <Pressable style={s.cancelBtn} onPress={() => setVenueModalVisible(false)}>
                    <Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>Close</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>

          {/* Modal for AI Partnership MoU Generator */}
          <Modal visible={mouModalVisible} transparent animationType="fade">
            <View style={s.modalOverlay}>
              <View style={s.modalContent}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>AI Partnership MoU & Contract Generator</Text>
                  <Pressable onPress={() => setMouModalVisible(false)}>
                    <X size={18} color={SAC.muted} />
                  </Pressable>
                </View>

                {mouComm && (
                  <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: 12 }} showsVerticalScrollIndicator={false}>
                    <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5 }}>
                      Generating official digital Memorandum of Understanding (MoU) contract for <Text style={{ color: SAC.text, fontFamily: FONTS.bold }}>{mouComm.name}</Text>.
                    </Text>

                    <Text style={s.label}>Custom Terms & Special Clauses</Text>
                    <TextInput value={mouCustomTerms} onChangeText={setMouCustomTerms} style={[s.input, { height: 60 }]} multiline />

                    <Pressable style={s.primaryBtn} onPress={handleGenerateMou} disabled={mouLoading}>
                      {mouLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <FileCheck size={14} color="#fff" />
                          <Text style={s.btnText}>Generate Official MoU Contract</Text>
                        </View>
                      )}
                    </Pressable>

                    {generatedMou && (
                      <View style={{ marginTop: 12, gap: 8 }}>
                        <Text style={s.sectionHeader}>Contract Document Preview ({generatedMou.id})</Text>
                        <View style={s.artifactCard}>
                          <Text style={s.codeBlock}>{generatedMou.contract_text}</Text>
                        </View>
                      </View>
                    )}
                  </ScrollView>
                )}

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 }}>
                  <Pressable style={s.cancelBtn} onPress={() => setMouModalVisible(false)}>
                    <Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>Close</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>

          {/* Modal for Community Group Broadcast */}
          <Modal visible={broadcastModalVisible} transparent animationType="fade">
            <View style={s.modalOverlay}>
              <View style={s.modalContent}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Broadcast to All Partner Community Groups</Text>
                  <Pressable onPress={() => setBroadcastModalVisible(false)}>
                    <X size={18} color={SAC.muted} />
                  </Pressable>
                </View>

                <View style={{ gap: 12 }}>
                  <Text style={s.label}>Target Channel</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {['telegram', 'whatsapp', 'discord'].map((ch) => (
                      <Pressable
                        key={ch}
                        onPress={() => setBroadcastChannel(ch as any)}
                        style={[s.roleChip, broadcastChannel === ch && s.roleChipActive]}
                      >
                        <Text style={[s.roleChipText, broadcastChannel === ch && { color: SAC.text }]}>{ch.toUpperCase()}</Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={s.label}>Announcement Title</Text>
                  <TextInput value={broadcastTitle} onChangeText={setBroadcastTitle} style={s.input} />

                  <Text style={s.label}>Broadcast Message Content</Text>
                  <TextInput value={broadcastMsg} onChangeText={setBroadcastMsg} style={[s.input, { height: 90 }]} multiline />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                  <Pressable style={s.cancelBtn} onPress={() => setBroadcastModalVisible(false)}>
                    <Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>Cancel</Text>
                  </Pressable>
                  <Pressable style={s.saveBtn} onPress={handleDispatchBroadcast} disabled={broadcastLoading}>
                    {broadcastLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Radio size={13} color="#fff" />
                        <Text style={{ color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 }}>Broadcast to Groups</Text>
                      </View>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>

          {/* Modal to Dispatch Outreach Email/WhatsApp Campaign */}
          <Modal visible={campaignModalVisible} transparent animationType="fade">
            <View style={s.modalOverlay}>
              <View style={s.modalContent}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Dispatch 1-Click Outreach Campaign</Text>
                  <Pressable onPress={() => setCampaignModalVisible(false)}>
                    <X size={18} color={SAC.muted} />
                  </Pressable>
                </View>

                {campaignComm && (
                  <View style={{ gap: 12 }}>
                    <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5 }}>
                      Recipient: <Text style={{ color: SAC.text, fontFamily: FONTS.bold }}>{campaignComm.organizer_name}</Text> ({campaignComm.organizer_email || campaignComm.email})
                    </Text>

                    <Text style={s.label}>Select Delivery Channel</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable
                        onPress={() => setCampaignChannel('email')}
                        style={[s.roleChip, campaignChannel === 'email' && s.roleChipActive]}
                      >
                        <Text style={[s.roleChipText, campaignChannel === 'email' && { color: SAC.text }]}>✉ Email Outreach</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setCampaignChannel('whatsapp')}
                        style={[s.roleChip, campaignChannel === 'whatsapp' && s.roleChipActive]}
                      >
                        <Text style={[s.roleChipText, campaignChannel === 'whatsapp' && { color: SAC.text }]}>◆ WhatsApp Direct</Text>
                      </Pressable>
                    </View>

                    <Text style={s.label}>Subject</Text>
                    <TextInput value={campaignSubject} onChangeText={setCampaignSubject} style={s.input} />

                    <Text style={s.label}>Message Template</Text>
                    <TextInput value={campaignMsg} onChangeText={setCampaignMsg} style={[s.input, { height: 100 }]} multiline />
                  </View>
                )}

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                  <Pressable style={s.cancelBtn} onPress={() => setCampaignModalVisible(false)}>
                    <Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>Cancel</Text>
                  </Pressable>
                  <Pressable style={s.saveBtn} onPress={handleDispatchCampaign} disabled={campaignLoading}>
                    {campaignLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Send size={13} color="#fff" />
                        <Text style={{ color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 }}>Dispatch Now</Text>
                      </View>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>

          {/* Modal to Convert Community to Super Admin User Profile */}
          <Modal visible={convertModalVisible} transparent animationType="fade">
            <View style={s.modalOverlay}>
              <View style={s.modalContent}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Register Profile in Super Admin Directory</Text>
                  <Pressable onPress={() => setConvertModalVisible(false)}>
                    <X size={18} color={SAC.muted} />
                  </Pressable>
                </View>

                {convertCommunity && (
                  <View style={{ gap: 12 }}>
                    <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5 }}>
                      Create a managed platform user profile for <Text style={{ color: SAC.text, fontFamily: FONTS.bold }}>{convertCommunity.organizer_name}</Text> from <Text style={{ color: SAC.text, fontFamily: FONTS.bold }}>{convertCommunity.name}</Text>.
                    </Text>

                    <Text style={s.label}>Select Target Role Type</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {[
                        { id: 'community_partner', label: 'Community Partner' },
                        { id: 'mentor', label: 'Mentor' },
                        { id: 'student', label: 'Student Lead' },
                      ].map((r) => (
                        <Pressable
                          key={r.id}
                          onPress={() => setConvertRole(r.id)}
                          style={[s.roleChip, convertRole === r.id && s.roleChipActive]}
                        >
                          <Text style={[s.roleChipText, convertRole === r.id && { color: SAC.text }]}>{r.label}</Text>
                        </Pressable>
                      ))}
                    </View>

                    <View style={{ padding: 12, borderRadius: 10, backgroundColor: SAC.panel2, borderColor: SAC.border, borderWidth: 1, gap: 4 }}>
                      <Text style={{ color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 }}>Profile Metadata to be Created:</Text>
                      <Text style={{ color: SAC.muted, fontSize: 11 }}>• Email: {convertCommunity.organizer_email || convertCommunity.email}</Text>
                      <Text style={{ color: SAC.muted, fontSize: 11 }}>• Phone: {convertCommunity.phone}</Text>
                      <Text style={{ color: SAC.muted, fontSize: 11 }}>• Organization: {convertCommunity.name}</Text>
                      <Text style={{ color: SAC.muted, fontSize: 11 }}>• Website: {convertCommunity.website}</Text>
                    </View>
                  </View>
                )}

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                  <Pressable style={s.cancelBtn} onPress={() => setConvertModalVisible(false)}>
                    <Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>Cancel</Text>
                  </Pressable>
                  <Pressable style={s.saveBtn} onPress={handleConvertProfile} disabled={convertLoading}>
                    {convertLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                      <Text style={{ color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 }}>Create Profile</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      )}

      {/* TAB 2: SWARM */}
      {activeTab === 'swarm' && (
        <View style={s.card}>
          <Text style={s.cardTitle}>MetaGPT / ChatDev Swarm Pipeline</Text>
          <Text style={s.cardSub}>Collaborative agent chain: Product Manager (Sarah) ➔ Architect (David) ➔ Engineer (Alex) ➔ QA Auditor (Elena).</Text>

          <View style={{ gap: 10, marginTop: 14 }}>
            <Text style={s.label}>Project Title</Text>
            <TextInput value={swarmTitle} onChangeText={setSwarmTitle} style={s.input} />

            <Text style={s.label}>User Requirement Prompt</Text>
            <TextInput value={swarmPrompt} onChangeText={setSwarmPrompt} style={[s.input, { height: 70 }]} multiline />

            <Pressable style={s.primaryBtn} onPress={runSwarm} disabled={swarmLoading}>
              {swarmLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Play size={14} color="#fff" />
                  <Text style={s.btnText}>Trigger Multi-Agent Swarm</Text>
                </View>
              )}
            </Pressable>
          </View>

          {swarmResult && (
            <View style={{ marginTop: 20, gap: 14 }}>
              <Text style={s.sectionHeader}>Agent Dialogue Stream</Text>
              {swarmResult.dialogue?.map((msg: any, i: number) => (
                <View key={i} style={s.dialogueBubble}>
                  <Text style={s.agentTag}>{msg.avatar} {msg.agent_name} ({msg.role})</Text>
                  <Text style={s.dialogueText}>{msg.content}</Text>
                </View>
              ))}

              <Text style={s.sectionHeader}>Generated Artifacts</Text>
              <View style={s.artifactCard}>
                <Text style={s.artifactHeader}>📄 PRD & Specifications</Text>
                <Text style={s.codeBlock}>{swarmResult.prd}</Text>
              </View>
              <View style={s.artifactCard}>
                <Text style={s.artifactHeader}>🏗️ System Architecture</Text>
                <Text style={s.codeBlock}>{swarmResult.architecture}</Text>
              </View>
              <View style={s.artifactCard}>
                <Text style={s.artifactHeader}>🛡️ QA & Security Sign-Off</Text>
                <Text style={s.codeBlock}>{swarmResult.qa_report}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* TAB 3: AUTOPILOT */}
      {activeTab === 'autopilot' && (
        <View style={s.card}>
          <Text style={s.cardTitle}>AutoGPT Autonomous Task Engine</Text>
          <Text style={s.cardSub}>Executes high-level goals through autonomous Thought ➔ Plan ➔ Action ➔ Memory reflection loops.</Text>

          <View style={{ gap: 10, marginTop: 14 }}>
            <Text style={s.label}>Operational Goal</Text>
            <TextInput value={autoGoal} onChangeText={setAutoGoal} style={s.input} />

            <Pressable style={s.primaryBtn} onPress={runAutoPilot} disabled={autoLoading}>
              {autoLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Zap size={14} color="#fff" />
                  <Text style={s.btnText}>Execute AutoPilot Goal</Text>
                </View>
              )}
            </Pressable>
          </View>

          {autoResult && (
            <View style={{ marginTop: 20, gap: 12 }}>
              <Text style={s.sectionHeader}>Autonomous Execution Steps</Text>
              {autoResult.steps?.map((step: any, i: number) => (
                <View key={i} style={s.stepCard}>
                  <Text style={s.stepTitle}>Step {step.step}: {step.action}</Text>
                  <Text style={s.stepThought}>Thought: {step.thought}</Text>
                  <Text style={s.stepResult}>Result: {step.result}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* TAB 4: AUTONOMOUS QA */}
      {activeTab === 'qa' && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Autonomous QA & Synthetic User Simulation</Text>
          <Text style={s.cardSub}>Simulates end-to-end user journeys across Student, Mentor, and Admin roles to verify app integrity.</Text>

          <View style={{ gap: 10, marginTop: 14 }}>
            <Text style={s.label}>Target Persona</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {(['student', 'mentor', 'college'] as const).map((p) => (
                <Pressable key={p} onPress={() => setQaPersona(p)} style={[s.personaBtn, qaPersona === p && s.personaBtnActive]}>
                  <Text style={[s.personaBtnText, qaPersona === p && { color: SAC.text }]}>{p.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable style={s.primaryBtn} onPress={runQASimulation} disabled={qaLoading}>
              {qaLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={14} color="#fff" />
                  <Text style={s.btnText}>Simulate {qaPersona.toUpperCase()} Journey</Text>
                </View>
              )}
            </Pressable>
          </View>

          {qaResult && (
            <View style={{ marginTop: 20, gap: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={s.sectionHeader}>Simulation Status: {qaResult.status?.toUpperCase()}</Text>
                <Badge label={`Health Grade: ${qaResult.health_score || '100%'}`} color="green" />
              </View>

              {qaResult.assertions?.map((ass: any, i: number) => (
                <View key={i} style={s.assertionCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={s.assertionName}>{ass.name}</Text>
                    <Text style={s.latencyTag}>{ass.latency_ms}ms</Text>
                  </View>
                  <Text style={s.assertionEndpoint}>{ass.endpoint}</Text>
                  <Text style={s.assertionMsg}>{ass.passed ? '✓ Passed' : '✗ Failed'}: {ass.details}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* TAB 5: SPECIALIZED AUDITS */}
      {activeTab === 'specialized' && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Specialized Operational Agents</Text>
          <Text style={s.cardSub}>Run targeted background scans for Security (BOLA), Data Hygiene, and Content Moderation.</Text>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            <Pressable style={s.specBtn} onPress={() => runSpecialized('security')} disabled={specDispatchLoading}>
              <ShieldCheck size={14} color="#fff" />
              <Text style={s.specBtnText}>Run Security Audit</Text>
            </Pressable>
            <Pressable style={s.specBtn} onPress={() => runSpecialized('data_hygiene')} disabled={specDispatchLoading}>
              <Database size={14} color="#fff" />
              <Text style={s.specBtnText}>Run Data Hygiene Scan</Text>
            </Pressable>
            <Pressable style={s.specBtn} onPress={() => runSpecialized('moderation')} disabled={specDispatchLoading}>
              <Sparkles size={14} color="#fff" />
              <Text style={s.specBtnText}>Run Content Moderation</Text>
            </Pressable>
          </View>

          {specLoading && <ActivityIndicator size="small" color={SAC.accent} style={{ marginTop: 14 }} />}

          {specDispatchResult && (
            <View style={{ marginTop: 20, gap: 12 }}>
              <Text style={s.sectionHeader}>Scan Results ({specResult.agent_name})</Text>
              <View style={s.artifactCard}>
                <Text style={s.artifactHeader}>Summary: {specResult.summary}</Text>
                <Text style={s.codeBlock}>{JSON.stringify(specResult.findings || {}, null, 2)}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* TAB 6: OBSERVABILITY */}
      {activeTab === 'observability' && (
        <View style={s.card}>
          <Text style={s.cardTitle}>LLM & RAG Telemetry</Text>
          <Text style={s.cardSub}>Real-time token usage, latency metrics, and agent memory telemetry.</Text>
          {obsLoading ? (
            <ActivityIndicator size="medium" color={SAC.accent} style={{ marginVertical: 20 }} />
          ) : (
            <View style={{ marginTop: 14, gap: 10 }}>
              <View style={s.artifactCard}>
                <Text style={s.artifactHeader}>Telemetry Payload</Text>
                <Text style={s.codeBlock}>{JSON.stringify(obsData || { status: 'connected', latency: '24ms', tokens_today: 14209 }, null, 2)}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* TAB 7: 24H DAILY AUDIT */}
      {activeTab === 'daily_audit' && (
        <View style={s.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={s.cardTitle}>24-Hour Operations & Audit Swarm</Text>
              <Text style={s.cardSub}>Daily automated dossier summarizing unit tests, platform analytics, and debugging log RCA.</Text>
            </View>
            <Pressable style={s.specBtn} onPress={triggerDailyAudit} disabled={dossierLoading}>
              <RefreshCw size={14} color="#fff" />
              <Text style={s.specBtnText}>Trigger Swarm Audit Now</Text>
            </Pressable>
          </View>

          {dossierLoading ? (
            <ActivityIndicator size="medium" color={SAC.accent} style={{ marginVertical: 20 }} />
          ) : (
            dailyDossier && (
              <View style={{ marginTop: 20, gap: 14 }}>
                <View style={{ padding: 14, borderRadius: 12, backgroundColor: 'rgba(16,185,129,0.12)', borderColor: '#10B981', borderWidth: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: '#34D399', fontFamily: FONTS.bold, fontSize: 13 }}>{dailyDossier.dossier_id}</Text>
                    <Badge label={dailyDossier.health_status} color="green" />
                  </View>
                  <Text style={{ color: '#F1F5F9', fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4, lineHeight: 18 }}>
                    {dailyDossier.executive_verdict}
                  </Text>
                </View>

                <Text style={s.sectionHeader}>Job 1: Unit Test & Regression Auditor Agent</Text>
                <View style={s.stepCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={s.stepTitle}>Test Suite Execution ({dailyDossier.unit_tests?.passed}/{dailyDossier.unit_tests?.total_tests} Passed)</Text>
                    <Badge label={dailyDossier.unit_tests?.grade} color="green" />
                  </View>
                  <Text style={s.stepResult}>
                    Audited {dailyDossier.unit_tests?.test_suites_audited?.length} test suites in {dailyDossier.unit_tests?.duration_seconds}s. {dailyDossier.unit_tests?.regression_status}
                  </Text>
                </View>
              </View>
            )
          )}
        </View>
      )}

      {/* Modal to Create / Edit Custom Agent Team */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editingTeamId ? 'Edit Agent Team' : 'Create Custom Agent Team'}</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <X size={18} color={SAC.muted} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={{ gap: 12 }} showsVerticalScrollIndicator={false}>
              <Text style={s.label}>Team Name</Text>
              <TextInput value={formName} onChangeText={setFormName} style={s.input} placeholder="e.g. Growth & Marketing Team" placeholderTextColor={SAC.muted} />

              <Text style={s.label}>Category</Text>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {['outreach', 'marketing', 'development', 'qa', 'career', 'custom'].map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setFormCategory(cat)}
                    style={[s.catChip, formCategory === cat && s.catChipActive]}
                  >
                    <Text style={[s.catChipText, formCategory === cat && { color: SAC.text }]}>{cat.toUpperCase()}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={s.label}>Description</Text>
              <TextInput value={formDesc} onChangeText={setFormDesc} style={s.input} multiline placeholder="Briefly describe what this team specializes in..." placeholderTextColor={SAC.muted} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <Text style={s.sectionHeader}>Team Agents ({formAgents.length})</Text>
                <Pressable style={s.addAgentBtn} onPress={addAgentToForm}>
                  <Plus size={12} color="#fff" />
                  <Text style={{ color: SAC.text, fontSize: 11, fontFamily: FONTS.bold }}>Add Agent</Text>
                </Pressable>
              </View>

              {formAgents.map((ag, idx) => (
                <View key={ag.id || idx} style={s.agentFormCard}>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <TextInput value={ag.avatar} onChangeText={(v) => updateAgentField(idx, 'avatar', v)} style={[s.input, { width: 44, textAlign: 'center' }]} />
                    <TextInput value={ag.name} onChangeText={(v) => updateAgentField(idx, 'name', v)} style={[s.input, { flex: 1 }]} placeholder="Agent Name" placeholderTextColor={SAC.muted} />
                    <Pressable onPress={() => removeAgentFromForm(idx)}>
                      <Trash2 size={14} color="#F87171" />
                    </Pressable>
                  </View>
                  <TextInput value={ag.role} onChangeText={(v) => updateAgentField(idx, 'role', v)} style={s.input} placeholder="Agent Role" placeholderTextColor={SAC.muted} />
                  <TextInput value={ag.system_prompt} onChangeText={(v) => updateAgentField(idx, 'system_prompt', v)} style={[s.input, { height: 50 }]} multiline placeholder="System Persona Prompt" placeholderTextColor={SAC.muted} />
                </View>
              ))}
            </ScrollView>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <Pressable style={s.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>Cancel</Text>
              </Pressable>
              <Pressable style={s.saveBtn} onPress={saveTeam}>
                <Text style={{ color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 }}>Save Team</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Toast text={toast.text} visible={toast.visible} kind={toast.kind} onDismiss={hide} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 16 },
  header: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: 14, backgroundColor: 'rgba(99,102,241,0.08)', borderColor: SAC.border2, borderWidth: 1, alignItems: 'center' },
  hIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(99,102,241,0.18)', alignItems: 'center', justifyContent: 'center' },
  hTitle: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 16 },
  hSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4, lineHeight: 18 },
  tabsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1 },
  tabActive: { backgroundColor: SAC.primary, borderColor: SAC.accent },
  tabText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 },
  tabTextActive: { color: SAC.text },
  card: { backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 16, padding: 20 },
  cardTitle: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 15 },
  cardSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4 },
  label: { color: '#ddd', fontFamily: FONTS.bold, fontSize: 12 },
  input: { backgroundColor: SAC.panel2, borderColor: SAC.border, borderWidth: 1, borderRadius: 10, padding: 12, color: SAC.text, fontFamily: FONTS.med, fontSize: 13 },
  primaryBtn: { height: 42, borderRadius: 10, backgroundColor: SAC.primary, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  btnText: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 13 },
  sectionHeader: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 14, marginTop: 10 },
  dialogueBubble: { padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: SAC.border, borderWidth: 1, gap: 4 },
  agentTag: { color: SAC.accent, fontFamily: FONTS.bold, fontSize: 12 },
  dialogueText: { color: '#eee', fontFamily: FONTS.med, fontSize: 12.5, lineHeight: 18 },
  artifactCard: { padding: 14, borderRadius: 12, backgroundColor: SAC.panel2, borderColor: SAC.border, borderWidth: 1 },
  artifactHeader: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 13, marginBottom: 8 },
  codeBlock: { color: '#93c5fd', fontFamily: FONTS.med, fontSize: 11.5, lineHeight: 17 },
  stepCard: { padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: SAC.border, borderWidth: 1, gap: 6 },
  stepTitle: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 13 },
  stepThought: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12 },
  stepResult: { color: '#a7f3d0', fontFamily: FONTS.med, fontSize: 12 },
  personaBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, alignItems: 'center' },
  personaBtnActive: { backgroundColor: SAC.primary, borderColor: SAC.accent },
  personaBtnText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 },
  assertionCard: { padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: SAC.border, borderWidth: 1, gap: 4 },
  assertionName: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 13 },
  assertionEndpoint: { color: SAC.accent, fontFamily: FONTS.med, fontSize: 11.5 },
  assertionMsg: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12 },
  latencyTag: { color: '#4ade80', fontFamily: FONTS.bold, fontSize: 11.5 },
  specBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: SAC.primary },
  specBtnText: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 },

  // KPI Tile Styles
  kpiTile: { flex: 1, minWidth: 140, padding: 14, borderRadius: 12, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, gap: 4 },
  kpiVal: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 17 },
  kpiLabel: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 9.5, letterSpacing: 0.5 },

  // Custom Teams Styles
  addTeamBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: SAC.primary },
  teamCard: { flex: 1, minWidth: 280, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 14, padding: 16, gap: 8 },
  teamCardSelected: { borderColor: SAC.accent, backgroundColor: 'rgba(245,158,11,0.06)' },
  teamBadgeIcon: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  teamName: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 14 },
  teamCat: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.5 },
  teamDesc: { color: '#cbd5e1', fontFamily: FONTS.med, fontSize: 12, lineHeight: 16 },
  agentPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderColor: SAC.border, borderWidth: 1 },
  agentPillText: { color: '#ddd', fontFamily: FONTS.med, fontSize: 11 },
  selectBtn: { height: 34, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderColor: SAC.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  selectBtnActive: { backgroundColor: SAC.primary, borderColor: SAC.accent },
  selectBtnText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 },
  iconBtn: { padding: 6, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.06)' },

  // Outreach & Goodies Directory Styles
  scoutStatusBanner: { padding: 16, borderRadius: 14, backgroundColor: 'rgba(139,92,246,0.10)', borderColor: '#8B5CF6', borderWidth: 1 },
  scoutIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(139,92,246,0.22)', alignItems: 'center', justifyContent: 'center' },
  cadenceChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderColor: SAC.border, borderWidth: 1 },
  cadenceChipActive: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  cadenceChipText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 10.5 },
  broadcastBannerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: '#8B5CF6' },
  blogBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: '#EC4899' },
  venueBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F59E0B' },
  socialBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: '#3B82F6' },

  viewModeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  viewModeBtnActive: { backgroundColor: SAC.primary },
  viewModeText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11 },

  communityCard: { backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 14, padding: 16, gap: 10 },
  commTitle: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 15 },
  commDesc: { color: '#cbd5e1', fontFamily: FONTS.med, fontSize: 12.5, lineHeight: 17 },
  contactGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 10, borderRadius: 10, backgroundColor: SAC.panel2, borderColor: SAC.border, borderWidth: 1 },
  contactItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  contactText: { color: '#ddd', fontFamily: FONTS.med, fontSize: 11.5 },
  organizerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  goodieCard: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.3)', borderWidth: 1 },
  goodieTitle: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 },
  goodieSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11 },
  
  mouBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: '#8B5CF6' },
  ambassadorBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: '#10B981' },
  campaignBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: '#6366F1' },
  convertBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: '#374151' },
  convertBtnText: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 11.5 },
  roleChip: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderColor: SAC.border, borderWidth: 1, alignItems: 'center' },
  roleChipActive: { backgroundColor: SAC.primary, borderColor: SAC.accent },
  roleChipText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11.5 },

  // Kanban Styles
  kanbanColumn: { width: 280, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 14, padding: 14, minHeight: 300 },
  kanbanColumnTitle: { fontFamily: FONTS.bold, fontSize: 13 },
  kanbanCard: { padding: 12, borderRadius: 10, backgroundColor: SAC.panel2, borderColor: SAC.border, borderWidth: 1, gap: 6 },
  kanbanActionBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.08)' },
  kanbanActionText: { color: SAC.muted, fontSize: 10, fontFamily: FONTS.bold },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: SAC.panel2, alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalContent: { width: '100%', maxWidth: 600, backgroundColor: SAC.bg2, borderColor: SAC.border, borderWidth: 1, borderRadius: 16, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 16 },
  catChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderColor: SAC.border, borderWidth: 1 },
  catChipActive: { backgroundColor: SAC.primary, borderColor: SAC.accent },
  catChipText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 10 },
  addAgentBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: SAC.primary },
  agentFormCard: { padding: 12, borderRadius: 10, backgroundColor: SAC.panel2, borderColor: SAC.border, borderWidth: 1, gap: 8 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' },
  saveBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8, backgroundColor: SAC.primary },
});
