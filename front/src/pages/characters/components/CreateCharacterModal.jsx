function CreateCharacterModal({
  open,
  error,
  submitting,
  formValues,
  avatarPreview,
  onChange,
  onAvatarChange,
  onSubmit,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal character-create-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Créer un personnage</div>

        {error && <p style={{ color: "red" }}>{error}</p>}

        <form onSubmit={onSubmit}>
          <input
            type="text"
            placeholder="Surnom"
            value={formValues.nickname}
            onChange={(e) => onChange("nickname", e.target.value)}
            required
          />

          <input
            type="text"
            placeholder="Prénom"
            value={formValues.firstname}
            onChange={(e) => onChange("firstname", e.target.value)}
          />

          <input
            type="text"
            placeholder="Nom"
            value={formValues.lastname}
            onChange={(e) => onChange("lastname", e.target.value)}
          />

          <input
            type="file"
            accept="image/*"
            onChange={onAvatarChange}
          />

          {avatarPreview && <img src={avatarPreview} alt="Preview" width="100" />}

          <div className="form-actions">
            <button type="button" onClick={onCancel} disabled={submitting}>
              Annuler
            </button>

            <button type="submit" disabled={submitting}>
              {submitting ? "Enregistrement..." : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateCharacterModal;