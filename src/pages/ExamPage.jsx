import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/ExamPage.css";

function ExamPage() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [animate, setAnimate] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(3570); // 59:30 in seconds

  // Dummy questions (replace with backend later)
  const questions = [
    {
      id: 1,
      question: "What is JVM in Java?",
      options: [
        "Java Virtual Machine",
        "Java Variable Method",
        "Java Visual Model",
        "None of the above"
      ]
    },
    {
      id: 2,
      question: "Which data structure uses FIFO?",
      options: [
        "Stack",
        "Queue",
        "Tree",
        "Graph"
      ]
    },
    {
      id: 3,
      question: "What does SQL stand for?",
      options: [
        "Structured Query Language",
        "Simple Query Language",
        "System Query Language",
        "Standard Question Language"
      ]
    },
    {
      id: 4,
      question: "Which is not an OOP principle?",
      options: [
        "Encapsulation",
        "Inheritance",
        "Compilation",
        "Polymorphism"
      ]
    }
  ];

  // Start webcam
  useEffect(() => {
    setAnimate(true);
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error("Camera access denied:", err);
      });
  }, []);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (optionIndex) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestion]: optionIndex
    });
  };

  const answeredCount = Object.keys(selectedAnswers).length;
  const progress = (answeredCount / questions.length) * 100;

  return (
    <div className={`exam-page ${animate ? "exam-enter" : ""}`}>
      {/* Top Bar */}
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
          <h1>Java Fundamentals Exam</h1>
          <span className="exam-code">JAVA101</span>
        </div>

        <div className={`timer-display ${timeRemaining < 300 ? 'timer-warning' : ''}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>{formatTime(timeRemaining)}</span>
        </div>
      </div>

      <div className="exam-container">
        {/* Sidebar */}
        <div className="exam-sidebar">
          {/* Camera Section */}
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
              <video ref={videoRef} autoPlay muted />
              <div className="camera-overlay">
                <div className="recording-badge">
                  <span className="rec-dot"></span>
                  Recording
                </div>
              </div>
            </div>
          </div>

          {/* Progress Section */}
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
              {questions.map((_, index) => (
                <button
                  key={index}
                  className={`question-number ${currentQuestion === index ? 'active' : ''} ${selectedAnswers[index] !== undefined ? 'answered' : ''}`}
                  onClick={() => setCurrentQuestion(index)}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button className="submit-exam-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            Submit Exam
          </button>
        </div>

        {/* Main Content */}
        <div className="exam-main">
          <div className="question-container">
            <div className="question-header">
              <span className="question-label">Question {currentQuestion + 1} of {questions.length}</span>
              <div className="question-status">
                {selectedAnswers[currentQuestion] !== undefined ? (
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
              <h2 className="question-text">{questions[currentQuestion].question}</h2>

              <div className="options-container">
                {questions[currentQuestion].options.map((opt, index) => (
                  <label 
                    key={index} 
                    className={`option-card ${selectedAnswers[currentQuestion] === index ? 'selected' : ''}`}
                  >
                    <input 
                      type="radio" 
                      name={`question-${currentQuestion}`}
                      checked={selectedAnswers[currentQuestion] === index}
                      onChange={() => handleAnswerSelect(index)}
                    />
                    <div className="option-indicator">
                      <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                    </div>
                    <span className="option-text">{opt}</span>
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
                <span 
                  key={index}
                  className={`dot ${currentQuestion === index ? 'active' : ''}`}
                ></span>
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