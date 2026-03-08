import { BrowserRouter, Routes, Route } from "react-router-dom";
import ViewExams from "./pages/ViewExams";
import LandingPage from "./pages/LandingPage";
import Home from "./pages/Home";
import Scope from "./pages/Scope";
import Team from "./pages/Team";
import About from "./pages/About";
import Results from "./pages/Results";
import ExamPage from "./pages/ExamPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminRoute from "./components/AdminRoute";
import CreateExam from "./pages/admin/CreateExam";
import ManageExams from "./pages/admin/ManageExams";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminResultsPage from "./pages/admin/AdminResultsPage";
import AdminSessionPage from "./pages/admin/AdminSessionPage";
import AdminViolationsPage from "./pages/admin/AdminViolationsPage";
import ExamHistoryPage from "./pages/ExamHistoryPage";
import AdminFeedbackPage from "./pages/admin/AdminFeedbackPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<LandingPage />} />
        <Route path="/scope" element={<Scope />} />
        <Route path="/team" element={<Team />} />
        <Route path="/about" element={<About />} />
        <Route path="/home" element={<Home />} />
        <Route path="/exams" element={<ViewExams />} />
        <Route path="/results" element={<Results />} />
        <Route path="/exam/:examId" element={<ExamPage />} />
        <Route path="/history" element={<ExamHistoryPage />} />

        <Route path="/admin" element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="exams" element={<ManageExams />} />
            <Route path="exams/create" element={<CreateExam />} />
            <Route path="results" element={<AdminResultsPage />} />
            <Route path="violations" element={<AdminViolationsPage />} />
            <Route path="sessions" element={<AdminSessionPage />} />
            <Route path="feedback" element={<AdminFeedbackPage />} />
          </Route>
        </Route>  
      </Routes>
    </BrowserRouter>
  );
}

export default App;
