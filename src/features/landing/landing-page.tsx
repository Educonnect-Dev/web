import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../shared/hooks/use-language";
import { apiGet } from "../../services/api-client";
import logoImage from "../../assets/logo.jpeg";
import { useSeoMeta } from "../../shared/hooks/use-seo-meta";

type Feature = {
  title: string;
  description: string;
};

type Stat = {
  key: "teachers" | "students" | "sessions" | "subscriptions";
  label: string;
  suffix?: string;
  value?: number;
};

type Testimonial = {
  name: string;
  role: string;
  quote: string;
};

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => setReduced(media.matches);
    handler();
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);
  return reduced;
}

function useCountUp(target: number, durationMs: number, start: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let rafId = 0;
    const startTime = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / durationMs, 1);
      setValue(Math.floor(progress * target));
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [durationMs, start, target]);
  return value;
}

type StatCardProps = {
  stat: Stat;
  start: boolean;
  reducedMotion: boolean;
  delayMs?: number;
};

function StatCard({ stat, start, reducedMotion, delayMs = 0 }: StatCardProps) {
  const safeValue = stat.value ?? 0;
  const value = useCountUp(safeValue, 2000, start && !reducedMotion);
  const displayValue = start ? (reducedMotion ? safeValue : value) : 0;
  return (
    <div className="stat-card reveal-once" style={{ animationDelay: `${delayMs}ms` }}>
      <div className="stat-value">
        {displayValue}
        {stat.suffix ?? ""}
      </div>
      <div className="stat-label">{stat.label}</div>
    </div>
  );
}

