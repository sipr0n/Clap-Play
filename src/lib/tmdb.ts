// Accès à l'API TMDB (catalogue de films + disponibilité sur les plateformes, via JustWatch).
const TMDB = "https://api.themoviedb.org/3";
export const POSTER = "https://image.tmdb.org/t/p/w500";

export const hasTmdb = () => Boolean(process.env.TMDB_API_KEY);

export async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("TMDB_API_KEY manquante");
  const url = new URL(TMDB + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const headers: Record<string, string> = { accept: "application/json" };
  // TMDB accepte un « jeton d'accès en lecture » (commence par eyJ) ou une clé API v3.
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
  else url.searchParams.set("api_key", key);

  const res = await fetch(url, { headers, next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`TMDB ${res.status} sur ${path}`);
  return res.json() as Promise<T>;
}

export type TmdbMovie = {
  id: number;
  title: string;
  release_date?: string;
  vote_average: number;
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
};

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
