import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { getExams } from "../services/api";
import "../css/ViewExams.css";

function ViewExams() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [animate, setAnimate] = useState(false);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setAnimate(true);
    fetchExams();
  }, []);

  const fetchExams = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getExams();
      
      if (Array.isArray(data)) {
        setExams(data);
      } else {
        setExams([]);
        setError("Invalid data received from server");
      }
    } catch (err) {
      console.error("Failed to fetch exams:", err);
      setError("Failed to load exams. Please try again.");
      setExams([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredExams = exams.filter(
    (exam) =>
      exam.title.toLowerCase().includes(search.toLowerCase()) ||
      (exam.description && exam.description.toLowerCase().includes(search.toLowerCase()))
  );

  const getDifficultyColor = (duration) => {
    // Difficulty based on duration
    if (duration <= 60) return "easy";
    if (duration <= 90) return "medium";
    return "hard";
  };

  const getDifficultyLabel = (duration) => {
    if (duration <= 60) return "Easy";
    if (duration <= 90) return "Medium";
    return "Hard";
  };

  const handleStartExam = (examId) => {
    navigate(`/exam/${examId}`);
  };

  return (
    <div className={`exams-container ${animate ? "exams-enter" : ""}`}>
      {/* Header Section */}
      <div className="exams-header">
        <button className="back-btn" onClick={() => navigate("/home")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
          <span>Back to Dashboard</span>
        </button>

        <div className="header-content">
          <div className="exam-badge">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            <span>Online Examinations</span>
          </div>
          <h1 className="exams-title">Available Exams</h1>
          <p className="exams-subtitle">Select an exam to begin your assessment</p>
          <div className="title-decoration"></div>
        </div>

        {/* Search Bar */}
        <div className="search-wrapper">
          <div className="search-bar">
            <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search exam by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="clear-search" onClick={() => setSearch("")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
          <div className="exam-count">
            {loading ? "Loading..." : `${filteredExams.length} ${filteredExams.length === 1 ? 'exam' : 'exams'} available`}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-banner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>{error}</span>
          <button onClick={fetchExams}>Retry</button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading exams...</p>
        </div>
      ) : (
        /* Exams Grid */
        <div className="exam-grid">
          {filteredExams.length > 0 ? (
            filteredExams.map((exam, index) => (
              <div 
                className="exam-card slide-up" 
                key={exam.id}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="exam-card-header">
                  <div className={`difficulty-badge ${getDifficultyColor(exam.duration)}`}>
                    {getDifficultyLabel(exam.duration)}
                  </div>
                  <div className="exam-code">EXAM-{exam.id}</div>
                </div>

                <h2 className="exam-name">{exam.title}</h2>
                
                {exam.description && (
                  <p className="exam-description">{exam.description}</p>
                )}

                <div className="exam-details">
                  <div className="detail-item">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span>{exam.duration} mins</span>
                  </div>
                  <div className="detail-item">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <span>{exam.total_marks} marks</span>
                  </div>
                </div>

                <div className="card-divider"></div>

                <button
                  className="start-btn"
                  onClick={() => handleStartExam(exam.id)}
                >
                  <span>Start Exam</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </button>

                <div className="card-decoration"></div>
              </div>
            ))
          ) : (
            <div className="no-result">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <h3>No exams found</h3>
              <p>{search ? "Try adjusting your search criteria" : "No exams available at the moment"}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ViewExams;