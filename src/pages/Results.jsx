import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "../css/Results.css";

function Results() {
  const navigate = useNavigate();
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
  }, []);

  // Dummy data (replace with backend API later)
  const results = [
    {
      id: 1,
      examName: "Java Fundamentals",
      code: "JAVA101",
      score: 82,
      total: 100,
      status: "Pass",
      date: "2026-01-15",
      duration: "60 mins",
      questions: 30
    },
    {
      id: 2,
      examName: "Data Structures",
      code: "DSA201",
      score: 65,
      total: 100,
      status: "Pass",
      date: "2026-01-18",
      duration: "90 mins",
      questions: 45
    },
    {
      id: 3,
      examName: "Operating Systems",
      code: "OS401",
      score: 42,
      total: 100,
      status: "Fail",
      date: "2026-01-20",
      duration: "80 mins",
      questions: 35
    },
    {
      id: 4,
      examName: "Database Management Systems",
      code: "DBMS301",
      score: 91,
      total: 100,
      status: "Pass",
      date: "2026-01-22",
      duration: "75 mins",
      questions: 40
    }
  ];

  const passCount = results.filter(r => r.status === "Pass").length;
  const failCount = results.filter(r => r.status === "Fail").length;
  const averageScore = Math.round(
    results.reduce((sum, r) => sum + r.score, 0) / results.length
  );

  const getScoreColor = (score) => {
    if (score >= 80) return "excellent";
    if (score >= 60) return "good";
    return "poor";
  };

  const getPercentage = (score, total) => {
    return Math.round((score / total) * 100);
  };

  return (
    <div className={`results-container ${animate ? "results-enter" : ""}`}>
      {/* Header Section */}
      <div className="results-header">
        <button className="back-btn" onClick={() => navigate("/home")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
          <span>Back to Dashboard</span>
        </button>

        <div className="header-content">
          <div className="results-badge">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="20" x2="12" y2="10"/>
              <line x1="18" y1="20" x2="18" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="16"/>
            </svg>
            <span>Performance Overview</span>
          </div>
          <h1 className="results-title">Exam Results</h1>
          <p className="results-subtitle">Track your performance and progress</p>
          <div className="title-decoration"></div>
        </div>

        {/* Summary Cards */}
        <div className="summary-cards">
          <div className="summary-card total" style={{ animationDelay: '0.1s' }}>
            <div className="card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
            <div className="card-info">
              <div className="card-value">{results.length}</div>
              <div className="card-label">Total Exams</div>
            </div>
          </div>

          <div className="summary-card pass" style={{ animationDelay: '0.2s' }}>
            <div className="card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <div className="card-info">
              <div className="card-value">{passCount}</div>
              <div className="card-label">Passed</div>
            </div>
          </div>

          <div className="summary-card fail" style={{ animationDelay: '0.3s' }}>
            <div className="card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <div className="card-info">
              <div className="card-value">{failCount}</div>
              <div className="card-label">Failed</div>
            </div>
          </div>

          <div className="summary-card average" style={{ animationDelay: '0.4s' }}>
            <div className="card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <div className="card-info">
              <div className="card-value">{averageScore}%</div>
              <div className="card-label">Average Score</div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Cards */}
      <div className="results-content">
        <div className="results-grid">
          {results.map((result, index) => (
            <div 
              className="result-card slide-up" 
              key={result.id}
              style={{ animationDelay: `${0.5 + index * 0.1}s` }}
            >
              <div className="result-card-header">
                <div className="exam-info">
                  <h3>{result.examName}</h3>
                  <span className="exam-code">{result.code}</span>
                </div>
                <span className={`status-badge ${result.status.toLowerCase()}`}>
                  {result.status === "Pass" ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  )}
                  {result.status}
                </span>
              </div>

              <div className="score-section">
                <div className="score-display">
                  <div className={`score-number ${getScoreColor(result.score)}`}>
                    {result.score}
                    <span className="score-total">/{result.total}</span>
                  </div>
                  <div className="percentage">{getPercentage(result.score, result.total)}%</div>
                </div>

                <div className="score-bar">
                  <div 
                    className={`score-fill ${getScoreColor(result.score)}`}
                    style={{ width: `${getPercentage(result.score, result.total)}%` }}
                  ></div>
                </div>
              </div>

              <div className="result-details">
                <div className="detail-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span>{result.date}</span>
                </div>
                <div className="detail-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <span>{result.duration}</span>
                </div>
                <div className="detail-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 11l3 3L22 4"/>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                  <span>{result.questions} Questions</span>
                </div>
              </div>

              <button className="view-details-btn">
                <span>View Details</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>

              <div className="card-decoration"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Results;