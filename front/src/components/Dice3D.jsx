import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../CSS/Dice3D.css";

function getDiceHistoryKey(campaignId) {
  return `dice-history:${String(campaignId)}`;
}

function readDiceHistory(campaignId) {
  if (!campaignId) return [];
  try {
    const raw = localStorage.getItem(getDiceHistoryKey(campaignId));
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDiceHistory(campaignId, history) {
  if (!campaignId) return;
  try {
    localStorage.setItem(getDiceHistoryKey(campaignId), JSON.stringify(history));
  } catch {
    // rien
  }
}

function formatHour(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function getFaceTransform(value) {
  switch (value) {
    case 1:
      return "rotateX(0deg) rotateY(0deg)";
    case 2:
      return "rotateX(-90deg) rotateY(0deg)";
    case 3:
      return "rotateY(-90deg)";
    case 4:
      return "rotateY(90deg)";
    case 5:
      return "rotateX(90deg) rotateY(0deg)";
    case 6:
      return "rotateX(180deg) rotateY(0deg)";
    default:
      return "rotateX(0deg) rotateY(0deg)";
  }
}

function D6Cube({ value = 1, rolling = false, small = false }) {
  const safeValue = Math.min(6, Math.max(1, Number(value) || 1));

  const finalTransform = useMemo(() => {
    return getFaceTransform(safeValue);
  }, [safeValue]);

  return (
    <div className={`d6-wrap ${small ? "d6-wrap--small" : ""}`}>
      <div className="d6-shadow" />
      <div className="d6-scene">
        <div
          className={`d6-cube ${rolling ? "d6-cube--rolling" : "d6-cube--stopped"}`}
          style={{
            transform: rolling ? undefined : finalTransform,
          }}
        >
          <div className="d6-face d6-face--1">
            <span className="pip center" />
          </div>

          <div className="d6-face d6-face--2">
            <span className="pip top-left" />
            <span className="pip bottom-right" />
          </div>

          <div className="d6-face d6-face--3">
            <span className="pip top-left" />
            <span className="pip center" />
            <span className="pip bottom-right" />
          </div>

          <div className="d6-face d6-face--4">
            <span className="pip top-left" />
            <span className="pip top-right" />
            <span className="pip bottom-left" />
            <span className="pip bottom-right" />
          </div>

          <div className="d6-face d6-face--5">
            <span className="pip top-left" />
            <span className="pip top-right" />
            <span className="pip center" />
            <span className="pip bottom-left" />
            <span className="pip bottom-right" />
          </div>

          <div className="d6-face d6-face--6">
            <span className="pip top-left" />
            <span className="pip top-right" />
            <span className="pip mid-left" />
            <span className="pip mid-right" />
            <span className="pip bottom-left" />
            <span className="pip bottom-right" />
          </div>
        </div>
      </div>
      <div className="d6-label">d6</div>
    </div>
  );
}

export default function Dice3D({ campaignId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [diceCount, setDiceCount] = useState(1);
  const [diceHistory, setDiceHistory] = useState(() => readDiceHistory(campaignId));

  const [isRolling, setIsRolling] = useState(false);
  const [displayedRolls, setDisplayedRolls] = useState([]);
  const [overlayResult, setOverlayResult] = useState(null);

  const fakeIntervalRef = useRef(null);
  const rollTimeoutRef = useRef(null);
  const overlayTimeoutRef = useRef(null);

  useEffect(() => {
    setDiceHistory(readDiceHistory(campaignId));
  }, [campaignId]);

  useEffect(() => {
    return () => {
      clearInterval(fakeIntervalRef.current);
      clearTimeout(rollTimeoutRef.current);
      clearTimeout(overlayTimeoutRef.current);
    };
  }, []);

  const clearDiceHistory = useCallback(() => {
    saveDiceHistory(campaignId, []);
    setDiceHistory([]);
  }, [campaignId]);

  const handleRoll = useCallback(() => {
    if (isRolling) return;

    const count = Math.max(1, Number(diceCount) || 1);
    const faces = 6;

    const finalRolls = Array.from({ length: count }, () => Math.floor(Math.random() * faces) + 1);
    const total = finalRolls.reduce((sum, value) => sum + value, 0);

    clearInterval(fakeIntervalRef.current);
    clearTimeout(rollTimeoutRef.current);
    clearTimeout(overlayTimeoutRef.current);

    setIsRolling(true);
    setOverlayResult(null);
    setDisplayedRolls(Array.from({ length: count }, () => 1));

    fakeIntervalRef.current = window.setInterval(() => {
      setDisplayedRolls(
        Array.from({ length: count }, () => Math.floor(Math.random() * faces) + 1)
      );
    }, 95);

    rollTimeoutRef.current = window.setTimeout(() => {
      clearInterval(fakeIntervalRef.current);

      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        count,
        faces,
        rolls: finalRolls,
        total,
      };

      const nextHistory = [entry, ...readDiceHistory(campaignId)].slice(0, 50);
      saveDiceHistory(campaignId, nextHistory);
      setDiceHistory(nextHistory);

      setDisplayedRolls(finalRolls);
      setIsRolling(false);
      setOverlayResult({
        label: `${count}d6`,
        value: total,
        rolls: finalRolls,
      });

      overlayTimeoutRef.current = window.setTimeout(() => {
        setOverlayResult(null);
        setDisplayedRolls([]);
      }, 1900);
    }, 1350);
  }, [campaignId, diceCount, isRolling]);

  const activeRolls = isRolling ? displayedRolls : overlayResult?.rolls || [];
  const isSmall = activeRolls.length >= 6;

  return (
    <div className="dice-module">
      <button
        type="button"
        className="dice-toggle-btn"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {isOpen ? "Fermer les dés" : "Lancer de dés"}
      </button>

      {isOpen && (
        <div className="dice-panel">
          <div className="dice-panel-top">
            <h2 className="dice-panel-title">Lancer de d6</h2>

            <button
              type="button"
              className="dice-clear-btn"
              onClick={clearDiceHistory}
            >
              Vider
            </button>
          </div>

          <div className="dice-controls">
            <div className="dice-field">
              <label htmlFor="dice-count">Nombre</label>
              <select
                id="dice-count"
                value={diceCount}
                onChange={(e) => setDiceCount(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div className="dice-fixed-type">d6</div>

            <button
              type="button"
              className="dice-roll-btn"
              onClick={handleRoll}
              disabled={isRolling}
            >
              {isRolling ? "Lancement..." : "Lancer"}
            </button>
          </div>

          <div className="dice-history">
            {diceHistory.length === 0 ? (
              <div className="dice-history-empty">Aucun lancer pour le moment.</div>
            ) : (
              diceHistory.map((entry) => (
                <div key={entry.id} className="dice-history-item">
                  <span className="dice-history-main">
                    {entry.count}d6 → [{entry.rolls.join(", ")}]
                  </span>
                  <span className="dice-history-total">Total : {entry.total}</span>
                  <span className="dice-history-time">{formatHour(entry.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {(isRolling || overlayResult) && (
        <div className="dice-overlay">
          <div className="dice-overlay-box">
            <div className="dice-overlay-label">
              {isRolling ? `Lancement ${diceCount}d6...` : overlayResult?.label}
            </div>

            <div className="dice-roll-visuals">
              {activeRolls.map((value, index) => (
                <D6Cube
  key={`die-${index}`}
  value={value}
  rolling={isRolling}
  small={isSmall}
/>
              ))}
            </div>

            {!isRolling && overlayResult && (
              <div className="dice-overlay-total">
                <small>Résultat final</small>
                <span>Total : {overlayResult.value}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}