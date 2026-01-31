import Navbar from "../components/Navbar";
import "../css/About.css";

function About() {
  return (
    <>
      <Navbar />
      <section className="section">
        <h2 className="section-title">About EduShield</h2>

        <p className="section-text">
          EduShield is an AI-driven academic integrity system developed to ensure
          fairness and transparency in online examinations. The platform leverages
          computer vision and deep learning techniques to monitor examinee
          behavior and detect suspicious activities in real time.
        </p>

        <h3 className="sub-title">Algorithms & Models Used</h3>
        <p className="section-text">
          The system primarily uses Convolutional Neural Networks (CNN) for image
          and video frame analysis. Face detection and behavior classification
          models are trained to identify anomalies such as multiple faces,
          frequent head movement, and absence from the frame.
        </p>

        <h3 className="sub-title">Model Accuracy</h3>
        <p className="section-text">
          The trained CNN model achieved an accuracy of approximately 80–85% on
          test datasets under controlled conditions. Accuracy may vary based on
          lighting, camera quality, and network latency.
        </p>

        <h3 className="sub-title">Technology Stack</h3>
        <ul className="tech-list">
          <li>Frontend: React.js, HTML5, CSS3</li>
          <li>Backend: Python, Flask</li>
          <li>AI/ML: Python, TensorFlow, Keras, OpenCV</li>
          <li>Database: PostgreSQL / MySQL</li>
          <li>Deployment & Training: Google Colab, Cloud Services</li>
        </ul>
      </section>
    </>
  );
}

export default About;
