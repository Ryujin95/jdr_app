// src/pages/ProfilePage.jsx
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { API_URL } from "../config";
import "../CSS/Profile.css";
import defaultAvatar from "../assets/kenichi.png";

function ProfilePage() {
  const { user, token, isAuthenticated, logout, updateUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [profileImagePreview, setProfileImagePreview] = useState(defaultAvatar);

  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated) navigate("/login");
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (user?.avatar) setProfileImagePreview(user.avatar);
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const callUpdateApi = async (body) => {
    if (!user) throw new Error("Pas d'utilisateur connecté");
    if (!token) throw new Error("Token manquant (pas connecté)");

    const res = await fetch(`${API_URL}/users/${user.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      throw new Error(`Réponse non JSON (${res.status}). Extrait: ${text.slice(0, 120)}`);
    }

    if (!res.ok) {
      throw new Error(data?.error || data?.message || "Erreur lors de la mise à jour");
    }

    updateUser?.({
      username: data.username ?? user.username,
      email: data.email ?? user.email,
    });

    return data;
  };

  const handleUsernameSave = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    const value = newUsername.trim();
    if (!value) return;

    try {
      await callUpdateApi({ username: value });
      setNewUsername("");
      setMessage("Nom d'utilisateur mis à jour.");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEmailSave = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    const value = newEmail.trim();
    if (!value) return;

    try {
      await callUpdateApi({ email: value });
      setNewEmail("");
      setMessage("Email mis à jour.");
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    const value = newPassword.trim();
    if (!value) return;

    try {
      await callUpdateApi({ password: value });
      setNewPassword("");
      setMessage("Mot de passe mis à jour.");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result;
      setProfileImagePreview(base64);
      setMessage("Avatar mis à jour (front uniquement pour l'instant).");
    };
    reader.readAsDataURL(file);
  };

  if (!user) return null;

  return (
    <main className="profile-container">
      <div className="profile-header-line">
        <div className="profile-header-left">
          <img src={profileImagePreview} alt="Avatar" className="profile-avatar-big" />
          <div>
            <h2>Mon profil</h2>
            <p className="profile-username">@{user.username}</p>
            <p className="profile-email">{user.email}</p>
          </div>
        </div>

        <button className="logout-btn" onClick={handleLogout}>
          Se déconnecter
        </button>
      </div>

      {error && <p className="profile-error">{error}</p>}
      {message && <p className="profile-success">{message}</p>}

      <section className="profile-section">
        <h3>Nom d'utilisateur</h3>
        <p className="profile-current">
          Actuel : <strong>{user.username}</strong>
        </p>
        <form className="profile-form-inline" onSubmit={handleUsernameSave}>
          <input
            type="text"
            className="profile-input"
            placeholder="Nouveau nom d'utilisateur"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
          />
          <button type="submit" className="profile-save-btn">
            Mettre à jour
          </button>
        </form>
      </section>

      <section className="profile-section">
        <h3>Email</h3>
        <p className="profile-current">
          Actuel : <strong>{user.email}</strong>
        </p>
        <form className="profile-form-inline" onSubmit={handleEmailSave}>
          <input
            type="email"
            className="profile-input"
            placeholder="Nouvel email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <button type="submit" className="profile-save-btn">
            Mettre à jour
          </button>
        </form>
      </section>

      <section className="profile-section">
        <h3>Mot de passe</h3>
        <form className="profile-form-inline" onSubmit={handlePasswordSave}>
          <input
            type="password"
            className="profile-input"
            placeholder="Nouveau mot de passe"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button type="submit" className="profile-save-btn">
            Mettre à jour
          </button>
        </form>
      </section>

      <section className="profile-section">
        <h3>Photo de profil</h3>
        <form className="profile-form-inline" onSubmit={(e) => e.preventDefault()}>
          <label className="profile-image-label">
            Choisir une nouvelle image
            <input
              type="file"
              accept="image/*"
              className="profile-image-input"
              onChange={handleImageChange}
            />
          </label>
        </form>
      </section>
    </main>
  );
}

export default ProfilePage;
