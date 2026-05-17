// src/pages/ProfilePage.jsx
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { API_URL } from "../config";
import { apiUpdateMe, apiDeleteMe, apiUploadMeAvatar } from "../api/api";
import "../CSS/Profile.css";
import defaultAvatar from "../assets/kenichi.png";

export default function ProfilePage() {
  const { user, token, isAuthenticated, logout, updateUser } = useContext(AuthContext);
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [profileImagePreview, setProfileImagePreview] = useState(defaultAvatar);
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [disableTransitions, setDisableTransitions] = useState(false);
  const [savingTransitions, setSavingTransitions] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  const [selectedTheme, setSelectedTheme] = useState(
    localStorage.getItem("appTheme") || "dark-fantasy"
  );

  useEffect(() => {
    if (!isAuthenticated) navigate("/login");
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    document.body.dataset.theme = selectedTheme;
    localStorage.setItem("appTheme", selectedTheme);
  }, [selectedTheme]);

  const buildAvatarUrl = (avatarUrl) => {
    if (!avatarUrl) return defaultAvatar;
    if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")) {
      return `${avatarUrl}${avatarUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;
    }
    const base = API_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");
    const path = avatarUrl.startsWith("/") ? avatarUrl : `/${avatarUrl}`;
    return `${base}${path}?t=${Date.now()}`;
  };

  useEffect(() => {
    if (user?.avatarUrl) {
      setProfileImagePreview(buildAvatarUrl(user.avatarUrl));
    } else {
      setProfileImagePreview(defaultAvatar);
    }
  }, [user]);

  useEffect(() => {
    setDisableTransitions(!!user?.disableTransitions);
  }, [user]);

  const callUpdateApi = async (body, successMessage) => {
    const data = await apiUpdateMe(token, body);
    updateUser({
      ...user,
      username: data?.username ?? user.username,
      email: data?.email ?? user.email,
      disableTransitions:
        typeof data?.disableTransitions === "boolean"
          ? data.disableTransitions
          : (user?.disableTransitions ?? false),
      avatarUrl: data?.avatarUrl ?? user?.avatarUrl ?? null,
    });
    addNotification({ type: "success", message: successMessage });
    return data;
  };

  const handleUsernameSave = async (e) => {
    e.preventDefault();
    if (!newUsername.trim()) return;
    try {
      await callUpdateApi({ username: newUsername }, t("profile.usernameUpdated"));
      setNewUsername("");
    } catch (err) {
      addNotification({ type: "error", message: err.message });
    }
  };

  const handleEmailSave = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    try {
      await callUpdateApi({ email: newEmail }, t("profile.emailUpdated"));
      setNewEmail("");
    } catch (err) {
      addNotification({ type: "error", message: err.message });
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (!newPassword.trim()) return;
    try {
      await callUpdateApi({ password: newPassword }, t("profile.passwordUpdated"));
      setNewPassword("");
    } catch (err) {
      addNotification({ type: "error", message: err.message });
    }
  };

  const handleToggleTransitions = async () => {
    const next = !disableTransitions;
    setDisableTransitions(next);
    setSavingTransitions(true);
    try {
      const data = await callUpdateApi(
        { disableTransitions: next },
        next ? t("profile.transitionsDisabled") : t("profile.transitionsEnabled")
      );
      if (typeof data?.disableTransitions === "boolean") {
        setDisableTransitions(data.disableTransitions);
      }
    } catch (err) {
      setDisableTransitions(!next);
      addNotification({ type: "error", message: err.message });
    } finally {
      setSavingTransitions(false);
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      addNotification({ type: "error", message: t("profile.invalidFormat") });
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setProfileImagePreview(localPreview);
    setSavingAvatar(true);

    try {
      const data = await apiUploadMeAvatar(token, file);
      const nextAvatarUrl = data?.avatarUrl ?? "/api/me/avatar";
      updateUser({ ...user, avatarUrl: nextAvatarUrl });
      setProfileImagePreview(buildAvatarUrl(nextAvatarUrl));
      addNotification({ type: "success", message: t("profile.avatarUpdated") });
    } catch (err) {
      setProfileImagePreview(user?.avatarUrl ? buildAvatarUrl(user.avatarUrl) : defaultAvatar);
      addNotification({ type: "error", message: err.message });
    } finally {
      setSavingAvatar(false);
      e.target.value = "";
      URL.revokeObjectURL(localPreview);
    }
  };

  const handleDeleteRequest = async () => {
    if (!window.confirm(t("profile.deleteConfirm"))) return;
    try {
      await apiDeleteMe(token);
      addNotification({ type: "success", message: t("profile.accountDeleted") });
      logout();
      navigate("/");
    } catch (err) {
      addNotification({ type: "error", message: err.message });
    }
  };

  if (!user) return null;

  return (
    <main className="profile-container">
      <div className="profile-header-line">
        <div className="profile-header-left">
          <img src={profileImagePreview} alt="Avatar" className="profile-avatar-big" />
          <div>
            <h2>{t("profile.title")}</h2>
            <p className="profile-username">@{user.username}</p>
            <p className="profile-email">{user.email}</p>
          </div>
        </div>
        <button className="logout-btn" onClick={logout}>
          {t("profile.logout")}
        </button>
      </div>

      <section className="profile-themes">
        <h3>{t("profile.theme")}</h3>
        <select value={selectedTheme} onChange={(e) => setSelectedTheme(e.target.value)} className="profile-select">
          <option value="dark-fantasy">Dark Fantasy</option>
          <option value="frost-wind">Frost Wind</option>
          <option value="shadow-tech">Shadow Tech</option>
          <option value="mystic-forest">Mystic Forest</option>
          <option value="epic-gold">Epic Gold</option>
        </select>
      </section>

      <section className="profile-section">
        <h3>{t("profile.preferences")}</h3>
        <div className="profile-form-inline profile-preferences">
          <label className="profile-checkbox-label">
            <input
              type="checkbox"
              checked={disableTransitions}
              onChange={handleToggleTransitions}
              disabled={savingTransitions}
            />
            {t("profile.disableTransitions")}
          </label>
          {savingTransitions && <span className="profile-saving">{t("profile.saving")}</span>}
        </div>
      </section>

      <section className="profile-section">
        <h3>{t("profile.username")}</h3>
        <p className="profile-current">{t("profile.current")} : <strong>{user.username}</strong></p>
        <form className="profile-form-inline" onSubmit={handleUsernameSave}>
          <input
            type="text"
            className="profile-input"
            placeholder={t("profile.newUsername")}
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
          />
          <button type="submit" className="profile-save-btn">{t("profile.update")}</button>
        </form>
      </section>

      <section className="profile-section">
        <h3>{t("profile.email")}</h3>
        <p className="profile-current">{t("profile.current")} : <strong>{user.email}</strong></p>
        <form className="profile-form-inline" onSubmit={handleEmailSave}>
          <input
            type="email"
            className="profile-input"
            placeholder={t("profile.newEmail")}
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <button type="submit" className="profile-save-btn">{t("profile.update")}</button>
        </form>
      </section>

      <section className="profile-section">
        <h3>{t("profile.password")}</h3>
        <form className="profile-form-inline" onSubmit={handlePasswordSave}>
          <input
            type="password"
            className="profile-input"
            placeholder={t("profile.newPassword")}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button type="submit" className="profile-save-btn">{t("profile.update")}</button>
        </form>
      </section>

      <section className="profile-section">
        <h3>{t("profile.avatar")}</h3>
        <form className="profile-form-inline" onSubmit={(e) => e.preventDefault()}>
          <label className="profile-image-label">
            {savingAvatar ? t("profile.uploading") : t("profile.chooseImage")}
            <input
              type="file"
              accept="image/*"
              className="profile-image-input"
              onChange={handleImageChange}
              disabled={savingAvatar}
            />
          </label>
        </form>
      </section>

      <section className="profile-section delete-section">
        <h3>{t("profile.deleteAccount")}</h3>
        <button type="button" className="profile-delete-btn" onClick={handleDeleteRequest}>
          {t("profile.deleteAccount")}
        </button>
      </section>
    </main>
  );
}