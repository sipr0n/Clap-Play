// Accès à l'API TMDB (catalogue de films + disponibilité sur les plateformes, via JustWatch).
const TMDB = "https://api.themoviedb.org/3";
export const POSTER = "https://image.tmdb.org/t/p/w500";

export const hasTmdb = () => Boolean(process.env.TMDB_API_KEY);

// revalidate : durée de cache en secondes (1 h par défaut ; plus long pour les fiches qui changent peu).
export async function tmdb<T>(path: string, params: Record<string, string> = {}, revalidate = 3600): Promise<T> {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("TMDB_API_KEY manquante");
  const url = new URL(TMDB + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const headers: Record<string, string> = { accept: "application/json" };
  // TMDB accepte un « jeton d'accès en lecture » (commence par eyJ) ou une clé API v3.
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
  else url.searchParams.set("api_key", key);

  const res = await fetch(url, { headers, next: { revalidate } });
  if (!res.ok) throw new Error(`TMDB ${res.status} sur ${path}`);
  return res.json() as Promise<T>;
}

export type TmdbMovie = {
  id: number;
  title: string;
  release_date?: string;
  vote_average: number;
  vote_count?: number;
  popularity?: number;
  overview: string;
  poster_path: string | null;
  genre_ids?: number[];
};

export type TmdbDetails = {
  id: number;
  title: string;
  release_date?: string;
  runtime: number | null;
  genres: { id: number }[];
  poster_path?: string | null;
  imdb_id?: string | null;
  credits?: {
    crew: { id: number; name: string; job: string }[];
    cast: { id: number; name: string; order: number }[];
  };
};

export const directorsOf = (d: TmdbDetails | null) =>
  (d?.credits?.crew ?? []).filter((c) => c.job === "Director").map((c) => ({ id: c.id, name: c.name }));

// Acteurs principaux (les 8 premiers du générique).
export const leadActorsOf = (d: TmdbDetails | null) =>
  (d?.credits?.cast ?? []).filter((c) => c.order < 8).map((c) => ({ id: c.id, name: c.name }));

// Fiche d'un film avec son générique, gardée une semaine en cache (elle ne change presque jamais).
export const movieWithCredits = (id: number) =>
  tmdb<TmdbDetails>(`/movie/${id}`, { language: "fr-FR", append_to_response: "credits" }, 7 * 24 * 3600).catch(
    () => null,
  );

// Exécute des tâches avec un nombre limité d'appels simultanés.
export async function mapLimit<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}
