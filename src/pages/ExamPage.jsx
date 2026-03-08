import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getExamDetails, startExam, submitExam } from "../services/api";
import "../css/ExamPage.css";

const API_BASE = "http://localhost:5001";
const FRAME_INTERVAL_MS = 3000;

// ── Termination thresholds ────────────────────────────────────────────────────
const TERM_THRESHOLDS = {
  phone_detected:  1,
  book_detected:   3,
  multiple_faces:  2,
  looking_away:    5,
  no_face:         5,
  tab_switch:      3,
  fullscreen_exit: 3,
  loud_noise:      5,
};

const VIOLATION_META = {
  phone_detected:  { label: "Phone Detected",            severity: "critical" },
  book_detected:   { label: "Unauthorized Material",     severity: "major"    },
  multiple_faces:  { label: "Multiple Persons Detected", severity: "critical" },
  looking_away:    { label: "Looking Away from Screen",  severity: "major"    },
  no_face:         { label: "No Face Detected",          severity: "major"    },
  tab_switch:      { label: "Tab Switch Detected",       severity: "critical" },
  fullscreen_exit: { label: "Fullscreen Exited",         severity: "major"    },
  loud_noise:      { label: "Loud Noise Detected",       severity: "minor"    },
};

const TERMINAL_ON_DISMISS = ["phone_detected", "multiple_faces"];
const INSTANT_TERMINATE   = ["phone_detected"];

function getLabel(type)    { return VIOLATION_META[type]?.label    ?? type.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase()); }
function getSeverity(type) { return VIOLATION_META[type]?.severity ?? "minor"; }

