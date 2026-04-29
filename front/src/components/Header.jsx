// src/components/Header.jsx
import { useContext, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { API_URL } from "../config";
import { AuthContext } from "../context/AuthContext";
import defaultAvatar from "../assets/kenichi.png";
import RightSidebar from "./RightSidebar.jsx";
import "./HeaderFooter.css";

function Header() {
  const { isAuthenticated, user } = useContext(AuthContext);
  const [panelOpen, setPanelOpen] = useState(false);

  const assetBase = useMemo(() => API_URL.replace(/\/api\/?$/, ""), []);

  const profileAvatarSrc = useMemo(() => {
    const path = user?.avatarUrl;
    if (!path) return defaultAvatar;
    if (path.startsWith("http")) return path;
    if (path.startsWith("/")) return `${assetBase}${path}`;
    return `${assetBase}/${path}`;
  }, [user?.avatarUrl, assetBase]);

  return (
    <header className="header">
      <h1 className="logo">JDR</h1>

      <nav className="nav">
        <Link to="/" className="nav-link">Accueil</Link>

        {isAuthenticated && (
          <Link to="/dashboard" className="nav-link">Mes JDR</Link>
        )}

        {!isAuthenticated && (
          <Link to="/login" className="nav-link">Se connecter</Link>
        )}

        {isAuthenticated && (
          <div
            className="profile-wrapper"
            onMouseEnter={() => setPanelOpen(true)}
            onMouseLeave={() => setPanelOpen(false)}
          >
            <Link to="/profile" className="profile-link">
              <img
                src={profileAvatarSrc}
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