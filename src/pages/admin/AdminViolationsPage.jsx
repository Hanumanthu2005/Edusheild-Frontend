import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../css/AdminViolationsPage.css";

const API_BASE = "http://localhost:5001";
function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("token") || ""}` };
}

// ── Violation metadata ────────────────────────────────────────────────────────
const VIOLATION_META = {
  phone_detected:  { label: "Phone Detected",            severity: "critical", color: "#ef4444", bg: "rgba(239,68,68,0.1)"   },
  book_detected:   { label: "Unauthorized Material",     severity: "major",    color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
  multiple_faces:  { label: "Multiple Persons",          severity: "critical", color: "#ef4444", bg: "rgba(239,68,68,0.1)"   },
  looking_away:    { label: "Looking Away",              severity: "major",    color: "#f97316", bg: "rgba(249,115,22,0.1)"  },
  no_face:         { label: "No Face Detected",          severity: "major",    color: "#f97316", bg: "rgba(249,115,22,0.1)"  },
  tab_switch:      { label: "Tab Switch",                severity: "critical", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)"  },
  fullscreen_exit: { label: "Fullscreen Exit",           severity: "major",    color: "#3b82f6", bg: "rgba(59,130,246,0.1)"  },
  loud_noise:      { label: "Loud Noise",                severity: "minor",    color: "#10b981", bg: "rgba(16,185,129,0.1)"  },
};

function getMeta(type) {
  return VIOLATION_META[type] || {
    label: type.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase()),
    severity: "minor", color: "#64748b", bg: "rgba(100,116,139,0.1)",
  };
}

function fmtTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
function fmtDateTime(iso) { return `${fmtDate(iso)} ${fmtTime(iso)}`; }

// ── Icons ─────────────────────────────────────────────────────────────────────
function ViolationIcon({ type, size = 18 }) {
  const s = size;
  switch (type) {
    case "no_face":       return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/><line x1="2" y1="2" x2="22" y2="22" strokeWidth="2.5"/></svg>;
    case "multiple_faces":return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case "phone_detected":return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>;
    case "looking_away":  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><line x1="2" y1="2" x2="22" y2="22" strokeWidth="2.5"/></svg>;
    case "tab_switch":    return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>;
    case "loud_noise":    return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>;
    case "fullscreen_exit":return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>;
    case "book_detected": return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>;
    default:              return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
  }
}

// ── Severity badge ────────────────────────────────────────────────────────────
function SeverityBadge({ severity }) {
  const map = {
    critical: { label: "Critical", cls: "sev-critical" },
    major:    { label: "Major",    cls: "sev-major"    },
    minor:    { label: "Minor",    cls: "sev-minor"    },
  };
  const s = map[severity] || map.minor;
  return <span className={`avp-severity-badge ${s.cls}`}>{s.label}</span>;
}

// ── Stat mini card ────────────────────────────────────────────────────────────
function MiniStat({ label, value, sub, color, icon, delay }) {
  return (
    <div className="avp-mini-stat" style={{ animationDelay: `${delay}s` }}>
      <div className="avp-mini-stat-icon" style={{ background: color }}>{icon}</div>
      <div className="avp-mini-stat-body">
        <span className="avp-mini-stat-value">{value}</span>
        <span className="avp-mini-stat-label">{label}</span>
        {sub && <span className="avp-mini-stat-sub">{sub}</span>}
      </div>
    </div>
  );
}

// ── Timeline event ────────────────────────────────────────────────────────────
function TimelineEvent({ log, isLast, onSnapshot }) {
  const meta = getMeta(log.violation_type);
  return (
    <div className="avp-tl-row">
      <div className="avp-tl-left">
        <span className="avp-tl-time">{fmtTime(log.timestamp)}</span>
      </div>
      <div className="avp-tl-line-col">
        <div className="avp-tl-dot" style={{ background: meta.color, boxShadow: `0 0 0 4px ${meta.bg}` }}>
          <ViolationIcon type={log.violation_type} size={12} />
        </div>
        {!isLast && <div className="avp-tl-connector" />}
      </div>
      <div className="avp-tl-card" style={{ borderLeftColor: meta.color }}>
        <div className="avp-tl-card-header">
          <div className="avp-tl-type-icon" style={{ background: meta.bg, color: meta.color }}>
            <ViolationIcon type={log.violation_type} size={14} />
          </div>
          <span className="avp-tl-type-label" style={{ color: meta.color }}>{meta.label}</span>
          <SeverityBadge severity={log.severity} />
          {log.snapshot_b64 && (
            <button className="avp-snapshot-btn" onClick={() => onSnapshot(log)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              Snapshot
            </button>
          )}
        </div>
        {log.detail && <p className="avp-tl-detail">{log.detail}</p>}
        <span className="avp-tl-full-time">{fmtDateTime(log.timestamp)}</span>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function AdminViolationsPage() {
  const navigate  = useNavigate();
  const location  = useLocation();

  const params    = new URLSearchParams(location.search);
  const studentId = params.get("student");

  const [pageReady,   setPageReady]   = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");

  const [student,     setStudent]     = useState(null);
  const [violations,  setViolations]  = useState([]);
  const [sessions,    setSessions]    = useState([]);

  // filters
  const [typeFilter,  setTypeFilter]  = useState("all");
  const [sevFilter,   setSevFilter]   = useState("all");
  const [sessFilter,  setSessFilter]  = useState("all");
  const [search,      setSearch]      = useState("");
  const [viewMode,    setViewMode]    = useState("timeline"); // timeline | table

  // snapshot lightbox
  const [lightbox,    setLightbox]    = useState(null);

  useEffect(() => {
    setTimeout(() => setPageReady(true), 50);
    if (studentId) loadData();
    else setError("No student ID provided.");
  }, [studentId]);

  const loadData = async () => {
    setLoading(true); setError("");
    try {
      const [vRes, sRes, uRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/students/${studentId}/violations`, { headers: authHeaders() }),
        fetch(`${API_BASE}/api/admin/students/${studentId}/sessions`,   { headers: authHeaders() }),
        fetch(`${API_BASE}/api/admin/students/${studentId}/profile`,    { headers: authHeaders() }),
      ]);
      if (!vRes.ok) throw new Error("Failed to load violations");
      const vData = await vRes.json();
      const sData = sRes.ok ? await sRes.json() : [];
      const uData = uRes.ok ? await uRes.json() : null;
      setViolations(vData);
      setSessions(sData);
      setStudent(uData);
    } catch (e) {
      setError(e.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  // ── derived stats ─────────────────────────────────────────────────────────
  const criticalCount = violations.filter(v => v.severity === "critical" || getMeta(v.violation_type).severity === "critical").length;
  const majorCount    = violations.filter(v => v.severity === "major"    || getMeta(v.violation_type).severity === "major").length;
  const minorCount    = violations.filter(v => v.severity === "minor"    || getMeta(v.violation_type).severity === "minor").length;

  const typeCounts = violations.reduce((acc, v) => {
    acc[v.violation_type] = (acc[v.violation_type] || 0) + 1;
    return acc;
  }, {});
  const topViolation = Object.entries(typeCounts).sort((a,b) => b[1]-a[1])[0];

  // ── filtered list ─────────────────────────────────────────────────────────
  const filtered = violations.filter(v => {
    if (typeFilter !== "all" && v.violation_type !== typeFilter) return false;
    if (sevFilter  !== "all" && (v.severity || getMeta(v.violation_type).severity) !== sevFilter) return false;
    if (sessFilter !== "all" && String(v.session_id) !== sessFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!v.violation_type.includes(q) && !(v.detail||"").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // group by date for timeline
  const groupedByDate = filtered.reduce((acc, v) => {
    const d = fmtDate(v.timestamp);
    if (!acc[d]) acc[d] = [];
    acc[d].push(v);
    return acc;
  }, {});

  const uniqueTypes = [...new Set(violations.map(v => v.violation_type))];

  const openSnapshot = useCallback((log) => setLightbox(log), []);

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className={`avp-page ${pageReady ? "avp-page--ready" : ""}`}>

      {/* Header */}
      <div className="page-header">
        <button className="avp-back-btn" onClick={() => navigate(-1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Back
        </button>
        <div className="page-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>Proctoring Log</span>
        </div>
        <h1 className="page-title">
          Violation History
          {student && <span className="avp-title-name"> — {student.username}</span>}
        </h1>
        <p className="page-subtitle">
          Complete proctoring violation record{student ? ` for student #${studentId}` : ""}
        </p>
        <div className="title-decoration" />
      </div>

      {error && (
        <div className="avp-error-banner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
          <button onClick={loadData} className="avp-retry-btn">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="avp-loading">
          <div className="avp-spinner" />
          <span>Loading violation history…</span>
        </div>
      ) : (
        <>
          {/* ── Student profile strip ──────────────────────────────────── */}
          {student && (
            <div className="avp-profile-strip card">
              <div className="avp-profile-avatar">
                {student.username?.charAt(0).toUpperCase()}
              </div>
              <div className="avp-profile-info">
                <h3 className="avp-profile-name">{student.username}</h3>
                <span className="avp-profile-meta">Student ID #{studentId} · {sessions.length} session{sessions.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="avp-profile-actions">
                <button className="avp-action-btn" onClick={() => navigate(`/admin/session?student=${studentId}`)}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>
                  </svg>
                  View Sessions
                </button>
                <button className="avp-action-btn avp-action-btn--primary" onClick={() => navigate(`/admin/results`)}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                  View Results
                </button>
              </div>
            </div>
          )}

          {/* ── Stat cards ──────────────────────────────────────────────── */}
          <div className="avp-stats-grid">
            <MiniStat delay={0.1}
              label="Total Violations" value={violations.length}
              sub={`across ${sessions.length} sessions`}
              color="linear-gradient(135deg,#3b82f6,#8b5cf6)"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
            />
            <MiniStat delay={0.15}
              label="Critical" value={criticalCount}
              sub="phone / multiple faces"
              color="linear-gradient(135deg,#ef4444,#dc2626)"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
            />
            <MiniStat delay={0.2}
              label="Major" value={majorCount}
              sub="looking away / no face"
              color="linear-gradient(135deg,#f59e0b,#d97706)"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
            />
            <MiniStat delay={0.25}
              label="Minor" value={minorCount}
              sub="loud noise / minor events"
              color="linear-gradient(135deg,#10b981,#059669)"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
            />
          </div>

          {/* ── Type breakdown bar chart ─────────────────────────────────── */}
          {Object.keys(typeCounts).length > 0 && (
            <div className="card avp-breakdown-card">
              <div className="avp-card-head">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                  <rect x="18" y="3" width="4" height="18"/><rect x="10" y="8" width="4" height="13"/><rect x="2" y="13" width="4" height="8"/>
                </svg>
                <h3>Violation Type Breakdown</h3>
                {topViolation && (
                  <span className="avp-top-badge">
                    Most frequent: <strong>{getMeta(topViolation[0]).label}</strong> ({topViolation[1]}×)
                  </span>
                )}
              </div>
              <div className="avp-breakdown-list">
                {Object.entries(typeCounts)
                  .sort((a,b) => b[1]-a[1])
                  .map(([type, count], i) => {
                    const meta = getMeta(type);
                    const pct  = (count / violations.length) * 100;
                    return (
                      <div key={type} className="avp-breakdown-row" style={{ animationDelay: `${0.5 + i*0.07}s` }}>
                        <div className="avp-breakdown-icon" style={{ background: meta.bg, color: meta.color }}>
                          <ViolationIcon type={type} size={15} />
                        </div>
                        <span className="avp-breakdown-label">{meta.label}</span>
                        <div className="avp-breakdown-track">
                          <div className="avp-breakdown-fill" style={{ width: `${pct}%`, background: meta.color }} />
                        </div>
                        <span className="avp-breakdown-count" style={{ color: meta.color }}>{count}</span>
                        <span className="avp-breakdown-pct">{pct.toFixed(0)}%</span>
                      </div>
                    );
                })}
              </div>
            </div>
          )}

          {/* ── Filters + view toggle ────────────────────────────────────── */}
          <div className="card avp-filter-card">
            <div className="avp-filter-row">
              {/* Search */}
              <div className="avp-input-wrap">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input type="text" placeholder="Search violations…" value={search}
                  onChange={e => setSearch(e.target.value)} />
              </div>

              {/* Type */}
              <div className="avp-select-wrap">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                </svg>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                  <option value="all">All Types</option>
                  {uniqueTypes.map(t => <option key={t} value={t}>{getMeta(t).label}</option>)}
                </select>
              </div>

              {/* Severity */}
              <div className="avp-select-wrap">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                  <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
                </svg>
                <select value={sevFilter} onChange={e => setSevFilter(e.target.value)}>
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="major">Major</option>
                  <option value="minor">Minor</option>
                </select>
              </div>

              {/* Session */}
              {sessions.length > 0 && (
                <div className="avp-select-wrap">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2"/>
                  </svg>
                  <select value={sessFilter} onChange={e => setSessFilter(e.target.value)}>
                    <option value="all">All Sessions</option>
                    {sessions.map(s => <option key={s.id} value={String(s.id)}>Session #{s.id} — {fmtDate(s.start_time)}</option>)}
                  </select>
                </div>
              )}

              {/* Reset */}
              {(search || typeFilter !== "all" || sevFilter !== "all" || sessFilter !== "all") && (
                <button className="avp-reset-btn" onClick={() => { setSearch(""); setTypeFilter("all"); setSevFilter("all"); setSessFilter("all"); }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.75"/>
                  </svg>
                  Reset
                </button>
              )}

              {/* Count pill */}
              <span className="avp-count-pill">{filtered.length} event{filtered.length !== 1 ? "s" : ""}</span>

              {/* View toggle */}
              <div className="avp-view-toggle">
                <button className={`avp-toggle-btn ${viewMode === "timeline" ? "active" : ""}`} onClick={() => setViewMode("timeline")}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                  </svg>
                  Timeline
                </button>
                <button className={`avp-toggle-btn ${viewMode === "table" ? "active" : ""}`} onClick={() => setViewMode("table")}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>
                  </svg>
                  Table
                </button>
              </div>
            </div>
          </div>

          {/* ── TIMELINE VIEW ────────────────────────────────────────────── */}
          {viewMode === "timeline" && (
            <div className="avp-timeline-wrap">
              {Object.keys(groupedByDate).length === 0 ? (
                <div className="avp-empty">
                  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <span>No violations match the selected filters</span>
                </div>
              ) : Object.entries(groupedByDate).map(([date, logs]) => (
                <div key={date} className="avp-tl-date-group">
                  <div className="avp-tl-date-label">
                    <span>{date}</span>
                    <span className="avp-tl-date-count">{logs.length} event{logs.length !== 1 ? "s" : ""}</span>
                  </div>
                  {logs.map((log, i) => (
                    <TimelineEvent key={log.id} log={log} isLast={i === logs.length - 1} onSnapshot={openSnapshot} />
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* ── TABLE VIEW ───────────────────────────────────────────────── */}
          {viewMode === "table" && (
            <div className="card avp-table-card">
              <div className="avp-table-wrap">
                <table className="avp-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Type</th>
                      <th>Severity</th>
                      <th>Detail</th>
                      <th>Session</th>
                      <th>Timestamp</th>
                      <th>Snapshot</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={7} className="avp-empty-td">No violations match the selected filters</td></tr>
                    ) : filtered.map((v, i) => {
                      const meta = getMeta(v.violation_type);
                      return (
                        <tr key={v.id} className="avp-tr" style={{ animationDelay: `${i * 0.03}s` }}>
                          <td className="avp-td-num">{i + 1}</td>
                          <td>
                            <div className="avp-type-cell">
                              <span className="avp-type-icon-sm" style={{ background: meta.bg, color: meta.color }}>
                                <ViolationIcon type={v.violation_type} size={13} />
                              </span>
                              <span className="avp-type-name" style={{ color: meta.color }}>{meta.label}</span>
                            </div>
                          </td>
                          <td><SeverityBadge severity={v.severity || meta.severity} /></td>
                          <td className="avp-td-detail">{v.detail || "—"}</td>
                          <td><span className="avp-session-chip">#{v.session_id}</span></td>
                          <td className="avp-td-time">{fmtDateTime(v.timestamp)}</td>
                          <td>
                            {v.snapshot_b64 ? (
                              <button className="avp-snapshot-btn" onClick={() => openSnapshot(v)}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                                  <circle cx="12" cy="13" r="4"/>
                                </svg>
                                View
                              </button>
                            ) : <span className="avp-no-snap">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Snapshot lightbox ─────────────────────────────────────────── */}
      {lightbox && (
        <div className="avp-lightbox-overlay" onClick={() => setLightbox(null)}>
          <div className="avp-lightbox" onClick={e => e.stopPropagation()}>
            <button className="avp-lightbox-close" onClick={() => setLightbox(null)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <div className="avp-lightbox-head">
              <div className="avp-lightbox-icon" style={{ background: getMeta(lightbox.violation_type).bg, color: getMeta(lightbox.violation_type).color }}>
                <ViolationIcon type={lightbox.violation_type} size={20} />
              </div>
              <div>
                <h3 className="avp-lightbox-title">{getMeta(lightbox.violation_type).label}</h3>
                <p className="avp-lightbox-time">{fmtDateTime(lightbox.timestamp)}</p>
              </div>
              <SeverityBadge severity={lightbox.severity || getMeta(lightbox.violation_type).severity} />
            </div>
            {lightbox.snapshot_b64 ? (
              <img
                src={lightbox.snapshot_b64.startsWith("data:") ? lightbox.snapshot_b64 : `data:image/jpeg;base64,${lightbox.snapshot_b64}`}
                alt="Violation snapshot"
                className="avp-lightbox-img"
              />
            ) : (
              <div className="avp-lightbox-no-img">No snapshot available</div>
            )}
            {lightbox.detail && <p className="avp-lightbox-detail">{lightbox.detail}</p>}
          </div>
        </div>
      )}
    </div>
  );
}