// src/pages/TransitionVideo.jsx
import { useEffect, useMemo, useState, useCallback, useRef, useContext } from "react";
import { useParams } from "react-router-dom";
import "../CSS/TransitionVideo.css";
import CharacterDetailPage from "./CharacterDetailPage";
import { API_URL } from "../config";
import { AuthContext } from "../context/AuthContext";
import { apiGetCharacter } from "../api/api";

function TransitionVideo() {
  const { id } = useParams();
  const { token, user } = useContext(AuthContext);

  const [character, setCharacter] = useState(null);
  const [loadingCharacter, setLoadingCharacter] = useState(true);
  const [showOverlay, setShowOverlay] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const videoRef = useRef(null);

  const assetBase = useMemo(() => API_URL.replace(/\/api\/?$/, ""), []);

  const buildAssetUrl = useCallback((path) => {
    if (!path || typeof path !== "string") return null;
    if (path.startsWith("http")) return path;
    if (path.startsWith("/")) return `${assetBase}${path}`;
    return `${assetBase}/${path}`;
  }, [assetBase]);

  const transitionVideoSrc = useMemo(() => {
    return buildAssetUrl(character?.transitionVideoUrl || null);
  }, [character, buildAssetUrl]);

  const handleRemoveVideo = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => setShowOverlay(false), 800);
  }, [leaving]);

  // Charge le personnage
  useEffect(() => {
    if (!token || !id) {
      setCharacter(null);
      setLoadingCharacter(false);
      return;
    }

    let cancelled = false;

    const fetchCharacter = async () => {
      setLoadingCharacter(true);
      try {
        const data = await apiGetCharacter(token, id);
        if (cancelled) return;
        setCharacter(data);
      } catch {
        if (cancelled) return;
        setCharacter(null);
      } finally {
        if (!cancelled) setLoadingCharacter(false);
      }
    };

    fetchCharacter();
    return () => { cancelled = true; };
  }, [id, token]);

  // Animation d'apparition
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(timer);
  }, []);

  // Pas de vidéo → retire l'overlay
  useEffect(() => {
    if (loadingCharacter || !showOverlay || transitionVideoSrc) return;
    handleRemoveVideo();
  }, [loadingCharacter, transitionVideoSrc, showOverlay, handleRemoveVideo]);

  // Gestion fin de vidéo + timer de sécurité
  useEffect(() => {
    if (!showOverlay || !transitionVideoSrc) return;
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

  const overlayClassName = [
    "transition-video-overlay",
    mounted ? "visible" : "",
    leaving ? "leaving" : "",
  ].filter(Boolean).join(" ");

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
          <button type="button" className="transition-skip-button" onClick={handleRemoveVideo}>
            Skip
          </button>
        </div>
      )}
    </div>
  );
}

export default TransitionVideo;