import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/ExamHistoryPage.css";

const API_BASE = "http://localhost:5001";

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("token") || ""}` };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function gradeInfo(score, total) {
  const pct = total > 0 ? (score / total) * 100 : 0;
  if (pct >= 90) return { label: "A+", cls: "grade-aplus" };
  if (pct >= 80) return { label: "A",  cls: "grade-a" };
  if (pct >= 70) return { label: "B",  cls: "grade-b" };
  if (pct >= 60) return { label: "C",  cls: "grade-c" };
  if (pct >= 50) return { label: "D",  cls: "grade-d" };
  return               { label: "F",  cls: "grade-f" };
}

function scorePct(score, total) {
  return total > 0 ? Math.round((score / total) * 100) : 0;
}

function fmt(date) {
  if (!date || date === "N/A") return "—";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

// ── Score Ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score, total, size = 72 }) {
  const pct  = scorePct(score, total);
  const { cls } = gradeInfo(score, total);
  const r    = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <svg width={size} height={size} className={`score-ring ${cls}`}>
      <circle cx={size/2} cy={size/2} r={r} className="ring-track" strokeWidth="7" fill="none" />
      <circle cx={size/2} cy={size/2} r={r} className="ring-fill" strokeWidth="7" fill="none"
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        className="ring-text" fontSize={size < 60 ? "11" : size < 90 ? "14" : "20"} fontWeight="700">
        {pct}%
      </text>
    </svg>
  );
}

// ── Mini Bar ──────────────────────────────────────────────────────────────────
function MiniBar({ score, total }) {
  const pct = scorePct(score, total);
  const { cls } = gradeInfo(score, total);
  return (
    <div className="mini-bar-wrap">
      <div className="mini-bar-track">
        <div className={`mini-bar-fill ${cls}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`mini-bar-label ${cls}`}>{pct}%</span>
    </div>
  );
}

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({ data, positive = true, width = 110, height = 32 }) {
  if (!data || data.length < 2) return null;
  const max   = Math.max(...data, 1);
  const min   = Math.min(...data);
  const range = max - min || 1;
  const pts   = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 6) - 3;
    return `${x},${y}`;
  }).join(" ");
  const lastX = width;
  const lastY = height - ((data[data.length - 1] - min) / range) * (height - 6) - 3;

  return (
    <svg width={width} height={height} className="sparkline-svg">
      <polyline points={pts} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="3.5" />
    </svg>
  );
}

// ── Summary Pill ──────────────────────────────────────────────────────────────
function SummaryPill({ icon, label, value, accentCls }) {
  return (
    <div className={`summary-pill ${accentCls}`}>
      <div className="summary-pill-icon">{icon}</div>
      <div className="summary-pill-body">
        <span className="summary-pill-value">{value}</span>
        <span className="summary-pill-label">{label}</span>
      </div>
      <div className="summary-pill-glow" />
    </div>
  );
}

