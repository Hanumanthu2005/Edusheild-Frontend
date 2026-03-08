import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../../css/AdminFeedbackPage.css";

const API_BASE = "http://localhost:5001";
function authHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    "Content-Type": "application/json",
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
function fmtTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}
function fmtDuration(start, end) {
  if (!start || !end) return "—";
  const sec = Math.floor((new Date(end) - new Date(start)) / 1000);
  if (sec < 60)  return `${sec}s`;
  const m = Math.floor(sec / 60), s = sec % 60;
  if (m < 60)    return `${m}m ${s}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

const VIOLATION_META = {
  phone_detected:   { label: "Phone Detected",        color: "#ef4444", bg: "rgba(239,68,68,0.12)",   icon: "📱" },
  book_detected:    { label: "Unauthorized Material",  color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  icon: "📚" },
  multiple_faces:   { label: "Multiple Faces",         color: "#ef4444", bg: "rgba(239,68,68,0.12)",   icon: "👥" },
  looking_away:     { label: "Looking Away",           color: "#f97316", bg: "rgba(249,115,22,0.12)",  icon: "👀" },
  no_face:          { label: "No Face Detected",       color: "#f97316", bg: "rgba(249,115,22,0.12)",  icon: "🚫" },
  tab_switch:       { label: "Tab Switch",             color: "#8b5cf6", bg: "rgba(139,92,246,0.12)",  icon: "🔄" },
  fullscreen_exit:  { label: "Fullscreen Exit",        color: "#3b82f6", bg: "rgba(59,130,246,0.12)",  icon: "⛶"  },
  loud_noise:       { label: "Loud Noise",             color: "#10b981", bg: "rgba(16,185,129,0.12)",  icon: "🔊" },
};
function getMeta(type) {
  return VIOLATION_META[type] || { label: type?.replace(/_/g," ") || "Unknown", color: "#64748b", bg: "rgba(100,116,139,0.12)", icon: "⚠️" };
}

// ── Accuracy Ring ─────────────────────────────────────────────────────────────
function AccuracyRing({ pct = 0, size = 72 }) {
  const r    = 26;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(pct, 1) * circ);
  const color = pct >= 0.8 ? "#10b981" : pct >= 0.6 ? "#3b82f6" : "#f59e0b";
  return (
    <svg width={size} height={size} viewBox="0 0 60 60">
      <circle cx="30" cy="30" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5"/>
      <circle cx="30" cy="30" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        transform="rotate(-90 30 30)" style={{ transition: "stroke-dasharray 1s ease" }}/>
      <text x="30" y="34" textAnchor="middle" fontSize="12" fontWeight="800" fill={color}>
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}

// ── Accuracy History Sparkline ────────────────────────────────────────────────
function Sparkline({ history = [] }) {
  if (history.length < 2) return <div className="afp-spark-empty">Not enough data</div>;
  const w = 200, h = 40, pad = 4;
  const max = Math.max(...history, 0.01);
  const min = Math.min(...history);
  const pts = history.map((v, i) => {
    const x = pad + (i / (history.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (v - min) / (max - min || 1)) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  const last = history[history.length - 1];
  const color = last >= 0.8 ? "#10b981" : last >= 0.6 ? "#3b82f6" : "#f59e0b";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="afp-sparkline">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline
        points={`${pts} ${w - pad},${h} ${pad},${h}`}
        fill={color} opacity="0.12" stroke="none"
      />
    </svg>
  );
}

// ── Session Card (pending feedback) ──────────────────────────────────────────
function PendingCard({ session, index, onFeedback }) {
  const meta = getMeta(session.primary_violation);
  return (
    <div className="afp-pending-card" style={{ animationDelay: `${0.05 * index}s` }}>
      <div className="afp-pending-card-accent" style={{ background: meta.color }} />

      <div className="afp-pending-top">
        <div className="afp-pending-id">
          <span className="afp-session-label">Session</span>
          <span className="afp-session-num">#{session.session_id}</span>
        </div>
        <span className="afp-terminated-badge">Terminated</span>
      </div>

      <div className="afp-student-row">
        <div className="afp-avatar">{session.student?.charAt(0).toUpperCase()}</div>
        <div>
          <div className="afp-student-name">{session.student}</div>
          <div className="afp-student-sub">Student ID: {session.student_id}</div>
        </div>
      </div>

      <div className="afp-viol-badge" style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}22` }}>
        <span>{meta.icon}</span>
        <span>{meta.label}</span>
        <span className="afp-viol-count">×{session.total_violations}</span>
      </div>

      <div className="afp-pending-meta">
        <span>🕐 {fmtDate(session.end_time)} · {fmtTime(session.end_time)}</span>
        <span>⏱ {fmtDuration(session.start_time, session.end_time)}</span>
      </div>

      <div className="afp-feedback-btns">
        <button
          className="afp-btn-fp"
          onClick={() => onFeedback(session, true)}
          title="This termination was a mistake — student was NOT cheating"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M10 15l-3-3 3-3M21 12H7"/><path d="M3 12v0"/>
          </svg>
          False Positive
        </button>
        <button
          className="afp-btn-confirm"
          onClick={() => onFeedback(session, false)}
          title="This termination was correct — student was actually cheating"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Confirm Cheat
        </button>
      </div>
    </div>
  );
}

