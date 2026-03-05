import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../../css/AdminDashboard.css";

const API = "http://localhost:5001";
const PAGE_SIZE = 15;

const VTYPE_LABEL = {
  phone_detected:  "Phone Detected",
  book_detected:   "Unauthorized Material",
  multiple_faces:  "Multiple Faces",
  looking_away:    "Looking Away",
  no_face:         "No Face",
  tab_switch:      "Tab Switch",
  fullscreen_exit: "Fullscreen Exit",
  loud_noise:      "Loud Noise",
};
const VTYPE_ICON = {
  phone_detected: "📱", book_detected: "📚", multiple_faces: "👥",
  looking_away: "👀", no_face: "🚫", tab_switch: "🔄",
  fullscreen_exit: "⛶", loud_noise: "🔊",
};

function vtLabel(t) { return VTYPE_LABEL[t] ?? t.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase()); }
function vtIcon(t)  { return VTYPE_ICON[t]  ?? "⚠️"; }

function timeAgo(iso) {
  const d = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (d < 60)   return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d/60)}m ago`;
  return `${Math.floor(d/3600)}h ago`;
}

// ── Snapshot modal ──────────────────────────────────────────────────────────
function SnapshotModal({ log, onClose }) {
  if (!log) return null;
  return (
    <div className="vp-modal-overlay" onClick={onClose}>
      <div className="vp-modal" onClick={e => e.stopPropagation()}>
        <div className="vp-modal-head">
          <div>
            <div className="vp-modal-eyebrow">Violation Snapshot</div>
            <div className="vp-modal-title">{vtIcon(log.violation_type)} {vtLabel(log.violation_type)}</div>
            <div className="vp-modal-sub">{log.student} · {new Date(log.timestamp).toLocaleString()}</div>
          </div>
          <button className="vp-modal-close" onClick={onClose}>✕</button>
        </div>

        {log.snapshot
          ? <img className="vp-modal-img" src={`data:image/jpeg;base64,${log.snapshot}`} alt="violation frame" />
          : <div className="vp-modal-no-snap">No snapshot captured for this violation</div>
        }

        {log.detail && <div className="vp-modal-detail">{log.detail}</div>}
      </div>
    </div>
  );
}

// ── Violation frequency chart ───────────────────────────────────────────────
function ViolationChart({ summary }) {
  const byType = {};
  summary.forEach(r => { byType[r.violation_type] = (byType[r.violation_type] || 0) + r.count; });
  const entries = Object.entries(byType).sort((a,b) => b[1]-a[1]).slice(0,8);
  const max = entries[0]?.[1] || 1;

  if (!entries.length) return <div className="vp-chart-empty">No violations recorded yet</div>;

  return entries.map(([type, count]) => (
    <div key={type} className="vp-chart-row">
      <span className="vp-chart-emoji">{vtIcon(type)}</span>
      <span className="vp-chart-type">{vtLabel(type)}</span>
      <div className="vp-chart-track">
        <div
          className={`vp-chart-fill ${count > 3 ? "vp-chart-fill--high" : count > 1 ? "vp-chart-fill--mid" : "vp-chart-fill--low"}`}
          style={{ width: `${(count / max) * 100}%` }}
        />
      </div>
      <span className="vp-chart-num">{count}</span>
    </div>
  ));
}

// ── Violations panel ────────────────────────────────────────────────────────
function ViolationsPanel({ token }) {
  const [logs, setLogs]       = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [sevFilter, setSevFilter]   = useState("all");
  const [snapshot, setSnapshot]     = useState(null);
  const [page, setPage]             = useState(0);

  const fetchViolations = useCallback(async () => {
    try {
      setLoading(true);
      const typeQ = typeFilter !== "all" ? `&type=${typeFilter}` : "";
      const [logsRes, sumRes] = await Promise.all([
        fetch(`${API}/api/admin/violations?include_snapshot=1${typeQ}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/admin/violations/summary`,                    { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (logsRes.ok) setLogs(await logsRes.json());
      if (sumRes.ok)  setSummary(await sumRes.json());
    } catch (_) {}
    finally { setLoading(false); }
  }, [token, typeFilter]);

  useEffect(() => { fetchViolations(); }, [fetchViolations]);
  useEffect(() => { const t = setInterval(fetchViolations, 10000); return () => clearInterval(t); }, [fetchViolations]);

  const visible    = logs.filter(l => sevFilter === "all" || l.severity === sevFilter);
  const pageData   = visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(visible.length / PAGE_SIZE);

  const totalCritical = logs.filter(l => l.severity === "critical").length;
  const totalMajor    = logs.filter(l => l.severity === "major").length;
  const totalMinor    = logs.filter(l => l.severity === "minor").length;

  const SEV_CARDS = [
    { key: "critical", label: "Critical Violations", count: totalCritical, cls: "vp-sev-card--critical" },
    { key: "major",    label: "Major Violations",    count: totalMajor,    cls: "vp-sev-card--major"    },
    { key: "minor",    label: "Minor Violations",    count: totalMinor,    cls: "vp-sev-card--minor"    },
  ];

  return (
    <div className="violations-panel">

      {/* Snapshot modal */}
      <SnapshotModal log={snapshot} onClose={() => setSnapshot(null)} />

      {/* ── Severity summary strip ── */}
      <div className="vp-summary-strip">
        {SEV_CARDS.map(s => (
          <div
            key={s.key}
            className={`vp-sev-card ${s.cls} ${sevFilter === s.key ? "vp-sev-active" : ""}`}
            onClick={() => { setSevFilter(sevFilter === s.key ? "all" : s.key); setPage(0); }}
          >
            <div className="vp-sev-count">{s.count}</div>
            <div className="vp-sev-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Chart + filter row ── */}
      <div className="vp-body">
        {/* Bar chart */}
        <div className="vp-chart-card">
          <div className="vp-card-label">Violation Frequency</div>
          <ViolationChart summary={summary} />
        </div>

        {/* Type filter sidebar */}
        <div className="vp-filter-card">
          <div className="vp-card-label" style={{ padding: "0 4px 6px" }}>Filter by Type</div>

          {["all", ...Object.keys(VTYPE_LABEL)].map(t => (
            <button
              key={t}
              className={`vp-filter-btn ${typeFilter === t ? "active" : ""}`}
              onClick={() => { setTypeFilter(t); setPage(0); }}
            >
              {t === "all" ? "All Types" : `${vtIcon(t)} ${vtLabel(t)}`}
            </button>
          ))}

          {sevFilter !== "all" && (
            <button className="vp-filter-clear" onClick={() => setSevFilter("all")}>
              Clear severity filter ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Log table ── */}
      <div className="vp-log-card">
        <div className="vp-log-header">
          <span>
            <span className="vp-log-title">Violation Log</span>
            <span className="vp-log-count">{visible.length} records</span>
          </span>
          <button className="vp-refresh-btn" onClick={fetchViolations} disabled={loading}>
            {loading ? "⟳ Loading…" : "⟳ Refresh"}
          </button>
        </div>

        {loading ? (
          <div className="vp-loading">
            <div className="vp-loading-spinner" />
            Loading violations…
          </div>
        ) : pageData.length === 0 ? (
          <div className="vp-empty">
            <div className="vp-empty-icon">✅</div>
            <div className="vp-empty-text">No violations found</div>
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className="vp-col-headers">
              <span>#</span>
              <span>Student</span>
              <span>Type</span>
              <span>Detail</span>
              <span>Severity</span>
              <span>Time</span>
              <span>Snap</span>
            </div>

            {/* Rows */}
            {pageData.map((log, i) => (
              <div key={log.id} className={`vp-row ${i % 2 === 0 ? "vp-row--even" : "vp-row--odd"}`}>

                <span className="vp-cell-id">#{log.session_id}</span>

                <div className="vp-cell-student">
                  <div className="vp-avatar">{(log.student || "?")[0].toUpperCase()}</div>
                  <span className="vp-student-name">{log.student}</span>
                </div>

                <span className="vp-cell-type">{vtIcon(log.violation_type)} {vtLabel(log.violation_type)}</span>

                <span className="vp-cell-detail" title={log.detail}>{log.detail || "—"}</span>

                <span className={`vp-sev-badge vp-sev-badge--${log.severity}`}>
                  {log.severity}
                </span>

                <span className="vp-cell-time">{timeAgo(log.timestamp)}</span>

                {log.snapshot
                  ? (
                    <button className="vp-snap-btn" onClick={() => setSnapshot(log)} title="View snapshot">
                      <img src={`data:image/jpeg;base64,${log.snapshot}`} alt="snap" />
                    </button>
                  )
                  : <span className="vp-snap-none">—</span>
                }
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="vp-pagination">
                <button className="vp-page-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  ← Prev
                </button>
                <span className="vp-page-info">{page + 1} / {totalPages}</span>
                <button className="vp-page-btn" disabled={page === totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Main AdminDashboard ─────────────────────────────────────────────────────
function AdminDashboard() {
  const navigate = useNavigate();
  const token    = localStorage.getItem("token");

  const [animate, setAnimate]               = useState(false);
  const [activeTab, setActiveTab]           = useState("overview");
  const [activeExams, setActiveExams]       = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [stats, setStats]                   = useState({ totalExams:0, activeSessions:0, avgWarnings:0, totalViolations:0 });
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState("");

  useEffect(() => { setAnimate(true); fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    if (!token) { setError("Authentication required"); setLoading(false); return; }
    setLoading(true); setError("");
    try {
      const [examsRes, sessionsRes, sumRes] = await Promise.all([
        fetch(`${API}/api/admin/exams`,              { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/admin/sessions/active`,    { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/admin/violations/summary`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const examsData    = examsRes.ok    ? await examsRes.json()    : [];
      const sessionsData = sessionsRes.ok ? await sessionsRes.json() : [];
      const sumData      = sumRes.ok      ? await sumRes.json()      : [];

      setActiveExams(Array.isArray(examsData)    ? examsData    : []);
      setActiveSessions(Array.isArray(sessionsData) ? sessionsData : []);

      const totalViolations = Array.isArray(sumData) ? sumData.reduce((s,r) => s + r.count, 0) : 0;
      const avgW = sessionsData.length > 0
        ? (sessionsData.reduce((s,x) => s + (x.warnings || 0), 0) / sessionsData.length).toFixed(1) : "0";

      setStats({
        totalExams:     Array.isArray(examsData) ? examsData.length : 0,
        activeSessions: Array.isArray(sessionsData) ? sessionsData.length : 0,
        avgWarnings:    avgW,
        totalViolations,
      });
    } catch (e) {
      setError(e.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateSession = async (sessionId) => {
    if (!window.confirm("Terminate this session?")) return;
    try {
      const r = await fetch(`${API}/api/admin/sessions/${sessionId}/terminate`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (r.ok) fetchDashboardData();
      else alert("Failed to terminate session");
    } catch { alert("Network error"); }
  };

  const handleLogout = () => {
    if (window.confirm("Log out?")) {
      localStorage.removeItem("token"); localStorage.removeItem("session_id");
      navigate("/login");
    }
  };

  return (
    <div className={`admin-dashboard ${animate ? "admin-enter" : ""}`}>

      {/* ── Header ── */}
      <div className="admin-header">
        <div className="header-top">
          <div className="brand-section">
            <div className="brand-logo-admin">
              <div className="logo-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span className="brand-name">EduShield Admin</span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>Logout</span>
          </button>
        </div>

        <div className="header-content">
          <div className="admin-badge">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>Administrator</span>
          </div>
          <h1 className="admin-title">Admin Dashboard</h1>
          <p className="admin-subtitle">Manage exams, monitor sessions, and review violations</p>
          <div className="title-decoration"></div>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="error-banner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>{error}</span>
          <button onClick={fetchDashboardData}>Retry</button>
        </div>
      )}

      <div className="admin-content">

        {/* ── Stats ── */}
        <div className="stats-grid">
          {[
            { cls:"total-exams",     label:"Total Exams",       val:stats.totalExams,      delay:"0.1s",
              icon:<><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></> },
            { cls:"active-sessions", label:"Active Sessions",   val:stats.activeSessions,  delay:"0.2s",
              icon:<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></> },
            { cls:"avg-warnings",    label:"Total Violations",  val:stats.totalViolations, delay:"0.3s",
              icon:<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></> },
            { cls:"total-students",  label:"Avg Warnings",      val:stats.avgWarnings,     delay:"0.4s",
              icon:<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></> },
          ].map(s => (
            <div key={s.label} className={`stat-card ${s.cls}`} style={{ animationDelay: s.delay }}>
              <div className="stat-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{s.icon}</svg>
              </div>
              <div className="stat-info">
                <div className="stat-value">{loading ? "…" : s.val}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tab bar ── */}
        <div className="admin-tab-bar">
          {[
            { id:"overview",   label:"Overview"        },
            { id:"violations", label:"🚨 Violations"   },
            { id:"sessions",   label:"Active Sessions" },
          ].map(t => (
            <button
              key={t.id}
              className={`admin-tab-btn ${activeTab === t.id ? "active" : ""}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === "overview" && (
          <>
            <div className="quick-actions slide-up" style={{ animationDelay:"0.5s" }}>
              <h2 className="section-title">Quick Actions</h2>
              <div className="actions-grid">
                {[
                  { label:"Create Exam",      path:"/admin/exams/create", cls:"create",
                    icon:<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></> },
                  { label:"Manage Exams",     path:"/admin/exams",        cls:"manage",
                    icon:<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></> },
                  { label:"Monitor Sessions", path:"/admin/sessions",     cls:"monitor",
                    icon:<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></> },
                  { label:"View Results",     path:"/admin/results",      cls:"results",
                    icon:<><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></> },
                ].map(a => (
                  <button key={a.label} className={`action-card ${a.cls}`} onClick={() => navigate(a.path)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{a.icon}</svg>
                    <span>{a.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="recent-exams-section slide-up" style={{ animationDelay:"0.6s" }}>
              <div className="section-header">
                <h2 className="section-title">Recent Exams</h2>
                <button className="view-all-btn" onClick={() => navigate("/admin/exams")}>
                  View All
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </button>
              </div>

              {loading ? (
                <div className="loading-state"><div className="loading-spinner"/><p>Loading exams…</p></div>
              ) : activeExams.length > 0 ? (
                <div className="exams-grid">
                  {activeExams.slice(0,4).map((exam, i) => (
                    <div key={exam.id} className="exam-card" style={{ animationDelay:`${0.7+i*0.1}s` }}
                      onClick={() => navigate(`/admin/exams/${exam.id}`)}>
                      <h3>{exam.title}</h3>
                      <div className="exam-meta">
                        <div className="meta-item">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                          </svg>
                          <span>{exam.duration} mins</span>
                        </div>
                        <div className="meta-item">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                          </svg>
                          <span>{exam.total_marks} marks</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  </svg>
                  <h3>No Exams Found</h3>
                  <p>Create your first exam to get started</p>
                  <button className="create-exam-btn" onClick={() => navigate("/admin/exams/create")}>
                    Create Exam
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── VIOLATIONS TAB ── */}
        {activeTab === "violations" && (
          <div className="slide-up">
            <ViolationsPanel token={token} />
          </div>
        )}

        {/* ── SESSIONS TAB ── */}
        {activeTab === "sessions" && (
          <div className="active-sessions-section slide-up">
            <div className="section-header">
              <h2 className="section-title">Active Sessions</h2>
              <button className="refresh-btn" onClick={fetchDashboardData} disabled={loading}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
                {loading ? "Loading…" : "Refresh"}
              </button>
            </div>

            {loading ? (
              <div className="loading-state"><div className="loading-spinner"/><p>Loading sessions…</p></div>
            ) : activeSessions.length > 0 ? (
              <div className="sessions-table">
                <table>
                  <thead>
                    <tr>
                      <th>Session ID</th><th>Student</th><th>Warnings</th>
                      <th>Started At</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSessions.map(s => (
                      <tr key={s.session_id}>
                        <td>#{s.session_id}</td>
                        <td>
                          <div className="student-info">
                            <div className="student-avatar">{s.student.charAt(0).toUpperCase()}</div>
                            {s.student}
                          </div>
                        </td>
                        <td>
                          <span className={`warning-badge ${s.warnings > 2 ? "high" : "normal"}`}>
                            {s.warnings}
                          </span>
                        </td>
                        <td>{new Date(s.started_at).toLocaleString()}</td>
                        <td>
                          <div style={{ display:"flex", gap:8 }}>
                            <button className="terminate-btn" onClick={() => handleTerminateSession(s.session_id)}>
                              Terminate
                            </button>
                            <button className="vp-view-btn" onClick={() => setActiveTab("violations")}>
                              View Violations
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <h3>No Active Sessions</h3>
                <p>There are currently no students taking exams</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default AdminDashboard;