// ── Exam Detail Drawer ────────────────────────────────────────────────────────
function ExamDrawer({ exam, onClose }) {
  const pct    = scorePct(exam.score, exam.total);
  const g      = gradeInfo(exam.score, exam.total);
  const passed = exam.status === "Pass";

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={e => e.stopPropagation()}>

        <button className="drawer-close-btn" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="drawer-header">
          <div className="drawer-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div className="drawer-exam-code">{exam.code}</div>
          <h3 className="drawer-exam-title">{exam.examName}</h3>
        </div>

        <div className="drawer-body">
          <div className={`drawer-score-section ${g.cls}`}>
            <ScoreRing score={exam.score} total={exam.total} size={110} />
            <div className="drawer-score-meta">
              <div className={`drawer-grade-badge ${g.cls}`}>{g.label}</div>
              <div className="drawer-marks">
                {exam.score}<span className="drawer-marks-denom">/{exam.total}</span>
              </div>
              <div className="drawer-marks-label">marks scored</div>
              <div className={`drawer-status-pill ${passed ? "pill-pass" : "pill-fail"}`}>
                {passed ? "✓ Passed" : "✗ Failed"}
              </div>
            </div>
          </div>

          <div className="drawer-stats-grid">
            <div className="drawer-stat-card">
              <div className="drawer-stat-icon">📅</div>
              <div className="drawer-stat-label">Date Taken</div>
              <div className="drawer-stat-value">{fmt(exam.date)}</div>
            </div>
            <div className="drawer-stat-card">
              <div className="drawer-stat-icon">⏱</div>
              <div className="drawer-stat-label">Duration</div>
              <div className="drawer-stat-value">{exam.duration}</div>
            </div>
            <div className="drawer-stat-card">
              <div className="drawer-stat-icon">❓</div>
              <div className="drawer-stat-label">Questions</div>
              <div className="drawer-stat-value">{exam.questions} Qs</div>
            </div>
            <div className="drawer-stat-card">
              <div className="drawer-stat-icon">📊</div>
              <div className="drawer-stat-label">Percentage</div>
              <div className={`drawer-stat-value ${g.cls}`}>{pct}%</div>
            </div>
          </div>

          <div className="drawer-breakdown">
            <div className="drawer-breakdown-header">
              <span>Score breakdown</span>
              <span className={g.cls}>{exam.score} correct</span>
            </div>
            <div className="drawer-breakdown-bar">
              <div className={`drawer-breakdown-correct ${g.cls}`} style={{ width: `${pct}%` }} />
              <div className="drawer-breakdown-missed" style={{ width: `${100 - pct}%` }} />
            </div>
            <div className="drawer-breakdown-labels">
              <span className={`breakdown-label-correct ${g.cls}`}>✓ Correct: {exam.score}</span>
              <span className="breakdown-label-missed">✗ Missed: {exam.total - exam.score}</span>
            </div>
          </div>

          <div className={`drawer-advice ${g.cls}`}>
            <span className="drawer-advice-emoji">
              {pct >= 80 ? "🏆" : pct >= 60 ? "📈" : pct >= 50 ? "💡" : "📚"}
            </span>
            <p className="drawer-advice-text">
              {pct >= 90 && "Outstanding performance! You've mastered this material."}
              {pct >= 80 && pct < 90 && "Excellent work! A little more practice and you'll ace it."}
              {pct >= 70 && pct < 80 && "Good effort. Review the topics where you lost marks."}
              {pct >= 60 && pct < 70 && "Decent attempt. Focus on weak areas to improve your grade."}
              {pct >= 50 && pct < 60 && "Passed, but there's significant room for improvement."}
              {pct < 50 && "Don't be discouraged. Review the material and try again."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function ExamHistoryPage() {
  const navigate = useNavigate();

  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState("all");
  const [sort,     setSort]     = useState("newest");
  const [selected, setSelected] = useState(null);
  const [view,     setView]     = useState("grid");
  const [entered,  setEntered]  = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/student/results`, { headers: authHeaders() })
      .then(r => {
        if (!r.ok) throw new Error("Unauthorised — please log in again.");
        return r.json();
      })
      .then(data => {
        setResults(data);
        setLoading(false);
        setTimeout(() => setEntered(true), 50);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const completed = results.length;
  const passCount = results.filter(r => r.status === "Pass").length;
  const avgPct    = completed > 0
    ? Math.round(results.reduce((s, r) => s + scorePct(r.score, r.total), 0) / completed)
    : 0;
  const sparkData = [...results].slice(0, 8).reverse().map(r => scorePct(r.score, r.total));

  const visible = results
    .filter(r => {
      const q = search.toLowerCase();
      if (q && !r.examName.toLowerCase().includes(q) && !r.code.toLowerCase().includes(q)) return false;
      if (filter === "pass" && r.status !== "Pass") return false;
      if (filter === "fail" && r.status !== "Fail") return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === "newest")   return (b.date || "").localeCompare(a.date || "");
      if (sort === "oldest")   return (a.date || "").localeCompare(b.date || "");
      if (sort === "score-hi") return scorePct(b.score, b.total) - scorePct(a.score, a.total);
      if (sort === "score-lo") return scorePct(a.score, a.total) - scorePct(b.score, b.total);
      return 0;
    });

  if (loading) {
    return (
      <div className="ehs-shell">
        <div className="ehs-loading">
          <div className="ehs-spinner" />
          <span>Loading your exam history…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ehs-shell">
        <div className="ehs-empty-state">
          <div className="ehs-empty-icon">⚠️</div>
          <h3 className="ehs-empty-title">Something went wrong</h3>
          <p className="ehs-empty-text">{error}</p>
          <button className="btn-primary" onClick={() => navigate("/home")}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`ehs-shell ${entered ? "ehs-entered" : ""}`}>
      {selected && <ExamDrawer exam={selected} onClose={() => setSelected(null)} />}

      {/* Top Bar */}
      <div className="ehs-top-bar">
        <button className="btn-back" onClick={() => navigate("/home")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Dashboard
        </button>
        <div className="ehs-top-bar-spacer" />
        <button className="btn-primary" onClick={() => navigate("/exams")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Take New Exam
        </button>
      </div>

      {/* Page Header */}
      <div className="ehs-page-header">
        <div className="ehs-page-badge anim-fade-down-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          Student Portal
        </div>
        <h1 className="ehs-page-title anim-fade-down-2">Exam History</h1>
        <p className="ehs-page-subtitle anim-fade-down-3">
          Review your past performance and track your progress over time
        </p>
        <div className="ehs-title-decoration anim-expand" />
      </div>

      {/* Summary Strip */}
      {completed > 0 && (
        <div className="ehs-summary-strip anim-fade-up">
          <SummaryPill icon="📋" label="Exams Taken"  value={completed}      accentCls="accent-blue" />
          <SummaryPill icon="✅" label="Passed"        value={passCount}      accentCls="accent-green" />
          <SummaryPill icon="📊" label="Avg. Score"    value={`${avgPct}%`}  accentCls="accent-purple" />
          <SummaryPill icon="🏆" label="Pass Rate"
            value={`${completed > 0 ? Math.round((passCount / completed) * 100) : 0}%`}
            accentCls="accent-amber" />
          {sparkData.length >= 2 && (
            <div className={`ehs-sparkline-wrap ${avgPct >= 50 ? "spark-positive" : "spark-negative"}`}>
              <span className="ehs-sparkline-label">Trend</span>
              <Sparkline data={sparkData} positive={avgPct >= 50} />
            </div>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="ehs-toolbar">
        <div className="ehs-search-wrap">
          <svg className="ehs-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input className="ehs-search-input" placeholder="Search by exam name or code…"
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && (
            <button className="ehs-search-clear" onClick={() => setSearch("")}>✕</button>
          )}
        </div>

        <div className="ehs-filter-group">
          {[{ key: "all", label: "All" }, { key: "pass", label: "✓ Passed" }, { key: "fail", label: "✗ Failed" }].map(f => (
            <button key={f.key}
              className={`ehs-filter-btn ${filter === f.key ? "ehs-filter-btn--active" : ""}`}
              onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>

        <select className="ehs-sort-select" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="score-hi">Highest Score</option>
          <option value="score-lo">Lowest Score</option>
        </select>

        <div className="ehs-view-toggle">
          <button className={`ehs-view-btn ${view === "grid" ? "ehs-view-btn--active" : ""}`}
            onClick={() => setView("grid")} title="Grid view">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
            </svg>
          </button>
          <button className={`ehs-view-btn ${view === "list" ? "ehs-view-btn--active" : ""}`}
            onClick={() => setView("list")} title="List view">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {(search || filter !== "all") && (
        <div className="ehs-result-count">
          <strong>{visible.length}</strong> result{visible.length !== 1 ? "s" : ""}
          {search && <> for "<strong>{search}</strong>"</>}
          {filter !== "all" && <> · {filter === "pass" ? "Passed" : "Failed"} only</>}
        </div>
      )}

      {/* Empty States */}
      {completed === 0 ? (
        <div className="ehs-empty-state">
          <div className="ehs-empty-icon">📝</div>
          <h3 className="ehs-empty-title">No exams taken yet</h3>
          <p className="ehs-empty-text">Your completed exams will appear here once you finish one.</p>
          <button className="btn-primary" onClick={() => navigate("/exams")}>Browse Available Exams</button>
        </div>
      ) : visible.length === 0 ? (
        <div className="ehs-empty-state">
          <div className="ehs-empty-icon">🔍</div>
          <h3 className="ehs-empty-title">No results match your filters</h3>
          <p className="ehs-empty-text">Try adjusting your search or filter criteria.</p>
          <button className="btn-back" onClick={() => { setSearch(""); setFilter("all"); }}>Clear Filters</button>
        </div>

      ) : view === "grid" ? (
        <div className="ehs-grid">
          {visible.map((exam, i) => {
            const g      = gradeInfo(exam.score, exam.total);
            const passed = exam.status === "Pass";
            return (
              <div key={exam.id}
                className={`ehs-card ${g.cls}`}
                style={{ animationDelay: `${i * 0.06}s` }}
                onClick={() => setSelected(exam)}>
                <div className="ehs-card-glow" />
                <div className="ehs-card-top">
                  <div>
                    <div className="ehs-card-code">{exam.code}</div>
                    <div className={`ehs-card-status-pill ${passed ? "pill-pass" : "pill-fail"}`}>
                      {passed ? "✓ Passed" : "✗ Failed"}
                    </div>
                  </div>
                  <div className={`ehs-card-grade ${g.cls}`}>{g.label}</div>
                </div>
                <h3 className="ehs-card-name">{exam.examName}</h3>
                <div className="ehs-card-score-row">
                  <ScoreRing score={exam.score} total={exam.total} size={64} />
                  <div className="ehs-card-score-info">
                    <div className="ehs-card-marks">
                      {exam.score}<span className="ehs-card-marks-denom">/{exam.total}</span>
                    </div>
                    <div className="ehs-card-marks-label">marks scored</div>
                    <MiniBar score={exam.score} total={exam.total} />
                  </div>
                </div>
                <div className="ehs-card-footer">
                  <div className="ehs-card-meta-item"><span className="ehs-meta-icon">📅</span><span>{fmt(exam.date)}</span></div>
                  <div className="ehs-card-meta-item"><span className="ehs-meta-icon">⏱</span><span>{exam.duration}</span></div>
                  <div className="ehs-card-meta-item"><span className="ehs-meta-icon">❓</span><span>{exam.questions} Qs</span></div>
                </div>
                <div className="ehs-card-hover-hint">View Details →</div>
              </div>
            );
          })}
        </div>

      ) : (
        <div className="ehs-list-wrap">
          <div className="ehs-list-header">
            <span>Exam</span><span>Date</span><span>Score</span>
            <span>Duration</span><span>Grade</span><span>Status</span>
          </div>
          {visible.map((exam, i) => {
            const g      = gradeInfo(exam.score, exam.total);
            const passed = exam.status === "Pass";
            return (
              <div key={exam.id} className="ehs-list-row"
                style={{ animationDelay: `${i * 0.04}s` }}
                onClick={() => setSelected(exam)}>
                <div className="ehs-list-exam">
                  <span className="ehs-list-code">{exam.code}</span>
                  <span className="ehs-list-name">{exam.examName}</span>
                </div>
                <span className="ehs-list-date">{fmt(exam.date)}</span>
                <div className="ehs-list-score">
                  <MiniBar score={exam.score} total={exam.total} />
                  <span className="ehs-list-score-raw">{exam.score}/{exam.total}</span>
                </div>
                <span className="ehs-list-duration">{exam.duration}</span>
                <span className={`ehs-list-grade ${g.cls}`}>{g.label}</span>
                <span className={`ehs-list-status ${passed ? "pill-pass" : "pill-fail"}`}>
                  {passed ? "✓ Passed" : "✗ Failed"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}