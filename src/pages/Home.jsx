import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import "../css/Home.css";

function Home() {
  const navigate = useNavigate();
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
  }, []);

  return (
    <>
      <Navbar />
      <div className={`home-container ${animate ? "home-enter" : ""}`}>
        <div className="home-header">
          <div className="welcome-badge">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span>Welcome Back</span>
          </div>
          <h1 className="home-title">Online Examination Dashboard</h1>
          <p className="home-subtitle">Manage your exams, view results, and track your progress</p>
          <div className="title-decoration"></div>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-card slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="card-icon-wrapper exams">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
            <div className="card-content">
              <h2>Exams</h2>
              <p>View and attempt available online examinations.</p>
              <button className="dashboard-btn exams-btn" onClick={() => navigate("/exams")}>
                <span>View Exams</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
            </div>
            <div className="card-decoration"></div>
          </div>

          <div className="dashboard-card slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="card-icon-wrapper results">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="20" x2="12" y2="10"/>
                <line x1="18" y1="20" x2="18" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="16"/>
              </svg>
            </div>
            <div className="card-content">
              <h2>Results</h2>
              <p>Check your exam results and performance analysis.</p>
              <button className="dashboard-btn results-btn" onClick={() => navigate("/results")}>
                <span>View Results</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
            </div>
            <div className="card-decoration"></div>
          </div>

          <div className="dashboard-card slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="card-icon-wrapper history">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div className="card-content">
              <h2>History</h2>
              <p>Review previously attempted exams.</p>
              <button className="dashboard-btn history-btn">
                <span>View History</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
            </div>
            <div className="card-decoration"></div>
          </div>

          <div className="dashboard-card slide-up" style={{ animationDelay: '0.4s' }}>
            <div className="card-icon-wrapper upcoming">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div className="card-content">
              <h2>Upcoming Exams</h2>
              <p>See scheduled and upcoming examinations.</p>
              <button className="dashboard-btn upcoming-btn">
                <span>View Schedule</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
            </div>
            <div className="card-decoration"></div>
          </div>
        </div>

        {/* Quick stats section */}
        <div className="stats-section fade-in-delayed">
          <div className="stat-card">
            <div className="stat-number">12</div>
            <div className="stat-label">Total Exams</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">8</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">85%</div>
            <div className="stat-label">Avg Score</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">3</div>
            <div className="stat-label">Upcoming</div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Home;