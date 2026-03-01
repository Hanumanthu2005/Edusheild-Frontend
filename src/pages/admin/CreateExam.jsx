import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../css/CreateExam.css";

function CreateExam() {
  const navigate = useNavigate();
  const [animate, setAnimate] = useState(false);

  const [exam, setExam] = useState({
    title: "",
    description: "",
    duration: "",
    total_marks: ""
  });

  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    setAnimate(true);
  }, []);

  // ==========================
  // Add Question
  // ==========================
  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question_text: "",
        marks: 1,
        type: "mcq",
        options: [
          { option_text: "", is_correct: false },
          { option_text: "", is_correct: false }
        ]
      }
    ]);
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const updateOption = (qIndex, oIndex, field, value) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex][field] = value;
    setQuestions(updated);
  };

  const addOption = (qIndex) => {
    const updated = [...questions];
    updated[qIndex].options.push({
      option_text: "",
      is_correct: false
    });
    setQuestions(updated);
  };

  // ==========================
  // Submit Exam
  // ==========================
  const handleSubmit = async () => {
    if (!exam.title || !exam.duration || !exam.total_marks) {
      setError("Please fill all required exam details.");
      return;
    }

    try {
      const examRes = await fetch("http://localhost:5001/api/admin/exams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(exam)
      });

      if (!examRes.ok) {
        const err = await examRes.json();
        setError(err.error || "Failed to create exam");
        return;
      }

      const examData = await examRes.json();
      const examId = examData.exam_id;

      for (const q of questions) {
        const questionRes = await fetch(
          `http://localhost:5001/api/admin/exams/${examId}/questions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              question_text: q.question_text,
              marks: q.marks,
              type: q.type
            })
          }
        );

        const questionData = await questionRes.json();
        const questionId = questionData.question_id;

        if (q.type === "mcq") {
          for (const opt of q.options) {
            await fetch(
              `http://localhost:5001/api/admin/questions/${questionId}/options`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(opt)
              }
            );
          }
        }
      }

      alert("Exam Created Successfully!");
      navigate("/admin");

    } catch (err) {
      console.error(err);
      setError("Unexpected error occurred.");
    }
  };

  return (
    <div className={`page-container ${animate ? "enter-animation" : ""}`}>
      
      {/* ================= HEADER ================= */}
      <div className="page-header">
        <div className="page-badge">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          <span>Exam Management</span>
        </div>

        <h1 className="page-title">Create New Exam</h1>

        <p className="page-subtitle">
          Design structured AI-powered assessments with dynamic question control.
        </p>

        <div className="title-decoration"></div>
      </div>

      {/* ================= FORM GRID ================= */}
      <div className="form-grid">

        {/* ================= EXAM DETAILS CARD ================= */}
        <div className="card">
          <div className="card-decoration"></div>

          <div className="input-group">
            <label>Exam Title</label>
            <div className="input-wrapper">
              <input
                type="text"
                value={exam.title}
                onChange={(e) => setExam({ ...exam, title: e.target.value })}
              />
            </div>
          </div>

          <div className="input-group">
            <label>Description</label>
            <div className="input-wrapper">
              <textarea
                value={exam.description}
                onChange={(e) =>
                  setExam({ ...exam, description: e.target.value })
                }
              />
            </div>
          </div>

          <div className="input-group">
            <label>Duration (Minutes)</label>
            <div className="input-wrapper">
              <input
                type="number"
                value={exam.duration}
                onChange={(e) =>
                  setExam({ ...exam, duration: e.target.value })
                }
              />
            </div>
          </div>

          <div className="input-group">
            <label>Total Marks</label>
            <div className="input-wrapper">
              <input
                type="number"
                value={exam.total_marks}
                onChange={(e) =>
                  setExam({ ...exam, total_marks: e.target.value })
                }
              />
            </div>
          </div>
        </div>

        {/* ================= QUESTIONS CARD ================= */}
        <div className="card">
          <div className="card-decoration"></div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
            <h2 style={{ color: "#0f172a" }}>Questions</h2>
            <button className="secondary-btn" onClick={addQuestion}>
              + Add Question
            </button>
          </div>

          {questions.map((q, qIndex) => (
            <div key={qIndex} className="question-card">

              <div className="input-group">
                <label>Question Text</label>
                <div className="input-wrapper">
                  <textarea
                    value={q.question_text}
                    onChange={(e) =>
                      updateQuestion(qIndex, "question_text", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Marks</label>
                <div className="input-wrapper">
                  <input
                    type="number"
                    value={q.marks}
                    onChange={(e) =>
                      updateQuestion(qIndex, "marks", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Question Type</label>
                <div className="input-wrapper">
                  <select
                    value={q.type}
                    onChange={(e) =>
                      updateQuestion(qIndex, "type", e.target.value)
                    }
                  >
                    <option value="mcq">MCQ</option>
                    <option value="descriptive">Descriptive</option>
                  </select>
                </div>
              </div>

              {q.type === "mcq" && (
                <>
                  <h4 style={{ marginTop: "15px", color: "#64748b" }}>Options</h4>

                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} className="input-group">
                      <label>Option {oIndex + 1}</label>
                      <div className="input-wrapper">
                        <input
                          type="text"
                          value={opt.option_text}
                          onChange={(e) =>
                            updateOption(
                              qIndex,
                              oIndex,
                              "option_text",
                              e.target.value
                            )
                          }
                        />
                      </div>
                      <label style={{ fontSize: "13px", color: "#64748b" }}>
                        <input
                          type="checkbox"
                          checked={opt.is_correct}
                          onChange={(e) =>
                            updateOption(
                              qIndex,
                              oIndex,
                              "is_correct",
                              e.target.checked
                            )
                          }
                        />{" "}
                        Mark as Correct
                      </label>
                    </div>
                  ))}

                  <button
                    className="secondary-btn"
                    onClick={() => addOption(qIndex)}
                  >
                    + Add Option
                  </button>
                </>
              )}
            </div>
          ))}

          {error && <div className="error-box">{error}</div>}

          <div style={{ marginTop: "30px", textAlign: "right" }}>
            <button className="primary-btn" onClick={handleSubmit}>
              Create Exam
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default CreateExam;