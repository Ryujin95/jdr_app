// src/components/Header.jsx
import { useContext, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import defaultAvatar from "../assets/kenichi.png";
import RightSidebar from "./RightSidebar.jsx";
import "./HeaderFooter.css";

function Header() {
  const { isAuthenticated, user } = useContext(AuthContext);
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <header className="header">
      <h1 className="logo">JDR The Walking Dead</h1>

      <nav className="nav">
        <Link to="/" className="nav-link">
          Accueil
        </Link>

        <Link to="/characters" className="nav-link">
          Personnages
        </Link>

        {!isAuthenticated && (
          <Link to="/login" className="nav-link">
            Se connecter
          </Link>
        )}

        {isAuthenticated && (
          <div
            className="profile-wrapper"
            onMouseEnter={() => setPanelOpen(true)}
            onMouseLeave={() => setPanelOpen(false)}
          >
            <Link to="/profile" className="profile-link">
              <img
                src={user?.avatar || defaultAvatar}
                alt="Mon profil"
                className="profile-avatar"
              />
            </Link>

            <RightSidebar open={panelOpen} setOpen={setPanelOpen} />
          </div>
        )}
      </nav>
    </header>
  );
}

export default Header;
