import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../css/ViewExams.css";

function ViewExams() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
  }, []);

  // Dummy data (later replace with backend API)
  const exams = [
    { id: 1, name: "Java Fundamentals", code: "JAVA101", duration: "60 mins", questions: 30, difficulty: "Easy" },
    { id: 2, name: "Data Structures", code: "DSA201", duration: "90 mins", questions: 45, difficulty: "Medium" },
    { id: 3, name: "Database Management Systems", code: "DBMS301", duration: "75 mins", questions: 40, difficulty: "Medium" },
    { id: 4, name: "Operating Systems", code: "OS401", duration: "80 mins", questions: 35, difficulty: "Hard" }
  ];

  const filteredExams = exams.filter(
    (exam) =>
      exam.name.toLowerCase().includes(search.toLowerCase()) ||
      exam.code.toLowerCase().includes(search.toLowerCase())
  );

  const getDifficultyColor = (difficulty) => {
    switch(difficulty) {
      case "Easy": return "easy";
      case "Medium": return "medium";
      case "Hard": return "hard";
      default: return "medium";
    }
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
              placeholder="Search exam by name or code..."
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
            {filteredExams.length} {filteredExams.length === 1 ? 'exam' : 'exams'} available
          </div>
        </div>
      </div>

      {/* Exams Grid */}
      <div className="exam-grid">
        {filteredExams.length > 0 ? (
          filteredExams.map((exam, index) => (
            <div 
              className="exam-card slide-up" 
              key={exam.id}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="exam-card-header">
                <div className={`difficulty-badge ${getDifficultyColor(exam.difficulty)}`}>
                  {exam.difficulty}
                </div>
                <div className="exam-code">{exam.code}</div>
              </div>

              <h2 className="exam-name">{exam.name}</h2>

              <div className="exam-details">
                <div className="detail-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <span>{exam.duration}</span>
                </div>
                <div className="detail-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 11l3 3L22 4"/>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                  <span>{exam.questions} Questions</span>
                </div>
              </div>

              <div className="card-divider"></div>

              <button
                className="start-btn"
                onClick={() => navigate("/exam")}
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
            <p>Try adjusting your search criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ViewExams;