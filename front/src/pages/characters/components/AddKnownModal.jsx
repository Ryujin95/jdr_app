function AddKnownModal({
  candidates,
  selectedId,
  selectedType,
  onSelectId,
  onSelectType,
  onConfirm,
  onCancel,
}) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Ajouter un connu</div>

        <select className="modal-select" value={selectedId} onChange={(e) => onSelectId(e.target.value)}>
          <option value="">Choisir un personnage</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nickname} {c.clan ? `(${c.clan})` : ""}
            </option>
          ))}
        </select>

        <select className="modal-select" value={selectedType} onChange={(e) => onSelectType(e.target.value)}>
          <option value="neutral">Neutre</option>
          <option value="ami">Ami</option>
          <option value="ennemi">Ennemi</option>
        </select>

        <div className="modal-actions">
          <button type="button" className="modal-cancel" onClick={onCancel}>
            Annuler
          </button>

          <button type="button" className="modal-confirm" disabled={!selectedId} onClick={onConfirm}>
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddKnownModal;