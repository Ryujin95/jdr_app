// src/components/Header.jsx
import { useContext, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { API_URL } from "../config";
import { AuthContext } from "../context/AuthContext";
import defaultAvatar from "../assets/kenichi.png";
import RightSidebar from "./RightSidebar.jsx";
import "./HeaderFooter.css";

function Header() {
  const { isAuthenticated, user } = useContext(AuthContext);
  const [panelOpen, setPanelOpen] = useState(false);
  const { t, i18n } = useTranslation();

  const assetBase = useMemo(() => API_URL.replace(/\/api\/?$/, ""), []);

  const profileAvatarSrc = useMemo(() => {
    const path = user?.avatarUrl;
    if (!path) return defaultAvatar;
    if (path.startsWith("http")) return path;
    if (path.startsWith("/")) return `${assetBase}${path}`;
    return `${assetBase}/${path}`;
  }, [user?.avatarUrl, assetBase]);

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
  };

  return (
    <header className="header">
  <div className="header-left">
    <div className="lang-switcher">
      <button
        type="button"
        className={`lang-btn ${i18n.language === "fr" ? "active" : ""}`}
        onClick={() => changeLanguage("fr")}
        title="Français"
      >
        <img src="https://flagcdn.com/w20/fr.png" alt="Français" width="20" />
      </button>
      <button
        type="button"
        className={`lang-btn ${i18n.language === "en" ? "active" : ""}`}
        onClick={() => changeLanguage("en")}
        title="English"
      >
        <img src="https://flagcdn.com/w20/gb.png" alt="English" width="20" />
      </button>
    </div>
  </div>
  
<div className="header-center">
  <Link to="/">
    <img src="/images/logo.png" alt="StoryForge" className="header-logo" />
  </Link>
</div>

  <div className="header-right">
    <nav className="nav">

      {isAuthenticated && (
        <Link to="/dashboard" className="nav-link">{t("nav.myJdr")}</Link>
      )}

      {!isAuthenticated && (
        <Link to="/login" className="nav-link">{t("nav.login")}</Link>
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
              alt={t("nav.myProfile")}
              className="profile-avatar"
            />
          </Link>
          <RightSidebar open={panelOpen} setOpen={setPanelOpen} />
        </div>
      )}
    </nav>
  </div>
</header>
  );
}

export default Header;