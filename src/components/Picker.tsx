"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Film, MOODS, PROVIDERS, TIMES } from "@/lib/options";

type Props = {
  loggedIn: boolean;
  accountsEnabled: boolean;
  initialProviders: number[];
};

type Feedback = "seen" | "liked" | "disliked";

// Petits utilitaires de stockage local (fonctionnent même si le navigateur bloque le stockage).
const store = {
  get<T>(key: string, fallback: T): T {
    try {
      const v = localStorage.getItem(key);
      return v ? (JSON.parse(v) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
};

export default function Picker({ loggedIn, accountsEnabled, initialProviders }: Props) {
  const [mood, setMood] = useState<string | null>(null);
  const [time, setTime] = useState<string>("normal");
  const [providers, setProviders] = useState<number[]>(initialProviders);
  const [films, setFilms] = useState<Film[]>([]);
  const [loading, setLoading] = useState(false);
  const [replacing, setReplacing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [personalized, setPersonalized] = useState(false);
  const [feedback, setFeedback] = useState<Record<number, Feedback>>({});
  const [searched, setSearched] = useState(false);
  const shown = useRef<Set<number>>(new Set());
  const resultsRef = useRef<HTMLDivElement>(null);

  // Sans compte, on mémorise les abonnements et les films « déjà vus » dans le navigateur.
  useEffect(() => {
    if (!loggedIn && initialProviders.length === 0) {
      const saved = store.get<number[]>("cp.providers", []);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved.length) setProviders(saved);
    }
  }, [loggedIn, initialProviders.length]);

  const localSeen = () => store.get<number[]>("cp.seen", []);

  function toggleProvider(id: number) {
    setProviders((prev) => {
      const next = prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id];
      store.set("cp.providers", next);
      return next;
    });
  }

  async function fetchFilms(count: number, exclude: number[]) {
    const q = new URLSearchParams({
      mood: mood!,
      time,
      providers: providers.join(","),
      count: String(count),
      exclude: exclude.join(","),
    });
    const res = await fetch(`/api/recommendations?${q}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Une erreur est survenue.");
    setDemo(data.demo);
    setPersonalized(data.personalized);
    return data.films as Film[];
  }

  async function findFilms(again = false) {
    if (!mood || providers.length === 0) return;
    setLoading(true);
    setError(null);
    if (!again) shown.current = new Set();
    try {
      if (loggedIn) {
        fetch("/api/me/profile", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ providers }),
        }).catch(() => {});
      }
      const list = await fetchFilms(3, [...localSeen(), ...shown.current]);
      list.forEach((f) => shown.current.add(f.id));
      setFilms(list);
      setFeedback({});
      setSearched(true);
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function sendFeedback(film: Film, status: Feedback) {
    setFeedback((f) => ({ ...f, [film.id]: status }));
    if (loggedIn) {
      fetch("/api/me/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tmdbId: film.id, title: film.title, year: film.year, genres: film.genres, status }),
      }).catch(() => {});
    } else if (status !== "liked") {
      store.set("cp.seen", [...new Set([...localSeen(), film.id])].slice(-500));
    }
    // « Déjà vu » ou « Pas pour moi » : on remplace le film par un autre.
    if (status !== "liked") await replaceFilm(film);
  }

  async function replaceFilm(film: Film) {
    setReplacing(film.id);
    try {
      const [next] = await fetchFilms(1, [...localSeen(), ...shown.current, film.id]);
      if (next) {
        shown.current.add(next.id);
        setFilms((list) => list.map((f) => (f.id === film.id ? next : f)));
      } else {
        setFilms((list) => list.filter((f) => f.id !== film.id));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReplacing(null);
    }
  }

  const ready = Boolean(mood) && providers.length > 0;

  return (
    <>
      <section className="hero">
        <h1>
          Indécis ? <em>3 films</em> pour ce soir.
        </h1>
        <p>Dis-nous ton humeur, ton temps libre et tes abonnements. On s&apos;occupe du reste.</p>
      </section>

      <section className="step" aria-labelledby="step-mood">
        <h2 className="step-title" id="step-mood">
          <span className="step-num">1</span> Ton mood du moment
        </h2>
        <div className="chips">
          {MOODS.map((m) => (
            <button key={m.id} className="chip" aria-pressed={mood === m.id} onClick={() => setMood(m.id)}>
              <span aria-hidden="true">{m.emoji}</span> {m.label}
            </button>
          ))}
        </div>
      </section>

      <section className="step" aria-labelledby="step-time">
        <h2 className="step-title" id="step-time">
          <span className="step-num">2</span> Ton temps libre
        </h2>
        <div className="chips">
          {TIMES.map((t) => (
            <button key={t.id} className="chip" aria-pressed={time === t.id} onClick={() => setTime(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="step" aria-labelledby="step-providers">
        <h2 className="step-title" id="step-providers">
          <span className="step-num">3</span> Tes abonnements
        </h2>
        <p className="step-hint">
          {loggedIn ? "Enregistrés dans ton profil." : "Mémorisés sur cet appareil."} Plusieurs choix possibles.
        </p>
        <div className="chips">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              className="chip"
              aria-pressed={providers.includes(p.id)}
              onClick={() => toggleProvider(p.id)}
            >
              <span className="dot" style={{ background: p.color }} aria-hidden="true" />
              {p.name}
            </button>
          ))}
        </div>
      </section>

      <div className="cta">
        <button className="btn btn-primary btn-lg" disabled={!ready || loading} onClick={() => findFilms()}>
          {loading ? "Recherche en cours…" : "🎬 Clap ! Trouve-moi 3 films"}
        </button>
        {!ready && <small>Choisis un mood et au moins un abonnement.</small>}
        {ready && !loggedIn && accountsEnabled && (
          <small>
            <Link href="/connexion">Connecte-toi</Link> pour des propositions basées sur tes goûts (Letterboxd…).
          </small>
        )}
      </div>

      {error && <p className="notice error" role="alert">{error}</p>}

      {searched ? (
        <section ref={resultsRef} className="results" aria-live="polite">
          <div className="results-head">
            <h2>Ce soir, on regarde…</h2>
            <div className="row">
              {personalized && <span className="badge">Selon tes goûts</span>}
              {demo && <span className="badge badge-yellow">Mode démo</span>}
              <button className="btn" onClick={() => findFilms(true)} disabled={loading}>
                ↻ 3 autres films
              </button>
            </div>
          </div>

          {demo && (
            <p className="notice notice-yellow" style={{ marginBottom: 18 }}>
              <strong>Mode démo :</strong> petit catalogue d&apos;exemple. Avec la clé TMDB, le site utilise les
              vrais catalogues Netflix, Prime Video, Canal+…
            </p>
          )}

          {films.length === 0 ? (
            <p className="notice">
              Plus aucun film ne correspond. Essaie un autre mood, plus de temps ou d&apos;autres abonnements.
            </p>
          ) : (
            <>
            {films.length < 3 && (
              <p className="notice" style={{ marginBottom: 18 }}>
                Seulement {films.length} film{films.length > 1 ? "s" : ""} pour ces critères. Ajoute un abonnement ou
                du temps pour plus de choix.
              </p>
            )}
            <div className="grid">
              {films.map((film) => (
                <FilmCard
                  key={film.id}
                  film={film}
                  loggedIn={loggedIn}
                  busy={replacing === film.id}
                  status={feedback[film.id]}
                  onFeedback={(s) => sendFeedback(film, s)}
                />
              ))}
            </div>
            </>
          )}
        </section>
      ) : null}
    </>
  );
}

function FilmCard({
  film,
  loggedIn,
  busy,
  status,
  onFeedback,
}: {
  film: Film;
  loggedIn: boolean;
  busy: boolean;
  status?: Feedback;
  onFeedback: (s: Feedback) => void;
}) {
  const hours = film.runtime ? `${Math.floor(film.runtime / 60)}h${String(film.runtime % 60).padStart(2, "0")}` : null;

  return (
    <article className="card" style={busy ? { opacity: 0.5 } : undefined}>
      <div className="poster">
        {film.poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={film.poster} alt={`Affiche de ${film.title}`} loading="lazy" />
        ) : (
          <div className="poster-fallback">{film.title}</div>
        )}
      </div>
      <div className="card-body">
        <h3 className="card-title">{film.title}</h3>
        <div className="meta">
          {film.year && <span>{film.year}</span>}
          {hours && <span>{hours}</span>}
          <span>
            <span className="star">★</span> {film.rating.toFixed(1)}/10
          </span>
        </div>
        {film.similar && <span className="badge" style={{ alignSelf: "flex-start" }}>Proche de tes coups de cœur</span>}
        {film.overview && <p className="overview">{film.overview}</p>}
        {film.providers.length > 0 && (
          <div className="providers">
            {film.providers.map((p) => (
              <span key={p} className="provider-tag">Sur {p}</span>
            ))}
          </div>
        )}
        <div className="card-actions">
          {film.watchLink && (
            <a className="btn btn-sm" href={film.watchLink} target="_blank" rel="noreferrer">
              ▶ Où regarder
            </a>
          )}
          <a className="btn btn-teal btn-sm" href={film.letterboxdUrl} target="_blank" rel="noreferrer">
            ★ Noter sur Letterboxd
          </a>
        </div>
        <div className="feedback">
          <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onFeedback("seen")}>
            👁 Déjà vu
          </button>
          {loggedIn && (
            <button
              className="btn btn-ghost btn-sm"
              disabled={busy || status === "liked"}
              onClick={() => onFeedback("liked")}
            >
              {status === "liked" ? "💛 Noté !" : "💛 Vu & aimé"}
            </button>
          )}
          <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onFeedback("disliked")}>
            ✕ Pas pour moi
          </button>
        </div>
      </div>
    </article>
  );
}
