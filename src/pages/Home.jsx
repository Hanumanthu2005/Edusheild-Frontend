import { useNavigate } from "react-router-dom";
import "../css/Home.css";

function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      {/* Back Button */}
      <button className="back-btn" onClick={() => navigate("/")}>
        ← Back
      </button>

      <h1 className="home-title">Online Examination Dashboard</h1>

      {/* Dashboard Cards */}
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h2>📘 Exams</h2>
          <p>View and attempt available online examinations.</p>
          <button onClick={() => navigate("/exams")}>View Exams</button>
        </div>

        <div className="dashboard-card">
          <h2>📊 Results</h2>
          <p>Check your exam results and performance analysis.</p>
          <button onClick={() => navigate("/results")}>
            View Results
          </button>
        </div>

        <div className="dashboard-card">
          <h2>🕘 History</h2>
          <p>Review previously attempted exams.</p>
          <button>View History</button>
        </div>

        <div className="dashboard-card">
          <h2>📝 Upcoming Exams</h2>
          <p>See scheduled and upcoming examinations.</p>
          <button>View Schedule</button>
        </div>
      </div>
    </div>
  );
}

export default Home;
