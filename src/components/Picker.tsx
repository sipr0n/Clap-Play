"use client";

import type { TrailerLang } from "@/lib/trailer";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import TrailerModal from "@/components/TrailerModal";
import { AVOIDABLE_GENRES, ERAS, Film, MAX_MOODS, MOODS, PROVIDERS, TIMES, visibleMoods } from "@/lib/options";
import type { Prefs } from "@/lib/prefs";
import { readLocalPrefs } from "@/lib/localPrefs";

type Props = {
  loggedIn: boolean;
  accountsEnabled: boolean;
  initialPrefs: Prefs | null; // préférences du profil (utilisateur connecté)
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

export default function Picker({ loggedIn, accountsEnabled, initialPrefs }: Props) {
  const router = useRouter();
  const [prefs, setPrefs] = useState<Prefs | null>(initialPrefs);
  const [moods, setMoods] = useState<string[]>([]);
  const [time, setTime] = useState<string>("normal");
  const [era, setEra] = useState<string>("tous");
  const [films, setFilms] = useState<Film[]>([]);
  const [loading, setLoading] = useState(false);
  const [replacing, setReplacing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [personalized, setPersonalized] = useState(false);
  const [feedback, setFeedback] = useState<Record<number, Feedback>>({});
  const [searched, setSearched] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [trailer, setTrailer] = useState<{ title: string; key: string; lang: TrailerLang } | null>(null);
  const shown = useRef<Set<number>>(new Set());
  const resultsRef = useRef<HTMLDivElement>(null);

  // Préférences : celles du profil, sinon celles de cet appareil, sinon on les demande d'abord.
  useEffect(() => {
    if (initialPrefs) return;
    const local = readLocalPrefs();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (local) setPrefs(local);
    else router.replace("/preferences?bienvenue=1");
  }, [initialPrefs, router]);

  // Le message temporaire disparaît tout seul après 3,5 secondes.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const localSeen = () => store.get<number[]>("cp.seen", []);
  const avoid = prefs?.avoidGenres ?? [];
  const moodChoices = visibleMoods(avoid);

  // Jusqu'à 2 styles : un 3e remplace le plus ancien.
  function toggleMood(id: string) {
    setMoods((prev) => {
      if (prev.includes(id)) return prev.filter((m) => m !== id);
      return [...prev, id].slice(-MAX_MOODS);
    });
  }

  async function fetchFilms(count: number, exclude: number[]) {
    const q = new URLSearchParams({
      mood: moods.join(","),
      time,
      era,
      providers: (prefs?.providers ?? []).join(","),
      avoid: avoid.join(","),
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
    if (moods.length === 0 || !prefs) return;
    setLoading(true);
    setError(null);
    if (!again) shown.current = new Set();
    try {
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
    // « Déjà vu » ou « Pas pour moi » : on remplace le film par un autre, pendant l'enregistrement.
    const replaced = status !== "liked" ? replaceFilm(film) : Promise.resolve(true);

    let saved = true;
    if (loggedIn) {
      try {
        const res = await fetch("/api/me/feedback", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ tmdbId: film.id, title: film.title, year: film.year, genres: film.genres, status }),
        });
        saved = res.ok;
      } catch {
        saved = false;
      }
    } else if (status !== "liked") {
      store.set("cp.seen", [...new Set([...localSeen(), film.id])].slice(-500));
    }

    const hasReplacement = await replaced;
    if (!saved) {
      setFeedback((f) => {
        const next = { ...f };
        delete next[film.id];
        return next;
      });
      setToast("Ton choix n'a pas pu être enregistré. Vérifie ta connexion et réessaie.");
    } else if (status === "liked") {
      setToast(`« ${film.title} » ajouté à tes coups de cœur.`);
    } else {
      setToast(
        `« ${film.title} » ne te sera plus proposé.` +
          (hasReplacement ? "" : " Plus d'autre film pour ces critères : élargis ta recherche."),
      );
    }
  }

  // Remplace un film par un autre. Renvoie false s'il n'y avait plus de film à proposer.
  async function replaceFilm(film: Film): Promise<boolean> {
    setReplacing(film.id);
    try {
      const [next] = await fetchFilms(1, [...localSeen(), ...shown.current, film.id]);
      if (next) {
        shown.current.add(next.id);
        setFilms((list) => list.map((f) => (f.id === film.id ? next : f)));
        return true;
      }
      setFilms((list) => list.filter((f) => f.id !== film.id));
      return false;
    } catch (e) {
      setError((e as Error).message);
      return true;
    } finally {
      setReplacing(null);
    }
  }

  const ready = moods.length > 0 && Boolean(prefs);
  const moodLabels = moods.map((id) => MOODS.find((m) => m.id === id)?.label ?? id);
  const myProviders = PROVIDERS.filter((p) => prefs?.providers.includes(p.id));
  const avoidLabels = AVOIDABLE_GENRES.filter((g) => avoid.includes(g.id)).map((g) => g.label);

  return (
    <>
      <section className="hero">
        <Logo size={190} className="hero-logo" />
        <h1>
          Indécis ? <em>3 films</em> pour ce soir.
        </h1>
        <p>Dis-nous ton mood, ton temps libre et l&apos;époque. On s&apos;occupe du reste.</p>
      </section>

      {prefs && (
        <div className="prefs-summary">
          <span className="logos" aria-label={`Tes abonnements : ${myProviders.map((p) => p.name).join(", ")}`}>
            {myProviders.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={p.logo} alt={p.name} title={p.name} width={28} height={28} />
            ))}
          </span>
          <span>{avoidLabels.length ? `Sans : ${avoidLabels.join(", ")}` : "Tous les genres"}</span>
          <span className="spacer" />
          <Link href="/preferences" className="btn btn-sm">
            Modifier
          </Link>
        </div>
      )}

      <section className="step" aria-labelledby="step-mood">
        <h2 className="step-title" id="step-mood">
          <span className="step-num">1</span> Ton mood du moment
        </h2>
        <p className="step-hint">Choisis 1 style, ou 2 pour un film qui mélange les deux.</p>
        <div className="chips">
          {moodChoices.map((m) => (
            <button key={m.id} className="chip" aria-pressed={moods.includes(m.id)} onClick={() => toggleMood(m.id)}>
              <span aria-hidden="true">{m.emoji}</span> {m.label}
            </button>
          ))}
        </div>
        {moods.length === MAX_MOODS && (
          <p className="mood-hint">
            Des films à la fois <strong>{moodLabels[0]}</strong> et <strong>{moodLabels[1]}</strong>.
          </p>
        )}
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

      <section className="step" aria-labelledby="step-era">
        <h2 className="step-title" id="step-era">
          <span className="step-num">3</span> Plutôt récent ou plus ancien ?
        </h2>
        <div className="chips">
          {ERAS.map((e) => (
            <button key={e.id} className="chip" aria-pressed={era === e.id} onClick={() => setEra(e.id)}>
              {e.label}
            </button>
          ))}
        </div>
      </section>

      <div className="cta">
        <button className="btn btn-primary btn-lg" disabled={!ready || loading} onClick={() => findFilms()}>
          {loading ? "Recherche en cours…" : "🎬 Clap ! Trouve-moi 3 films"}
        </button>
        {!ready && prefs && <small>Choisis au moins un style.</small>}
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
              Aucun film ne correspond. Essaie un autre style, plus de temps, une autre époque, ou ajoute un
              abonnement dans tes préférences.
            </p>
          ) : (
            <>
            {films.length < 3 && (
              <p className="notice" style={{ marginBottom: 18 }}>
                Seulement {films.length} film{films.length > 1 ? "s" : ""} pour ces critères. Pour plus de choix,
                choisis un seul style, plus de temps ou une autre époque.
              </p>
            )}
            <div className="grid">
              {films.map((film) => (
                <FilmCard
                  key={film.id}
                  film={film}
                  loggedIn={loggedIn}
                  demo={demo}
                  busy={replacing === film.id}
                  status={feedback[film.id]}
                  onFeedback={(s) => sendFeedback(film, s)}
                  onTrailer={(key, lang) => setTrailer({ title: film.title, key, lang })}
                />
              ))}
            </div>
            </>
          )}
        </section>
      ) : null}

      {trailer && (
        <TrailerModal title={trailer.title} videoKey={trailer.key} lang={trailer.lang} onClose={() => setTrailer(null)} />
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}

function FilmCard({
  film,
  loggedIn,
  demo,
  busy,
  status,
  onFeedback,
  onTrailer,
}: {
  film: Film;
  loggedIn: boolean;
  demo: boolean;
  busy: boolean;
  status?: Feedback;
  onFeedback: (s: Feedback) => void;
  onTrailer: (key: string, lang: TrailerLang) => void;
}) {
  const [trailerState, setTrailerState] = useState<"idle" | "loading" | "none">("idle");

  async function openTrailer() {
    setTrailerState("loading");
    try {
      const res = await fetch(`/api/films/${film.id}/trailer`);
      const data = await res.json();
      if (res.ok && data.trailer) {
        setTrailerState("idle");
        onTrailer(data.trailer.key, data.trailer.lang);
      } else {
        setTrailerState("none");
      }
    } catch {
      setTrailerState("none");
    }
  }

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
          {!demo && (
            <button
              className="btn btn-primary btn-sm"
              onClick={openTrailer}
              disabled={trailerState !== "idle"}
            >
              {trailerState === "loading" ? "Chargement…" : "🎬 Bande-annonce"}
            </button>
          )}
          {film.watchLink && (
            <a className="btn btn-sm" href={film.watchLink} target="_blank" rel="noreferrer">
              ▶ Où regarder
            </a>
          )}
          <a className="btn btn-teal btn-sm" href={film.letterboxdUrl} target="_blank" rel="noreferrer">
            ★ Noter sur Letterboxd
          </a>
        </div>
        {trailerState === "none" && <p className="card-note">Pas de bande-annonce disponible pour ce film.</p>}
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
