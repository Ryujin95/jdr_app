// src/pages/HomePage.jsx
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import "../CSS/HomePage.css";

export default function HomePage() {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);

  const goToStart = () => {
    const lsToken = localStorage.getItem("token") || localStorage.getItem("jwt") || localStorage.getItem("access_token");
    const ssToken = sessionStorage.getItem("token") || sessionStorage.getItem("jwt") || sessionStorage.getItem("access_token");

    const ctxToken = auth?.token;
    const ctxUser = auth?.user;

    const isConnected = Boolean(ctxToken || ctxUser || lsToken || ssToken);

    if (isConnected) {
      navigate("/campaigns/new"); // ou /campaigns/create si c’est ta route
    } else {
      navigate("/login");
    }
  };

  return (
    <main className="home">
      <section className="home-hero">
        <div className="home-hero__content">
          <h1 className="home-hero__title">Crée et gère tes parties de JDR, quel que soit le thème</h1>
          <p className="home-hero__subtitle">
            Une plateforme simple pour créer une campagne, inviter tes joueurs, gérer les personnages,
            et contrôler la visibilité des infos sensibles côté MJ.
          </p>

          <div className="home-hero__actions">
            <button className="btn btn-primary" onClick={goToStart}>
              Se connecter
            </button>
            <button className="btn btn-ghost" onClick={() => navigate("/register")}>
              Créer un compte
            </button>
          </div>

          <p className="home-hero__note">
            Après connexion, tu peux créer un JDR. Le créateur devient MJ, les autres rejoignent en tant que joueurs.
          </p>
        </div>

        <div className="home-hero__visual" aria-hidden="true">
          <div className="glass-card">
            <div className="glass-card__row">
              <span className="pill">Campagne</span>
              <span className="pill pill--muted">Thème libre</span>
            </div>
            <div className="glass-card__title">Nom du JDR</div>
            <div className="glass-card__desc">
              Invités: 4 joueurs • Rôle: MJ • Visibilité: contrôlée
            </div>
            <div className="glass-card__grid">
              <div className="mini-box">
                <div className="mini-box__label">Personnages</div>
                <div className="mini-box__value">12</div>
              </div>
              <div className="mini-box">
                <div className="mini-box__label">Lieux</div>
                <div className="mini-box__value">7</div>
              </div>
              <div className="mini-box">
                <div className="mini-box__label">Secrets</div>
                <div className="mini-box__value">MJ</div>
              </div>
              <div className="mini-box">
                <div className="mini-box__label">Knowledge</div>
                <div className="mini-box__value">OK</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section">
        <h2 className="home-section__title">Ce que le site apporte</h2>
        <div className="feature-grid">
          <article className="feature">
            <h3 className="feature__title">Multi-thèmes</h3>
            <p className="feature__text">
              Une campagne peut être zombie, fantasy, SF, enquête… le système reste le même.
            </p>
          </article>
          <article className="feature">
            <h3 className="feature__title">Rôles clairs</h3>
            <p className="feature__text">
              Le créateur est MJ. Les autres sont joueurs. Le MJ peut transférer le rôle plus tard.
            </p>
          </article>
          <article className="feature">
            <h3 className="feature__title">Confidentialité</h3>
            <p className="feature__text">
              Les joueurs ne voient que ce que le MJ autorise. Les règles sont côté backend, pas côté front.
            </p>
          </article>
        </div>
      </section>

      <section className="home-section">
        <h2 className="home-section__title">Comment ça marche</h2>
        <div className="steps">
          <div className="step">
            <div className="step__num">1</div>
            <div className="step__body">
              <div className="step__title">Crée une campagne</div>
              <div className="step__text">Titre + thème, et tu deviens MJ automatiquement.</div>
            </div>
          </div>
          <div className="step">
            <div className="step__num">2</div>
            <div className="step__body">
              <div className="step__title">Invite tes joueurs</div>
              <div className="step__text">Ils rejoignent la campagne en tant que joueurs.</div>
            </div>
          </div>
          <div className="step">
            <div className="step__num">3</div>
            <div className="step__body">
              <div className="step__title">Joue et maîtrise</div>
              <div className="step__text">Personnages, relations, knowledge, secrets: tout est contrôlé.</div>
            </div>
          </div>
        </div>

        <div className="home-cta">
          <div className="home-cta__text">Prêt à lancer une partie ?</div>
          <button className="btn btn-primary" onClick={goToStart}>
            Lancer une partie
          </button>
        </div>
      </section>
    </main>
  );
}
