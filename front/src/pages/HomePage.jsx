// src/pages/HomePage.jsx
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../context/AuthContext";
import "../CSS/HomePage.css";

export default function HomePage() {
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);
  const { t } = useTranslation();

  const goToStart = () => {
    if (token) {
      navigate("/campaigns/create");
    } else {
      navigate("/login");
    }
  };

  return (
    <main className="home">
      <section className="home-hero">
        <div className="home-hero__content">
          <h1 className="home-hero__title">{t("home.hero.title")}</h1>
          <p className="home-hero__subtitle">{t("home.hero.subtitle")}</p>

          <div className="home-hero__actions">
            {token ? (
              <button className="btn btn-primary" onClick={() => navigate("/dashboard")}>
                {t("dashboard.title")}
              </button>
            ) : (
              <>
                <button className="btn btn-primary" onClick={() => navigate("/login")}>
                  {t("home.hero.loginBtn")}
                </button>
                <button className="btn btn-ghost" onClick={() => navigate("/register")}>
                  {t("home.hero.registerBtn")}
                </button>
              </>
            )}
          </div>

          <p className="home-hero__note">{t("home.hero.note")}</p>
        </div>

        <div className="home-hero__visual" aria-hidden="true">
          <div className="glass-card">
            <div className="glass-card__row">
              <span className="pill">{t("home.card.campaign")}</span>
              <span className="pill pill--muted">{t("home.card.freeTheme")}</span>
            </div>
            <div className="glass-card__title">{t("home.card.jdrName")}</div>
            <div className="glass-card__desc">{t("home.card.desc")}</div>
            <div className="glass-card__grid">
              <div className="mini-box">
                <div className="mini-box__label">{t("home.card.characters")}</div>
                <div className="mini-box__value">12</div>
              </div>
              <div className="mini-box">
                <div className="mini-box__label">{t("home.card.locations")}</div>
                <div className="mini-box__value">7</div>
              </div>
              <div className="mini-box">
                <div className="mini-box__label">{t("home.card.secrets")}</div>
                <div className="mini-box__value">MJ</div>
              </div>
              <div className="mini-box">
                <div className="mini-box__label">{t("home.card.knowledge")}</div>
                <div className="mini-box__value">OK</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section">
        <h2 className="home-section__title">{t("home.features.title")}</h2>
        <div className="feature-grid">
          <article className="feature">
            <h3 className="feature__title">{t("home.features.multiTheme.title")}</h3>
            <p className="feature__text">{t("home.features.multiTheme.text")}</p>
          </article>
          <article className="feature">
            <h3 className="feature__title">{t("home.features.roles.title")}</h3>
            <p className="feature__text">{t("home.features.roles.text")}</p>
          </article>
          <article className="feature">
            <h3 className="feature__title">{t("home.features.privacy.title")}</h3>
            <p className="feature__text">{t("home.features.privacy.text")}</p>
          </article>
        </div>
      </section>

      <section className="home-section">
        <h2 className="home-section__title">{t("home.howItWorks.title")}</h2>
        <div className="steps">
          <div className="step">
            <div className="step__num">1</div>
            <div className="step__body">
              <div className="step__title">{t("home.howItWorks.step1.title")}</div>
              <div className="step__text">{t("home.howItWorks.step1.text")}</div>
            </div>
          </div>
          <div className="step">
            <div className="step__num">2</div>
            <div className="step__body">
              <div className="step__title">{t("home.howItWorks.step2.title")}</div>
              <div className="step__text">{t("home.howItWorks.step2.text")}</div>
            </div>
          </div>
          <div className="step">
            <div className="step__num">3</div>
            <div className="step__body">
              <div className="step__title">{t("home.howItWorks.step3.title")}</div>
              <div className="step__text">{t("home.howItWorks.step3.text")}</div>
            </div>
          </div>
        </div>

        <div className="home-cta">
          <div className="home-cta__text">{t("home.howItWorks.cta")}</div>
          <button className="btn btn-primary" onClick={goToStart}>
            {t("home.howItWorks.ctaBtn")}
          </button>
        </div>
      </section>
    </main>
  );
}