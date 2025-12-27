// src/pages/TransitionVideo.jsx
import { useEffect, useMemo, useState, useCallback, useRef, useContext } from "react";
import { useParams } from "react-router-dom";
import "../CSS/TransitionVideo.css";
import CharacterDetailPage from "./CharacterDetailPage";
import { API_URL } from "../config";
import { AuthContext } from "../context/AuthContext";

function TransitionVideo() {
  const { id } = useParams();
  const { token, user } = useContext(AuthContext); // ✅ SEULE MODIFICATION

  const [character, setCharacter] = useState(null);
  const [loadingCharacter, setLoadingCharacter] = useState(true);

  const [showOverlay, setShowOverlay] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const videoRef = useRef(null);

  const assetBase = useMemo(() => API_URL.replace(/\/api\/?$/, ""), []);
  const buildAssetUrl = useCallback(
    (path) => {
      if (!path) return null;
      if (typeof path !== "string") return null;
      if (path.startsWith("http")) return path;
      if (path.startsWith("/")) return `${assetBase}${path}`;
      return `${assetBase}/${path}`;
    },
    [assetBase]
  );

  const transitionVideoSrc = useMemo(() => {
    return buildAssetUrl(character?.transitionVideoUrl || null);
  }, [character, buildAssetUrl]);

  const handleRemoveVideo = useCallback(() => {
    if (leaving) return;

    setLeaving(true);
    setTimeout(() => {
      setShowOverlay(false);
    }, 800);
  }, [leaving]);

  // 1) Charge le personnage UNE SEULE FOIS
  useEffect(() => {
    const fetchCharacter = async () => {
      setLoadingCharacter(true);
      try {
        const res = await fetch(`${API_URL}/characters/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          setCharacter(null);
          return;
        }

        const data = await res.json();
        setCharacter(data);
      } catch {
        setCharacter(null);
      } finally {
        setLoadingCharacter(false);
      }
    };

    if (token && id) fetchCharacter();
    else {
      setCharacter(null);
      setLoadingCharacter(false);
    }
  }, [id, token]);

  // 2) animation apparition overlay
  useEffect(() => {
    const mountTimer = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(mountTimer);
  }, []);

  // 3) Pas de vidéo → on enlève l’overlay
  useEffect(() => {
    if (loadingCharacter) return;
    if (!showOverlay) return;

    if (!transitionVideoSrc) {
      handleRemoveVideo();
    }
  }, [loadingCharacter, transitionVideoSrc, showOverlay, handleRemoveVideo]);

  // 4) timers vidéo
  useEffect(() => {
    if (!showOverlay) return;
    if (!transitionVideoSrc) return;

    const video = videoRef.current;
    if (!video) return;

    const onEnded = () => handleRemoveVideo();

    video.addEventListener("ended", onEnded);
    const safetyTimer = setTimeout(handleRemoveVideo, 11000);

    return () => {
      clearTimeout(safetyTimer);
      video.removeEventListener("ended", onEnded);
    };
  }, [showOverlay, transitionVideoSrc, handleRemoveVideo]);

  const overlayClassName =
    "transition-video-overlay" +
    (mounted ? " visible" : "") +
    (leaving ? " leaving" : "");

  return (
    <div className="transition-video-page">
      <div className="transition-background">
        <CharacterDetailPage character={character} />
      </div>

      {showOverlay && !user?.disableTransitions && (
        <div className={overlayClassName}>
          {transitionVideoSrc && (
            <video
              ref={videoRef}
              id="transition-video"
              src={transitionVideoSrc}
              autoPlay
              muted
              playsInline
              className="transition-video"
            />
          )}

          <button
            type="button"
            className="transition-skip-button"
            onClick={handleRemoveVideo}
          >
            Skip
          </button>
        </div>
      )}
    </div>
  );
}

export default TransitionVideo;
