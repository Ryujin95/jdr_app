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

  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const canSeeEditor = roles.includes("ROLE_ADMIN") || roles.includes("ROLE_MJ");

  return (
    <header className="header">
      <h1 className="logo">JDR</h1>

      <nav className="nav">
        <Link to="/" className="nav-link">
          Accueil
        </Link>

        {isAuthenticated && (
          <>
            {/* ✅ NOUVEAU : lien Mes JDR */}
            <Link to="/dashboard" className="nav-link">
              Mes JDR
            </Link>
          </>
        )}

        {isAuthenticated && canSeeEditor && (
          <Link to="/editor" className="nav-link">
            Éditeur
          </Link>
        )}

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
