import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Scope from "./Scope";
import Team from "./Team";
import About from "./About";
import "../css/LandingPage.css";

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      <Navbar />

      {/* Hero Section */}
      <section className="full-section hero">
        <div>
          <h1>EduShield</h1>
          <p>
            EduShield is an AI-powered academic integrity platform designed to
            conduct secure and fair online examinations.
          </p>

          {/* HOME BUTTON */}
          <button
            className="home-btn"
            onClick={() => navigate("/home")}
          >
            Go to Exam Dashboard
          </button>
        </div>
      </section>

      <section id="scope" className="full-section">
        <Scope />
      </section>

      <section id="team" className="full-section">
        <Team />
      </section>

      <section id="about" className="full-section">
        <About />
      </section>
    </div>
  );
}

export default LandingPage;
