import "../css/Scope.css";

function Scope() {
  return (
    <section className="section">
      <h2 className="section-title">Project Scope & Future Enhancements</h2>

      <p className="section-text">
        EduShield is designed as a scalable academic integrity platform. While
        the current system focuses on AI-based behavior analysis, the future
        scope extends toward a comprehensive, intelligent proctoring ecosystem.
      </p>

      <ul className="scope-list">
        <li>Multi-face detection to identify proxy test takers</li>
        <li>Eye gaze and head movement tracking for advanced cheating detection</li>
        <li>Audio-based anomaly detection using speech recognition</li>
        <li>Real-time alerts for invigilators during examinations</li>
        <li>Integration with Learning Management Systems (LMS)</li>
        <li>Cloud-based scalability for large-scale examinations</li>
        <li>Detailed analytics dashboard for administrators</li>
        <li>AI model optimization for low-bandwidth environments</li>
      </ul>
    </section>
  );
}

export default Scope;
