import { useNavigate } from "react-router-dom";
import "../css/Results.css";

function Results() {
  const navigate = useNavigate();

  // Dummy data (replace with backend API later)
  const results = [
    {
      examName: "Java Fundamentals",
      score: 82,
      total: 100,
      status: "Pass",
      date: "2026-01-15"
    },
    {
      examName: "Data Structures",
      score: 65,
      total: 100,
      status: "Pass",
      date: "2026-01-18"
    },
    {
      examName: "Operating Systems",
      score: 42,
      total: 100,
      status: "Fail",
      date: "2026-01-20"
    }
  ];

  return (
    <div className="results-container">
      {/* Back Button */}
      <button className="back-btn" onClick={() => navigate("/home")}>
        ← Back to Dashboard
      </button>

      <h1 className="results-title">Exam Results</h1>

      <div className="table-wrapper">
        <table className="results-table">
          <thead>
            <tr>
              <th>Exam Name</th>
              <th>Date</th>
              <th>Score</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {results.map((result, index) => (
              <tr key={index}>
                <td>{result.examName}</td>
                <td>{result.date}</td>
                <td>
                  {result.score} / {result.total}
                </td>
                <td>
                  <span
                    className={
                      result.status === "Pass"
                        ? "status pass"
                        : "status fail"
                    }
                  >
                    {result.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Results;
