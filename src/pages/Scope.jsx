import "../css/Scope.css";
import Navbar from "../components/Navbar";

function Scope() {
  return (
    <>
      <Navbar />

      <section className="section">
        <h2 className="section-title">Project Scope & Future Enhancements</h2>

        <p className="section-text">
          EduShield is designed as a scalable academic integrity platform. While
          the current system focuses on AI-based behavior analysis, the future
          scope extends toward a comprehensive, intelligent proctoring ecosystem.
        </p>

        <div className="scope-grid">
          <div className="scope-card">
            <img src="/images/multi-face.png" alt="Multi face detection" />
            <h3>Multi-Face Detection</h3>
            <p>Identify proxy test takers by detecting multiple faces in real time.</p>
          </div>

          <div className="scope-card">
            <img src="/images/eye-tracking.png" alt="Eye gaze tracking" />
            <h3>Eye Gaze & Head Tracking</h3>
            <p>Advanced monitoring of eye and head movements to prevent cheating.</p>
          </div>

          <div className="scope-card">
            <img src="/images/audio-ai.png" alt="Audio anomaly detection" />
            <h3>Audio Anomaly Detection</h3>
            <p>Detect suspicious sounds using AI-powered speech recognition.</p>
          </div>

          <div className="scope-card">
            <img src="/images/invigilation.png" alt="Invigilation alerts" />
            <h3>Real-time Alerts</h3>
            <p>Instant alerts for invigilators during live examinations.</p>
          </div>

          <div className="scope-card">
            <img src="/images/lms.png" alt="LMS integration" />
            <h3>LMS Integration</h3>
            <p>Seamless integration with Learning Management Systems.</p>
          </div>

          <div className="scope-card">
            <img src="/images/cloud.png" alt="Cloud scalability" />
            <h3>Cloud Scalability</h3>
            <p>Support large-scale exams using cloud-native architecture.</p>
          </div>
        </div>
      </section>
    </>
  );
}

export default Scope;
