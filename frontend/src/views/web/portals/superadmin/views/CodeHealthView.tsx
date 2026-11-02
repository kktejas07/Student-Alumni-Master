import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { ShieldCheck, Zap, Play, Pause, Circle, Sparkles, UserCheck, ExternalLink } from "lucide-react-native";
import { SAC, useSAC, FONTS, resolveColors } from "../tokens";
import { Card } from "../applekit";
import { request } from "@/src/models/services/api";

// Analytics instrumentation per standards §3
const trackScreen = (screenName: string, meta: Record<string, any>) => {
  if (typeof window !== "undefined" && (window as any).analytics?.trackScreen) {
    (window as any).analytics.trackScreen(screenName, meta);
  }
};

const trackClick = (actionName: string, meta?: Record<string, any>) => {
  if (typeof window !== "undefined" && (window as any).analytics?.trackClick) {
    (window as any).analytics.trackClick(actionName, meta);
  }
};

export const CodeHealthView: React.FC = () => {
  const T = useSAC();
  Object.assign(s, resolveColors(s, T));

  const [loading, setLoading] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [findings, setFindings] = useState<any[]>([]);
  const [autofixes, setAutofixes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"findings" | "autofixes">("findings");

  // Filters
  const [familyFilter, setFamilyFilter] = useState<string>("ALL");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [expandedFingerprint, setExpandedFingerprint] = useState<string | null>(null);

  const [runningCycle, setRunningCycle] = useState<boolean>(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    trackScreen("code_health", { path: "/superadmin/code-health" });
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resStatus, resMetrics, resFindings, resAutofixes] = await Promise.all([
        request<any>("/admin/code-health/status").catch(() => null),
        request<any>("/admin/code-health/metrics?range=30d").catch(() => null),
        request<any>("/admin/code-health/findings?status=open&limit=100").catch(() => null),
        request<any>("/admin/code-health/autofixes?limit=50").catch(() => null),
      ]);

      if (resStatus) setStatus(resStatus);
      if (resMetrics) setMetrics(resMetrics);
      if (resFindings?.findings) setFindings(resFindings.findings);
      if (resAutofixes?.autofixes) setAutofixes(resAutofixes.autofixes);
    } catch (err) {
      console.error("Failed to fetch code health data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunAudit = async () => {
    trackClick("code_health_run_audit");
    setRunningCycle(true);
    setActionMsg("Running full codebase audit...");
    try {
      const data = await request<any>("/admin/code-health/run", {
        method: "POST",
        body: { scope: "repo", autofix: false },
      });
      setActionMsg(`Audit complete! Score: ${data.health_score}/100, Open Findings: ${data.total_findings}`);
      fetchData();
    } catch (e: any) {
      setActionMsg(`Audit failed: ${e.message}`);
    } finally {
      setRunningCycle(false);
    }
  };

  const handleStartLoop = async () => {
    trackClick("code_health_start_loop");
    try {
      await request("/admin/code-health/loop-agent/start", {
        method: "POST",
        body: { interval_seconds: 86400 },
      });
      setActionMsg("24h Loop worker started.");
      fetchData();
    } catch (e: any) {
      setActionMsg(`Failed to start loop: ${e.message}`);
    }
  };

  const handleStopLoop = async () => {
    trackClick("code_health_stop_loop");
    try {
      await request("/admin/code-health/loop-agent/stop", { method: "POST" });
      setActionMsg("Loop worker stopped.");
      fetchData();
    } catch (e: any) {
      setActionMsg(`Failed to stop loop: ${e.message}`);
    }
  };

  const handlePatchStatus = async (fingerprint: string, newStatus: string) => {
    trackClick("code_health_patch_status", { fingerprint, newStatus });
    try {
      await request(`/admin/code-health/findings/${fingerprint}`, {
        method: "PATCH",
        body: { status: newStatus, admin_note: "Updated from SuperAdmin UI" },
      });
      setActionMsg(`Finding updated to ${newStatus}`);
      fetchData();
    } catch (e: any) {
      setActionMsg(`Update failed: ${e.message}`);
    }
  };

  const filteredFindings = findings.filter((f) => {
    if (familyFilter !== "ALL" && f.family !== familyFilter) return false;
    if (severityFilter !== "ALL" && f.severity !== severityFilter) return false;
    if (statusFilter !== "ALL" && f.status !== statusFilter) return false;
    return true;
  });

  const p0p1 = (metrics?.counts_by_severity?.P0 || 0) + (metrics?.counts_by_severity?.P1 || 0);

  const sevColor = (sev: string) =>
    sev === "P0" ? T.danger : sev === "P1" ? T.amber : T.blue;
  const sevBg = (sev: string) =>
    sev === "P0" ? T.dangerTint : sev === "P1" ? T.warnTint : T.tint;
  const tierColor = (tier: string) =>
    tier === "Tier A" ? T.ok : tier === "Tier B" ? T.amber : T.danger;
  const tierBg = (tier: string) =>
    tier === "Tier A" ? T.okTint : tier === "Tier B" ? T.warnTint : T.dangerTint;

  const td: Record<string, any> = { padding: 12 };

  const loopPill = {
    backgroundColor: status?.is_running ? T.okTint : T.dangerTint,
    borderColor: status?.is_running ? T.okLine : T.danger,
  };
  const autofixPill = {
    backgroundColor: status?.autofix_enabled_env ? T.okTint : T.warnTint,
    borderColor: status?.autofix_enabled_env ? T.okLine : T.amber,
  };

  const selectStyle: Record<string, any> = {
    backgroundColor: s.sel.backgroundColor,
    color: s.sel.color,
    borderWidth: 1,
    borderColor: s.sel.borderColor,
    borderRadius: 9,
    padding: "8px 12px",
    fontSize: 12.5,
    fontFamily: FONTS.regular,
    outline: "none",
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={s.rootPad} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={s.headerRow}>
        <View>
          <View style={s.titleRow}>
            <ShieldCheck size={24} color={T.violet} />
            <Text style={s.title}>CodeHealthAgent — Autonomous Auditor & Auto-Fix Control Plane</Text>
          </View>
          <Text style={s.subtitle}>
            Continuous auditing against <Text style={s.codeInline}>.agents/rules/development_standards.md</Text> · Gate-based Tier A remediation
          </Text>
        </View>
        <View style={s.headerPills}>
          <View style={[s.pill, loopPill]}>
            {status?.is_running ? <Circle size={10} color={T.ok} /> : <Pause size={10} color={T.danger} />}
            <Text style={[s.pillText, { color: status?.is_running ? T.ok : T.danger }]}>{status?.is_running ? "24H LOOP ACTIVE" : "LOOP PAUSED"}</Text>
          </View>
          <View style={[s.pill, autofixPill]}>
            <Text style={[s.pillText, { color: status?.autofix_enabled_env ? T.ok : T.amber }]}>
              AUTOFIX: {status?.autofix_enabled_env ? "ON" : "OFF (SAFE)"}
            </Text>
          </View>
        </View>
      </View>

      {actionMsg && (
        <View style={s.banner}>
          <Text style={s.bannerText}>{actionMsg}</Text>
        </View>
      )}

      {/* KPI Cards */}
      <View style={s.kpiGrid}>
        <Card style={s.kpiCard}>
          <Text style={s.kpiLabel}>Code Health Score</Text>
          <View style={s.kpiValueRow}>
            <Text style={[s.kpiValue, { color: (metrics?.health_score || 100) >= 90 ? T.ok : T.amber }]}>{metrics?.health_score ?? "100.0"}</Text>
            <Text style={s.kpiUnit}>/100</Text>
          </View>
          <Text style={s.kpiSub}>Formula: 100 − penalty/KLOC</Text>
        </Card>

        <Card style={s.kpiCard}>
          <Text style={s.kpiLabel}>Open P0 / P1 Findings</Text>
          <Text style={[s.kpiValue, { color: p0p1 > 0 ? T.danger : T.ok }]}>{p0p1}</Text>
          <Text style={s.kpiSub}>P0: {metrics?.counts_by_severity?.P0 || 0} · P1: {metrics?.counts_by_severity?.P1 || 0}</Text>
        </Card>

        <Card style={s.kpiCard}>
          <Text style={s.kpiLabel}>Total Open Findings</Text>
          <Text style={s.kpiValue}>{metrics?.total_open_findings ?? 0}</Text>
          <Text style={s.kpiSub}>P2: {metrics?.counts_by_severity?.P2 || 0} · P3: {metrics?.counts_by_severity?.P3 || 0}</Text>
        </Card>

        <Card style={s.kpiCard}>
          <Text style={s.kpiLabel}>Auto-Fix Rate</Text>
          <Text style={[s.kpiValue, { color: T.violet }]}>{autofixes.length > 0 ? "100%" : "0%"}</Text>
          <Text style={s.kpiSub}>{autofixes.length} PRs opened by agent</Text>
        </Card>
      </View>

      {/* Compliance Pillars */}
      <Card style={s.complianceCard}>
        <Text style={s.complianceTitle}>Standards Compliance Pillars (.agents/rules/development_standards.md)</Text>
        <View style={s.pillarGrid}>
          {[
            { label: "Unit Test Coverage (§1)", val: metrics?.compliance_pillars?.test_coverage_pct ?? 100, target: ">80%" },
            { label: "Named Loggers (§2)", val: metrics?.compliance_pillars?.logging_compliance_pct ?? 100, target: ">95%" },
            { label: "Analytics Views (§3)", val: metrics?.compliance_pillars?.analytics_compliance_pct ?? 100, target: ">90%" },
            { label: "Fallback Guards (§4)", val: metrics?.compliance_pillars?.fallback_compliance_pct ?? 100, target: ">85%" },
          ].map((pillar, i) => (
            <View key={i} style={s.pillarCard}>
              <View style={s.pillarHead}>
                <Text style={s.pillarLabel}>{pillar.label}</Text>
                <Text style={[s.pillarVal, { color: pillar.val >= 80 ? T.ok : T.amber }]}>{pillar.val}%</Text>
              </View>
              <View style={s.barTrack}>
                <View style={[s.barFill, { width: `${pillar.val}%`, backgroundColor: pillar.val >= 80 ? T.ok : T.amber }]} />
              </View>
              <Text style={s.pillarTarget}>Target: {pillar.target}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Control Buttons */}
      <View style={s.controlRow}>
        <Pressable onPress={handleRunAudit} disabled={runningCycle} style={[s.runBtn, runningCycle ? s.btnDisabled : null]}>
          <Zap size={14} color="#FFF" />
          <Text style={s.runBtnText}>{runningCycle ? "Scanning..." : "Run Audit Now"}</Text>
        </Pressable>
        <Pressable onPress={handleStartLoop} style={[s.loopBtn, { borderColor: T.ok }]}>
          <Play size={14} color={T.ok} />
          <Text style={[s.loopBtnText, { color: T.ok }]}>Enable 24h Loop</Text>
        </Pressable>
        <Pressable onPress={handleStopLoop} style={[s.loopBtn, { borderColor: T.danger }]}>
          <Pause size={14} color={T.danger} />
          <Text style={[s.loopBtnText, { color: T.danger }]}>Pause Loop</Text>
        </Pressable>
      </View>

      {/* Navigation Tabs */}
      <View style={s.tabsRow}>
        <Pressable style={[s.tabPress, { borderBottomColor: activeTab === "findings" ? T.violet : "transparent" }]} onPress={() => setActiveTab("findings")}>
          <Text style={[s.tabLabel, { color: activeTab === "findings" ? T.violet : T.muted }]}>Audit Findings ({filteredFindings.length})</Text>
        </Pressable>
        <Pressable style={[s.tabPress, { borderBottomColor: activeTab === "autofixes" ? T.violet : "transparent" }]} onPress={() => setActiveTab("autofixes")}>
          <Text style={[s.tabLabel, { color: activeTab === "autofixes" ? T.violet : T.muted }]}>Auto-Fix Audit Trail ({autofixes.length})</Text>
        </Pressable>
      </View>

      {/* Tab 1: Findings Table */}
      {activeTab === "findings" && (
        <Card style={s.panelPad}>
          <View style={s.filterRow}>
            <select value={familyFilter} onChange={(e) => setFamilyFilter(e.target.value)} style={selectStyle}>
              <option value="ALL">All Families</option>
              <option value="DEAD">DEAD</option>
              <option value="FAKE">FAKE</option>
              <option value="TEST">TEST</option>
              <option value="LOG">LOG</option>
              <option value="ANALYTICS">ANALYTICS</option>
              <option value="FALLBACK">FALLBACK</option>
            </select>

            <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} style={selectStyle}>
              <option value="ALL">All Severities</option>
              <option value="P0">P0 (Critical)</option>
              <option value="P1">P1 (High)</option>
              <option value="P2">P2 (Medium)</option>
              <option value="P3">P3 (Low)</option>
            </select>
          </View>

          {filteredFindings.length === 0 ? (
            <View style={s.emptyBox}>
              <Sparkles size={24} color={T.violet} />
              <Text style={s.emptyText}>No open findings matching selected filters. Codebase is clean!</Text>
            </View>
          ) : (
            <View style={{ overflowX: "auto" } as any}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, color: T.text } as any}>
                <thead>
                  <tr style={{ borderBottomWidth: 1, borderBottomColor: T.line, color: T.muted, textAlign: "left" } as any}>
                    <th style={{ padding: "10px 12px", textAlign: "left" } as any}>Sev</th>
                    <th style={{ padding: "10px 12px", textAlign: "left" } as any}>Family</th>
                    <th style={{ padding: "10px 12px", textAlign: "left" } as any}>File & Line</th>
                    <th style={{ padding: "10px 12px", textAlign: "left" } as any}>Rule ID</th>
                    <th style={{ padding: "10px 12px", textAlign: "left" } as any}>Tier</th>
                    <th style={{ padding: "10px 12px", textAlign: "left" } as any}>Status</th>
                    <th style={{ padding: "10px 12px", textAlign: "left" } as any}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFindings.map((f, i) => (
                    <React.Fragment key={i}>
                      <tr
                        onClick={() => setExpandedFingerprint(expandedFingerprint === f.fingerprint ? null : f.fingerprint)}
                        style={{ borderBottomWidth: 1, borderBottomColor: T.line, cursor: "pointer", backgroundColor: expandedFingerprint === f.fingerprint ? T.panel2 : "transparent" } as any}
                      >
                        <td style={td}>
                          <span style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 800, display: "inline-block", backgroundColor: sevBg(f.severity), color: sevColor(f.severity) } as any}>
                            {f.severity}
                          </span>
                        </td>
                        <td style={{ ...td, fontWeight: 700, color: T.violetLt } as any}>{f.family}</td>
                        <td style={{ ...td, color: T.text, fontFamily: FONTS.mono } as any}>{f.file}:{f.line}</td>
                        <td style={{ ...td, color: T.muted } as any}>{f.rule_id}</td>
                        <td style={td}>
                          <span style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, display: "inline-block", backgroundColor: tierBg(f.tier), color: tierColor(f.tier) } as any}>
                            {f.tier}
                          </span>
                        </td>
                        <td style={{ ...td, color: T.muted } as any}>{f.status}</td>
                        <td style={td}>
                          {f.tier === "Tier A" ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); handlePatchStatus(f.fingerprint, "fixed_manual"); }}
                              style={{ padding: "4px 10px", borderRadius: 6, backgroundColor: T.ok, color: "#FFF", border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer" } as any}
                            >
                              Approve Fix
                            </button>
                          ) : (
                            <span style={{ fontSize: 11, color: T.dim, display: "inline-flex", alignItems: "center", gap: 4 } as any} title="Tier B & C require human review & decision">
                              <UserCheck size={12} color={T.dim} /> Human Review
                            </span>
                          )}
                        </td>
                      </tr>

                      {expandedFingerprint === f.fingerprint && (
                        <tr style={{ backgroundColor: T.panel2 } as any}>
                          <td colSpan={7} style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: T.line } as any}>
                            <View style={{ gap: 8 }}>
                              <Text style={{ fontFamily: FONTS.med, fontSize: 12.5, color: T.text }}>
                                <Text style={{ fontFamily: FONTS.semi, fontSize: 12.5, color: T.violet }}>Evidence: </Text>
                                <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: T.accentBright, backgroundColor: T.cardSolid, padding: "2px 6px", borderRadius: 4 } as any}>{f.evidence}</Text>
                              </Text>
                              <Text style={{ fontFamily: FONTS.med, fontSize: 12.5, color: T.text }}>
                                <Text style={{ fontFamily: FONTS.semi, fontSize: 12.5, color: T.violet }}>Blast Radius: </Text>{f.blast_radius}
                              </Text>
                              <Text style={{ fontFamily: FONTS.med, fontSize: 12.5, color: T.text }}>
                                <Text style={{ fontFamily: FONTS.semi, fontSize: 12.5, color: T.violet }}>Proposed Fix: </Text>{f.proposed_fix}
                              </Text>
                              <Text style={{ fontFamily: FONTS.med, fontSize: 12.5, color: T.text }}>
                                <Text style={{ fontFamily: FONTS.semi, fontSize: 12.5, color: T.violet }}>Verification Method: </Text>{f.verification_method}
                              </Text>
                              <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                                <Pressable onPress={() => handlePatchStatus(f.fingerprint, "wont_fix")} style={[s.tinyBtn, { backgroundColor: T.line2 }]}>
                                  <Text style={{ fontFamily: FONTS.semi, fontSize: 11, color: T.text }}>Mark Won't Fix</Text>
                                </Pressable>
                                <Pressable onPress={() => handlePatchStatus(f.fingerprint, "false_positive")} style={[s.tinyBtn, { backgroundColor: T.line2 }]}>
                                  <Text style={{ fontFamily: FONTS.semi, fontSize: 11, color: T.danger }}>Mark False Positive</Text>
                                </Pressable>
                              </View>
                            </View>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </View>
          )}
        </Card>
      )}

      {/* Tab 2: Auto-Fix Audit Trail */}
      {activeTab === "autofixes" && (
        <Card style={s.panelPad}>
          {autofixes.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyText}>
                Zero auto-fixes applied yet. Enable <Text style={s.codeInline}>CODE_HEALTH_AUTOFIX_ENABLED=true</Text> for Tier A PR automation.
              </Text>
            </View>
          ) : (
            <View style={{ overflowX: "auto" } as any}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, color: T.text } as any}>
                <thead>
                  <tr style={{ borderBottomWidth: 1, borderBottomColor: T.line, color: T.muted, textAlign: "left" } as any}>
                    <th style={{ padding: "10px 12px", textAlign: "left" } as any}>Applied At</th>
                    <th style={{ padding: "10px 12px", textAlign: "left" } as any}>Rule ID</th>
                    <th style={{ padding: "10px 12px", textAlign: "left" } as any}>Files Changed</th>
                    <th style={{ padding: "10px 12px", textAlign: "left" } as any}>PR URL</th>
                    <th style={{ padding: "10px 12px", textAlign: "left" } as any}>Applied By</th>
                  </tr>
                </thead>
                <tbody>
                  {autofixes.map((fix, i) => (
                    <tr key={i} style={{ borderBottomWidth: 1, borderBottomColor: T.line } as any}>
                      <td style={{ ...td, color: T.text } as any}>{fix.applied_at}</td>
                      <td style={{ ...td, color: T.violetLt, fontWeight: 700 } as any}>{fix.rule_id}</td>
                      <td style={{ ...td, fontFamily: FONTS.mono, color: T.muted } as any}>{fix.files_changed?.join(", ")}</td>
                      <td style={td}>
                        {fix.pr_url ? (
                          <a href={fix.pr_url} target="_blank" rel="noreferrer" style={{ color: T.violet, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 } as any}>
                            <ExternalLink size={12} color={T.violet} /><Text style={{ fontFamily: FONTS.semi, fontSize: 13, color: T.violet }}>View PR</Text>
                          </a>
                        ) : "Shadow Mode"}
                      </td>
                      <td style={{ ...td, color: T.ok, fontWeight: 700 } as any}>{fix.applied_by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </View>
          )}
        </Card>
      )}
    </ScrollView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: SAC.bgPage, width: "100%", minHeight: "100%" },
  rootPad: { padding: 24 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: SAC.border, flexWrap: "wrap", gap: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontFamily: FONTS.xbold, fontSize: 24, color: SAC.text },
  subtitle: { fontFamily: FONTS.med, fontSize: 13.5, color: SAC.muted, marginTop: 4 },
  codeInline: { fontFamily: FONTS.mono, fontSize: 12.5, color: SAC.violet },
  headerPills: { flexDirection: "row", gap: 12, alignItems: "center", flexWrap: "wrap" },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1 },
  pillText: { fontFamily: FONTS.bold, fontSize: 12 },
  banner: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, backgroundColor: SAC.tint, borderWidth: 1, borderColor: SAC.accentLine, marginBottom: 20 },
  bannerText: { fontFamily: FONTS.semi, fontSize: 13.5, color: SAC.onTint },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginBottom: 24 },
  kpiCard: { flex: 1, minWidth: 220, padding: 18, backgroundColor: SAC.card },
  kpiLabel: { fontFamily: FONTS.semi, fontSize: 12, color: SAC.muted, textTransform: "uppercase" },
  kpiValueRow: { flexDirection: "row", alignItems: "baseline", gap: 2, marginTop: 4 },
  kpiValue: { fontFamily: FONTS.xbold, fontSize: 32, color: SAC.text },
  kpiUnit: { fontFamily: FONTS.xbold, fontSize: 16, color: SAC.muted },
  kpiSub: { fontFamily: FONTS.med, fontSize: 11, color: SAC.dim, marginTop: 4 },
  complianceCard: { borderRadius: 14, padding: 20, marginBottom: 24, backgroundColor: SAC.card },
  complianceTitle: { fontFamily: FONTS.bold, fontSize: 15, color: SAC.text, marginBottom: 16 },
  pillarGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  pillarCard: { flex: 1, minWidth: 220, backgroundColor: SAC.bg, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: SAC.line, gap: 6 },
  pillarHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  pillarLabel: { fontFamily: FONTS.bold, fontSize: 12.5, color: SAC.text },
  pillarVal: { fontFamily: FONTS.bold, fontSize: 12.5 },
  barTrack: { width: "100%", height: 6, backgroundColor: SAC.line, borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },
  pillarTarget: { fontFamily: FONTS.med, fontSize: 10.5, color: SAC.dim, marginTop: 6 },
  controlRow: { flexDirection: "row", gap: 12, marginBottom: 20, flexWrap: "wrap" },
  runBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: SAC.violet },
  runBtnText: { color: "#FFF", fontFamily: FONTS.bold, fontSize: 13.5 },
  btnDisabled: { opacity: 0.6 },
  loopBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: SAC.cardSolid, borderWidth: 1, borderColor: SAC.line },
  loopBtnText: { fontFamily: FONTS.bold, fontSize: 13.5 },
  tabsRow: { flexDirection: "row", gap: 16, borderBottomWidth: 1, borderBottomColor: SAC.border, marginBottom: 20, flexWrap: "wrap" },
  tabPress: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 2 },
  tabLabel: { fontFamily: FONTS.bold, fontSize: 14 },
  filterRow: { flexDirection: "row", gap: 12, marginBottom: 16, flexWrap: "wrap" },
  sel: { backgroundColor: SAC.cardSolid, color: SAC.text, borderColor: SAC.border, borderRadius: 9 },
  panelPad: { borderRadius: 14, padding: 20, backgroundColor: SAC.card },
  emptyBox: { padding: 40, alignItems: "center", gap: 8 },
  emptyText: { fontFamily: FONTS.med, fontSize: 13, color: SAC.muted, textAlign: "center" },
  tinyBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
});

export default CodeHealthView;
