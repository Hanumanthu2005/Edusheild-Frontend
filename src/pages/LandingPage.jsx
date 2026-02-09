import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import "../css/LandingPage.css";

function LandingPage() {
  const navigate = useNavigate();
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
  }, []);

  return (
    <div className="landing">
      <Navbar />
      
      {/* Background with blur */}
      <div className="hero-background"></div>
      <div className="hero-overlay"></div>

      {/* Hero Section */}
      <section className="full-section hero">
        <div className={`hero-content ${animate ? "hero-enter" : ""}`}>
          <div className="hero-badge">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
            <span>AI-Powered Proctoring</span>
          </div>

          <h1 className="hero-title">
            <span className="title-gradient">EduShield</span>
          </h1>
          
          <p className="hero-description">
            EduShield is an AI-powered academic integrity platform designed to
            conduct secure and fair online examinations.
          </p>

          <div className="hero-features">
            <div className="feature-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>Real-time Monitoring</span>
            </div>
            <div className="feature-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>AI-Powered Detection</span>
            </div>
            <div className="feature-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>Secure Examinations</span>
            </div>
          </div>

          <button
            className="home-btn"
            onClick={() => navigate("/home")}
          >
            <span>Go to Exam Dashboard</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>

          <div className="hero-stats">
            <div className="stat-item">
              <div className="stat-number">99%</div>
              <div className="stat-label">Accuracy</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-number">Real-time</div>
              <div className="stat-label">Detection</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-number">24/7</div>
              <div className="stat-label">Monitoring</div>
            </div>
          </div>
        </div>

        {/* Floating elements for visual interest */}
        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
        <div className="floating-shape shape-3"></div>
      </section>
    </div>
  );
}

export default LandingPage;