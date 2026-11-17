// Profil de goûts d'un utilisateur, calculé à partir de ses films (site + Letterboxd + imports).

export type FilmEvent = {
  tmdb_id: number;
  title: string;
  genres: number[];
  rating: number | null;
  status: "seen" | "liked" | "disliked";
};

export type Taste = {
  seen: Set<number>;
  disliked: Set<number>;
  genreScore: Map<number, number>; // >0 : genre apprécié, <0 : genre moins aimé
  favorites: number[]; // films les mieux notés / aimés
};

// Note « ressentie » entre -1 (détesté) et +1 (adoré).
function feeling(e: FilmEvent): number {
  if (e.status === "liked") return 1;
  if (e.status === "disliked") return -1;
  if (e.rating === null) return 0.2; // vu sans note : léger signal positif
  return (e.rating - 3) / 2; // 5★ → +1, 3★ → 0, 1★ → -1
}

export function buildTaste(events: FilmEvent[]): Taste {
  const genreScore = new Map<number, number>();
  const genreCount = new Map<number, number>();
  for (const e of events) {
    const f = feeling(e);
    for (const g of e.genres) {
      genreScore.set(g, (genreScore.get(g) ?? 0) + f);
      genreCount.set(g, (genreCount.get(g) ?? 0) + 1);
    }
  }
  for (const [g, s] of genreScore) genreScore.set(g, s / Math.sqrt(genreCount.get(g)!));

  const favorites = events
    .filter((e) => feeling(e) >= 0.75)
    .map((e) => e.tmdb_id);

  return {
    seen: new Set(events.filter((e) => e.status !== "disliked").map((e) => e.tmdb_id)),
    disliked: new Set(events.filter((e) => e.status === "disliked").map((e) => e.tmdb_id)),
    genreScore,
    favorites,
  };
}

export function genreAffinity(taste: Taste | null, genres: number[]): number {
  if (!taste || genres.length === 0) return 0;
  const sum = genres.reduce((acc, g) => acc + (taste.genreScore.get(g) ?? 0), 0);
  return sum / genres.length;
}