// ── Feedback Modal ────────────────────────────────────────────────────────────
function FeedbackModal({ session, isFalsePositive, onSubmit, onClose, loading }) {
  const [note, setNote] = useState("");
  const meta = getMeta(session?.primary_violation);

  if (!session) return null;

  return (
    <div className="afp-modal-overlay" onClick={onClose}>
      <div className="afp-modal" onClick={e => e.stopPropagation()}>
        <div className="afp-modal-header" style={{
          borderBottomColor: "#e2e8f0",
          borderLeftColor: isFalsePositive ? "#3b82f6" : "#ef4444"
        }}>
          <div className="afp-modal-icon" style={{ background: isFalsePositive ? "rgba(59,130,246,0.1)" : "rgba(239,68,68,0.1)" }}>
            {isFalsePositive
              ? <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            }
          </div>
          <div>
            <h3 className="afp-modal-title">
              {isFalsePositive ? "Mark as False Positive" : "Confirm as Cheating"}
            </h3>
            <p className="afp-modal-sub">
              {isFalsePositive
                ? "You're telling the AI this termination was incorrect."
                : "You're confirming the AI made the right call."}
            </p>
          </div>
          <button className="afp-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="afp-modal-body">
          <div className="afp-modal-info">
            <div className="afp-modal-info-row">
              <span>Student:</span><strong>{session.student}</strong>
            </div>
            <div className="afp-modal-info-row">
              <span>Session:</span><strong>#{session.session_id}</strong>
            </div>
            <div className="afp-modal-info-row">
              <span>Violation:</span>
              <span style={{ color: meta.color, fontWeight: 600 }}>{meta.icon} {meta.label}</span>
            </div>
            <div className="afp-modal-info-row">
              <span>Total Flags:</span><strong>{session.total_violations}</strong>
            </div>
          </div>

          <div className="afp-modal-note">
            <label>Note <span>(optional)</span></label>
            <textarea
              placeholder={isFalsePositive
                ? "e.g. Student was adjusting glasses, not looking at phone..."
                : "e.g. Confirmed sharing screen via Discord..."}
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
            />
          </div>

          <div className="afp-modal-what-happens">
            <div className="afp-what-icon">🧠</div>
            <div>
              <strong>What happens next?</strong>
              <p>
                {isFalsePositive
                  ? "The RL model will receive a −1 reward signal and adjust detection thresholds to be less aggressive for this behaviour pattern."
                  : "The RL model will receive a +1 reward signal, reinforcing the current detection thresholds."}
              </p>
            </div>
          </div>
        </div>

        <div className="afp-modal-footer">
          <button className="afp-modal-cancel" onClick={onClose} disabled={loading}>Cancel</button>
          <button
            className={`afp-modal-submit ${isFalsePositive ? "afp-modal-submit--fp" : "afp-modal-submit--confirm"}`}
            onClick={() => onSubmit(note)}
            disabled={loading}
          >
            {loading ? "Submitting…" : isFalsePositive ? "Mark False Positive" : "Confirm Cheating"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className={`afp-toast afp-toast--${type}`}>
      {type === "success" ? "✓" : "✕"} {message}
    </div>
  );
}

// ── Threshold Display ─────────────────────────────────────────────────────────
function ThresholdBar({ label, value, min, max, color }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="afp-thresh-row">
      <span className="afp-thresh-label">{label}</span>
      <div className="afp-thresh-track">
        <div className="afp-thresh-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="afp-thresh-val">{typeof value === "number" && value > 10 ? Math.round(value) : value?.toFixed(2)}</span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
function AdminFeedbackPage() {
  const navigate = useNavigate();
  const [animate, setAnimate]         = useState(false);
  const [pending, setPending]         = useState([]);
  const [rlStats, setRlStats]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [modalSession, setModalSession]   = useState(null);
  const [modalIsFP, setModalIsFP]     = useState(false);
  const [toast, setToast]             = useState(null);
  const [activeTab, setActiveTab]     = useState("pending"); // "pending" | "model"

  const token = localStorage.getItem("token");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pendRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/sessions/terminated`, { headers: authHeaders() }),
        fetch(`${API_BASE}/api/admin/rl/stats`,            { headers: authHeaders() }),
      ]);
      if (pendRes.ok)  setPending(await pendRes.json());
      if (statsRes.ok) setRlStats(await statsRes.json());
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    setAnimate(true);
    fetchData();
  }, [fetchData]);

  const openModal = (session, isFP) => {
    setModalSession(session);
    setModalIsFP(isFP);
  };

  const handleSubmit = async (note) => {
    if (!modalSession) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/feedback`, {
        method:  "POST",
        headers: authHeaders(),
        body:    JSON.stringify({
          session_id:        modalSession.session_id,
          is_false_positive: modalIsFP,
          note:              note,
          violation_type:    modalSession.primary_violation,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setToast({ message: data.message, type: "success" });
        setModalSession(null);
        // Update RL stats inline
        if (data.updated_thresholds) {
          setRlStats(prev => prev ? {
            ...prev,
            thresholds:      data.updated_thresholds,
            accuracy:        data.accuracy,
            total_feedback:  (prev.total_feedback || 0) + 1,
            true_positives:  !modalIsFP ? (prev.true_positives || 0) + 1 : (prev.true_positives || 0),
            false_positives: modalIsFP  ? (prev.false_positives || 0) + 1 : (prev.false_positives || 0),
          } : prev);
        }
        // Remove from pending list
        setPending(p => p.filter(s => s.session_id !== modalSession.session_id));
      } else {
        setToast({ message: data.error || "Submission failed", type: "error" });
      }
    } catch (e) {
      setToast({ message: "Network error", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const stats = rlStats || {};
  const accuracy = stats.accuracy || 0;
  const tp = stats.true_positives  || 0;
  const fp = stats.false_positives || 0;
  const thresholds = stats.thresholds || { yolo: 0.5, pose: 0.25, audio: 800 };

  return (
    <div className={`afp-page ${animate ? "afp-enter" : ""}`}>

      {/* ── Toast ── */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />
      )}

      {/* ── Feedback Modal ── */}
      <FeedbackModal
        session={modalSession}
        isFalsePositive={modalIsFP}
        onSubmit={handleSubmit}
        onClose={() => setModalSession(null)}
        loading={submitting}
      />

      {/* ── Back Button ── */}
      <button className="afp-back-btn" onClick={() => navigate("/admin")}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
        </svg>
        Back to Dashboard
      </button>

      {/* ── Header ── */}
      <div className="afp-header">
        <div className="afp-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/>
            <path d="M12 8v4l3 3"/>
          </svg>
          RL Feedback Engine
        </div>
        <h1 className="afp-title">AI Feedback &amp; Learning</h1>
        <p className="afp-subtitle">
          Review terminated sessions and teach the AI what was a false positive.
          Every correction makes the system smarter.
        </p>
        <div className="afp-title-line" />
      </div>

      {/* ── Stat Strip ── */}
      <div className="afp-stat-strip">
        <div className="afp-stat-card afp-stat-card--accuracy">
          <AccuracyRing pct={accuracy} size={72} />
          <div>
            <div className="afp-stat-val">{Math.round(accuracy * 100)}%</div>
            <div className="afp-stat-lbl">Model Accuracy</div>
            <div className="afp-stat-sub">{tp + fp} total feedbacks</div>
          </div>
        </div>
        <div className="afp-stat-card">
          <div className="afp-stat-icon afp-stat-icon--green">✓</div>
          <div>
            <div className="afp-stat-val">{tp}</div>
            <div className="afp-stat-lbl">Confirmed Cheats</div>
          </div>
        </div>
        <div className="afp-stat-card">
          <div className="afp-stat-icon afp-stat-icon--blue">↩</div>
          <div>
            <div className="afp-stat-val">{fp}</div>
            <div className="afp-stat-lbl">False Positives</div>
          </div>
        </div>
        <div className="afp-stat-card">
          <div className="afp-stat-icon afp-stat-icon--orange">⏳</div>
          <div>
            <div className="afp-stat-val">{pending.length}</div>
            <div className="afp-stat-lbl">Awaiting Review</div>
          </div>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="afp-tab-bar">
        {[
          { id: "pending", label: `📋 Pending Review (${pending.length})` },
          { id: "model",   label: "🧠 Model Intelligence" },
        ].map(t => (
          <button
            key={t.id}
            className={`afp-tab-btn ${activeTab === t.id ? "active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PENDING TAB ── */}
      {activeTab === "pending" && (
        <div className="afp-tab-content">
          <div className="afp-section-header">
            <div>
              <h2 className="afp-section-title">Terminated Sessions Awaiting Review</h2>
              <p className="afp-section-sub">
                These students had their exams ended by the AI. Review each one and
                tell the system if it was correct or a mistake.
              </p>
            </div>
            <button className="afp-refresh-btn" onClick={fetchData} disabled={loading}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>

          {loading ? (
            <div className="afp-loading">
              <div className="afp-spinner" />
              <p>Loading sessions…</p>
            </div>
          ) : pending.length === 0 ? (
            <div className="afp-empty">
              <div className="afp-empty-icon">🎉</div>
              <h3>All caught up!</h3>
              <p>No terminated sessions are awaiting feedback.</p>
            </div>
          ) : (
            <div className="afp-pending-grid">
              {pending.map((session, i) => (
                <PendingCard
                  key={session.session_id}
                  session={session}
                  index={i}
                  onFeedback={openModal}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MODEL TAB ── */}
      {activeTab === "model" && (
        <div className="afp-tab-content">
          <div className="afp-model-grid">

            {/* Accuracy trend */}
            <div className="afp-model-card" style={{ animationDelay: "0.1s" }}>
              <h3 className="afp-model-card-title">
                <span>📈</span> Accuracy Over Time
              </h3>
              <Sparkline history={stats.accuracy_history || []} />
              <div className="afp-model-trend-labels">
                <span>First feedback</span>
                <span>Latest: {Math.round(accuracy * 100)}%</span>
              </div>
              <p className="afp-model-desc">
                Each feedback submission updates model weights via Deep Q-Learning.
                Accuracy improves as the model learns your institution's patterns.
              </p>
            </div>

            {/* Thresholds */}
            <div className="afp-model-card" style={{ animationDelay: "0.2s" }}>
              <h3 className="afp-model-card-title">
                <span>⚙️</span> Current Detection Thresholds
              </h3>
              <ThresholdBar label="YOLO Confidence"  value={thresholds.yolo}  min={0.30} max={0.85} color="#3b82f6" />
              <ThresholdBar label="Pose Ratio"       value={thresholds.pose}  min={0.10} max={0.50} color="#8b5cf6" />
              <ThresholdBar label="Audio Amplitude"  value={thresholds.audio} min={300}  max={2000} color="#10b981" />
              <p className="afp-model-desc">
                These thresholds are automatically tuned by the RL agent.
                False positive feedback raises them (less sensitive);
                confirmed cheats lower them (more sensitive).
              </p>
            </div>

            {/* How it works */}
            <div className="afp-model-card afp-model-card--full" style={{ animationDelay: "0.3s" }}>
              <h3 className="afp-model-card-title"><span>🔬</span> How the RL Learning Loop Works</h3>
              <div className="afp-how-grid">
                {[
                  { step: "1", icon: "📹", title: "Detection", desc: "YOLO, pose estimation, and audio monitor flag suspicious behaviour during the exam." },
                  { step: "2", icon: "⚡", title: "Termination", desc: "If violation count exceeds a threshold, the exam session is automatically terminated." },
                  { step: "3", icon: "👨‍💼", title: "Admin Review", desc: "You review each termination here and mark it as a false positive or confirm it was cheating." },
                  { step: "4", icon: "🧠", title: "RL Update", desc: "The Deep Q-Network receives +1 (correct) or −1 (false positive) reward and adjusts thresholds via the Bellman equation." },
                  { step: "5", icon: "📈", title: "Accuracy Improves", desc: "Over time the model learns your institution's exam environment and reduces false positives while catching real cheats." },
                ].map(item => (
                  <div key={item.step} className="afp-how-step">
                    <div className="afp-how-num">{item.step}</div>
                    <div className="afp-how-icon">{item.icon}</div>
                    <div className="afp-how-title">{item.title}</div>
                    <div className="afp-how-desc">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* RL params */}
            <div className="afp-model-card" style={{ animationDelay: "0.4s" }}>
              <h3 className="afp-model-card-title"><span>🔧</span> RL Parameters</h3>
              {[
                { label: "Exploration Rate (ε)", value: (stats.epsilon || 0).toFixed(4) },
                { label: "Total Feedbacks",      value: stats.total_feedback || 0 },
                { label: "True Positives",       value: tp },
                { label: "False Positives",      value: fp },
                { label: "Algorithm",            value: "Deep Q-Network (1D CNN)" },
                { label: "Discount Factor (γ)",  value: "0.95" },
              ].map(row => (
                <div key={row.label} className="afp-param-row">
                  <span className="afp-param-label">{row.label}</span>
                  <span className="afp-param-val">{row.value}</span>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default AdminFeedbackPage;