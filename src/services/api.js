const API_BASE = "http://localhost:5001";

export const registerUser = async (data) => {
  const response = await fetch(`${API_BASE}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return response.json();
};

export const loginUser = async (data) => {
  const response = await fetch(`${API_BASE}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return response.json();
};

export const getExams = async () => {
  const token = localStorage.getItem("token");
  
  const response = await fetch(`${API_BASE}/api/student/exams`, {
    method: "GET",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch exams");
  }

  return response.json();
};

export const getExamDetails = async (examId) => {
  const token = localStorage.getItem("token");
  
  const response = await fetch(`${API_BASE}/api/student/exams/${examId}`, {
    method: "GET",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch exam details");
  }

  return response.json();
};

export const startExam = async (examId) => {
  const token = localStorage.getItem("token");
  
  const response = await fetch(`${API_BASE}/api/student/exams/${examId}/start`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
  });

  if (!response.ok) {
    throw new Error("Failed to start exam");
  }

  return response.json();
};

export const submitExam = async (examId, userExamId, answers) => {
  const token = localStorage.getItem("token");
  
  const response = await fetch(`${API_BASE}/api/student/exams/${examId}/submit`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      user_exam_id: userExamId,
      answers: answers
    })
  });

  if (!response.ok) {
    throw new Error("Failed to submit exam");
  }

  return response.json();
};

export const getStudentResults = async () => {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_BASE}/api/student/results`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch results");
  }

  return response.json();
};