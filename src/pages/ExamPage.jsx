import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getExamDetails, startExam, submitExam } from "../services/api";
import "../css/ExamPage.css";

const API_BASE = "http://localhost:5001";

function ExamPage() {
  const navigate = useNavigate();
  const { examId } = useParams();

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [animate, setAnimate] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [examData, setExamData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userExamId, setUserExamId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Violation alerts state
  const [alerts, setAlerts] = useState([]);
  const alertIdRef = useRef(0);
  const alertTimeoutsRef = useRef({});

  // ── fetch exam + start attempt ──────────────────────────────────────────────
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

      const startResponse = await startExam(examId);
      setUserExamId(startResponse.user_exam_id);
      setLoading(false);
    } catch (err) {
      console.error("Failed to initialize exam:", err);
      setError("Failed to load exam. Please try again.");
      setLoading(false);
    }
  };

  // ── Poll backend for violations ─────────────────────────────────────────────
  const addAlert = useCallback((type) => {
    const id = ++alertIdRef.current;
    const label = formatViolationLabel(type);
    const severity = getSeverity(type);

    setAlerts((prev) => {
      // Avoid duplicate alerts of same type within 5 s
      const exists = prev.find((a) => a.type === type);
      if (exists) return prev;
      return [{ id, type, label, severity }, ...prev].slice(0, 5);
    });

    // Auto-dismiss after 6 s
    const t = setTimeout(() => {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      delete alertTimeoutsRef.current[id];
    }, 6000);
    alertTimeoutsRef.current[id] = t;
  }, []);

  const dismissAlert = (id) => {
    clearTimeout(alertTimeoutsRef.current[id]);
    delete alertTimeoutsRef.current[id];
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  // Poll /api/violations/latest every 3 s
  useEffect(() => {
    if (loading) return;
    const token = localStorage.getItem("token");

    const poll = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/violations/latest`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.violations && Array.isArray(data.violations)) {
          data.violations.forEach((v) => addAlert(v));
        }
      } catch (_) {}
    }, 3000);

    return () => clearInterval(poll);
  }, [loading, addAlert]);

  // Cleanup alert timers on unmount
  useEffect(() => {
    return () => {
      Object.values(alertTimeoutsRef.current).forEach(clearTimeout);
    };
  }, []);

  // ── Timer countdown ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (timeRemaining <= 0 || loading) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, loading]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatViolationLabel = (type) => {
    const map = {
      no_face: "No Face Detected",
      multiple_faces: "Multiple Faces Detected",
      looking_away: "Looking Away from Screen",
      phone_detected: "Phone Detected",
      loud_noise: "Loud Noise Detected",
      tab_switch: "Tab Switch Detected",
      fullscreen_exit: "Fullscreen Exited",
    };
    return map[type] || type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const getSeverity = (type) => {
    const major = ["multiple_faces", "phone_detected", "tab_switch"];
    if (major.includes(type)) return "major";
    return "minor";
  };

  const getAlertIcon = (type) => {
    const icons = {
      no_face: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          <line x1="2" y1="2" x2="22" y2="22" strokeWidth="2.5"/>
        </svg>
      ),
      multiple_faces: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      phone_detected: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="5" y="2" width="14" height="20" rx="2"/>
          <line x1="12" y1="18" x2="12.01" y2="18"/>
        </svg>
      ),
      loud_noise: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
        </svg>
      ),
    };
    return icons[type] || (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    );
  };

  const handleAnswerSelect = (optionId) => {
    const questionId = questions[currentQuestion].id;
    setSelectedAnswers({ ...selectedAnswers, [questionId]: optionId });
  };

  const handleSubmitExam = async () => {
    if (isSubmitting) return;

    const unansweredCount = questions.length - Object.keys(selectedAnswers).length;
    if (unansweredCount > 0) {
      const confirmSubmit = window.confirm(
        `You have ${unansweredCount} unanswered question(s). Are you sure you want to submit?`
      );
      if (!confirmSubmit) return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitExam(examId, userExamId, selectedAnswers);
      alert(
        `Exam submitted successfully!\nScore: ${result.score.toFixed(2)}%\nMarks: ${result.marks_obtained}/${result.total_marks}`
      );
      navigate("/results");
    } catch (err) {
      console.error("Failed to submit exam:", err);
      alert("Failed to submit exam. Please try again.");
      setIsSubmitting(false);
    }
  };

  const answeredCount = Object.keys(selectedAnswers).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  // ── Loading / Error states ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="exam-loading">
        <div className="loading-spinner"></div>
        <p>Loading exam...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="exam-error">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <h3>{error}</h3>
        <button onClick={() => navigate("/exams")} className="back-to-exams-btn">Back to Exams</button>
      </div>
    );
  }

  if (!examData || questions.length === 0) {
    return (
      <div className="exam-error">
        <h3>No questions available for this exam</h3>
        <button onClick={() => navigate("/exams")} className="back-to-exams-btn">Back to Exams</button>
      </div>
    );
  }

  const currentQuestionData = questions[currentQuestion];
  const currentQuestionId = currentQuestionData.id;
  const selectedOptionId = selectedAnswers[currentQuestionId];
  const token = localStorage.getItem("token");

  return (
    <div className={`exam-page ${animate ? "exam-enter" : ""}`}>

      {/* ── Live Violation Alerts ──────────────────────────────────────────── */}
      <div className="alerts-container">
        {alerts.map((alert) => (
          <div key={alert.id} className={`violation-alert alert-${alert.severity}`}>
            <div className="alert-icon">{getAlertIcon(alert.type)}</div>
            <div className="alert-body">
              <span className="alert-title">
                {alert.severity === "major" ? "⚠ Major Violation" : "⚠ Warning"}
              </span>
              <span className="alert-message">{alert.label}</span>
            </div>
            <button className="alert-dismiss" onClick={() => dismissAlert(alert.id)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <div className="alert-progress-bar"></div>
          </div>
        ))}
      </div>

      {/* ── Top Bar ────────────────────────────────────────────────────────── */}
      <div className="exam-top-bar">
        <div className="exam-brand">
          <div className="brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
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
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>{formatTime(timeRemaining)}</span>
        </div>
      </div>

      <div className="exam-container">
        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <div className="exam-sidebar">
          {/* Backend video stream */}
          <div className="camera-section">
            <div className="camera-header">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <span>Proctoring</span>
              <div className="live-indicator">
                <span className="live-dot"></span>
                LIVE
              </div>
            </div>
            <div className="camera-box">
              <img
                src={`${API_BASE}/video_feed`}
                alt="Proctoring stream"
                className="proctor-stream"
              />
              <div className="camera-overlay">
                <div className="recording-badge">
                  <span className="rec-dot"></span>
                  Recording
                </div>
              </div>
            </div>
          </div>

          {/* Violation counter */}
          <div className="violation-summary">
            <div className={`vsummary-item ${alerts.filter(a => a.severity === "major").length > 0 ? "has-major" : ""}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>{alerts.filter(a => a.severity === "major").length} Major</span>
            </div>
            <div className={`vsummary-item ${alerts.filter(a => a.severity === "minor").length > 0 ? "has-minor" : ""}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{alerts.filter(a => a.severity === "minor").length} Minor</span>
            </div>
          </div>

          {/* Progress */}
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

          {/* Question Navigator */}
          <div className="question-navigator">
            <h4>Questions</h4>
            <div className="question-grid">
              {questions.map((q, index) => (
                <button
                  key={q.id}
                  className={`question-number ${currentQuestion === index ? "active" : ""} ${selectedAnswers[q.id] !== undefined ? "answered" : ""}`}
                  onClick={() => setCurrentQuestion(index)}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button className="submit-exam-btn" onClick={handleSubmitExam} disabled={isSubmitting}>
            {isSubmitting ? (
              <><div className="button-spinner"></div>Submitting...</>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 11l3 3L22 4"/>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
                Submit Exam
              </>
            )}
          </button>
        </div>

        {/* ── Main Content ─────────────────────────────────────────────────── */}
        <div className="exam-main">
          <div className="question-container">
            <div className="question-header">
              <span className="question-label">Question {currentQuestion + 1} of {questions.length}</span>
              <div className="question-status">
                {selectedAnswers[currentQuestionId] !== undefined ? (
                  <span className="status-answered">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Answered
                  </span>
                ) : (
                  <span className="status-unanswered">Not Answered</span>
                )}
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
                      onChange={() => handleAnswerSelect(opt.id)}
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

          {/* Navigation */}
          <div className="exam-navigation">
            <button
              className="nav-btn prev-btn"
              disabled={currentQuestion === 0}
              onClick={() => setCurrentQuestion(currentQuestion - 1)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
              Previous
            </button>

            <div className="question-dots">
              {questions.map((_, index) => (
                <span key={index} className={`dot ${currentQuestion === index ? "active" : ""}`}></span>
              ))}
            </div>

            <button
              className="nav-btn next-btn"
              disabled={currentQuestion === questions.length - 1}
              onClick={() => setCurrentQuestion(currentQuestion + 1)}
            >
              Next
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExamPage;