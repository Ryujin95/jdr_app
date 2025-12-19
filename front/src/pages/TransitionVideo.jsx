// src/pages/TransitionVideo.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../CSS/TransitionVideo.css";

function TransitionVideo() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let hasStartedLeave = false;

    const startLeave = () => {
      if (hasStartedLeave) return;
      hasStartedLeave = true;

      // on lance l'animation de fade-out
      setLeaving(true);

      // on laisse 500ms pour le fondu, puis on navigue vers la fiche
      setTimeout(() => {
        navigate(`/characters/${id}`);
      }, 1800);
    };

    const video = document.getElementById("transition-video");
    if (video) {
      video.addEventListener("ended", startLeave);
    }

    // sécurité si l'event "ended" ne se déclenche pas
    const timer = setTimeout(startLeave, 11000);

    return () => {
      clearTimeout(timer);
      if (video) {
        video.removeEventListener("ended", startLeave);
      }
    };
  }, [id, navigate]);

  return (
    <div
      className={
        "transition-video-container" + (leaving ? " leaving" : "")
      }
    >
      <video
        id="transition-video"
        src="/videos/Kennichi.mp4"   // ton chemin actuel
        autoPlay
        muted
        playsInline
        className="transition-video"
      />
    </div>
  );
}

export default TransitionVideo;
