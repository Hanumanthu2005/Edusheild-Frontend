import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "../css/ViewExams.css";

function ViewExams() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");

  // Dummy data (later replace with backend API)
  const exams = [
    { id: 1, name: "Java Fundamentals", code: "JAVA101", duration: "60 mins" },
    { id: 2, name: "Data Structures", code: "DSA201", duration: "90 mins" },
    { id: 3, name: "Database Management Systems", code: "DBMS301", duration: "75 mins" },
    { id: 4, name: "Operating Systems", code: "OS401", duration: "80 mins" }
  ];

  const filteredExams = exams.filter(
    (exam) =>
      exam.name.toLowerCase().includes(search.toLowerCase()) ||
      exam.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="exams-container">
      {/* Back Button */}
      <button className="back-btn" onClick={() => navigate("/home")}>
        ← Back to Dashboard
      </button>

      <h1 className="exams-title">Available Exams</h1>

      {/* Search */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search exam by name or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Exams List */}
      <div className="exam-grid">
        {filteredExams.length > 0 ? (
          filteredExams.map((exam) => (
            <div className="exam-card" key={exam.id}>
              <h2>{exam.name}</h2>
              <p><strong>Code:</strong> {exam.code}</p>
              <p><strong>Duration:</strong> {exam.duration}</p>

              <button className="start-btn">
                Start Exam
              </button>
            </div>
          ))
        ) : (
          <p className="no-result">No exams found.</p>
        )}
      </div>
    </div>
  );
}

export default ViewExams;
