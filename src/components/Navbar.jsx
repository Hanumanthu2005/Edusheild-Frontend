import { Link } from "react-router-dom";
import "../css/Navbar.css";

function Navbar() {
  return (
    <nav className="navbar">
      <div className="logo">EduShield</div>

      <div className="nav-links">
        <Link to="/">Home</Link>
        <Link to="/scope">Scope</Link>
        <Link to="/team">Team</Link>
        <Link to="/about">About</Link>
      </div>
    </nav>
  );
}

export default Navbar;
