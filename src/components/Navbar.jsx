import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import "../css/Navbar.css";

function Navbar() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`navbar ${scrolled ? "navbar-scrolled" : ""}`}>
      <div className="navbar-container">
        <Link to="/" className="logo">
          <div className="logo-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="logo-text">EduShield</span>
        </Link>

        <div className="nav-links">
          <Link 
            to="/" 
            className={`nav-link ${location.pathname === "/" ? "active" : ""}`}
          >
            <span>Home</span>
            <div className="link-underline"></div>
          </Link>
          <Link 
            to="/scope" 
            className={`nav-link ${location.pathname === "/scope" ? "active" : ""}`}
          >
            <span>Scope</span>
            <div className="link-underline"></div>
          </Link>
          <Link 
            to="/team" 
            className={`nav-link ${location.pathname === "/team" ? "active" : ""}`}
          >
            <span>Team</span>
            <div className="link-underline"></div>
          </Link>
          <Link 
            to="/about" 
            className={`nav-link ${location.pathname === "/about" ? "active" : ""}`}
          >
            <span>About</span>
            <div className="link-underline"></div>
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;