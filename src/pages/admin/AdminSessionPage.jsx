import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../css/AdminSessionPage.css";

const API_BASE = "http://localhost:5001";
function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("token") || ""}` };
}

function fmtDate(iso)     { if(!iso) return "—"; return new Date(iso).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"}); }
function fmtTime(iso)     { if(!iso) return "—"; return new Date(iso).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",second:"2-digit"}); }
function fmtDateTime(iso) { return `${fmtDate(iso)} · ${fmtTime(iso)}`; }
function fmtDuration(start, end) {
  if (!start || !end) return "—";
  const sec = Math.floor((new Date(end) - new Date(start)) / 1000);
  if (sec < 60)  return `${sec}s`;
  const m = Math.floor(sec / 60), s = sec % 60;
  if (m < 60)    return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_META = {
  in_progress: { label: "In Progress", color: "#3b82f6", bg: "rgba(59,130,246,0.1)",   dot: "#3b82f6" },
  completed:   { label: "Completed",   color: "#10b981", bg: "rgba(16,185,129,0.1)",  dot: "#10b981" },
  terminated:  { label: "Terminated",  color: "#ef4444", bg: "rgba(239,68,68,0.1)",   dot: "#ef4444" },
};
function getStatus(s) { return STATUS_META[s] || STATUS_META.completed; }

// ── Score ring (SVG) ─────────────────────────────────────────────────────────
function ScoreRing({ score, size = 56 }) {
  const r    = 20;
  const circ = 2 * Math.PI * r;
  const pct  = Math.min(Math.max(score || 0, 0), 100);
  const dash = (pct / 100) * circ;
  const color = pct >= 80 ? "#10b981" : pct >= 50 ? "#3b82f6" : "#ef4444";
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <circle cx="24" cy="24" r={r} fill="none" stroke="#e2e8f0" strokeWidth="4"/>
      <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        transform="rotate(-90 24 24)" style={{ transition: "stroke-dasharray 1s ease" }}/>
      <text x="24" y="28" textAnchor="middle" fontSize="10" fontWeight="800" fill={color}>
        {pct === 0 ? "—" : `${Math.round(pct)}`}
      </text>
    </svg>
  );
}

// ── Violation chip strip ─────────────────────────────────────────────────────
function ViolChips({ violations }) {
  if (!violations || violations.length === 0) {
    return <span className="asp-no-viol">Clean session</span>;
  }
  const counts = violations.reduce((a,v) => { a[v.violation_type] = (a[v.violation_type]||0)+1; return a; }, {});
  const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,3);
  return (
    <div className="asp-viol-chips">
      {sorted.map(([type, cnt]) => (
        <span key={type} className="asp-viol-chip">{cnt}× {type.replace(/_/g," ")}</span>
      ))}
      {Object.keys(counts).length > 3 && <span className="asp-viol-more">+{Object.keys(counts).length - 3}</span>}
    </div>
  );
}

// ── Mini stat card ────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, gradient, delay }) {
  return (
    <div className="asp-stat-card" style={{ animationDelay: `${delay}s` }}>
      <div className="asp-stat-icon" style={{ background: gradient }}>{icon}</div>
      <div className="asp-stat-body">
        <span className="asp-stat-value">{value}</span>
        <span className="asp-stat-label">{label}</span>
        {sub && <span className="asp-stat-sub">{sub}</span>}
      </div>
    </div>
  );
}

// ── Session Card ─────────────────────────────────────────────────────────────
function SessionCard({ session, index, onSelect, isSelected }) {
  const sm = getStatus(session.status);
  const isActive = session.status === "in_progress";
  return (
    <div
      className={`asp-session-card card ${isSelected ? "asp-session-card--selected" : ""} ${isActive ? "asp-session-card--active" : ""}`}
      style={{ animationDelay: `${0.1 + index * 0.07}s` }}
      onClick={() => onSelect(session)}
    >
      {isActive && <div className="asp-active-pulse" />}
      <div className="asp-session-card-top">
        <div className="asp-session-number">
          <span className="asp-session-num-label">Session</span>
          <span className="asp-session-num-value">#{session.id}</span>
        </div>
        <span className="asp-status-badge" style={{ background: sm.bg, color: sm.color }}>
          {isActive && <span className="asp-status-dot" style={{ background: sm.dot }} />}
          {sm.label}
        </span>
      </div>

      <div className="asp-session-card-meta">
        <div className="asp-meta-item">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>{fmtDate(session.start_time)}</span>
        </div>
        <div className="asp-meta-item">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
          </svg>
          <span>{fmtDuration(session.start_time, session.end_time)}</span>
        </div>
      </div>

      <div className="asp-session-card-footer">
        <div className="asp-session-score">
          <ScoreRing score={session.exam_score} size={48} />
          <div>
            <span className="asp-score-label">Score</span>
            <span className="asp-score-val">{session.exam_score != null ? `${session.exam_score.toFixed(1)}%` : "—"}</span>
          </div>
        </div>
        <div className="asp-session-viols">
          <span className="asp-viol-count-big" style={{ color: session.total_warnings > 0 ? "#ef4444" : "#10b981" }}>
            {session.total_warnings || 0}
          </span>
          <span className="asp-viol-count-label">violations</span>
        </div>
      </div>

      {session.violations && <ViolChips violations={session.violations} />}

      <div className={`asp-session-card-hover-indicator`} style={{ background: sm.color }} />
    </div>
  );
}

// ── Session Detail Panel ─────────────────────────────────────────────────────
function SessionDetailPanel({ session, onViewViolations }) {
  const sm = getStatus(session.status);
  const examAttempt = session.exam_attempt;

  return (
    <div className="asp-detail-panel card">
      {/* Header */}
      <div className="asp-detail-header">
        <div className="asp-detail-id">
          <div className="asp-detail-id-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>
            </svg>
          </div>
          <div>
            <h3 className="asp-detail-title">Session #{session.id}</h3>
            <span className="asp-detail-sub">Proctoring Session Record</span>
          </div>
        </div>
        <span className="asp-status-badge asp-status-badge--lg" style={{ background: sm.bg, color: sm.color }}>
          {session.status === "in_progress" && <span className="asp-status-dot" style={{ background: sm.dot }} />}
          {sm.label}
        </span>
      </div>

      {/* Timeline bar */}
      <div className="asp-timeline-bar">
        <div className="asp-timeline-point">
          <div className="asp-tpoint-dot asp-tpoint-start" />
          <div className="asp-tpoint-label">Started</div>
          <div className="asp-tpoint-time">{fmtTime(session.start_time)}</div>
          <div className="asp-tpoint-date">{fmtDate(session.start_time)}</div>
        </div>
        <div className="asp-timeline-line">
          <div className="asp-timeline-fill" style={{
            background: session.status === "terminated"
              ? "linear-gradient(90deg,#3b82f6,#ef4444)"
              : "linear-gradient(90deg,#3b82f6,#10b981)"
          }} />
          <span className="asp-timeline-dur">{fmtDuration(session.start_time, session.end_time)}</span>
        </div>
        <div className="asp-timeline-point asp-timeline-point--end">
          <div className="asp-tpoint-dot" style={{ background: sm.dot }} />
          <div className="asp-tpoint-label">{sm.label}</div>
          <div className="asp-tpoint-time">{session.end_time ? fmtTime(session.end_time) : "Ongoing"}</div>
          <div className="asp-tpoint-date">{session.end_time ? fmtDate(session.end_time) : ""}</div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="asp-detail-grid">
        <div className="asp-detail-stat">
          <span className="asp-detail-stat-label">Total Warnings</span>
          <span className="asp-detail-stat-val" style={{ color: session.total_warnings > 0 ? "#ef4444" : "#10b981" }}>
            {session.total_warnings || 0}
          </span>
        </div>
        <div className="asp-detail-stat">
          <span className="asp-detail-stat-label">Duration</span>
          <span className="asp-detail-stat-val">{fmtDuration(session.start_time, session.end_time)}</span>
        </div>
        {examAttempt && (
          <>
            <div className="asp-detail-stat">
              <span className="asp-detail-stat-label">Exam Taken</span>
              <span className="asp-detail-stat-val asp-detail-stat-val--sm">{examAttempt.exam_title}</span>
            </div>
            <div className="asp-detail-stat">
              <span className="asp-detail-stat-label">Score</span>
              <span className="asp-detail-stat-val" style={{ color: (examAttempt.score||0) >= 50 ? "#10b981" : "#ef4444" }}>
                {examAttempt.score != null ? `${examAttempt.score.toFixed(1)}%` : "—"}
              </span>
            </div>
            <div className="asp-detail-stat">
              <span className="asp-detail-stat-label">Marks</span>
              <span className="asp-detail-stat-val">{examAttempt.marks_obtained ?? "—"} / {examAttempt.total_marks ?? "—"}</span>
            </div>
            <div className="asp-detail-stat">
              <span className="asp-detail-stat-label">Result</span>
              <span className={`asp-result-badge ${(examAttempt.score||0) >= 50 ? "pass" : "fail"}`}>
                {(examAttempt.score||0) >= 50 ? "Pass" : "Fail"}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Violation type breakdown */}
      {session.violation_summary && Object.keys(session.violation_summary).length > 0 && (
        <div className="asp-detail-viols">
          <div className="asp-detail-viols-head">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>Violations in This Session</span>
          </div>
          <div className="asp-detail-viol-list">
            {Object.entries(session.violation_summary)
              .sort((a,b) => b[1]-a[1])
              .map(([type, count]) => (
                <div key={type} className="asp-detail-viol-row">
                  <span className="asp-detail-viol-type">{type.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</span>
                  <div className="asp-detail-viol-bar-track">
                    <div className="asp-detail-viol-bar-fill"
                      style={{ width: `${(count / session.total_warnings) * 100}%` }} />
                  </div>
                  <span className="asp-detail-viol-count">{count}</span>
                </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="asp-detail-actions">
        <button className="asp-detail-btn asp-detail-btn--violations"
          onClick={() => onViewViolations(session.id)}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          </svg>
          View All Violations
        </button>
        {session.status === "in_progress" && (
          <button className="asp-detail-btn asp-detail-btn--terminate">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
            </svg>
            Terminate Session
          </button>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function AdminSessionPage() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const params     = new URLSearchParams(location.search);
  const studentId  = params.get("student");

  const [pageReady,  setPageReady]  = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");

  const [student,    setStudent]    = useState(null);
  const [sessions,   setSessions]   = useState([]);
  const [selected,   setSelected]   = useState(null);

  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder,    setSortOrder]    = useState("desc");

  useEffect(() => {
    setTimeout(() => setPageReady(true), 50);
    if (studentId) loadData();
    else setError("No student ID provided.");
  }, [studentId]);

  const loadData = async () => {
    setLoading(true); setError("");
    try {
      const [sRes, uRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/students/${studentId}/sessions`, { headers: authHeaders() }),
        fetch(`${API_BASE}/api/admin/students/${studentId}/profile`,  { headers: authHeaders() }),
      ]);
      if (!sRes.ok) throw new Error("Failed to load sessions");
      const sData = await sRes.json();
      const uData = uRes.ok ? await uRes.json() : null;
      setSessions(sData);
      setStudent(uData);
      // auto-select latest
      if (sData.length > 0) setSelected(sData[0]);
    } catch (e) {
      setError(e.message || "Failed to load sessions.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewViolations = useCallback((sessionId) => {
    navigate(`/admin/violations?student=${studentId}&session=${sessionId}`);
  }, [navigate, studentId]);

  // ── derived ───────────────────────────────────────────────────────────────
  const filtered = sessions
    .filter(s => statusFilter === "all" || s.status === statusFilter)
    .sort((a, b) => {
      const da = new Date(a.start_time), db = new Date(b.start_time);
      return sortOrder === "desc" ? db - da : da - db;
    });

  const totalSessions   = sessions.length;
  const activeSessions  = sessions.filter(s => s.status === "in_progress").length;
  const terminatedCount = sessions.filter(s => s.status === "terminated").length;
  const totalWarnings   = sessions.reduce((a, s) => a + (s.total_warnings || 0), 0);
  const avgScore        = (() => {
    const scored = sessions.filter(s => s.exam_score != null);
    return scored.length ? scored.reduce((a,s) => a + s.exam_score, 0) / scored.length : null;
  })();

  return (
    <div className={`asp-page ${pageReady ? "asp-page--ready" : ""}`}>

      {/* Header */}
      <div className="page-header">
        <button className="asp-back-btn" onClick={() => navigate(-1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Back
        </button>
        <div className="page-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>
          </svg>
          <span>Session Monitor</span>
        </div>
        <h1 className="page-title">
          Session Activity
          {student && <span className="asp-title-name"> — {student.username}</span>}
        </h1>
        <p className="page-subtitle">
          Detailed proctoring session history{student ? ` for student #${studentId}` : ""}
        </p>
        <div className="title-decoration" />
      </div>

      {error && (
        <div className="asp-error-banner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
          <button onClick={loadData} className="asp-retry-btn">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="asp-loading">
          <div className="asp-spinner" />
          <span>Loading session data…</span>
        </div>
      ) : (
        <>
          {/* ── Profile strip ────────────────────────────────────────────── */}
          {student && (
            <div className="asp-profile-strip card">
              <div className="asp-profile-avatar">{student.username?.charAt(0).toUpperCase()}</div>
              <div className="asp-profile-info">
                <h3 className="asp-profile-name">{student.username}</h3>
                <span className="asp-profile-meta">Student ID #{studentId} · {totalSessions} session{totalSessions !== 1 ? "s" : ""}</span>
              </div>
              <div className="asp-profile-actions">
                <button className="asp-action-btn" onClick={() => navigate(`/admin/violations?student=${studentId}`)}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  </svg>
                  Violations
                </button>
                <button className="asp-action-btn asp-action-btn--primary" onClick={() => navigate("/admin/results")}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                  Results
                </button>
              </div>
            </div>
          )}

          {/* ── Stat cards ───────────────────────────────────────────────── */}
          <div className="asp-stats-grid">
            <StatCard delay={0.1}
              label="Total Sessions" value={totalSessions}
              gradient="linear-gradient(135deg,#3b82f6,#8b5cf6)"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>}
            />
            <StatCard delay={0.15}
              label="Active Now" value={activeSessions}
              sub={activeSessions > 0 ? "Currently in exam" : "No active sessions"}
              gradient={activeSessions > 0 ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(135deg,#64748b,#475569)"}
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
            />
            <StatCard delay={0.2}
              label="Terminated" value={terminatedCount}
              sub="due to violations"
              gradient="linear-gradient(135deg,#ef4444,#dc2626)"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
            />
            <StatCard delay={0.25}
              label="Total Warnings" value={totalWarnings}
              sub={avgScore != null ? `avg score ${avgScore.toFixed(1)}%` : "no scores recorded"}
              gradient="linear-gradient(135deg,#f59e0b,#d97706)"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
            />
          </div>

          {/* ── Main split layout ─────────────────────────────────────────── */}
          <div className="asp-split">
            {/* LEFT: session list + filters */}
            <div className="asp-left-col">
              {/* Filters */}
              <div className="asp-list-controls">
                <div className="asp-status-tabs">
                  {["all","in_progress","completed","terminated"].map(s => (
                    <button key={s}
                      className={`asp-tab ${statusFilter === s ? "asp-tab--active" : ""}`}
                      onClick={() => setStatusFilter(s)}>
                      {s === "all" ? "All" : s === "in_progress" ? "Active" : s.charAt(0).toUpperCase() + s.slice(1)}
                      <span className="asp-tab-count">
                        {s === "all" ? sessions.length : sessions.filter(x => x.status === s).length}
                      </span>
                    </button>
                  ))}
                </div>
                <button className="asp-sort-btn" onClick={() => setSortOrder(o => o === "desc" ? "asc" : "desc")}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    style={{ transform: sortOrder === "asc" ? "scaleY(-1)" : "none", transition: "transform .3s" }}>
                    <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
                  </svg>
                  {sortOrder === "desc" ? "Newest" : "Oldest"}
                </button>
              </div>

              {/* Session cards */}
              <div className="asp-session-list">
                {filtered.length === 0 ? (
                  <div className="asp-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
                      <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>
                    </svg>
                    <span>No sessions match the filter</span>
                  </div>
                ) : filtered.map((session, i) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    index={i}
                    onSelect={setSelected}
                    isSelected={selected?.id === session.id}
                  />
                ))}
              </div>
            </div>

            {/* RIGHT: detail panel */}
            <div className="asp-right-col">
              {selected ? (
                <SessionDetailPanel
                  session={selected}
                  onViewViolations={handleViewViolations}
                />
              ) : (
                <div className="card asp-select-prompt">
                  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
                    <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>
                  </svg>
                  <h3>Select a Session</h3>
                  <p>Click on any session from the left panel to view its detailed activity record.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}