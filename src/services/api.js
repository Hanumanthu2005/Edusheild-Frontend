const API_BASE = "http://localhost:5001";

// ── Shared fetch helper ───────────────────────────────────────────────────────
// Handles non-JSON 500s gracefully and always resolves with a plain object.
// On HTTP errors it returns { error: "<message>" } instead of throwing.

async function apiFetch(path, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${path}`, options);

    // Try to parse JSON; fall back to a plain error string if body isn't JSON
    let json;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      json = await response.json();
    } else {
      const text = await response.text();
      json = { error: text || `Server error (${response.status})` };
    }

    // Normalise: if the server returned a non-2xx status but no "error" key,
    // synthesise one so callers don't have to check response.ok separately.
    if (!response.ok && !json.error) {
      json.error = `Request failed with status ${response.status}`;
    }

    return json;
  } catch (err) {
    // Network-level failure (server down, CORS, etc.)
    console.error(`[API] Network error on ${path}:`, err);
    return { error: "Failed to connect to server. Please try again." };
  }
}

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const registerUser = (data) =>
  apiFetch("/api/register", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(data),
  });

export const loginUser = (data) =>
  apiFetch("/api/login", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(data),
  });

// ── Student: Exams ────────────────────────────────────────────────────────────

export const getExams = () =>
  apiFetch("/api/student/exams", {
    method:  "GET",
    headers: authHeaders(),
  });

export const getExamDetails = (examId) =>
  apiFetch(`/api/student/exams/${examId}`, {
    method:  "GET",
    headers: authHeaders(),
  });

export const startExam = (examId) =>
  apiFetch(`/api/student/exams/${examId}/start`, {
    method:  "POST",
    headers: authHeaders(),
  });

export const submitExam = (examId, userExamId, answers) =>
  apiFetch(`/api/student/exams/${examId}/submit`, {
    method:  "POST",
    headers: authHeaders(),
    body:    JSON.stringify({ user_exam_id: userExamId, answers }),
  });

export const terminateExam = (examId, reason = "unknown") =>
  apiFetch(`/api/student/exams/${examId}/terminate`, {
    method:  "POST",
    headers: authHeaders(),
    body:    JSON.stringify({ reason }),
  });

// ── Student: Results ──────────────────────────────────────────────────────────

export const getStudentResults = () =>
  apiFetch("/api/student/results", {
    method:  "GET",
    headers: authHeaders(),
  });

// ── Proctoring ────────────────────────────────────────────────────────────────

export const logViolation = (type) =>
  apiFetch("/api/log_violation", {
    method:  "POST",
    headers: authHeaders(),
    body:    JSON.stringify({ type }),
  });

/**
 * Sends a captured video frame (Blob / File) to the backend for analysis.
 * Uses multipart/form-data — do NOT set Content-Type manually (browser sets boundary).
 */
export const analyzeFrame = (frameBlob) => {
  const token = localStorage.getItem("token");
  const form  = new FormData();
  form.append("frame", frameBlob, "frame.jpg");

  return apiFetch("/api/analyze_frame", {
    method:  "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body:    form,
  });
};

export const getLatestViolations = () =>
  apiFetch("/api/violations/latest", {
    method:  "GET",
    headers: authHeaders(),
  });

// ── Admin ─────────────────────────────────────────────────────────────────────

export const adminGetExams = () =>
  apiFetch("/api/admin/exams", {
    method:  "GET",
    headers: authHeaders(),
  });

export const adminCreateExam = (data) =>
  apiFetch("/api/admin/exams", {
    method:  "POST",
    headers: authHeaders(),
    body:    JSON.stringify(data),
  });

export const adminUpdateExam = (examId, data) =>
  apiFetch(`/api/admin/exams/${examId}`, {
    method:  "PUT",
    headers: authHeaders(),
    body:    JSON.stringify(data),
  });

export const adminDeleteExam = (examId) =>
  apiFetch(`/api/admin/exams/${examId}`, {
    method:  "DELETE",
    headers: authHeaders(),
  });

export const adminGetExamDetails = (examId) =>
  apiFetch(`/api/admin/exams/${examId}`, {
    method:  "GET",
    headers: authHeaders(),
  });

export const adminAddQuestion = (examId, data) =>
  apiFetch(`/api/admin/exams/${examId}/questions`, {
    method:  "POST",
    headers: authHeaders(),
    body:    JSON.stringify(data),
  });

export const adminDeleteQuestion = (questionId) =>
  apiFetch(`/api/admin/questions/${questionId}`, {
    method:  "DELETE",
    headers: authHeaders(),
  });

export const adminAddOption = (questionId, data) =>
  apiFetch(`/api/admin/questions/${questionId}/options`, {
    method:  "POST",
    headers: authHeaders(),
    body:    JSON.stringify(data),
  });

export const adminGetActiveSessions = () =>
  apiFetch("/api/admin/sessions/active", {
    method:  "GET",
    headers: authHeaders(),
  });

export const adminTerminateSession = (sessionId) =>
  apiFetch(`/api/admin/sessions/${sessionId}/terminate`, {
    method:  "POST",
    headers: authHeaders(),
  });

export const adminGetExamResults = (examId) =>
  apiFetch(`/api/admin/exams/${examId}/results`, {
    method:  "GET",
    headers: authHeaders(),
  });

export const adminGetAllViolations = (params = {}) => {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
  ).toString();
  return apiFetch(`/api/admin/violations${qs ? `?${qs}` : ""}`, {
    method:  "GET",
    headers: authHeaders(),
  });
};

export const adminGetViolationSummary = () =>
  apiFetch("/api/admin/violations/summary", {
    method:  "GET",
    headers: authHeaders(),
  });

export const adminGetSessionViolations = (sessionId, includeSnapshot = false) =>
  apiFetch(
    `/api/admin/sessions/${sessionId}/violations?include_snapshot=${includeSnapshot ? 1 : 0}`,
    { method: "GET", headers: authHeaders() }
  );

export const adminGetStudentViolations = (studentId) =>
  apiFetch(`/api/admin/students/${studentId}/violations`, {
    method:  "GET",
    headers: authHeaders(),
  });