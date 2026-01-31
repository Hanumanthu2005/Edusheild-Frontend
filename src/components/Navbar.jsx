import { Link } from "react-router-dom";
import "../css/Navbar.css";

function Navbar() {
  return (
    <nav className="navbar">
      <div className="logo">EduShield</div>

      <div className="nav-links">
        <Link to="/home">Home</Link>
        <a href="#scope">Scope</a>
        <a href="#team">Team</a>
        <a href="#about">About</a>
      </div>
    </nav>
  );
}

export default Navbar;
