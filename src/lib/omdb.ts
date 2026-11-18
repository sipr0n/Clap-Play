// Notes IMDb, Rotten Tomatoes et Metacritic via l'API OMDb (clé gratuite : 1 000 appels par jour).
// Sans clé (variable OMDB_API_KEY), le site fonctionne simplement sans ces notes.

export type CriticScores = { imdb: number | null; imdbVotes: number | null; rottenTomatoes: number | null; metacritic: number | null };

type OmdbResponse = {
  Response: "True" | "False";
  imdbRating?: string;
  imdbVotes?: string;
  Ratings?: { Source: string; Value: string }[];
};

export const hasOmdb = () => Boolean(process.env.OMDB_API_KEY);

export async function criticScores(imdbId: string | null | undefined): Promise<CriticScores | null> {
  const key = process.env.OMDB_API_KEY;
  if (!key || !imdbId || !/^tt\d+$/.test(imdbId)) return null;
  try {
    const url = `https://www.omdbapi.com/?i=${imdbId}&apikey=${encodeURIComponent(key)}`;
    // Les notes bougent peu : on garde la réponse une semaine pour économiser les appels.
    const res = await fetch(url, { next: { revalidate: 7 * 24 * 3600 } });
    if (!res.ok) return null;
    const d = (await res.json()) as OmdbResponse;
    if (d.Response !== "True") return null;
    const num = (s?: string) => (s && s !== "N/A" ? Number(s.replace(/[^\d.]/g, "")) : null);
    const rating = (source: string) => d.Ratings?.find((r) => r.Source === source)?.Value;
    return {
      imdb: num(d.imdbRating),
      imdbVotes: num(d.imdbVotes),
      rottenTomatoes: num(rating("Rotten Tomatoes")),
      metacritic: num(rating("Metacritic")?.split("/")[0]),
    };
  } catch {
    return null;
  }
}

// « IMDb 8,8/10 · Rotten Tomatoes 87 % · Metacritic 74/100 », seulement avec les notes disponibles.
export function criticsText(s: CriticScores): string | null {
  const parts = [
    s.imdb !== null ? `IMDb ${s.imdb.toFixed(1).replace(".", ",")}/10` : null,
    s.rottenTomatoes !== null ? `Rotten Tomatoes ${s.rottenTomatoes} %` : null,
    s.metacritic !== null ? `Metacritic ${s.metacritic}/100` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}
