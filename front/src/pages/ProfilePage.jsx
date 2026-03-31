import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { API_URL } from "../config";
import "../CSS/Profile.css";
import defaultAvatar from "../assets/kenichi.png";

export default function ProfilePage() {
  const { user, token, isAuthenticated, logout, updateUser } = useContext(AuthContext);
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  const [profileImagePreview, setProfileImagePreview] = useState(defaultAvatar);
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [disableTransitions, setDisableTransitions] = useState(false);
  const [savingTransitions, setSavingTransitions] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) navigate("/login");
  }, [isAuthenticated, navigate]);

  const parseResponse = async (res) => {
    const contentType = res.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      return res.json().catch(() => null);
    }

    const text = await res.text().catch(() => "");
    return { message: text || `HTTP ${res.status}` };
  };

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
    const res = await fetch(`${API_URL}/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await parseResponse(res);
    if (!res.ok) {
      throw new Error(data?.error || data?.message || "Erreur lors de la mise à jour.");
    }

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
      await callUpdateApi({ username: newUsername }, "Nom d'utilisateur mis à jour !");
      setNewUsername("");
    } catch (err) {
      addNotification({ type: "error", message: err.message });
    }
  };

  const handleEmailSave = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    try {
      await callUpdateApi({ email: newEmail }, "Email mis à jour !");
      setNewEmail("");
    } catch (err) {
      addNotification({ type: "error", message: err.message });
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (!newPassword.trim()) return;

    try {
      await callUpdateApi({ password: newPassword }, "Mot de passe mis à jour !");
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
        next ? "Transitions désactivées." : "Transitions activées."
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
      addNotification({
        type: "error",
        message: "Format d'image non autorisé.",
      });
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setProfileImagePreview(localPreview);
    setSavingAvatar(true);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await fetch(`${API_URL}/me`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await parseResponse(res);
      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Erreur lors de l'envoi de l'avatar.");
      }

      const nextAvatarUrl = data?.avatarUrl ?? "/api/me/avatar";

      updateUser({
        ...user,
        avatarUrl: nextAvatarUrl,
      });

      setProfileImagePreview(buildAvatarUrl(nextAvatarUrl));

      addNotification({
        type: "success",
        message: "Avatar mis à jour !",
      });
    } catch (err) {
      setProfileImagePreview(
        user?.avatarUrl ? buildAvatarUrl(user.avatarUrl) : defaultAvatar
      );

      addNotification({
        type: "error",
        message: err.message,
      });
    } finally {
      setSavingAvatar(false);
      e.target.value = "";
      URL.revokeObjectURL(localPreview);
    }
  };

  const deleteAccount = async () => {
    try {
      const res = await fetch(`${API_URL}/me`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Suppression impossible");

      addNotification({
        type: "success",
        message: "Compte supprimé avec succès !",
      });

      logout();
      navigate("/");
    } catch (err) {
      addNotification({
        type: "error",
        message: err.message,
      });
    }
  };

  const handleDeleteRequest = () => {
    if (
      window.confirm(
        "Es-tu sûr ? Cela supprimera définitivement ton compte et toutes tes données."
      )
    ) {
      deleteAccount();
    }
  };

  if (!user) return null;

  return (
    <main className="profile-container">
      <div className="profile-header-line">
        <div className="profile-header-left">
          <img
            src={profileImagePreview}
            alt="Avatar"
            className="profile-avatar-big"
          />
          <div>
            <h2>Mon profil</h2>
            <p className="profile-username">@{user.username}</p>
            <p className="profile-email">{user.email}</p>
          </div>
        </div>

        <button className="logout-btn" onClick={logout}>
          Se déconnecter
        </button>
      </div>

      <section className="profile-section">
        <h3>Préférences</h3>

        <div className="profile-form-inline" style={{ alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "10px", color: "black" }}>
            <input
              type="checkbox"
              checked={disableTransitions}
              onChange={handleToggleTransitions}
              disabled={savingTransitions}
            />
            Désactiver les transitions vidéo
          </label>

          <span style={{ opacity: 0.75 }}>
            {savingTransitions ? "Enregistrement..." : ""}
          </span>
        </div>
      </section>

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
            {savingAvatar ? "Envoi en cours..." : "Choisir une nouvelle image"}
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
        <h3>Supprimer mon compte</h3>

        <button
          type="button"
          className="profile-delete-btn"
          onClick={handleDeleteRequest}
        >
          Supprimer mon compte
        </button>
      </section>
    </main>
  );
}