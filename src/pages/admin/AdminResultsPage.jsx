import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../../css/AdminResultsPage.css";

const API_BASE = "http://localhost:5001";

// ── helpers ───────────────────────────────────────────────────────────────────
function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("token") || ""}` };
}

function fmt(n, dec = 1) {
  return n == null ? "—" : Number(n).toFixed(dec);
}

function grade(score) {
  if (score >= 90) return { label: "A+", cls: "grade-aplus" };
  if (score >= 80) return { label: "A",  cls: "grade-a" };
  if (score >= 70) return { label: "B",  cls: "grade-b" };
  if (score >= 60) return { label: "C",  cls: "grade-c" };
  if (score >= 50) return { label: "D",  cls: "grade-d" };
  return           { label: "F",  cls: "grade-f" };
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, gradient, delay }) {
  return (
    <div className="stat-card" style={{ animationDelay: `${delay}s` }}>
      <div className="stat-card-decoration" />
      <div className="stat-icon-wrap" style={{ background: gradient }}>{icon}</div>
      <div className="stat-body">
        <span className="stat-value">{value}</span>
        <span className="stat-label">{label}</span>
        {sub && <span className="stat-sub">{sub}</span>}
      </div>
    </div>
  );
}

// ── Score bar ─────────────────────────────────────────────────────────────────
function ScoreBar({ score }) {
  const pct  = Math.min(Math.max(score, 0), 100);
  const color =
    pct >= 80 ? "linear-gradient(90deg,#10b981,#059669)"
    : pct >= 60 ? "linear-gradient(90deg,#3b82f6,#8b5cf6)"
    : pct >= 50 ? "linear-gradient(90deg,#f59e0b,#d97706)"
    :             "linear-gradient(90deg,#ef4444,#dc2626)";
  return (
    <div className="score-bar-wrap">
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="score-bar-label">{fmt(pct)}%</span>
    </div>
  );
}

// ── Distribution chart (pure CSS bar chart) ───────────────────────────────────
function DistributionChart({ data }) {
  const max = Math.max(...data.map(d => d.count), 1);
  const bands = [
    { range: "90–100", key: "aplus", color: "#10b981" },
    { range: "80–89",  key: "a",     color: "#3b82f6" },
    { range: "70–79",  key: "b",     color: "#8b5cf6" },
    { range: "60–69",  key: "c",     color: "#f59e0b" },
    { range: "50–59",  key: "d",     color: "#f97316" },
    { range: "0–49",   key: "f",     color: "#ef4444" },
  ];
  return (
    <div className="dist-chart">
      {bands.map((b, i) => {
        const item  = data.find(d => d.key === b.key) || { count: 0 };
        const pct   = (item.count / max) * 100;
        return (
          <div key={b.key} className="dist-bar-group" style={{ animationDelay: `${0.6 + i * 0.08}s` }}>
            <div className="dist-bar-track">
              <div className="dist-bar-fill" style={{ height: `${pct}%`, background: b.color }} />
            </div>
            <span className="dist-bar-count">{item.count}</span>
            <span className="dist-bar-label">{b.range}</span>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function AdminResultsPage() {
  const navigate = useNavigate();

  const [pageReady,   setPageReady]   = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");

  // data
  const [exams,       setExams]       = useState([]);
  const [results,     setResults]     = useState([]);   // flat list for table
  const [summary,     setSummary]     = useState(null); // aggregate stats

  // filters
  const [selectedExam,   setSelectedExam]   = useState("all");
  const [statusFilter,   setStatusFilter]   = useState("all");  // all | Pass | Fail | terminated
  const [searchQuery,    setSearchQuery]    = useState("");
  const [sortField,      setSortField]      = useState("date");
  const [sortDir,        setSortDir]        = useState("desc");

  // pagination
  const [page,      setPage]      = useState(1);
  const PAGE_SIZE = 12;

  // detail drawer
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [drawerData,   setDrawerData]   = useState(null);

  // ── load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    setTimeout(() => setPageReady(true), 50);
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [examRes, resultsRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/exams`,         { headers: authHeaders() }),
        fetch(`${API_BASE}/api/admin/results/all`,   { headers: authHeaders() }),
      ]);
      if (!examRes.ok || !resultsRes.ok) throw new Error("Failed to fetch");
      const examData    = await examRes.json();
      const resultsData = await resultsRes.json();
      setExams(examData);
      setResults(resultsData.results || []);
      setSummary(resultsData.summary || null);
    } catch (e) {
      setError("Failed to load results. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── filter + sort ─────────────────────────────────────────────────────────
  const filtered = results
    .filter(r => {
      if (selectedExam !== "all" && String(r.exam_id) !== selectedExam) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!r.student.toLowerCase().includes(q) && !r.exam_title.toLowerCase().includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      let va = a[sortField], vb = b[sortField];
      if (sortField === "score")    { va = Number(va); vb = Number(vb); }
      if (sortField === "date")     { va = new Date(va); vb = new Date(vb); }
      if (sortField === "student")  { va = va?.toLowerCase(); vb = vb?.toLowerCase(); }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const totalPages  = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
    setPage(1);
  };

  const SortIcon = ({ field }) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      style={{ opacity: sortField === field ? 1 : 0.3, transition: "opacity .2s",
               transform: sortField === field && sortDir === "desc" ? "rotate(180deg)" : "none" }}>
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  );

  // ── distribution data from filtered results ───────────────────────────────
  const distData = [
    { key: "aplus", count: filtered.filter(r => r.score >= 90).length },
    { key: "a",     count: filtered.filter(r => r.score >= 80 && r.score < 90).length },
    { key: "b",     count: filtered.filter(r => r.score >= 70 && r.score < 80).length },
    { key: "c",     count: filtered.filter(r => r.score >= 60 && r.score < 70).length },
    { key: "d",     count: filtered.filter(r => r.score >= 50 && r.score < 60).length },
    { key: "f",     count: filtered.filter(r => r.score  <  50).length },
  ];

  const passCount  = filtered.filter(r => r.status === "Pass").length;
  const failCount  = filtered.filter(r => r.status === "Fail").length;
  const termCount  = filtered.filter(r => r.status === "terminated").length;
  const avgScore   = filtered.length
    ? filtered.reduce((s, r) => s + (r.score || 0), 0) / filtered.length
    : 0;
  const passRate   = filtered.length ? (passCount / filtered.filter(r => r.status !== "terminated").length) * 100 : 0;

  // ── drawer ────────────────────────────────────────────────────────────────
  const openDrawer = useCallback(async (row) => {
    setDrawerData(row);
    setDrawerOpen(true);
  }, []);

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className={`ar-page ${pageReady ? "ar-page--ready" : ""}`}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div className="page-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          <span>Admin Dashboard</span>
        </div>
        <h1 className="page-title">Exam Results</h1>
        <p className="page-subtitle">Comprehensive performance overview across all students and exams</p>
        <div className="title-decoration" />
      </div>

      {error && (
        <div className="ar-error">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
          <button onClick={loadAll} className="ar-retry-btn">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="ar-loading">
          <div className="ar-spinner" />
          <span>Loading results…</span>
        </div>
      ) : (
        <>
          {/* ── STAT CARDS ─────────────────────────────────────────────────── */}
          <div className="ar-stats-grid">
            <StatCard delay={0.1}
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
              label="Total Attempts" value={filtered.length}
              sub={`across ${exams.length} exam${exams.length !== 1 ? "s" : ""}`}
              gradient="linear-gradient(135deg,#3b82f6,#8b5cf6)"
            />
            <StatCard delay={0.15}
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
              label="Average Score" value={`${fmt(avgScore)}%`}
              sub={avgScore >= 50 ? "Above pass threshold" : "Below pass threshold"}
              gradient="linear-gradient(135deg,#8b5cf6,#6d28d9)"
            />
            <StatCard delay={0.2}
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
              label="Pass Rate" value={`${fmt(passRate)}%`}
              sub={`${passCount} passed · ${failCount} failed`}
              gradient="linear-gradient(135deg,#10b981,#059669)"
            />
            <StatCard delay={0.25}
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
              label="Terminated" value={termCount}
              sub="due to proctoring violations"
              gradient="linear-gradient(135deg,#ef4444,#dc2626)"
            />
          </div>

          {/* ── CHARTS ROW ─────────────────────────────────────────────────── */}
          <div className="ar-charts-row">
            {/* Score distribution */}
            <div className="card ar-dist-card">
              <div className="ar-card-head">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                  <rect x="18" y="3" width="4" height="18"/><rect x="10" y="8" width="4" height="13"/><rect x="2" y="13" width="4" height="8"/>
                </svg>
                <h3>Score Distribution</h3>
              </div>
              <DistributionChart data={distData} />
            </div>

            {/* Pass / Fail / Terminated donut (CSS-only) */}
            <div className="card ar-donut-card">
              <div className="ar-card-head">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
                <h3>Outcome Breakdown</h3>
              </div>
              <div className="ar-donut-wrap">
                <div className="ar-donut">
                  <svg viewBox="0 0 36 36" className="ar-donut-svg">
                    {(() => {
                      const total = passCount + failCount + termCount || 1;
                      const p = (passCount / total) * 100;
                      const f = (failCount / total) * 100;
                      const t = (termCount / total) * 100;
                      const C = 2 * Math.PI * 15.9;
                      const pDash = (p / 100) * C;
                      const fDash = (f / 100) * C;
                      const tDash = (t / 100) * C;
                      return (
                        <>
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3.5"/>
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" strokeWidth="3.5"
                            strokeDasharray={`${pDash} ${C - pDash}`} strokeLinecap="round"
                            transform="rotate(-90 18 18)" className="donut-seg" style={{ "--len": pDash, "--total": C }} />
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#ef4444" strokeWidth="3.5"
                            strokeDasharray={`${fDash} ${C - fDash}`} strokeLinecap="round"
                            transform={`rotate(${-90 + (p / 100) * 360} 18 18)`} className="donut-seg"
                            style={{ "--len": fDash, "--total": C }} />
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f59e0b" strokeWidth="3.5"
                            strokeDasharray={`${tDash} ${C - tDash}`} strokeLinecap="round"
                            transform={`rotate(${-90 + ((p + f) / 100) * 360} 18 18)`} className="donut-seg"
                            style={{ "--len": tDash, "--total": C }} />
                        </>
                      );
                    })()}
                  </svg>
                  <div className="ar-donut-center">
                    <span className="ar-donut-big">{filtered.length}</span>
                    <span className="ar-donut-tiny">total</span>
                  </div>
                </div>
                <div className="ar-legend">
                  <div className="ar-legend-item">
                    <span className="ar-legend-dot" style={{ background: "#10b981" }} />
                    <span className="ar-legend-label">Pass</span>
                    <span className="ar-legend-val">{passCount}</span>
                  </div>
                  <div className="ar-legend-item">
                    <span className="ar-legend-dot" style={{ background: "#ef4444" }} />
                    <span className="ar-legend-label">Fail</span>
                    <span className="ar-legend-val">{failCount}</span>
                  </div>
                  <div className="ar-legend-item">
                    <span className="ar-legend-dot" style={{ background: "#f59e0b" }} />
                    <span className="ar-legend-label">Terminated</span>
                    <span className="ar-legend-val">{termCount}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── FILTERS ────────────────────────────────────────────────────── */}
          <div className="card ar-filter-card">
            <div className="ar-filter-row">
              {/* Search */}
              <div className="input-wrapper ar-search">
                <span className="input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </span>
                <input
                  type="text" placeholder="Search student or exam…"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                />
              </div>

              {/* Exam filter */}
              <div className="ar-select-wrap">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
                <select value={selectedExam} onChange={e => { setSelectedExam(e.target.value); setPage(1); }}>
                  <option value="all">All Exams</option>
                  {exams.map(e => <option key={e.id} value={String(e.id)}>{e.title}</option>)}
                </select>
              </div>

              {/* Status filter */}
              <div className="ar-select-wrap">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                  <option value="all">All Statuses</option>
                  <option value="Pass">Pass</option>
                  <option value="Fail">Fail</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>

              {/* Reset */}
              {(searchQuery || selectedExam !== "all" || statusFilter !== "all") && (
                <button className="ar-reset-btn" onClick={() => { setSearchQuery(""); setSelectedExam("all"); setStatusFilter("all"); setPage(1); }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.75"/>
                  </svg>
                  Reset
                </button>
              )}

              <span className="ar-count-pill">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
            </div>
          </div>

          {/* ── TABLE ──────────────────────────────────────────────────────── */}
          <div className="card ar-table-card">
            <div className="ar-table-wrap">
              <table className="ar-table">
                <thead>
                  <tr>
                    <th className="ar-th-sortable" onClick={() => handleSort("student")}>
                      Student <SortIcon field="student" />
                    </th>
                    <th className="ar-th-sortable" onClick={() => handleSort("exam_title")}>
                      Exam <SortIcon field="exam_title" />
                    </th>
                    <th className="ar-th-sortable" onClick={() => handleSort("score")}>
                      Score <SortIcon field="score" />
                    </th>
                    <th>Grade</th>
                    <th className="ar-th-sortable" onClick={() => handleSort("status")}>
                      Status <SortIcon field="status" />
                    </th>
                    <th className="ar-th-sortable" onClick={() => handleSort("date")}>
                      Date <SortIcon field="date" />
                    </th>
                    <th>Duration</th>
                    <th>Violations</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="ar-empty">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
                          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        <span>No results match your filters</span>
                      </td>
                    </tr>
                  ) : paginated.map((row, i) => {
                    const g = grade(row.score);
                    return (
                      <tr key={row.id} className="ar-tr" style={{ animationDelay: `${i * 0.04}s` }}>
                        <td>
                          <div className="ar-student-cell">
                            <div className="ar-avatar">
                              {row.student?.charAt(0).toUpperCase()}
                            </div>
                            <span className="ar-student-name">{row.student}</span>
                          </div>
                        </td>
                        <td>
                          <span className="ar-exam-title">{row.exam_title}</span>
                          <span className="ar-exam-code">EXAM-{String(row.exam_id).padStart(3,"0")}</span>
                        </td>
                        <td><ScoreBar score={row.score} /></td>
                        <td><span className={`ar-grade ${g.cls}`}>{g.label}</span></td>
                        <td>
                          <span className={`status-badge ${row.status === "Pass" ? "success" : row.status === "Fail" ? "error" : "warn"}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="ar-date">{row.date}</td>
                        <td className="ar-duration">{row.duration}</td>
                        <td>
                          {row.violations > 0 ? (
                            <span className="ar-violations-badge">{row.violations}</span>
                          ) : (
                            <span className="ar-no-violations">—</span>
                          )}
                        </td>
                        <td>
                          <button className="ar-detail-btn" onClick={() => openDrawer(row)}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                            </svg>
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* pagination */}
            {totalPages > 1 && (
              <div className="ar-pagination">
                <button className="ar-page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                  .reduce((acc, n, idx, arr) => {
                    if (idx > 0 && n - arr[idx - 1] > 1) acc.push("…");
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((n, i) =>
                    n === "…"
                      ? <span key={`e${i}`} className="ar-page-ellipsis">…</span>
                      : <button key={n} className={`ar-page-btn ${page === n ? "active" : ""}`} onClick={() => setPage(n)}>{n}</button>
                  )
                }
                <button className="ar-page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── DETAIL DRAWER ────────────────────────────────────────────────── */}
      {drawerOpen && drawerData && (
        <div className="ar-drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <div className="ar-drawer" onClick={e => e.stopPropagation()}>
            <button className="ar-drawer-close" onClick={() => setDrawerOpen(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            <div className="ar-drawer-head">
              <div className="ar-drawer-avatar">{drawerData.student?.charAt(0).toUpperCase()}</div>
              <div>
                <h2 className="ar-drawer-name">{drawerData.student}</h2>
                <p className="ar-drawer-exam">{drawerData.exam_title}</p>
              </div>
              <span className={`status-badge ${drawerData.status === "Pass" ? "success" : drawerData.status === "Fail" ? "error" : "warn"}`} style={{ marginLeft: "auto" }}>
                {drawerData.status}
              </span>
            </div>

            <div className="ar-drawer-score-section">
              <div className="ar-drawer-big-score" style={{
                background: drawerData.score >= 50
                  ? "linear-gradient(135deg,#10b981,#059669)"
                  : "linear-gradient(135deg,#ef4444,#dc2626)"
              }}>
                <span className="ar-drawer-score-num">{fmt(drawerData.score)}%</span>
                <span className="ar-drawer-grade-big">{grade(drawerData.score).label}</span>
              </div>
              <div className="ar-drawer-score-meta">
                <div className="ar-drawer-meta-item">
                  <span className="ar-meta-label">Marks Obtained</span>
                  <span className="ar-meta-val">{drawerData.marks_obtained ?? "—"} / {drawerData.total_marks ?? "—"}</span>
                </div>
                <div className="ar-drawer-meta-item">
                  <span className="ar-meta-label">Date Taken</span>
                  <span className="ar-meta-val">{drawerData.date}</span>
                </div>
                <div className="ar-drawer-meta-item">
                  <span className="ar-meta-label">Duration</span>
                  <span className="ar-meta-val">{drawerData.duration}</span>
                </div>
                <div className="ar-drawer-meta-item">
                  <span className="ar-meta-label">Questions</span>
                  <span className="ar-meta-val">{drawerData.questions ?? "—"}</span>
                </div>
              </div>
            </div>

            {drawerData.violations > 0 && (
              <div className="ar-drawer-violations">
                <div className="ar-drawer-viol-head">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <span>{drawerData.violations} Proctoring Violation{drawerData.violations !== 1 ? "s" : ""} Recorded</span>
                </div>
                <button className="ar-view-violations-btn" onClick={() => navigate(`/admin/violations?student=${drawerData.student_id}`)}>
                  View Violation Log
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </button>
              </div>
            )}

            <button className="primary-btn ar-drawer-session-btn" onClick={() => navigate(`/admin/sessions?student=${drawerData.student_id}`)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>
              </svg>
              View Session Activity
            </button>
          </div>
        </div>
      )}
    </div>
  );
}