export function LandingPage() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const reducedMotion = useReducedMotion();
  const statsRef = useRef<HTMLDivElement | null>(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const [statsData, setStatsData] = useState({
    teachers: 0,
    students: 0,
    sessions: 0,
    subscriptions: 0,
  });

  useSeoMeta({
    title: "Educonnect — Cours et contenus avec des profs vérifiés",
    description:
      "Educonnect met en relation élèves et profs, avec contenus, sessions live et profils publics vérifiés.",
    robots: "index,follow",
    canonicalPath: "/",
    ogType: "website",
  });

  useEffect(() => {
    if (!statsRef.current) return;
    setStatsVisible(false);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setStatsVisible(true);
          }
        });
      },
      { threshold: 0.4 },
    );
    observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, [language]);

  useEffect(() => {
    apiGet<{ teachers: number; students: number; sessions: number; subscriptions: number }>("/landing/stats").then(
      (response) => {
        if (response.data) {
          setStatsData(response.data);
        }
      },
    );
  }, []);

  const heroWords = useMemo(
    () => (t("landing.hero.words", { returnObjects: true }) as string[]) ?? [],
    [language, t],
  );
  const features = useMemo(
    () => (t("landing.features", { returnObjects: true }) as Feature[]) ?? [],
    [language, t],
  );
  const stats = useMemo(
    () => (t("landing.stats", { returnObjects: true }) as Stat[]) ?? [],
    [language, t],
  );
  const testimonials = useMemo(
    () => (t("landing.testimonials", { returnObjects: true }) as Testimonial[]) ?? [],
    [language, t],
  );

  const scrollToSection = (sectionId: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const section = document.getElementById(sectionId);
    if (!section) return;
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    const elements = document.querySelectorAll("[data-reveal]");
    elements.forEach((el) => el.classList.remove("reveal--in"));

    if (typeof IntersectionObserver === "undefined") {
      elements.forEach((el) => el.classList.add("reveal--in"));
      return;
    }

    const revealIfVisible = (el: Element) => {
      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      if (rect.top <= windowHeight * 0.9 && rect.bottom >= 0) {
        el.classList.add("reveal--in");
        return true;
      }
      return false;
    };

    elements.forEach((el) => revealIfVisible(el));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal--in");
          }
        });
      },
      { threshold: 0.2 },
    );
    elements.forEach((el) => observer.observe(el));
    window.setTimeout(() => {
      elements.forEach((el) => el.classList.add("reveal--in"));
    }, 80);
    return () => observer.disconnect();
  }, [language]);

  return (
    <div className="landing">
      <div className="particles">
        {Array.from({ length: 28 }).map((_, index) => (
          <span key={index} className="particle" />
        ))}
      </div>

      <header className="nav">
        <div className="logo">
          <img src={logoImage} alt="Logo Educonnect" width={80} height={80} />
          <span>Educonnect</span>
        </div>
        <nav className="nav-links">
          <a href="#features" onClick={scrollToSection("features")}>{t("landing.navFeatures")}</a>
          <a href="#stats" onClick={scrollToSection("stats")}>{t("landing.navStats")}</a>
          <a href="#testimonials" onClick={scrollToSection("testimonials")}>{t("landing.navTestimonials")}</a>
        </nav>
        <div className="nav-actions">
          <div className="nav-lang">
            <button
              type="button"
              className={language === "fr" ? "active" : ""}
              onClick={() => setLanguage("fr")}
            >
              {t("landing.navLangFr")}
            </button>
            <button
              type="button"
              className={language === "ar" ? "active" : ""}
              onClick={() => setLanguage("ar")}
            >
              {t("landing.navLangAr")}
            </button>
          </div>
          <Link className="btn btn-ghost nav-cta" to="/login">
            {t("landing.navLogin")}
          </Link>
        </div>
      </header>

      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            {heroWords.map((word, index) => (
              <span
                key={word}
                className="hero-word"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {word}
              </span>
            ))}
          </h1>
          <p className="hero-subtitle">{t("landing.hero.subtitle")}</p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/register">
              {t("landing.hero.ctaPrimary")}{" "}
              <span className="arrow">{language === "ar" ? "←" : "→"}</span>
            </Link>
            <Link className="btn btn-ghost" to="/login">
              {t("landing.hero.ctaSecondary")}
            </Link>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-card float">
            <div className="hero-card-glow" />
            <div className="hero-card-header">
              <span className="chip">{t("landing.heroCard.chip")}</span>
              <span className="badge">{t("landing.heroCard.badge")}</span>
            </div>
            <h3>{t("landing.heroCard.title")}</h3>
            <p>{t("landing.heroCard.desc")}</p>
            <button className="btn btn-primary small">{t("landing.heroCard.cta")}</button>
          </div>
        </div>
      </section>

      <section id="features" className="section">
        <div className="section-heading">
          <h2>{t("landing.featuresSection.title")}</h2>
          <p>{t("landing.featuresSection.subtitle")}</p>
        </div>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="feature-card reveal-once"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="feature-icon">{index + 1}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="stats" className="section stats-section" ref={statsRef}>
        <div className="section-heading">
          <h2>{t("landing.statsSection.title")}</h2>
          <p>{t("landing.statsSection.subtitle")}</p>
        </div>
        <div className="stats-grid">
          {stats.map((stat, index) => (
            <StatCard
              key={stat.label}
              stat={{
                ...stat,
                value: statsData[stat.key],
              }}
              start={statsVisible}
              reducedMotion={reducedMotion}
              delayMs={index * 90}
            />
          ))}
        </div>
      </section>

      <section id="testimonials" className="section testimonials">
        <div className="section-heading">
          <h2>{t("landing.testimonialsSection.title")}</h2>
          <p>{t("landing.testimonialsSection.subtitle")}</p>
        </div>
        <div className="testimonial-carousel">
          <div key={`track-${language}`} className={`testimonial-track ${reducedMotion ? "reduced" : ""}`}>
            <div className="testimonial-group">
              {testimonials.map((item, index) => (
                <div key={`${item.name}-${index}`} className="testimonial-card">
                  <div className="avatar pulse" />
                  <blockquote>{item.quote}</blockquote>
                  <div className="author">
                    <strong>{item.name}</strong>
                    <span>{item.role}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="testimonial-group" aria-hidden="true">
              {testimonials.map((item, index) => (
                <div key={`clone-${item.name}-${index}`} className="testimonial-card">
                  <div className="avatar pulse" />
                  <blockquote>{item.quote}</blockquote>
                  <div className="author">
                    <strong>{item.name}</strong>
                    <span>{item.role}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="testimonial-group" aria-hidden="true">
              {testimonials.map((item, index) => (
                <div key={`clone-2-${item.name}-${index}`} className="testimonial-card">
                  <div className="avatar pulse" />
                  <blockquote>{item.quote}</blockquote>
                  <div className="author">
                    <strong>{item.name}</strong>
                    <span>{item.role}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section cta">
        <div className="cta-card reveal" data-reveal>
          <h2>{t("landing.cta.title")}</h2>
          <p>{t("landing.cta.subtitle")}</p>
          <Link className="btn btn-primary shine" to="/register">
            {t("landing.cta.button")}
          </Link>
        </div>
      </section>

      <footer className="footer">
        <p>{t("landing.footer")}</p>
      </footer>
    </div>
  );
}
