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

      {/* Hero Section */}
      <section className="full-section hero">
        <div className={`hero-content ${animate ? "hero-enter" : ""}`}>
          <h1>EduShield</h1>
          <p>
            EduShield is an AI-powered academic integrity platform designed to
            conduct secure and fair online examinations.
          </p>

          <button
            className="home-btn"
            onClick={() => navigate("/home")}
          >
            Go to Exam Dashboard
          </button>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;