// ══════════════════════════════════════════════════════════════════════════════
// 🔒 PRE-EXAM FACE VERIFICATION MODAL
// ══════════════════════════════════════════════════════════════════════════════
function FaceVerificationModal({ onVerified, onCancel }) {
  const videoRef        = useRef(null);
  const streamRef       = useRef(null);
  const attemptsRef     = useRef(0);           // ← ref so captureAndVerify always reads current value
  const [phase, setPhase]         = useState("intro");
  const [errorMsg, setErrorMsg]   = useState("");
  const [attempts, setAttempts]   = useState(0);  // drives UI only
  const [countdown, setCountdown] = useState(3);
  const [camReady, setCamReady]   = useState(false); // ← track when video is actually playing
  const MAX_ATTEMPTS = 3;
  const token = localStorage.getItem("token") || "";

  // ── Start webcam ──────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    navigator.mediaDevices
      .getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      })
      .then(stream => {
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // play() returns a promise; wait for it before marking ready
          videoRef.current.play().catch(() => {});
        }
      })
      .catch(() => {
        if (mounted) {
          setPhase("failed");
          setErrorMsg("Camera access denied. Please allow camera permissions and try again.");
        }
      });
    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ── Mark camera as ready once video starts playing ────────────────────────
  // BUG FIX 1: readyState is checked too early (race condition).
  // We now track an explicit `camReady` flag via the onCanPlay event instead
  // of checking readyState at capture time.
  const handleCanPlay = () => setCamReady(true);

  // ── Countdown → capture trigger ───────────────────────────────────────────
  // BUG FIX 2: countdown reaching 0 called captureAndVerify() while it was
  // still a stale closure. We now use a ref-based trigger to avoid closure issues.
  const shouldCaptureRef = useRef(false);

  useEffect(() => {
    if (phase !== "scanning") return;
    if (countdown <= 0) {
      shouldCaptureRef.current = true;
      captureAndVerify();
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  const startScan = () => {
    setCountdown(3);
    setErrorMsg("");
    shouldCaptureRef.current = false;
    setPhase("scanning");
  };

  // ── Wait for video to be ready, then draw one frame ───────────────────────
  const waitForFrame = (video) =>
    new Promise((resolve, reject) => {
      // Already has data — resolve immediately
      if (video.readyState >= 2 && video.videoWidth > 0) { resolve(); return; }
      const onReady = () => { video.removeEventListener("canplay", onReady); resolve(); };
      video.addEventListener("canplay", onReady);
      // Timeout safety — don't hang forever
      setTimeout(() => { video.removeEventListener("canplay", onReady); reject(new Error("timeout")); }, 5000);
    });

  const captureAndVerify = async () => {
    setPhase("verifying");

    const video = videoRef.current;

    // BUG FIX 1 (continued): wait for the video to genuinely have frame data
    // before drawing to canvas, instead of bailing immediately.
    try {
      await waitForFrame(video);
    } catch {
      setErrorMsg("Camera timed out. Please check your camera and try again.");
      attemptsRef.current += 1;
      setAttempts(attemptsRef.current);
      setPhase(attemptsRef.current >= MAX_ATTEMPTS ? "blocked" : "failed");
      return;
    }

    // BUG FIX 3: The canvas was applying ctx.scale(-1,1) to "mirror" the frame,
    // but the backend's registered photo was taken WITHOUT mirroring (by
    // /api/register, which also receives a mirrored canvas snapshot).
    // Both snapshots must be oriented the same way for ArcFace to match them.
    //
    // The <video> CSS transform: scaleX(-1) is purely visual — drawImage()
    // always captures the RAW (un-flipped) camera frame regardless.
    //
    // At registration the snapshot sent is the MIRRORED canvas (front camera
    // appears mirrored to user, canvas flip corrects it → natural orientation).
    // Here we must send the SAME orientation: flip once so left↔right match.
    // Removing the double-flip means we just draw the raw frame = no flip needed
    // because the backend registration photo was stored WITHOUT the flip.
    //
    // RULE: match whatever /api/register sends. Register sends raw (unflipped)
    // canvas from a mirrored <video> — which equals the NATURAL camera frame.
    // So here: draw without any transform.
    const canvas = document.createElement("canvas");
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");

    // Draw the raw camera frame — no flip. This matches the registration
    // baseline which was also captured as a raw (un-flipped) frame.
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const snapshot = canvas.toDataURL("image/jpeg", 0.92);

    // BUG FIX 4: `attempts` state was stale inside this async function because
    // React state updates are batched. We use `attemptsRef` for accurate count.
    try {
      const res = await fetch(`${API_BASE}/api/verify_face`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ live_snapshot_base64: snapshot }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      if (data.verified) {
        setPhase("success");
        setTimeout(() => {
          streamRef.current?.getTracks().forEach(t => t.stop());
          onVerified();
        }, 1500);
      } else {
        attemptsRef.current += 1;
        setAttempts(attemptsRef.current);
        setErrorMsg(data.message || "Face verification failed. Please try again.");
        setPhase(attemptsRef.current >= MAX_ATTEMPTS ? "blocked" : "failed");
      }
    } catch (err) {
      attemptsRef.current += 1;
      setAttempts(attemptsRef.current);
      setErrorMsg("Verification request failed. Check your connection and try again.");
      setPhase(attemptsRef.current >= MAX_ATTEMPTS ? "blocked" : "failed");
    }
  };

  const retry = () => {
    if (attemptsRef.current >= MAX_ATTEMPTS) return;
    setErrorMsg("");
    setPhase("intro");
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>

        {/* Header */}
        <div style={styles.modalHeader}>
          <div style={styles.shieldIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <h2 style={styles.modalTitle}>Identity Verification Required</h2>
            <p style={styles.modalSubtitle}>Confirm your identity before starting the exam</p>
          </div>
        </div>

        {/* Camera feed */}
        <div style={styles.cameraWrap}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onCanPlay={handleCanPlay}
            style={{
              ...styles.cameraVideo,
              transform: "scaleX(-1)",   /* visual mirror only — does NOT affect drawImage() */
              opacity: (phase === "verifying" || phase === "success" || phase === "blocked") ? 0.5 : 1,
            }}
          />

          {/* Camera warming up indicator */}
          {!camReady && phase === "intro" && (
            <div style={{ position:"absolute", bottom:8, left:"50%", transform:"translateX(-50%)",
              background:"rgba(0,0,0,0.6)", color:"#94a3b8", fontSize:11, padding:"3px 10px",
              borderRadius:20, whiteSpace:"nowrap" }}>
              Camera warming up…
            </div>
          )}

          {/* Overlay: scanning frame */}
          <div style={styles.scanFrame}>
            <div style={{ ...styles.scanCorner, top: 0, left: 0,   borderTop: "3px solid", borderLeft: "3px solid",  borderColor: phase === "success" ? "#22c55e" : phase === "failed" || phase === "blocked" ? "#ef4444" : "#60a5fa" }} />
            <div style={{ ...styles.scanCorner, top: 0, right: 0,  borderTop: "3px solid", borderRight: "3px solid", borderColor: phase === "success" ? "#22c55e" : phase === "failed" || phase === "blocked" ? "#ef4444" : "#60a5fa" }} />
            <div style={{ ...styles.scanCorner, bottom: 0, left: 0,  borderBottom: "3px solid", borderLeft: "3px solid",  borderColor: phase === "success" ? "#22c55e" : phase === "failed" || phase === "blocked" ? "#ef4444" : "#60a5fa" }} />
            <div style={{ ...styles.scanCorner, bottom: 0, right: 0, borderBottom: "3px solid", borderRight: "3px solid", borderColor: phase === "success" ? "#22c55e" : phase === "failed" || phase === "blocked" ? "#ef4444" : "#60a5fa" }} />
          </div>

          {/* Scan animation line */}
          {phase === "scanning" && (
            <div style={styles.scanLine} />
          )}

          {/* Countdown badge */}
          {phase === "scanning" && countdown > 0 && (
            <div style={styles.countdownBadge}>{countdown}</div>
          )}

          {/* Verifying spinner */}
          {phase === "verifying" && (
            <div style={styles.phaseOverlay}>
              <div style={styles.spinner} />
              <span style={styles.phaseText}>Verifying identity…</span>
            </div>
          )}

          {/* Success */}
          {phase === "success" && (
            <div style={{ ...styles.phaseOverlay, background: "rgba(16,185,129,0.85)" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span style={styles.phaseText}>Identity Confirmed!</span>
            </div>
          )}

          {/* Blocked */}
          {phase === "blocked" && (
            <div style={{ ...styles.phaseOverlay, background: "rgba(220,38,38,0.9)" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
              </svg>
              <span style={styles.phaseText}>Access Denied</span>
            </div>
          )}
        </div>

        {/* Attempt indicators */}
        {attempts > 0 && phase !== "success" && (
          <div style={styles.attemptsWrap}>
            <span style={styles.attemptsLabel}>Attempts:</span>
            {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
              <div key={i} style={{
                ...styles.attemptDot,
                background: i < attempts ? "#ef4444" : "rgba(255,255,255,0.15)",
                border: `1px solid ${i < attempts ? "#ef4444" : "rgba(255,255,255,0.25)"}`,
              }} />
            ))}
            <span style={styles.attemptsRemaining}>
              {MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts !== 1 ? "s" : ""} remaining
            </span>
          </div>
        )}

        {/* Error message */}
        {errorMsg && phase !== "blocked" && (
          <div style={styles.errorBox}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Blocked message */}
        {phase === "blocked" && (
          <div style={{ ...styles.errorBox, background: "rgba(220,38,38,0.15)", borderColor: "#ef4444" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>Maximum verification attempts reached. You cannot access this exam. Please contact your examiner.</span>
          </div>
        )}

        {/* Instructions (intro only) */}
        {phase === "intro" && (
          <ul style={styles.tipsList}>
            <li style={styles.tipItem}>
              <span style={styles.tipDot}>•</span>
              Ensure your face is <strong>clearly visible</strong> and well-lit
            </li>
            <li style={styles.tipItem}>
              <span style={styles.tipDot}>•</span>
              Look <strong>directly at the camera</strong> and stay still
            </li>
            <li style={styles.tipItem}>
              <span style={styles.tipDot}>•</span>
              Remove hats, glasses, or anything obscuring your face
            </li>
          </ul>
        )}

        {/* Action buttons */}
        <div style={styles.actions}>
          {(phase === "intro") && (
            <>
              <button style={styles.btnSecondary} onClick={onCancel}>Cancel</button>
              <button
                style={{ ...styles.btnPrimary, opacity: camReady ? 1 : 0.5, cursor: camReady ? "pointer" : "not-allowed" }}
                onClick={startScan}
                disabled={!camReady}
                title={!camReady ? "Camera is warming up, please wait…" : undefined}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                </svg>
                {camReady ? "Begin Verification" : "Camera warming up…"}
              </button>
            </>
          )}
          {phase === "failed" && attempts < MAX_ATTEMPTS && (
            <>
              <button style={styles.btnSecondary} onClick={onCancel}>Cancel</button>
              <button style={styles.btnPrimary} onClick={retry}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="1 4 1 10 7 10"/>
                  <path d="M3.51 15a9 9 0 1 0 .49-3.75"/>
                </svg>
                Try Again
              </button>
            </>
          )}
          {phase === "blocked" && (
            <button style={{ ...styles.btnSecondary, flex: 1 }} onClick={onCancel}>Return to Dashboard</button>
          )}
          {(phase === "scanning" || phase === "verifying") && (
            <button style={{ ...styles.btnSecondary, flex: 1, opacity: 0.5, cursor: "not-allowed" }} disabled>
              {phase === "scanning" ? `Capturing in ${countdown}s…` : "Verifying…"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

// Inline styles for the modal (self-contained, no CSS file dependency)
const styles = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 9999,
    background: "rgba(0,0,0,0.85)",
    backdropFilter: "blur(8px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "1rem",
  },
  modal: {
    background: "linear-gradient(145deg, #0f172a 0%, #1e293b 100%)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "20px",
    padding: "2rem",
    width: "100%",
    maxWidth: "500px",
    boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  modalHeader: {
    display: "flex", alignItems: "center", gap: "1rem",
  },
  shieldIcon: {
    width: 52, height: 52, borderRadius: "14px",
    background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
    boxShadow: "0 4px 20px rgba(59,130,246,0.4)",
  },
  modalTitle: {
    margin: 0, fontSize: "1.2rem", fontWeight: 700,
    color: "#f1f5f9", lineHeight: 1.2,
  },
  modalSubtitle: {
    margin: "0.2rem 0 0", fontSize: "0.85rem",
    color: "#94a3b8",
  },
  cameraWrap: {
    position: "relative", width: "100%", aspectRatio: "16/9",
    borderRadius: "12px", overflow: "hidden",
    background: "#0a0f1a",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  cameraVideo: {
    width: "100%", height: "100%",
    objectFit: "cover", display: "block",
  },
  scanFrame: {
    position: "absolute", inset: "10%",
    pointerEvents: "none",
  },
  scanCorner: {
    position: "absolute", width: 24, height: 24,
    transition: "border-color 0.3s",
  },
  scanLine: {
    position: "absolute", left: "10%", right: "10%", height: "2px",
    background: "linear-gradient(90deg, transparent, #60a5fa, transparent)",
    animation: "scanMove 1.8s ease-in-out infinite",
    top: "10%",
    // NOTE: add @keyframes scanMove to ExamPage.css:
    // @keyframes scanMove { 0%,100%{top:10%} 50%{top:85%} }
  },
  countdownBadge: {
    position: "absolute", top: "50%", left: "50%",
    transform: "translate(-50%,-50%)",
    fontSize: "5rem", fontWeight: 900,
    color: "rgba(96,165,250,0.9)",
    textShadow: "0 0 30px rgba(96,165,250,0.6)",
    lineHeight: 1, pointerEvents: "none",
    animation: "countPulse 1s ease-in-out",
  },
  phaseOverlay: {
    position: "absolute", inset: 0,
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", gap: "0.75rem",
    background: "rgba(15,23,42,0.75)",
    backdropFilter: "blur(4px)",
  },
  phaseText: {
    color: "#fff", fontSize: "1.05rem", fontWeight: 600,
    textAlign: "center",
  },
  spinner: {
    width: 44, height: 44, borderRadius: "50%",
    border: "3px solid rgba(255,255,255,0.15)",
    borderTopColor: "#60a5fa",
    animation: "spin 0.8s linear infinite",
  },
  attemptsWrap: {
    display: "flex", alignItems: "center", gap: "0.5rem",
  },
  attemptsLabel: { color: "#64748b", fontSize: "0.8rem" },
  attemptDot: {
    width: 10, height: 10, borderRadius: "50%",
    transition: "background 0.3s",
  },
  attemptsRemaining: { color: "#94a3b8", fontSize: "0.8rem", marginLeft: "0.25rem" },
  errorBox: {
    display: "flex", alignItems: "flex-start", gap: "0.6rem",
    background: "rgba(239,68,68,0.1)",
    border: "1px solid rgba(239,68,68,0.3)",
    borderRadius: "10px", padding: "0.75rem 1rem",
    color: "#fca5a5", fontSize: "0.875rem", lineHeight: 1.5,
  },
  tipsList: {
    margin: 0, padding: 0, listStyle: "none",
    display: "flex", flexDirection: "column", gap: "0.5rem",
  },
  tipItem: {
    display: "flex", alignItems: "flex-start", gap: "0.5rem",
    color: "#94a3b8", fontSize: "0.875rem", lineHeight: 1.5,
  },
  tipDot: { color: "#3b82f6", fontWeight: 700, marginTop: "0.1rem" },
  actions: {
    display: "flex", gap: "0.75rem",
  },
  btnPrimary: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    gap: "0.5rem", padding: "0.75rem 1.25rem",
    background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
    color: "#fff", border: "none", borderRadius: "10px",
    fontSize: "0.95rem", fontWeight: 600, cursor: "pointer",
    boxShadow: "0 4px 15px rgba(59,130,246,0.35)",
    transition: "opacity 0.2s",
  },
  btnSecondary: {
    flex: 1, padding: "0.75rem 1.25rem",
    background: "rgba(255,255,255,0.06)",
    color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "10px", fontSize: "0.95rem", fontWeight: 500,
    cursor: "pointer", transition: "background 0.2s",
  },
};

// ── Violation icon ────────────────────────────────────────────────────────────
function ViolationIcon({ type, size = 18 }) {
  const s = size;
  switch (type) {
    case "no_face":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/><line x1="2" y1="2" x2="22" y2="22" strokeWidth="2.5"/></svg>;
    case "multiple_faces":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case "phone_detected":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>;
    case "looking_away":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><line x1="2" y1="2" x2="22" y2="22" strokeWidth="2.5"/></svg>;
    case "tab_switch":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>;
    case "loud_noise":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>;
    case "fullscreen_exit":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>;
    default:
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
  }
}

// ── Violation popup ───────────────────────────────────────────────────────────
function ViolationPopup({ violation, count, threshold, onDismiss }) {
  const severity       = getSeverity(violation);
  const remaining      = threshold ? threshold - count : null;
  const isTerminalType = TERMINAL_ON_DISMISS.includes(violation);

  useEffect(() => {
    if (isTerminalType) return;
    const t = setTimeout(onDismiss, 8000);
    return () => clearTimeout(t);
  }, [violation, isTerminalType, onDismiss]);

  const dismissLabel = isTerminalType ? "I understand — end my exam" : "Understood";

  return (
    <div className={`violation-popup popup-${severity}`}>
      <div className="popup-glow"></div>
      <button className="popup-close-x" onClick={onDismiss} title="Close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      <div className="popup-header">
        <div className="popup-icon-wrap"><ViolationIcon type={violation} size={28} /></div>
        <div className="popup-title-group">
          <span className="popup-severity-tag">
            {severity === "critical" ? "⚠ Critical Violation" : "⚠ Warning"}
          </span>
          <h3 className="popup-title">{getLabel(violation)}</h3>
        </div>
      </div>
      <p className="popup-body">
        {violation === "phone_detected"  && "Mobile phone detected. Your exam is being terminated immediately. This incident has been recorded."}
        {violation === "multiple_faces"  && "Multiple persons were detected. Only you may be present during the exam. Acknowledging will terminate your exam."}
        {violation === "looking_away"    && `Keep your eyes on the screen at all times.${remaining > 0 ? ` ${remaining} warning(s) remaining before termination.` : " Final warning!"}`}
        {violation === "tab_switch"      && `Switching tabs or windows is not allowed.${remaining > 0 ? ` ${remaining} violation(s) remaining before termination.` : " Final warning!"}`}
        {violation === "no_face"         && `Your face must remain visible to the camera.${remaining > 0 ? ` ${remaining} warning(s) remaining.` : " Final warning!"}`}
        {violation === "book_detected"   && `Unauthorized materials detected.${remaining > 0 ? ` ${remaining} violation(s) remaining.` : " Final warning!"}`}
        {violation === "fullscreen_exit" && `You must remain in fullscreen mode.${remaining > 0 ? ` ${remaining} violation(s) remaining.` : " Final warning!"}`}
        {violation === "loud_noise"      && "Loud noise was detected. Please maintain silence during the exam."}
        {!VIOLATION_META[violation]      && "A proctoring violation was detected."}
      </p>
      {remaining !== null && threshold > 1 && (
        <div className="popup-counter">
          {Array.from({ length: threshold }).map((_, i) => (
            <span key={i} className={`counter-dot ${i < count ? "used" : ""}`}></span>
          ))}
          <span className="counter-label">{count}/{threshold}</span>
        </div>
      )}
      {!isTerminalType && <div className="popup-timer-bar"><div className="popup-timer-fill"></div></div>}
      <button
        className={`popup-dismiss ${isTerminalType ? "popup-dismiss-terminal" : ""}`}
        onClick={onDismiss}
      >
        {dismissLabel}
      </button>
    </div>
  );
}

// ── Termination modal ─────────────────────────────────────────────────────────
function TerminationModal({ reason, onRedirect }) {
  useEffect(() => {
    const t = setTimeout(onRedirect, 8000);
    return () => clearTimeout(t);
  }, [onRedirect]);

  return (
    <div className="termination-overlay">
      <div className="termination-modal">
        <div className="termination-icon">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <h2>Exam Terminated</h2>
        <p className="termination-reason">Reason: <strong>{getLabel(reason)}</strong></p>
        <p className="termination-body">
          Your exam session has been permanently terminated due to a proctoring violation.
          This incident has been recorded and will be reviewed by the examiner.
        </p>
        <div className="termination-redirect">
          <div className="redirect-bar"><div className="redirect-fill"></div></div>
          <span>Redirecting in 8 seconds…</span>
        </div>
        <button className="termination-btn" onClick={onRedirect}>Return to Dashboard</button>
      </div>
    </div>
  );
}

// ── Backend MJPEG Camera Preview ──────────────────────────────────────────────
function CameraPreview({ token, streamError, onStreamError }) {
  const [imgSrc, setImgSrc] = useState(null);

  useEffect(() => {
    if (!token) return;
    const url = `${API_BASE}/api/video_feed?token=${encodeURIComponent(token)}`;
    setImgSrc(url);
  }, [token]);

  return (
    <div className="camera-section">
      <div className="camera-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
        <span>Proctoring</span>
        <div className="live-indicator">
          <span className="live-dot"></span>LIVE
        </div>
      </div>
      <div className="camera-box">
        {streamError ? (
          <div className="cam-error">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <line x1="2" y1="2" x2="22" y2="22"/>
            </svg>
            <span>Camera unavailable</span>
          </div>
        ) : imgSrc ? (
          <>
            <img
              src={imgSrc}
              alt="Proctoring feed"
              className="proctor-stream"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={() => onStreamError(true)}
            />
            <div className="camera-overlay">
              <div className="recording-badge">
                <span className="rec-dot"></span>Recording
              </div>
              <div className="ai-badge">
                <span>AI Active</span>
              </div>
            </div>
          </>
        ) : (
          <div className="cam-error">
            <div className="loading-spinner" style={{ width: 24, height: 24 }} />
            <span>Connecting to proctor…</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ExamPage ─────────────────────────────────────────────────────────────
function ExamPage() {
  const navigate   = useNavigate();
  const { examId } = useParams();

  // ── NEW: gate state — "verifying" | "verified" | "cancelled"
  const [verificationState, setVerificationState] = useState("verifying");

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers]  = useState({});
  const [animate,         setAnimate]          = useState(false);
  const [timeRemaining,   setTimeRemaining]    = useState(0);
  const [examData,        setExamData]         = useState(null);
  const [questions,       setQuestions]        = useState([]);
  const [loading,         setLoading]          = useState(true);
  const [error,           setError]            = useState("");
  const [userExamId,      setUserExamId]       = useState(null);
  const [isSubmitting,    setIsSubmitting]     = useState(false);
  const [streamError,     setStreamError]      = useState(false);

  const token = localStorage.getItem("token") || "";

  const videoRef  = useRef(null);
  const streamRef = useRef(null);

  const [violationCounts,   setViolationCounts]   = useState({});
  const [activePopup,       setActivePopup]       = useState(null);
  const [terminated,        setTerminated]        = useState(false);
  const [terminationReason, setTerminationReason] = useState("");

  const popupQueueRef   = useRef([]);
  const showingPopupRef = useRef(false);
  const tabViolations   = useRef(0);
  const fsViolations    = useRef(0);
  const terminatedRef   = useRef(false);

  // ── Load exam data as soon as the page mounts (before verification) ────────
  // This way the exam is ready to go the moment verification passes.
  useEffect(() => {
    setAnimate(true);
    initializeExam();
  }, [examId]);

  const initializeExam = async () => {
    try {
      setLoading(true);
      const examDetails = await getExamDetails(examId);
      setExamData(examDetails);
      setQuestions(examDetails.questions || []);
      setTimeRemaining(examDetails.duration * 60);
      // NOTE: startExam() is called AFTER verification passes (see handleVerified)
    } catch {
      setError("Failed to load exam. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Called when face verification succeeds ─────────────────────────────────
  const handleVerified = useCallback(async () => {
    setVerificationState("verified");
    try {
      const startResponse = await startExam(examId);
      setUserExamId(startResponse.user_exam_id);
    } catch {
      setError("Failed to start exam after verification. Please try again.");
    }
  }, [examId]);

  // ── Called when student cancels verification ───────────────────────────────
  const handleVerificationCancelled = useCallback(() => {
    navigate("/exams");
  }, [navigate]);

  // ── Hidden webcam for audio detection ─────────────────────────────────────
  useEffect(() => {
    // Only open the proctoring stream after verification is done
    if (loading || verificationState !== "verified") return;
    let mounted = true;
    navigator.mediaDevices
      .getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      .then(stream => {
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => { if (mounted) setStreamError(true); });
    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [loading, verificationState]);

  // ── Popup queue ───────────────────────────────────────────────────────────
  const shiftQueue = useCallback(() => {
    if (popupQueueRef.current.length === 0) {
      showingPopupRef.current = false;
      setActivePopup(null);
      return;
    }
    showingPopupRef.current = true;
    setActivePopup(popupQueueRef.current.shift());
  }, []);

  const enqueuePopup = useCallback((type) => {
    if (terminatedRef.current) return;
    if (!popupQueueRef.current.includes(type)) {
      popupQueueRef.current.push(type);
    }
    if (!showingPopupRef.current) shiftQueue();
  }, [shiftQueue]);

  // ── Termination ───────────────────────────────────────────────────────────
  const triggerTermination = useCallback(async (reason) => {
    if (terminatedRef.current) return;
    terminatedRef.current = true;
    setTerminated(true);
    setTerminationReason(reason);
    setActivePopup(null);
    popupQueueRef.current = [];
    streamRef.current?.getTracks().forEach(t => t.stop());
    try {
      await fetch(`${API_BASE}/api/student/exams/${examId}/terminate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason }),
      });
    } catch (_) {}
  }, [examId, token]);

  const dismissPopup = useCallback((type) => {
    shiftQueue();
    if (TERMINAL_ON_DISMISS.includes(type)) {
      triggerTermination(type);
    }
  }, [shiftQueue, triggerTermination]);

  // ── Frame capture ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || verificationState !== "verified") return;

    const captureAndSend = async () => {
      if (terminatedRef.current) return;

      const video  = videoRef.current;
      const canvas = document.getElementById("capture-canvas");
      if (!video || !canvas || video.readyState < 2) return;

      canvas.width  = video.videoWidth  || 1280;
      canvas.height = video.videoHeight || 720;
      canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        if (!blob || terminatedRef.current) return;

        const fd = new FormData();
        fd.append("frame", blob, "frame.jpg");

        try {
          const res = await fetch(`${API_BASE}/api/analyze_frame`, {
            method:  "POST",
            headers: { Authorization: `Bearer ${token}` },
            body:    fd,
          });

          if (!res.ok) return;
          const data = await res.json();

          if (data.instant_terminate) {
            enqueuePopup(data.terminate_reason);
            setTimeout(() => {
              if (!terminatedRef.current) triggerTermination(data.terminate_reason);
            }, 1500);
            return;
          }

          if (Array.isArray(data.violations)) {
            data.violations.forEach(vType => {
              setViolationCounts(prev => ({ ...prev, [vType]: (prev[vType] ?? 0) + 1 }));
              if (INSTANT_TERMINATE.includes(vType) && !terminatedRef.current) {
                enqueuePopup(vType);
                setTimeout(() => { if (!terminatedRef.current) triggerTermination(vType); }, 1500);
              } else {
                enqueuePopup(vType);
              }
            });
          }
        } catch (_) {}
      }, "image/jpeg", 0.85);
    };

    const interval = setInterval(captureAndSend, FRAME_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loading, verificationState, enqueuePopup, triggerTermination, token]);

  // ── Tab-switch ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || verificationState !== "verified") return;
    const handle = async () => {
      if (!document.hidden || terminatedRef.current) return;
      tabViolations.current += 1;
      const count = tabViolations.current;
      setViolationCounts(prev => ({ ...prev, tab_switch: count }));
      fetch(`${API_BASE}/api/log_violation`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: "tab_switch" }),
      }).catch(() => {});
      enqueuePopup("tab_switch");
      if (count >= TERM_THRESHOLDS.tab_switch) {
        setTimeout(() => { if (!terminatedRef.current) triggerTermination("tab_switch"); }, 6000);
      }
    };
    document.addEventListener("visibilitychange", handle);
    return () => document.removeEventListener("visibilitychange", handle);
  }, [loading, verificationState, enqueuePopup, triggerTermination, token]);

  // ── Fullscreen ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || verificationState !== "verified") return;
    document.documentElement.requestFullscreen?.().catch(() => {});
    const handle = async () => {
      if (document.fullscreenElement || terminatedRef.current) return;
      fsViolations.current += 1;
      const count = fsViolations.current;
      setViolationCounts(prev => ({ ...prev, fullscreen_exit: count }));
      fetch(`${API_BASE}/api/log_violation`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: "fullscreen_exit" }),
      }).catch(() => {});
      enqueuePopup("fullscreen_exit");
      if (count >= TERM_THRESHOLDS.fullscreen_exit) {
        setTimeout(() => { if (!terminatedRef.current) triggerTermination("fullscreen_exit"); }, 6000);
      }
    };
    document.addEventListener("fullscreenchange", handle);
    return () => document.removeEventListener("fullscreenchange", handle);
  }, [loading, verificationState, enqueuePopup, triggerTermination, token]);

  // ── Backend poll ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || verificationState !== "verified") return;
    const poll = setInterval(async () => {
      if (terminatedRef.current) { clearInterval(poll); return; }
      try {
        const res = await fetch(`${API_BASE}/api/violations/latest`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.counts) {
          setViolationCounts(prev => {
            const merged = { ...prev };
            for (const [k, v] of Object.entries(data.counts)) {
              if ((v ?? 0) > (merged[k] ?? 0)) merged[k] = v;
            }
            return merged;
          });
        }
        if (data.terminated) { triggerTermination(data.reason || "proctoring_violation"); return; }
        data.violations?.forEach(v => {
          if (INSTANT_TERMINATE.includes(v) && !terminatedRef.current) {
            enqueuePopup(v);
            setTimeout(() => { if (!terminatedRef.current) triggerTermination(v); }, 1500);
          } else {
            enqueuePopup(v);
          }
        });
      } catch (_) {}
    }, 5000);
    return () => clearInterval(poll);
  }, [loading, verificationState, enqueuePopup, triggerTermination, token]);

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timeRemaining <= 0 || loading || terminated || verificationState !== "verified") return;
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) { handleSubmitExam(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeRemaining, loading, terminated, verificationState]);

  const formatTime = s =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmitExam = async () => {
    if (isSubmitting) return;
    const unanswered = questions.length - Object.keys(selectedAnswers).length;
    if (unanswered > 0 && !window.confirm(`${unanswered} question(s) unanswered. Submit anyway?`)) return;
    setIsSubmitting(true);
    try {
      const result = await submitExam(examId, userExamId, selectedAnswers);
      alert(`Submitted!\nScore: ${result.score.toFixed(2)}%\nMarks: ${result.marks_obtained}/${result.total_marks}`);
      navigate("/results");
    } catch {
      alert("Failed to submit. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleRedirectAfterTermination = useCallback(() => navigate("/home"), [navigate]);
  const answeredCount = Object.keys(selectedAnswers).length;
  const progress      = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  // ── Render: show verification modal first, before anything else ───────────
  if (verificationState === "verifying") {
    return (
      <>
        {/* Blurred exam preview behind the modal */}
        <div style={{ filter: "blur(8px)", pointerEvents: "none", userSelect: "none", minHeight: "100vh", background: "#0f172a" }} />
        <FaceVerificationModal
          onVerified={handleVerified}
          onCancel={handleVerificationCancelled}
        />
      </>
    );
  }

  // ── Render guards ─────────────────────────────────────────────────────────
  if (loading) return (
    <div className="exam-loading"><div className="loading-spinner"></div><p>Loading exam…</p></div>
  );
  if (error) return (
    <div className="exam-error">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <h3>{error}</h3>
      <button onClick={() => navigate("/exams")} className="back-to-exams-btn">Back to Exams</button>
    </div>
  );
  if (!examData || questions.length === 0) return (
    <div className="exam-error">
      <h3>No questions available for this exam</h3>
      <button onClick={() => navigate("/exams")} className="back-to-exams-btn">Back to Exams</button>
    </div>
  );

  const currentQuestionData = questions[currentQuestion];
  const currentQuestionId   = currentQuestionData.id;
  const selectedOptionId    = selectedAnswers[currentQuestionId];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`exam-page ${animate ? "exam-enter" : ""}`}>

      {terminated && (
        <TerminationModal reason={terminationReason} onRedirect={handleRedirectAfterTermination} />
      )}

      {activePopup && !terminated && (
        <div
          className="popup-backdrop"
          onClick={() => !TERMINAL_ON_DISMISS.includes(activePopup) && dismissPopup(activePopup)}
        >
          <div onClick={e => e.stopPropagation()}>
            <ViolationPopup
              violation={activePopup}
              count={violationCounts[activePopup] ?? 1}
              threshold={TERM_THRESHOLDS[activePopup]}
              onDismiss={() => dismissPopup(activePopup)}
            />
          </div>
        </div>
      )}

      {/* Toast strip */}
      <div className="toast-strip">
        {Object.entries(violationCounts).filter(([, c]) => c > 0).map(([type, count]) => (
          <div key={type} className={`toast-chip chip-${getSeverity(type)}`}>
            <ViolationIcon type={type} size={14} />
            <span>{getLabel(type)}</span>
            {TERM_THRESHOLDS[type] && (
              <span className="chip-count">{count}/{TERM_THRESHOLDS[type]}</span>
            )}
          </div>
        ))}
      </div>

      {/* Top bar */}
      <div className="exam-top-bar">
        <div className="exam-brand">
          <div className="brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span>EduShield</span>
        </div>
        <div className="exam-title-info">
          <h1>{examData.title}</h1>
          <span className="exam-code">EXAM-{examData.id}</span>
        </div>
        <div className={`timer-display ${timeRemaining < 300 ? "timer-warning" : ""}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>{formatTime(timeRemaining)}</span>
        </div>
      </div>

      <div className="exam-container">
        <div className="exam-sidebar">

          <CameraPreview
            token={token}
            streamError={streamError}
            onStreamError={setStreamError}
          />

          <video ref={videoRef} autoPlay playsInline muted style={{ display: "none" }} />
          <canvas id="capture-canvas" style={{ display: "none" }} />

          <div className="violation-summary">
            {Object.entries(TERM_THRESHOLDS).map(([type, threshold]) => {
              const count = violationCounts[type] ?? 0;
              if (count === 0) return null;
              const pct = Math.min((count / threshold) * 100, 100);
              return (
                <div key={type} className={`vsummary-row sev-${getSeverity(type)}`}>
                  <div className="vsummary-info">
                    <ViolationIcon type={type} size={14} />
                    <span className="vsummary-label">{getLabel(type)}</span>
                    <span className="vsummary-count">{count}/{threshold}</span>
                  </div>
                  <div className="vsummary-bar">
                    <div className="vsummary-fill" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
            {Object.values(violationCounts).every(c => c === 0) && (
              <div className="vsummary-clean">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span>No violations</span>
              </div>
            )}
          </div>

          <div className="progress-section">
            <div className="progress-header">
              <span>Progress</span>
              <span className="progress-count">{answeredCount}/{questions.length}</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <p className="progress-text">{answeredCount} questions answered</p>
          </div>

          <div className="question-navigator">
            <h4>Questions</h4>
            <div className="question-grid">
              {questions.map((q, index) => (
                <button
                  key={q.id}
                  className={`question-number ${currentQuestion === index ? "active" : ""} ${selectedAnswers[q.id] !== undefined ? "answered" : ""}`}
                  onClick={() => setCurrentQuestion(index)}
                >{index + 1}</button>
              ))}
            </div>
          </div>

          <button
            className="submit-exam-btn"
            onClick={handleSubmitExam}
            disabled={isSubmitting || terminated}
          >
            {isSubmitting
              ? <><div className="button-spinner"></div>Submitting…</>
              : <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>Submit Exam</>
            }
          </button>
        </div>

        <div className="exam-main">
          <div className="question-container">
            <div className="question-header">
              <span className="question-label">Question {currentQuestion + 1} of {questions.length}</span>
              <div className="question-status">
                {selectedAnswers[currentQuestionId] !== undefined
                  ? <span className="status-answered"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>Answered</span>
                  : <span className="status-unanswered">Not Answered</span>
                }
              </div>
            </div>
            <div className="question-content">
              <h2 className="question-text">{currentQuestionData.text}</h2>
              <div className="options-container">
                {currentQuestionData.options.map((opt, index) => (
                  <label key={opt.id} className={`option-card ${selectedOptionId === opt.id ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name={`question-${currentQuestionId}`}
                      checked={selectedOptionId === opt.id}
                      onChange={() => setSelectedAnswers({ ...selectedAnswers, [currentQuestionId]: opt.id })}
                    />
                    <div className="option-indicator">
                      <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                    </div>
                    <span className="option-text">{opt.text}</span>
                    <div className="option-check">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="exam-navigation">
            <button className="nav-btn prev-btn"
              disabled={currentQuestion === 0}
              onClick={() => setCurrentQuestion(currentQuestion - 1)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
              </svg>Previous
            </button>
            <div className="question-dots">
              {questions.map((_, i) => (
                <span key={i} className={`dot ${currentQuestion === i ? "active" : ""}`}></span>
              ))}
            </div>
            <button className="nav-btn next-btn"
              disabled={currentQuestion === questions.length - 1}
              onClick={() => setCurrentQuestion(currentQuestion + 1)}
            >
              Next
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExamPage;