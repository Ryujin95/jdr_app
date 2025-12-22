// src/pages/TransitionVideo.jsx
import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import "../CSS/TransitionVideo.css";
import CharacterDetailPage from "./CharacterDetailPage";

function TransitionVideo() {
  const { id } = useParams();

  const [showOverlay, setShowOverlay] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // même logique que ton removeVideo, mais réutilisable (fin vidéo + skip)
  const handleRemoveVideo = useCallback(() => {
    if (leaving) return;

    setLeaving(true);

    // on laisse le fondu, puis on enlève l'overlay
    setTimeout(() => {
      setShowOverlay(false);
    }, 800);
  }, [leaving]);

  useEffect(() => {
    const mountTimer = setTimeout(() => {
      setMounted(true);
    }, 10);

    const video = document.getElementById("transition-video");

    if (video) {
      video.addEventListener("ended", handleRemoveVideo);
    }

    const safetyTimer = setTimeout(handleRemoveVideo, 11000);

    return () => {
      clearTimeout(mountTimer);
      clearTimeout(safetyTimer);
      if (video) {
        video.removeEventListener("ended", handleRemoveVideo);
      }
    };
  }, [handleRemoveVideo]);

  const overlayClassName =
    "transition-video-overlay" +
    (mounted ? " visible" : "") +
    (leaving ? " leaving" : "");

  return (
    <div className="transition-video-page">
      <div className="transition-background">
        <CharacterDetailPage />
      </div>

      {showOverlay && (
        <div className={overlayClassName}>
          <video
            id="transition-video"
            src="/videos/Kennichi.mp4"
            autoPlay
            muted
            playsInline
            className="transition-video"
          />

          {/* Bouton Skip pendant la vidéo */}
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
