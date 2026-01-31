import { BrowserRouter, Routes, Route } from "react-router-dom";
import ViewExams from "./pages/ViewExams";
import LandingPage from "./pages/LandingPage";
import Home from "./pages/Home";
import Results from "./pages/Results";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<Home />} />
        <Route path="/exams" element={<ViewExams />} />
        <Route path="/results" element={<Results />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
