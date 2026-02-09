import "../css/Scope.css";
import Navbar from "../components/Navbar";

function Scope() {
  return (
    <>
      <Navbar />

      <section className="section scope-section">
        <div className="scope-header">
          <h2 className="section-title">Project Scope & Future Enhancements</h2>
          <div className="title-decoration"></div>
        </div>

        <div className="intro-text fade-in">
          <p className="section-text">
            EduShield is designed as a scalable academic integrity platform. While
            the current system focuses on AI-based behavior analysis, the future
            scope extends toward a comprehensive, intelligent proctoring ecosystem.
          </p>
        </div>

        <div className="scope-grid">
          <div className="scope-card slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="image-container">
              <img src="/images/multi-face.png" alt="Multi face detection" />
              <div className="image-overlay"></div>
            </div>
            <div className="card-content">
              <h3>Multi-Face Detection</h3>
              <div className="title-underline"></div>
              <p>Identify proxy test takers by detecting multiple faces in real time.</p>
            </div>
          </div>

          <div className="scope-card slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="image-container">
              <img src="/images/eye-tracking.png" alt="Eye gaze tracking" />
              <div className="image-overlay"></div>
            </div>
            <div className="card-content">
              <h3>Eye Gaze & Head Tracking</h3>
              <div className="title-underline"></div>
              <p>Advanced monitoring of eye and head movements to prevent cheating.</p>
            </div>
          </div>

          <div className="scope-card slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="image-container">
              <img src="/images/audio-ai.png" alt="Audio anomaly detection" />
              <div className="image-overlay"></div>
            </div>
            <div className="card-content">
              <h3>Audio Anomaly Detection</h3>
              <div className="title-underline"></div>
              <p>Detect suspicious sounds using AI-powered speech recognition.</p>
            </div>
          </div>

          <div className="scope-card slide-up" style={{ animationDelay: '0.4s' }}>
            <div className="image-container">
              <img src="/images/invigilation.png" alt="Invigilation alerts" />
              <div className="image-overlay"></div>
            </div>
            <div className="card-content">
              <h3>Real-time Alerts</h3>
              <div className="title-underline"></div>
              <p>Instant alerts for invigilators during live examinations.</p>
            </div>
          </div>

          <div className="scope-card slide-up" style={{ animationDelay: '0.5s' }}>
            <div className="image-container">
              <img src="/images/lms.png" alt="LMS integration" />
              <div className="image-overlay"></div>
            </div>
            <div className="card-content">
              <h3>LMS Integration</h3>
              <div className="title-underline"></div>
              <p>Seamless integration with Learning Management Systems.</p>
            </div>
          </div>

          <div className="scope-card slide-up" style={{ animationDelay: '0.6s' }}>
            <div className="image-container">
              <img src="/images/cloud.png" alt="Cloud scalability" />
              <div className="image-overlay"></div>
            </div>
            <div className="card-content">
              <h3>Cloud Scalability</h3>
              <div className="title-underline"></div>
              <p>Support large-scale exams using cloud-native architecture.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default Scope;