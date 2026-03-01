import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../css/AdminDashboard.css";

function AdminDashboard() {
  const navigate = useNavigate();
  const [animate, setAnimate] = useState(false);
  const [activeExams, setActiveExams] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [stats, setStats] = useState({
    totalExams: 0,
    activeSessions: 0,
    totalStudents: 0,
    avgWarnings: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setAnimate(true);
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      console.error("No token found");
      setError("Authentication required");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Fetch exams
      const examsRes = await fetch("http://localhost:5001/api/admin/exams", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!examsRes.ok) {
        throw new Error(`Failed to fetch exams: ${examsRes.status}`);
      }

      const examsData = await examsRes.json();
      console.log("Exams data:", examsData);

      if (Array.isArray(examsData)) {
        setActiveExams(examsData);
      } else {
        console.error("Exams API did not return an array:", examsData);
        setActiveExams([]);
      }

      // Fetch active sessions
      const sessionsRes = await fetch(
        "http://localhost:5001/api/admin/sessions/active",
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (!sessionsRes.ok) {
        throw new Error(`Failed to fetch sessions: ${sessionsRes.status}`);
      }

      const sessionsData = await sessionsRes.json();
      console.log("Sessions data:", sessionsData);

      if (Array.isArray(sessionsData)) {
        setActiveSessions(sessionsData);
      } else {
        console.error("Sessions API did not return an array:", sessionsData);
        setActiveSessions([]);
      }

      // Calculate stats
      const totalExams = Array.isArray(examsData) ? examsData.length : 0;
      const totalSessions = Array.isArray(sessionsData) ? sessionsData.length : 0;
      const avgWarnings = totalSessions > 0 
        ? (sessionsData.reduce((sum, s) => sum + (s.warnings || 0), 0) / totalSessions).toFixed(1)
        : "0";

      setStats({
        totalExams: totalExams,
        activeSessions: totalSessions,
        totalStudents: totalSessions,
        avgWarnings: avgWarnings
      });

    } catch (error) {
      console.error("Fetch error:", error);
      setError(error.message || "Failed to load dashboard data");
      setActiveExams([]);
      setActiveSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateSession = async (sessionId) => {
    if (!window.confirm("Are you sure you want to terminate this session?")) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5001/api/admin/sessions/${sessionId}/terminate`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      
      if (response.ok) {
        alert("Session terminated successfully");
        fetchDashboardData();
      } else {
        const errorData = await response.json();
        alert(`Failed to terminate session: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Failed to terminate session:", error);
      alert("Failed to terminate session. Please try again.");
    }
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      // Clear all stored data
      localStorage.removeItem("token");
      localStorage.removeItem("session_id");
      
      // Navigate to login page
      navigate("/login");
    }
  };

  return (
    <div className={`admin-dashboard ${animate ? "admin-enter" : ""}`}>
      {/* Header with Logout */}
      <div className="admin-header">
        <div className="header-top">
          <div className="brand-section">
            <div className="brand-logo-admin">
              <div className="logo-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span className="brand-name">EduShield Admin</span>
            </div>
          </div>
          
          <button className="logout-btn" onClick={handleLogout}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>Logout</span>
          </button>
        </div>

        <div className="header-content">
          <div className="admin-badge">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>Administrator</span>
          </div>
          <h1 className="admin-title">Admin Dashboard</h1>
          <p className="admin-subtitle">Manage exams, monitor sessions, and view analytics</p>
          <div className="title-decoration"></div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-banner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>{error}</span>
          <button onClick={fetchDashboardData}>Retry</button>
        </div>
      )}

      <div className="admin-content">
        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card total-exams" style={{ animationDelay: '0.1s' }}>
            <div className="stat-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
            <div className="stat-info">
              <div className="stat-value">{loading ? "..." : stats.totalExams}</div>
              <div className="stat-label">Total Exams</div>
            </div>
          </div>

          <div className="stat-card active-sessions" style={{ animationDelay: '0.2s' }}>
            <div className="stat-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div className="stat-info">
              <div className="stat-value">{loading ? "..." : stats.activeSessions}</div>
              <div className="stat-label">Active Sessions</div>
            </div>
          </div>

          <div className="stat-card total-students" style={{ animationDelay: '0.3s' }}>
            <div className="stat-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div className="stat-info">
              <div className="stat-value">{loading ? "..." : stats.totalStudents}</div>
              <div className="stat-label">Active Students</div>
            </div>
          </div>

          <div className="stat-card avg-warnings" style={{ animationDelay: '0.4s' }}>
            <div className="stat-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div className="stat-info">
              <div className="stat-value">{loading ? "..." : stats.avgWarnings}</div>
              <div className="stat-label">Avg Warnings</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions slide-up" style={{ animationDelay: '0.5s' }}>
          <h2 className="section-title">Quick Actions</h2>
          <div className="actions-grid">
            <button className="action-card create" onClick={() => navigate("/admin/exams/create")}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span>Create Exam</span>
            </button>

            <button className="action-card manage" onClick={() => navigate("/admin/exams")}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              <span>Manage Exams</span>
            </button>

            <button className="action-card monitor" onClick={() => navigate("/admin/sessions")}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <span>Monitor Sessions</span>
            </button>

            <button className="action-card results" onClick={() => navigate("/admin/results")}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="20" x2="12" y2="10"/>
                <line x1="18" y1="20" x2="18" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="16"/>
              </svg>
              <span>View Results</span>
            </button>
          </div>
        </div>

        {/* Active Sessions */}
        <div className="active-sessions-section slide-up" style={{ animationDelay: '0.6s' }}>
          <div className="section-header">
            <h2 className="section-title">Active Sessions</h2>
            <button className="refresh-btn" onClick={fetchDashboardData} disabled={loading}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading sessions...</p>
            </div>
          ) : activeSessions.length > 0 ? (
            <div className="sessions-table">
              <table>
                <thead>
                  <tr>
                    <th>Session ID</th>
                    <th>Student</th>
                    <th>Warnings</th>
                    <th>Started At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSessions.map((session) => (
                    <tr key={session.session_id}>
                      <td>#{session.session_id}</td>
                      <td>
                        <div className="student-info">
                          <div className="student-avatar">
                            {session.student.charAt(0).toUpperCase()}
                          </div>
                          {session.student}
                        </div>
                      </td>
                      <td>
                        <span className={`warning-badge ${session.warnings > 2 ? 'high' : 'normal'}`}>
                          {session.warnings}
                        </span>
                      </td>
                      <td>{new Date(session.started_at).toLocaleString()}</td>
                      <td>
                        <button 
                          className="terminate-btn"
                          onClick={() => handleTerminateSession(session.session_id)}
                        >
                          Terminate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <h3>No Active Sessions</h3>
              <p>There are currently no students taking exams</p>
            </div>
          )}
        </div>

        {/* Recent Exams */}
        <div className="recent-exams-section slide-up" style={{ animationDelay: '0.7s' }}>
          <div className="section-header">
            <h2 className="section-title">Recent Exams</h2>
            <button className="view-all-btn" onClick={() => navigate("/admin/exams")}>
              View All
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading exams...</p>
            </div>
          ) : activeExams.length > 0 ? (
            <div className="exams-grid">
              {activeExams.slice(0, 4).map((exam, index) => (
                <div 
                  className="exam-card" 
                  key={exam.id}
                  style={{ animationDelay: `${0.8 + index * 0.1}s` }}
                  onClick={() => navigate(`/admin/exams/${exam.id}`)}
                >
                  <h3>{exam.title}</h3>
                  <div className="exam-meta">
                    <div className="meta-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                      <span>{exam.duration} mins</span>
                    </div>
                    <div className="meta-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      <span>{exam.total_marks} marks</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
              <h3>No Exams Found</h3>
              <p>Create your first exam to get started</p>
              <button 
                className="create-exam-btn"
                onClick={() => navigate("/admin/exams/create")}
              >
                Create Exam
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;