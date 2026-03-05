import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getExamDetails, startExam, submitExam } from "../services/api";
import "../css/ExamPage.css";

const API_BASE = "http://localhost:5001";
const FRAME_INTERVAL_MS = 3000;

// ── Termination thresholds ────────────────────────────────────────────────────
const TERM_THRESHOLDS = {
  phone_detected:  1,   // IMMEDIATE — first detection terminates
  book_detected:   3,
  multiple_faces:  2,
  looking_away:    5,
  no_face:         5,
  tab_switch:      3,
  fullscreen_exit: 3,
  loud_noise:      5,
};

const VIOLATION_META = {
  phone_detected:  { label: "Phone Detected",           severity: "critical" },
  book_detected:   { label: "Unauthorized Material",    severity: "major"    },
  multiple_faces:  { label: "Multiple Persons Detected", severity: "critical" },
  looking_away:    { label: "Looking Away from Screen", severity: "major"    },
  no_face:         { label: "No Face Detected",         severity: "major"    },
  tab_switch:      { label: "Tab Switch Detected",      severity: "critical" },
  fullscreen_exit: { label: "Fullscreen Exited",        severity: "major"    },
  loud_noise:      { label: "Loud Noise Detected",      severity: "minor"    },
};

// These show a "this will terminate your exam" message and terminate on dismiss
const TERMINAL_ON_DISMISS  = ["phone_detected", "multiple_faces"];
// These terminate immediately without waiting for dismiss
const INSTANT_TERMINATE    = ["phone_detected"];

function getLabel(type)    { return VIOLATION_META[type]?.label    ?? type.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase()); }
function getSeverity(type) { return VIOLATION_META[type]?.severity ?? "minor"; }

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
// Replaces the plain <video> element with the annotated backend stream.
// The backend draws bounding boxes, face mesh, and violation banners directly
// onto each frame, so the student sees the same annotated view.
function CameraPreview({ token, streamError, onStreamError }) {
  const [imgSrc, setImgSrc] = useState(null);

  useEffect(() => {
    if (!token) return;
    // Build the MJPEG stream URL with the JWT in the query string
    // (browser <img> tags cannot set Authorization headers)
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
            {/* MJPEG stream from backend — fully annotated with bounding boxes */}
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

  // Token for MJPEG stream URL
  const token = localStorage.getItem("token") || "";

  // We still keep a hidden canvas + video for sending frames to /api/analyze_frame
  // (for audio detection and any supplemental analysis)
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

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    setAnimate(true);
    initializeExam();
  }, [examId]);

  const initializeExam = async () => {
    try {
      setLoading(true);
      const examDetails   = await getExamDetails(examId);
      setExamData(examDetails);
      setQuestions(examDetails.questions || []);
      setTimeRemaining(examDetails.duration * 60);
      const startResponse = await startExam(examId);
      setUserExamId(startResponse.user_exam_id);
    } catch {
      setError("Failed to load exam. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Hidden webcam for audio detection (backend stream handles video) ───────
  // We still open a local stream so the browser audio monitor can work,
  // but we DON'T display this video — the backend MJPEG stream is shown instead.
  useEffect(() => {
    if (loading) return;
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
  }, [loading]);

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

  // ── Frame capture — still used for supplemental analysis (audio, etc.) ────
  // NOTE: The backend MJPEG stream now handles the primary vision analysis.
  // This path is kept for audio violation detection which is backend-only.
  useEffect(() => {
    if (loading) return;

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

          // ── INSTANT TERMINATION: phone detected ───────────────────────────
          // Backend sets instant_terminate=true for phone_detected.
          // We terminate immediately without waiting for popup dismiss.
          if (data.instant_terminate) {
            enqueuePopup(data.terminate_reason);
            // Brief delay so popup renders before we terminate
            setTimeout(() => {
              if (!terminatedRef.current) {
                triggerTermination(data.terminate_reason);
              }
            }, 1500);
            return;
          }

          if (Array.isArray(data.violations)) {
            data.violations.forEach(vType => {
              setViolationCounts(prev => ({
                ...prev,
                [vType]: (prev[vType] ?? 0) + 1,
              }));

              // Instant terminate types get special handling even if backend
              // didn't flag instant_terminate (e.g. race condition)
              if (INSTANT_TERMINATE.includes(vType) && !terminatedRef.current) {
                enqueuePopup(vType);
                setTimeout(() => {
                  if (!terminatedRef.current) triggerTermination(vType);
                }, 1500);
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
  }, [loading, enqueuePopup, triggerTermination, token]);

  // ── Tab-switch ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading) return;
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
        setTimeout(() => {
          if (!terminatedRef.current) triggerTermination("tab_switch");
        }, 6000);
      }
    };
    document.addEventListener("visibilitychange", handle);
    return () => document.removeEventListener("visibilitychange", handle);
  }, [loading, enqueuePopup, triggerTermination, token]);

  // ── Fullscreen ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading) return;
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
        setTimeout(() => {
          if (!terminatedRef.current) triggerTermination("fullscreen_exit");
        }, 6000);
      }
    };
    document.addEventListener("fullscreenchange", handle);
    return () => document.removeEventListener("fullscreenchange", handle);
  }, [loading, enqueuePopup, triggerTermination, token]);

  // ── Backend poll — catch audio violations + admin termination ─────────────
  useEffect(() => {
    if (loading) return;

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

        if (data.terminated) {
          triggerTermination(data.reason || "proctoring_violation");
          return;
        }

        // Audio and any backend-only violations
        data.violations?.forEach(v => {
          if (INSTANT_TERMINATE.includes(v) && !terminatedRef.current) {
            enqueuePopup(v);
            setTimeout(() => {
              if (!terminatedRef.current) triggerTermination(v);
            }, 1500);
          } else {
            enqueuePopup(v);
          }
        });

      } catch (_) {}
    }, 5000);

    return () => clearInterval(poll);
  }, [loading, enqueuePopup, triggerTermination, token]);

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timeRemaining <= 0 || loading || terminated) return;
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) { handleSubmitExam(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeRemaining, loading, terminated]);

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

          {/* Backend MJPEG annotated stream */}
          <CameraPreview
            token={token}
            streamError={streamError}
            onStreamError={setStreamError}
          />

          {/* Hidden video + canvas for supplemental frame sending */}
          <video
            ref={videoRef}
            autoPlay playsInline muted
            style={{ display: "none" }}
          />
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