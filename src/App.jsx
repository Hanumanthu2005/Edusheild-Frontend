import { BrowserRouter, Routes, Route } from "react-router-dom";
import ViewExams from "./pages/ViewExams";
import LandingPage from "./pages/LandingPage";
import Home from "./pages/Home";
import Scope from "./pages/Scope";
import Team from "./pages/Team";
import About from "./pages/About";
import Results from "./pages/Results";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/scope" element={<Scope />} />
        <Route path="/team" element={<Team />} />
        <Route path="/about" element={<About />} />
        <Route path="/home" element={<Home />} />
        <Route path="/exams" element={<ViewExams />} />
        <Route path="/results" element={<Results />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
