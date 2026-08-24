// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { Bot, Sparkles, Play, ShieldCheck, Database, CheckCircle, Code, Layers, FileText, Zap, RefreshCw } from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
import { Badge } from '../atoms';
import { postPortal, getPortal } from '@/src/lib/portalApi';
import { useToast, Toast } from '../applekit';

export function AutonomousAgentsView() {
  const { toast, flash, hide } = useToast();
  const [activeTab, setActiveTab] = useState<'swarm' | 'autopilot' | 'qa' | 'specialized' | 'observability' | 'daily_audit'>('swarm');

  // Swarm State
  const [swarmTitle, setSwarmTitle] = useState('AI Mentorship Matching Platform');
  const [swarmPrompt, setSwarmPrompt] = useState('Create a collaborative matching platform connecting students with alumni based on skill graphs and goal alignment.');
  const [swarmLoading, setSwarmLoading] = useState(false);
  const [swarmResult, setSwarmResult] = useState<any>(null);

  // AutoPilot State
  const [autoGoal, setAutoGoal] = useState('Identify inactive mentors and send re-engagement emails');
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoResult, setAutoResult] = useState<any>(null);

  // QA Simulation State
  const [qaPersona, setQaPersona] = useState<'student' | 'mentor' | 'college'>('student');
  const [qaLoading, setQaLoading] = useState(false);
  const [qaResult, setQaResult] = useState<any>(null);

  // Specialized State
  const [specLoading, setSpecLoading] = useState(false);
  const [specResult, setSpecResult] = useState<any>(null);

  // Observability State
  const [obsLoading, setObsLoading] = useState(false);
  const [obsData, setObsData] = useState<any>(null);

  // 24-Hour Daily Audit State
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dailyDossier, setDailyDossier] = useState<any>(null);

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
      const res = await getPortal('/api/ai/observability');
      setObsData(res);
    } catch (e: any) {
      flash('Failed to load AI telemetry', 'error');
    } finally {
      setObsLoading(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'observability') {
      fetchObservability();
    } else if (activeTab === 'daily_audit') {
      fetchDailyDossier();
    }
  }, [activeTab]);

  const runSwarm = async () => {
    setSwarmLoading(true);
    try {
      const res = await postPortal('/admin/agents/swarm/run', {
        project_title: swarmTitle,
        user_prompt: swarmPrompt,
        domain: 'edtech'
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
        goal: autoGoal
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
        persona: qaPersona
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
          <Text style={s.hTitle}>Autonomous Agents & Swarm Control Plane</Text>
          <Text style={s.hSub}>Orchestrate MetaGPT multi-agent software swarms, AutoGPT goal auto-pilots, and synthetic QA simulators.</Text>
        </View>
      </View>

      {/* Navigation Tabs */}
      <View style={s.tabsRow}>
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
        <Pressable onPress={() => setActiveTab('observability')} style={[s.tabBtn, activeTab === 'observability' && s.tabActive]}>
          <Database size={14} color={activeTab === 'observability' ? '#fff' : SAC.muted} />
          <Text style={[s.tabText, activeTab === 'observability' && s.tabTextActive]}>LLM & RAG Telemetry</Text>
        </Pressable>
        <Pressable onPress={() => setActiveTab('daily_audit')} style={[s.tabBtn, activeTab === 'daily_audit' && s.tabActive]}>
          <CheckCircle size={14} color={activeTab === 'daily_audit' ? '#fff' : SAC.muted} />
          <Text style={[s.tabText, activeTab === 'daily_audit' && s.tabTextActive]}>24h Ops & Audit Swarm</Text>
        </Pressable>
      </View>

      {/* TAB 1: SWARM */}
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

      {/* TAB 2: AUTOPILOT */}
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
                  <Text style={s.btnText}>Execute Goal Loop</Text>
                </View>
              )}
            </Pressable>
          </View>

          {autoResult && (
            <View style={{ marginTop: 20, gap: 12 }}>
              <Text style={s.sectionHeader}>Execution Iterations ({autoResult.iterations} steps · {autoResult.duration_ms}ms)</Text>
              {autoResult.steps_executed?.map((st: any, i: number) => (
                <View key={i} style={s.stepCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={s.stepTitle}>Step {st.step_number}: {st.action_type}</Text>
                    <Badge label={st.target_resource} color="purple" />
                  </View>
                  <Text style={s.stepThought}>💭 {st.thought}</Text>
                  <Text style={s.stepResult}>✅ {st.result_summary}</Text>
                </View>
              ))}
              <View style={[s.stepCard, { borderColor: SAC.accent }]}>
                <Text style={{ color: '#fff', fontFamily: FONTS.bold }}>Final Outcome</Text>
                <Text style={{ color: SAC.muted, marginTop: 4 }}>{autoResult.final_output}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* TAB 3: QA TESTING */}
      {activeTab === 'qa' && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Autonomous QA Persona Simulator</Text>
          <Text style={s.cardSub}>Spawns synthetic user bots to test real user journeys and verify latency / API health.</Text>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            {(['student', 'mentor', 'college'] as const).map((p) => (
              <Pressable
                key={p}
                onPress={() => setQaPersona(p)}
                style={[s.personaBtn, qaPersona === p && s.personaBtnActive]}
              >
                <Text style={[s.personaBtnText, qaPersona === p && { color: '#fff' }]}>{p.toUpperCase()} Persona</Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={[s.primaryBtn, { marginTop: 14 }]} onPress={runQASimulation} disabled={qaLoading}>
            {qaLoading ? <ActivityIndicator size="small" color="#fff" /> : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <RefreshCw size={14} color="#fff" />
                <Text style={s.btnText}>Run Synthetic QA Simulation</Text>
              </View>
            )}
          </Pressable>

          {qaResult && (
            <View style={{ marginTop: 20, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={s.sectionHeader}>{qaResult.scenario_name}</Text>
                <Badge label={`Health: ${qaResult.health_score}%`} color="green" />
              </View>
              {qaResult.assertions?.map((ass: any, i: number) => (
                <View key={i} style={s.assertionCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={s.assertionName}>{ass.name}</Text>
                    <Text style={s.latencyTag}>{ass.response_time_ms}ms</Text>
                  </View>
                  <Text style={s.assertionEndpoint}>{ass.target_endpoint}</Text>
                  <Text style={s.assertionMsg}>{ass.message}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* TAB 4: SPECIALIZED AUDITS */}
      {activeTab === 'specialized' && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Specialized Operational Agents</Text>
          <Text style={s.cardSub}>On-demand autonomous auditors for security, data hygiene, and content safety.</Text>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            <Pressable style={s.specBtn} onPress={() => runSpecialized('security')} disabled={specLoading}>
              <ShieldCheck size={16} color="#fff" />
              <Text style={s.specBtnText}>Security & BOLA Scan</Text>
            </Pressable>
            <Pressable style={s.specBtn} onPress={() => runSpecialized('data_hygiene')} disabled={specLoading}>
              <Database size={16} color="#fff" />
              <Text style={s.specBtnText}>Data Hygiene Audit</Text>
            </Pressable>
            <Pressable style={s.specBtn} onPress={() => runSpecialized('moderation')} disabled={specLoading}>
              <Sparkles size={16} color="#fff" />
              <Text style={s.specBtnText}>Content Moderation</Text>
            </Pressable>
          </View>

          {specResult && (
            <View style={{ marginTop: 20, gap: 12 }}>
              <Text style={s.sectionHeader}>{specResult.agent_type}</Text>
              {specResult.items?.map((it: any, i: number) => (
                <View key={i} style={s.stepCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={s.stepTitle}>{it.target}</Text>
                    <Badge label={it.status} color="green" />
                  </View>
                  <Text style={s.stepResult}>{it.detail}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* TAB 5: OBSERVABILITY & TELEMETRY */}
      {activeTab === 'observability' && (
        <View style={s.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={s.cardTitle}>Global LLM & RAG Observability Hub</Text>
              <Text style={s.cardSub}>Real-time token analytics, API expenditure ($ & ₹), latency metrics, and vector index health.</Text>
            </View>
            <Pressable style={s.specBtn} onPress={fetchObservability} disabled={obsLoading}>
              <RefreshCw size={14} color="#fff" />
              <Text style={s.specBtnText}>Refresh Telemetry</Text>
            </Pressable>
          </View>

          {obsLoading && <ActivityIndicator size="small" color="#A78BFA" style={{ marginTop: 20 }} />}

          {obsData && (
            <View style={{ marginTop: 20, gap: 14 }}>
              {/* Metric Highlights */}
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                <View style={{ flex: 1, minWidth: 140, padding: 14, borderRadius: 12, backgroundColor: 'rgba(124,58,237,0.12)', borderColor: '#7C3AED', borderWidth: 1 }}>
                  <Text style={{ color: '#DDD6FE', fontSize: 11, fontFamily: FONTS.bold }}>TOTAL TOKENS (24H)</Text>
                  <Text style={{ color: '#fff', fontSize: 20, fontFamily: FONTS.xbold, marginTop: 4 }}>{obsData.total_tokens_24h?.toLocaleString()}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 140, padding: 14, borderRadius: 12, backgroundColor: 'rgba(16,185,129,0.12)', borderColor: '#10B981', borderWidth: 1 }}>
                  <Text style={{ color: '#A7F3D0', fontSize: 11, fontFamily: FONTS.bold }}>TOTAL AI COST</Text>
                  <Text style={{ color: '#fff', fontSize: 20, fontFamily: FONTS.xbold, marginTop: 4 }}>${obsData.estimated_cost_usd} (₹{obsData.estimated_cost_inr})</Text>
                </View>
                <View style={{ flex: 1, minWidth: 140, padding: 14, borderRadius: 12, backgroundColor: 'rgba(59,130,246,0.12)', borderColor: '#3B82F6', borderWidth: 1 }}>
                  <Text style={{ color: '#BFDBFE', fontSize: 11, fontFamily: FONTS.bold }}>CACHE HIT RATE</Text>
                  <Text style={{ color: '#fff', fontSize: 20, fontFamily: FONTS.xbold, marginTop: 4 }}>{obsData.cache_hit_rate_percent}%</Text>
                </View>
                <View style={{ flex: 1, minWidth: 140, padding: 14, borderRadius: 12, backgroundColor: 'rgba(245,158,11,0.12)', borderColor: '#F59E0B', borderWidth: 1 }}>
                  <Text style={{ color: '#FDE68A', fontSize: 11, fontFamily: FONTS.bold }}>AVG LATENCY</Text>
                  <Text style={{ color: '#fff', fontSize: 20, fontFamily: FONTS.xbold, marginTop: 4 }}>{obsData.average_system_latency_ms}ms</Text>
                </View>
              </View>

              {/* Models Breakdown */}
              <Text style={s.sectionHeader}>Model Ingestion & Latency Benchmarks</Text>
              <View style={{ gap: 8 }}>
                {obsData.models?.map((m: any, idx: number) => (
                  <View key={idx} style={s.assertionCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={s.assertionName}>{m.model_name}</Text>
                      <Badge label={`${m.avg_latency_ms}ms`} color="purple" />
                    </View>
                    <Text style={s.assertionEndpoint}>{m.tier} · {m.tokens_today?.toLocaleString()} tokens · ${m.cost_usd}</Text>
                  </View>
                ))}
              </View>

              {/* Vector Collections */}
              <Text style={s.sectionHeader}>Multi-Tenant Vector Knowledge Fabric</Text>
              <View style={{ gap: 8 }}>
                {obsData.vector_collections?.map((v: any, idx: number) => (
                  <View key={idx} style={s.stepCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={s.stepTitle}>{v.collection_name}</Text>
                      <Badge label={v.indexing_status} color="green" />
                    </View>
                    <Text style={s.stepResult}>{v.vector_count} indexed embeddings (1536-dim)</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* TAB 6: 24-HOUR DAILY OPS & AUDIT SWARM */}
      {activeTab === 'daily_audit' && (
        <View style={s.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={s.cardTitle}>24-Hour Autonomous Operations & Audit Swarm</Text>
              <Text style={s.cardSub}>Executes daily unit test audits, platform growth analytics, and log anomaly inspections.</Text>
            </View>
            <Pressable style={s.specBtn} onPress={triggerDailyAudit} disabled={dossierLoading}>
              <RefreshCw size={14} color="#fff" />
              <Text style={s.specBtnText}>Run Daily Audit Swarm</Text>
            </Pressable>
          </View>

          {dossierLoading && <ActivityIndicator size="small" color="#A78BFA" style={{ marginTop: 20 }} />}

          {dailyDossier && (
            <View style={{ marginTop: 20, gap: 14 }}>
              {/* Executive Verdict Banner */}
              <View style={{ padding: 14, borderRadius: 12, backgroundColor: 'rgba(16,185,129,0.12)', borderColor: '#10B981', borderWidth: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: '#34D399', fontFamily: FONTS.bold, fontSize: 13 }}>{dailyDossier.dossier_id}</Text>
                  <Badge label={dailyDossier.health_status} color="green" />
                </View>
                <Text style={{ color: '#F1F5F9', fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4, lineHeight: 18 }}>
                  {dailyDossier.executive_verdict}
                </Text>
              </View>

              {/* Job 1: Unit Test Audit Card */}
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

              {/* Job 2: Platform Analytics Card */}
              <Text style={s.sectionHeader}>Job 2: Platform Analytics & Growth Intelligence Agent</Text>
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                <View style={{ flex: 1, minWidth: 120, padding: 12, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.3)', borderColor: SAC.border, borderWidth: 1 }}>
                  <Text style={{ color: SAC.muted, fontSize: 10, fontFamily: FONTS.bold }}>ACTIVE USERS (DAU)</Text>
                  <Text style={{ color: '#fff', fontSize: 18, fontFamily: FONTS.xbold, marginTop: 3 }}>{dailyDossier.analytics?.dau_active_users}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 120, padding: 12, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.3)', borderColor: SAC.border, borderWidth: 1 }}>
                  <Text style={{ color: SAC.muted, fontSize: 10, fontFamily: FONTS.bold }}>NEW USERS (24H)</Text>
                  <Text style={{ color: '#fff', fontSize: 18, fontFamily: FONTS.xbold, marginTop: 3 }}>+{dailyDossier.analytics?.new_users_24h}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 120, padding: 12, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.3)', borderColor: SAC.border, borderWidth: 1 }}>
                  <Text style={{ color: SAC.muted, fontSize: 10, fontFamily: FONTS.bold }}>MENTORSHIPS</Text>
                  <Text style={{ color: '#fff', fontSize: 18, fontFamily: FONTS.xbold, marginTop: 3 }}>{dailyDossier.analytics?.mentorship_sessions_completed}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 120, padding: 12, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.3)', borderColor: SAC.border, borderWidth: 1 }}>
                  <Text style={{ color: SAC.muted, fontSize: 10, fontFamily: FONTS.bold }}>CERTIFICATES</Text>
                  <Text style={{ color: '#fff', fontSize: 18, fontFamily: FONTS.xbold, marginTop: 3 }}>{dailyDossier.analytics?.certificates_issued_24h}</Text>
                </View>
              </View>

              {/* Job 3: Debugging Logs & RCA Card */}
              <Text style={s.sectionHeader}>Job 3: Debugging Logs & Anomaly Inspector Agent</Text>
              <View style={s.stepCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={s.stepTitle}>Analyzed {dailyDossier.debugging_logs?.total_log_entries_analyzed?.toLocaleString()} Log Entries</Text>
                  <Badge label={dailyDossier.debugging_logs?.system_stability_index} color="purple" />
                </View>
                <View style={{ marginTop: 6, gap: 3 }}>
                  {dailyDossier.debugging_logs?.root_cause_analysis?.map((rca: string, i: number) => (
                    <Text key={i} style={s.stepResult}>✓ {rca}</Text>
                  ))}
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      <Toast text={toast.text} visible={toast.visible} kind={toast.kind} onDismiss={hide} />
    </View>
  );
}

const s = {
  container: { gap: 16 },
  header: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: 14, backgroundColor: 'rgba(99,102,241,0.08)', borderColor: SAC.border2, borderWidth: 1, alignItems: 'center' },
  hIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(99,102,241,0.18)', alignItems: 'center', justifyContent: 'center' },
  hTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 16 },
  hSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4, lineHeight: 18 },
  tabsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1 },
  tabActive: { backgroundColor: SAC.primary, borderColor: SAC.accent },
  tabText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 },
  tabTextActive: { color: '#fff' },
  card: { backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 16, padding: 20 },
  cardTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 15 },
  cardSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4 },
  label: { color: '#ddd', fontFamily: FONTS.bold, fontSize: 12 },
  input: { backgroundColor: 'rgba(0,0,0,0.3)', borderColor: SAC.border, borderWidth: 1, borderRadius: 10, padding: 12, color: '#fff', fontFamily: FONTS.med, fontSize: 13 },
  primaryBtn: { height: 42, borderRadius: 10, backgroundColor: SAC.primary, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  btnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },
  sectionHeader: { color: '#fff', fontFamily: FONTS.bold, fontSize: 14, marginTop: 10 },
  dialogueBubble: { padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: SAC.border, borderWidth: 1, gap: 4 },
  agentTag: { color: SAC.accent, fontFamily: FONTS.bold, fontSize: 12 },
  dialogueText: { color: '#eee', fontFamily: FONTS.med, fontSize: 12.5, lineHeight: 18 },
  artifactCard: { padding: 14, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.4)', borderColor: SAC.border, borderWidth: 1 },
  artifactHeader: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13, marginBottom: 8 },
  codeBlock: { color: '#93c5fd', fontFamily: FONTS.med, fontSize: 11.5, lineHeight: 17 },
  stepCard: { padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: SAC.border, borderWidth: 1, gap: 6 },
  stepTitle: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },
  stepThought: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12 },
  stepResult: { color: '#a7f3d0', fontFamily: FONTS.med, fontSize: 12 },
  personaBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, alignItems: 'center' },
  personaBtnActive: { backgroundColor: SAC.primary, borderColor: SAC.accent },
  personaBtnText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 },
  assertionCard: { padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: SAC.border, borderWidth: 1, gap: 4 },
  assertionName: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },
  assertionEndpoint: { color: SAC.accent, fontFamily: FONTS.med, fontSize: 11.5 },
  assertionMsg: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12 },
  latencyTag: { color: '#4ade80', fontFamily: FONTS.bold, fontSize: 11.5 },
  specBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: SAC.primary },
  specBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12 }
};
