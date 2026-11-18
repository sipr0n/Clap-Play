"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type HistoryItem = {
  tmdb_id: number;
  title: string;
  year: string | null;
  poster?: string | null;
  rating: number | null;
  status: "seen" | "liked" | "disliked";
  source: "site" | "letterboxd" | "csv_letterboxd" | "csv_imdb";
  created_at: string;
};

const STATUS_LABEL = { seen: "Vu", liked: "Vu & aimé", disliked: "Pas pour moi" } as const;
const SOURCE_LABEL = {
  site: "Clap & Play",
  letterboxd: "Letterboxd",
  csv_letterboxd: "Import Letterboxd",
  csv_imdb: "Import IMDb",
} as const;
const FILTERS = [
  { id: "all", label: "Tous" },
  { id: "liked", label: "Coups de cœur" },
  { id: "seen", label: "Vus" },
  { id: "disliked", label: "Pas pour moi" },
] as const;

const PAGE = 60;

export default function HistoryList({ initial }: { initial: HistoryItem[] }) {
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [error, setError] = useState<string | null>(null);

  // Un film noté 4★ ou plus sur Letterboxd compte aussi comme coup de cœur.
  const isLiked = (i: HistoryItem) => i.status === "liked" || (i.rating ?? 0) >= 4;
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (i) =>
        (filter === "all" ||
          (filter === "liked" ? isLiked(i) : filter === "seen" ? i.status === "seen" && !isLiked(i) : i.status === filter)) &&
        (!q || i.title.toLowerCase().includes(q)),
    );
  }, [items, filter, query]);

  async function changeStatus(item: HistoryItem, status: HistoryItem["status"]) {
    setError(null);
    const before = items;
    setItems((list) => list.map((i) => (i.tmdb_id === item.tmdb_id ? { ...i, status } : i)));
    const res = await fetch("/api/me/feedback", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tmdbId: item.tmdb_id, status }),
    }).catch(() => null);
    if (!res?.ok) {
      setItems(before);
      setError("La modification n'a pas pu être enregistrée. Réessaie.");
    }
  }

  async function remove(item: HistoryItem) {
    setError(null);
    const before = items;
    setItems((list) => list.filter((i) => i.tmdb_id !== item.tmdb_id));
    const res = await fetch(`/api/me/feedback?tmdbId=${item.tmdb_id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      setItems(before);
      setError("Le film n'a pas pu être retiré. Réessaie.");
    }
  }

  if (items.length === 0) {
    return (
      <div className="panel">
        <h2>Ton historique est vide</h2>
        <p>
          Marque des films « Déjà vu » sur l&apos;accueil, ou lie ton compte Letterboxd depuis ton{" "}
          <Link href="/profil">profil</Link> pour importer ton journal.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="history-tools">
        <div className="chips" role="group" aria-label="Filtrer l'historique">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className="chip"
              aria-pressed={filter === f.id}
              onClick={() => {
                setFilter(f.id);
                setLimit(PAGE);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          id="history-search"
          className="input"
          type="search"
          placeholder="Chercher un film"
          aria-label="Chercher un film dans l'historique"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <p className="step-hint" style={{ margin: "0 0 12px" }}>
        {visible.length} film{visible.length > 1 ? "s" : ""}. Un film de cette liste ne te sera plus proposé ; retire-le
        pour qu&apos;il puisse revenir.
      </p>
      <ul className="history">
        {visible.slice(0, limit).map((i) => (
          <li key={i.tmdb_id} className="history-row">
            {i.poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={i.poster.replace("/w500/", "/w92/")} alt="" width={46} height={69} loading="lazy" />
            ) : (
              <div className="history-noposter" aria-hidden="true">🎬</div>
            )}
            <div className="history-main">
              <a href={`https://letterboxd.com/tmdb/${i.tmdb_id}/`} target="_blank" rel="noreferrer">
                <strong>{i.title}</strong>
              </a>
              <span className="meta">
                {i.year && <span>{i.year}</span>}
                {i.rating !== null && (
                  <span>
                    <span className="star">★</span> {i.rating}/5
                  </span>
                )}
                <span>{SOURCE_LABEL[i.source] ?? i.source}</span>
                <span>{new Date(i.created_at).toLocaleDateString("fr-FR")}</span>
              </span>
            </div>
            <select
              className="input history-status"
              aria-label={`Avis sur ${i.title}`}
              value={i.status}
              onChange={(e) => changeStatus(i, e.target.value as HistoryItem["status"])}
            >
              {Object.entries(STATUS_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <button className="btn btn-ghost btn-sm" onClick={() => remove(i)} aria-label={`Retirer ${i.title}`}>
              Retirer
            </button>
          </li>
        ))}
      </ul>
      {visible.length > limit && (
        <button className="btn" style={{ marginTop: 14 }} onClick={() => setLimit((l) => l + PAGE)}>
          Voir plus
        </button>
      )}
    </>
  );
}
