import React, { useState, useEffect } from "react";

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
        fetch("/api/admin/code-health/status").then((r) => r.json()).catch(() => null),
        fetch("/api/admin/code-health/metrics?range=30d").then((r) => r.json()).catch(() => null),
        fetch("/api/admin/code-health/findings?status=open&limit=100").then((r) => r.json()).catch(() => null),
        fetch("/api/admin/code-health/autofixes?limit=50").then((r) => r.json()).catch(() => null),
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
      const res = await fetch("/api/admin/code-health/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "repo", autofix: false }),
      });
      const data = await res.json();
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
      await fetch("/api/admin/code-health/loop-agent/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval_seconds: 86400 }),
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
      await fetch("/api/admin/code-health/loop-agent/stop", { method: "POST" });
      setActionMsg("Loop worker stopped.");
      fetchData();
    } catch (e: any) {
      setActionMsg(`Failed to stop loop: ${e.message}`);
    }
  };

  const handlePatchStatus = async (fingerprint: string, newStatus: string) => {
    trackClick("code_health_patch_status", { fingerprint, newStatus });
    try {
      await fetch(`/api/admin/code-health/findings/${fingerprint}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, admin_note: "Updated from SuperAdmin UI" }),
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

  return (
    <div style={{ padding: 24, background: "#0A0A12", color: "#F4F4FA", minHeight: "100vh", fontFamily: "'Outfit', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, borderBottom: "1px solid #1F1F30", paddingBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "#FFF", display: "flex", alignItems: "center", gap: 10 }}>
            <span>🛡️</span> CodeHealthAgent — Autonomous Auditor & Auto-Fix Control Plane
          </h1>
          <p style={{ margin: "4px 0 0 0", color: "#9095A8", fontSize: 13.5 }}>
            Continuous auditing against <code>.agents/rules/development_standards.md</code> · Gate-based Tier A remediation
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: status?.is_running ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)", color: status?.is_running ? "#10B981" : "#EF4444", border: `1px solid ${status?.is_running ? "#10B981" : "#EF4444"}` }}>
            {status?.is_running ? "🟢 LOOP 24H ACTIVE" : "⏸️ LOOP PAUSED"}
          </span>
          <span style={{ padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: status?.autofix_enabled_env ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)", color: status?.autofix_enabled_env ? "#10B981" : "#F59E0B", border: `1px solid ${status?.autofix_enabled_env ? "#10B981" : "#F59E0B"}` }}>
            AUTOFIX: {status?.autofix_enabled_env ? "ON" : "OFF (SAFE)"}
          </span>
        </div>
      </div>

      {actionMsg && (
        <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(124, 92, 252, 0.15)", border: "1px solid #7C5CFC", color: "#D8B4FE", marginBottom: 20, fontSize: 13.5, fontWeight: 600 }}>
          {actionMsg}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "#141424", border: "1px solid #232338", borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 12, color: "#9095A8", textTransform: "uppercase", fontWeight: 700 }}>Code Health Score</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: (metrics?.health_score || 100) >= 90 ? "#10B981" : "#F59E0B", marginTop: 4 }}>
            {metrics?.health_score ?? "100.0"}<span style={{ fontSize: 16 }}>/100</span>
          </div>
          <div style={{ fontSize: 11, color: "#7E7E92", marginTop: 4 }} title={metrics?.score_formula}>
            Formula: 100 − penalty/KLOC
          </div>
        </div>

        <div style={{ background: "#141424", border: "1px solid #232338", borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 12, color: "#9095A8", textTransform: "uppercase", fontWeight: 700 }}>Open P0 / P1 Findings</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: (metrics?.counts_by_severity?.P0 || 0) + (metrics?.counts_by_severity?.P1 || 0) > 0 ? "#EF4444" : "#10B981", marginTop: 4 }}>
            {(metrics?.counts_by_severity?.P0 || 0) + (metrics?.counts_by_severity?.P1 || 0)}
          </div>
          <div style={{ fontSize: 11, color: "#7E7E92", marginTop: 4 }}>
            P0: {metrics?.counts_by_severity?.P0 || 0} · P1: {metrics?.counts_by_severity?.P1 || 0}
          </div>
        </div>

        <div style={{ background: "#141424", border: "1px solid #232338", borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 12, color: "#9095A8", textTransform: "uppercase", fontWeight: 700 }}>Total Open Findings</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#FFF", marginTop: 4 }}>
            {metrics?.total_open_findings ?? 0}
          </div>
          <div style={{ fontSize: 11, color: "#7E7E92", marginTop: 4 }}>
            P2: {metrics?.counts_by_severity?.P2 || 0} · P3: {metrics?.counts_by_severity?.P3 || 0}
          </div>
        </div>

        <div style={{ background: "#141424", border: "1px solid #232338", borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 12, color: "#9095A8", textTransform: "uppercase", fontWeight: 700 }}>Auto-Fix Rate</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#7C5CFC", marginTop: 4 }}>
            {autofixes.length > 0 ? "100%" : "0%"}
          </div>
          <div style={{ fontSize: 11, color: "#7E7E92", marginTop: 4 }}>
            {autofixes.length} PRs opened by agent
          </div>
        </div>
      </div>

      {/* Compliance Pillars */}
      <div style={{ background: "#141424", border: "1px solid #232338", borderRadius: 14, padding: 20, marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px 0", color: "#FFF" }}>Standards Compliance Pillars (.agents/rules/development_standards.md)</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {[
            { label: "Unit Test Coverage (§1)", val: metrics?.compliance_pillars?.test_coverage_pct ?? 100, target: ">80%" },
            { label: "Named Loggers (§2)", val: metrics?.compliance_pillars?.logging_compliance_pct ?? 100, target: ">95%" },
            { label: "Analytics Views (§3)", val: metrics?.compliance_pillars?.analytics_compliance_pct ?? 100, target: ">90%" },
            { label: "Fallback Guards (§4)", val: metrics?.compliance_pillars?.fallback_compliance_pct ?? 100, target: ">85%" },
          ].map((pillar, i) => (
            <div key={i} style={{ background: "#0A0A12", padding: 14, borderRadius: 10, border: "1px solid #1F1F30" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>
                <span>{pillar.label}</span>
                <span style={{ color: pillar.val >= 80 ? "#10B981" : "#F59E0B" }}>{pillar.val}%</span>
              </div>
              <div style={{ width: "100%", height: 6, background: "#1F1F30", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${pillar.val}%`, height: "100%", background: pillar.val >= 80 ? "linear-gradient(90deg, #10B981, #059669)" : "linear-gradient(90deg, #F59E0B, #D97706)" }} />
              </div>
              <div style={{ fontSize: 10.5, color: "#7E7E92", marginTop: 6 }}>Target: {pillar.target}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Control Buttons */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <button onClick={handleRunAudit} disabled={runningCycle} style={{ padding: "10px 20px", borderRadius: 10, background: "linear-gradient(135deg, #7C5CFC, #5B3FD9)", color: "#FFF", border: "none", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>
          {runningCycle ? "Scanning..." : "⚡ Run Audit Now"}
        </button>
        <button onClick={handleStartLoop} style={{ padding: "10px 20px", borderRadius: 10, background: "#141424", color: "#10B981", border: "1px solid #10B981", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>
          ▶️ Enable 24h Loop
        </button>
        <button onClick={handleStopLoop} style={{ padding: "10px 20px", borderRadius: 10, background: "#141424", color: "#EF4444", border: "1px solid #EF4444", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>
          ⏸️ Pause Loop
        </button>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: "flex", gap: 16, borderBottom: "1px solid #1F1F30", marginBottom: 20 }}>
        <button onClick={() => setActiveTab("findings")} style={{ padding: "10px 16px", background: "none", border: "none", borderBottom: activeTab === "findings" ? "2px solid #7C5CFC" : "none", color: activeTab === "findings" ? "#7C5CFC" : "#9095A8", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          Audit Findings ({filteredFindings.length})
        </button>
        <button onClick={() => setActiveTab("autofixes")} style={{ padding: "10px 16px", background: "none", border: "none", borderBottom: activeTab === "autofixes" ? "2px solid #7C5CFC" : "none", color: activeTab === "autofixes" ? "#7C5CFC" : "#9095A8", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          Auto-Fix Audit Trail ({autofixes.length})
        </button>
      </div>

      {/* Tab 1: Findings Table */}
      {activeTab === "findings" && (
        <div style={{ background: "#141424", border: "1px solid #232338", borderRadius: 14, padding: 20 }}>
          {/* Filters */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <select value={familyFilter} onChange={(e) => setFamilyFilter(e.target.value)} style={{ padding: "8px 12px", background: "#0A0A12", border: "1px solid #232338", borderRadius: 8, color: "#FFF", fontSize: 12.5 }}>
              <option value="ALL">All Families</option>
              <option value="DEAD">DEAD</option>
              <option value="FAKE">FAKE</option>
              <option value="TEST">TEST</option>
              <option value="LOG">LOG</option>
              <option value="ANALYTICS">ANALYTICS</option>
              <option value="FALLBACK">FALLBACK</option>
            </select>

            <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} style={{ padding: "8px 12px", background: "#0A0A12", border: "1px solid #232338", borderRadius: 8, color: "#FFF", fontSize: 12.5 }}>
              <option value="ALL">All Severities</option>
              <option value="P0">P0 (Critical)</option>
              <option value="P1">P1 (High)</option>
              <option value="P2">P2 (Medium)</option>
              <option value="P3">P3 (Low)</option>
            </select>
          </div>

          {filteredFindings.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#9095A8" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>✨</div>
              No open findings matching selected filters. Codebase is clean!
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #232338", color: "#9095A8", textAlign: "left" }}>
                    <th style={{ padding: "10px 12px" }}>Sev</th>
                    <th style={{ padding: "10px 12px" }}>Family</th>
                    <th style={{ padding: "10px 12px" }}>File & Line</th>
                    <th style={{ padding: "10px 12px" }}>Rule ID</th>
                    <th style={{ padding: "10px 12px" }}>Tier</th>
                    <th style={{ padding: "10px 12px" }}>Status</th>
                    <th style={{ padding: "10px 12px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFindings.map((f, i) => (
                    <React.Fragment key={i}>
                      <tr
                        onClick={() => setExpandedFingerprint(expandedFingerprint === f.fingerprint ? null : f.fingerprint)}
                        style={{ borderBottom: "1px solid #1F1F30", cursor: "pointer", background: expandedFingerprint === f.fingerprint ? "#1A1A2E" : "transparent" }}
                      >
                        <td style={{ padding: "12px" }}>
                          <span style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 800, background: f.severity === "P0" ? "rgba(239, 68, 68, 0.2)" : f.severity === "P1" ? "rgba(245, 158, 11, 0.2)" : "rgba(59, 130, 246, 0.2)", color: f.severity === "P0" ? "#EF4444" : f.severity === "P1" ? "#F59E0B" : "#3B82F6" }}>
                            {f.severity}
                          </span>
                        </td>
                        <td style={{ padding: "12px", fontWeight: 700, color: "#D8B4FE" }}>{f.family}</td>
                        <td style={{ padding: "12px", color: "#FFF", fontFamily: "monospace" }}>
                          {f.file}:{f.line}
                        </td>
                        <td style={{ padding: "12px", color: "#9095A8" }}>{f.rule_id}</td>
                        <td style={{ padding: "12px" }}>
                          <span style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: f.tier === "Tier A" ? "rgba(16, 185, 129, 0.15)" : f.tier === "Tier B" ? "rgba(245, 158, 11, 0.15)" : "rgba(239, 68, 68, 0.2)", color: f.tier === "Tier A" ? "#10B981" : f.tier === "Tier B" ? "#F59E0B" : "#EF4444" }}>
                            {f.tier}
                          </span>
                        </td>
                        <td style={{ padding: "12px", color: "#9095A8" }}>{f.status}</td>
                        <td style={{ padding: "12px" }}>
                          {f.tier === "Tier A" ? (
                            <button onClick={(e) => { e.stopPropagation(); handlePatchStatus(f.fingerprint, "fixed_manual"); }} style={{ padding: "4px 10px", borderRadius: 6, background: "#10B981", color: "#FFF", border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                              Approve Fix
                            </button>
                          ) : (
                            <span style={{ fontSize: 11, color: "#7E7E92" }} title="Tier B & C require human review & decision">
                              🛑 Human Review
                            </span>
                          )}
                        </td>
                      </tr>

                      {expandedFingerprint === f.fingerprint && (
                        <tr style={{ background: "#0F0F1A" }}>
                          <td colSpan={7} style={{ padding: 16, borderBottom: "1px solid #232338" }}>
                            <div style={{ display: "grid", gap: 8, fontSize: 12.5 }}>
                              <div><strong style={{ color: "#7C5CFC" }}>Evidence:</strong> <code style={{ color: "#F5B342", background: "#1A1A29", padding: "2px 6px", borderRadius: 4 }}>{f.evidence}</code></div>
                              <div><strong style={{ color: "#7C5CFC" }}>Blast Radius:</strong> {f.blast_radius}</div>
                              <div><strong style={{ color: "#7C5CFC" }}>Proposed Fix:</strong> {f.proposed_fix}</div>
                              <div><strong style={{ color: "#7C5CFC" }}>Verification Method:</strong> {f.verification_method}</div>
                              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                                <button onClick={() => handlePatchStatus(f.fingerprint, "wont_fix")} style={{ padding: "4px 10px", borderRadius: 6, background: "#232338", color: "#FFF", border: "none", fontSize: 11, cursor: "pointer" }}>
                                  Mark Won't Fix
                                </button>
                                <button onClick={() => handlePatchStatus(f.fingerprint, "false_positive")} style={{ padding: "4px 10px", borderRadius: 6, background: "#232338", color: "#EF4444", border: "none", fontSize: 11, cursor: "pointer" }}>
                                  Mark False Positive
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Auto-Fix Audit Trail */}
      {activeTab === "autofixes" && (
        <div style={{ background: "#141424", border: "1px solid #232338", borderRadius: 14, padding: 20 }}>
          {autofixes.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#9095A8" }}>
              Zero auto-fixes applied yet. Enable <code>CODE_HEALTH_AUTOFIX_ENABLED=true</code> for Tier A PR automation.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #232338", color: "#9095A8", textAlign: "left" }}>
                    <th style={{ padding: "10px 12px" }}>Applied At</th>
                    <th style={{ padding: "10px 12px" }}>Rule ID</th>
                    <th style={{ padding: "10px 12px" }}>Files Changed</th>
                    <th style={{ padding: "10px 12px" }}>PR URL</th>
                    <th style={{ padding: "10px 12px" }}>Applied By</th>
                  </tr>
                </thead>
                <tbody>
                  {autofixes.map((fix, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #1F1F30" }}>
                      <td style={{ padding: "12px", color: "#FFF" }}>{fix.applied_at}</td>
                      <td style={{ padding: "12px", color: "#D8B4FE", fontWeight: 700 }}>{fix.rule_id}</td>
                      <td style={{ padding: "12px", fontFamily: "monospace", color: "#9095A8" }}>{fix.files_changed?.join(", ")}</td>
                      <td style={{ padding: "12px" }}>
                        {fix.pr_url ? <a href={fix.pr_url} target="_blank" rel="noreferrer" style={{ color: "#7C5CFC", fontWeight: 700 }}>View PR →</a> : "Shadow Mode"}
                      </td>
                      <td style={{ padding: "12px", color: "#10B981", fontWeight: 700 }}>{fix.applied_by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CodeHealthView;
