import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../css/ManageExams.css";

function ManageExams() {
  const navigate = useNavigate();
  const [animate, setAnimate] = useState(false);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setAnimate(true);
    fetchExams();
  }, []);

  const fetchExams = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Authentication required");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:5001/api/admin/exams", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!res.ok) {
        throw new Error("Failed to fetch exams");
      }

      const data = await res.json();
      
      if (Array.isArray(data)) {
        setExams(data);
      } else {
        setExams([]);
      }

    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message || "Failed to load exams");
      setExams([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this exam permanently?")) return;

    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`http://localhost:5001/api/admin/exams/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (res.ok) {
        alert("Exam deleted successfully");
        fetchExams();
      } else {
        alert("Failed to delete exam");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete exam");
    }
  };

  const handleEdit = (id) => {
    navigate(`/admin/exams/edit/${id}`);
  };

  return (
    <div className={`page-container ${animate ? "enter-animation" : ""}`}>
      {/* Back Button */}
      <button className="back-btn" onClick={() => navigate("/admin")}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="19" y1="12" x2="5" y2="12"/>
          <polyline points="12 19 5 12 12 5"/>
        </svg>
        <span>Back to Dashboard</span>
      </button>

      {/* HEADER */}
      <div className="page-header">
        <div className="page-badge">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7h18M3 12h18M3 17h18"/>
          </svg>
          <span>Exam Control Panel</span>
        </div>

        <h1 className="page-title">Manage Exams</h1>

        <p className="page-subtitle">
          Edit, update, or remove AI-proctored examinations.
        </p>

        <div className="title-decoration"></div>
      </div>

      {error && <div className="error-box">{error}</div>}

      {/* GRID */}
      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading exams...</p>
        </div>
      ) : exams.length > 0 ? (
        <div className="grid">
          {exams.map((exam, index) => (
            <div
              key={exam.id}
              className="card exam-card"
              style={{ animationDelay: `${0.6 + index * 0.1}s` }}
            >
              <div className="card-decoration"></div>

              <h3 className="exam-title">{exam.title}</h3>

              <div className="exam-meta">
                <span>{exam.duration} mins</span>
                <span>{exam.total_marks} marks</span>
              </div>

              <div className="exam-actions">
                <button
                  className="secondary-btn"
                  onClick={() => handleEdit(exam.id)}
                >
                  Edit
                </button>

                <button
                  className="danger-btn"
                  onClick={() => handleDelete(exam.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          <h3>No Exams Found</h3>
          <p>Get started by creating your first examination</p>
          <button 
            className="create-btn"
            onClick={() => navigate("/admin/exams/create")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Create First Exam
          </button>
        </div>
      )}
    </div>
  );
}

export default ManageExams;