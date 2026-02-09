import Navbar from "../components/Navbar";
import "../css/About.css";

function About() {
  return (
    <>
      <Navbar />
      <section className="section about-section">
        <div className="about-header">
          <h2 className="section-title">About EduShield</h2>
          <div className="title-decoration"></div>
        </div>

        <div className="about-content">
          <div className="intro-card fade-in">
            <div className="card-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <p className="section-text">
              EduShield is an AI-based online examination proctoring system designed
              to ensure exam integrity through real-time monitoring of candidates.
              The system leverages a Reinforcement Learning–based Convolutional Neural
              Network (RL-CNN) to automatically detect suspicious activities such as
              multiple faces, abnormal head movements, gaze deviation, and unusual
              noise during online examinations.
            </p>
          </div>

          <div className="info-grid">
            <div className="info-card slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="card-header">
                <div className="icon-wrapper">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                </div>
                <h3 className="sub-title">Algorithms & Models Used</h3>
              </div>
              <div className="card-divider"></div>
              <p className="section-text">
                EduShield utilizes a Reinforcement Learning integrated Convolutional
                Neural Network (RL-CNN) for adaptive and intelligent proctoring. The
                model processes video, audio, and behavioral patterns in real time to
                identify cheating behaviors. Supporting technologies include YOLOv8
                for object detection and OpenCV for video frame analysis.
              </p>
            </div>

            <div className="info-card slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="card-header">
                <div className="icon-wrapper">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                </div>
                <h3 className="sub-title">Model Accuracy</h3>
              </div>
              <div className="card-divider"></div>
              <p className="section-text">
                The RL-CNN–based approach improves detection accuracy while reducing
                false positives compared to traditional rule-based systems. By
                adapting to behavioral patterns, the system achieves reliable
                performance under controlled environments and scales efficiently for
                large online examinations.
              </p>
            </div>
          </div>

          <div className="tech-stack-card slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="card-header">
              <div className="icon-wrapper">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              </div>
              <h3 className="sub-title">Technology Stack</h3>
            </div>
            <div className="card-divider"></div>
            <ul className="tech-list">
              <li className="tech-item">
                <span className="tech-label">Frontend:</span>
                <span className="tech-value">React JS</span>
              </li>
              <li className="tech-item">
                <span className="tech-label">Backend:</span>
                <span className="tech-value">Python, Flask</span>
              </li>
              <li className="tech-item">
                <span className="tech-label">AI/ML:</span>
                <span className="tech-value">TensorFlow, Keras, OpenCV, YOLOv8</span>
              </li>
              <li className="tech-item">
                <span className="tech-label">Database:</span>
                <span className="tech-value">MySQL / Cloud Storage</span>
              </li>
              <li className="tech-item">
                <span className="tech-label">Hardware:</span>
                <span className="tech-value">Webcam, Microphone (Minimum 8GB RAM, i5 / Ryzen 5)</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}

export default About;