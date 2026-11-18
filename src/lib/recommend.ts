import { DEMO_FILMS } from "./demo";
import { Film, MOODS, PROVIDERS, TIMES, WATCH_REGION, eraRange, inEra, letterboxdUrl } from "./options";
import { Taste, genreAffinity } from "./taste";
import { POSTER, TmdbDetails, TmdbMovie, hasTmdb, tmdb } from "./tmdb";

export type RecommendParams = {
  moodIds: string[]; // 1 ou 2 styles : un film doit correspondre à chacun
  timeId: string;
  eraId?: string; // époque : tous, recent, moderne, classique
  providerIds: number[];
  avoidGenres?: number[]; // genres que l'utilisateur ne veut jamais voir
  exclude?: number[]; // films déjà vus ou déjà affichés
  count?: number; // 3 par défaut, 1 pour remplacer un film « Déjà vu »
  taste?: Taste | null; // goûts de l'utilisateur connecté
};

export type RecommendResult = { films: Film[]; demo: boolean; personalized: boolean };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function providerNames(ids: number[]) {
  return PROVIDERS.filter((p) => ids.includes(p.id)).map((p) => p.name);
}

type Candidate = TmdbMovie & { score: number; similar: boolean };

// Pour chaque style choisi, ses genres (sans les genres exclus). Un style entièrement exclu est ignoré.
export function genreGroups(moodIds: string[], avoid: number[]): number[][] {
  return moodIds
    .map((id) => MOODS.find((m) => m.id === id))
    .filter((m): m is (typeof MOODS)[number] => Boolean(m))
    .map((m) => m.genres.filter((g) => !avoid.includes(g)))
    .filter((g) => g.length > 0);
}

// Le film correspond-il à tous les styles choisis, sans genre exclu ?
export function matchesGenres(genres: number[], groups: number[][], avoid: number[]) {
  return groups.every((group) => group.some((g) => genres.includes(g))) && !genres.some((g) => avoid.includes(g));
}

// Requêtes TMDB « with_genres » : virgule = ET, barre = OU.
// Un style : ses genres en OU. Deux styles : chaque combinaison d'un genre de chacun, en ET.
export function genreQueries(groups: number[][]): string[] {
  if (groups.length === 0) return [""];
  if (groups.length === 1) return [groups[0].join("|")];
  const [a, b] = groups;
  const pairs = a.flatMap((x) => b.filter((y) => y !== x).map((y) => `${x},${y}`)).slice(0, 4);
  return pairs.length ? pairs : [a.join("|")];
}

// Choisit les meilleurs candidats, avec une part de hasard pour varier.
function pick(cands: Candidate[], count: number): Candidate[] {
  return cands
    .map((c) => ({ c, s: c.score + Math.random() * 1.2 }))
    .sort((a, b) => b.s - a.s)
    .slice(0, count)
    .map((x) => x.c);
}

// ---------- Catalogue réel (TMDB) ----------

type DiscoverResponse = { total_pages: number; results: TmdbMovie[] };
type ProvidersResponse = {
  results: Record<string, { link?: string; flatrate?: { provider_id: number }[] }>;
};

async function availability(id: number, providerIds: number[]) {
  const prov = await tmdb<ProvidersResponse>(`/movie/${id}/watch/providers`).catch(() => null);
  const region = prov?.results?.[WATCH_REGION];
  const ids = (region?.flatrate ?? []).map((x) => x.provider_id).filter((p) => providerIds.includes(p));
  return { ids, link: region?.link ?? null };
}

async function recommendFromTmdb(p: RecommendParams): Promise<Film[]> {
  const time = TIMES.find((t) => t.id === p.timeId) ?? TIMES[TIMES.length - 1];
  const count = p.count ?? 3;
  const taste = p.taste ?? null;
  const avoid = p.avoidGenres ?? [];
  const groups = genreGroups(p.moodIds, avoid);
  const excluded = new Set([...(p.exclude ?? []), ...(taste?.seen ?? []), ...(taste?.disliked ?? [])]);

  const params: Record<string, string> = {
    language: "fr-FR",
    watch_region: WATCH_REGION,
    with_watch_monetization_types: "flatrate", // inclus dans l'abonnement
    with_watch_providers: p.providerIds.join("|"), // « | » = OU
    "vote_count.gte": "300",
    "vote_average.gte": "6.3",
    "with_runtime.gte": "60",
    sort_by: "popularity.desc",
  };
  if (avoid.length) params.without_genres = avoid.join(",");
  if (time.maxRuntime) params["with_runtime.lte"] = String(time.maxRuntime);
  const era = eraRange(p.eraId ?? "tous");
  if (era.from) params["primary_release_date.gte"] = era.from;
  if (era.to) params["primary_release_date.lte"] = era.to;
  if (p.eraId === "recent") params["vote_count.gte"] = "100"; // les films récents ont encore peu de votes
  if (groups.length > 1) params["vote_count.gte"] = String(Math.min(Number(params["vote_count.gte"]), 150)); // mélanges plus rares

  // 1) Films du catalogue qui collent aux styles, à la durée, à l'époque et aux abonnements.
  //    Pour chaque requête de genres : la 1re page + une page au hasard, pour varier.
  const lists = await Promise.all(
    genreQueries(groups).map(async (withGenres) => {
      const q = withGenres ? { ...params, with_genres: withGenres } : params;
      const first = await tmdb<DiscoverResponse>("/discover/movie", { ...q, page: "1" });
      const maxPage = Math.min(first.total_pages, 8);
      if (maxPage < 2) return first.results;
      const page = 2 + Math.floor(Math.random() * (maxPage - 1));
      const other = await tmdb<DiscoverResponse>("/discover/movie", { ...q, page: String(page) }).catch(() => null);
      return [...first.results, ...(other?.results ?? [])];
    }),
  );

  const byId = new Map<number, Candidate>();
  for (const list of lists) {
    for (const [i, m] of list.entries()) {
      if (excluded.has(m.id) || byId.has(m.id)) continue;
      if (!matchesGenres(m.genre_ids ?? [], groups, avoid)) continue;
      const popularity = 1 - i / 40; // les plus populaires gagnent un petit bonus
      byId.set(m.id, {
        ...m,
        score: popularity + m.vote_average / 5 + 2 * genreAffinity(taste, m.genre_ids ?? []),
        similar: false,
      });
    }
  }

  // 2) Si l'utilisateur est connecté : films « similaires » à ceux qu'il a adorés.
  if (taste && taste.favorites.length > 0) {
    const seeds = shuffle(taste.favorites).slice(0, 2);
    const recos = await Promise.all(
      seeds.map((id) =>
        tmdb<DiscoverResponse>(`/movie/${id}/recommendations`, { language: "fr-FR" }).catch(() => null),
      ),
    );
    const similar = recos
      .flatMap((r) => r?.results ?? [])
      .filter(
        (m) =>
          !excluded.has(m.id) &&
          matchesGenres(m.genre_ids ?? [], groups, avoid) &&
          inEra(p.eraId ?? "tous", m.release_date?.slice(0, 4)) &&
          m.vote_average >= 6.3,
      );
    // On vérifie la durée et la disponibilité sur les abonnements pour quelques-uns.
    const checked = await Promise.all(
      shuffle(similar)
        .slice(0, 6)
        .map(async (m) => {
          const [details, av] = await Promise.all([
            tmdb<TmdbDetails>(`/movie/${m.id}`).catch(() => null),
            availability(m.id, p.providerIds),
          ]);
          const okTime = !time.maxRuntime || (details?.runtime ?? 999) <= time.maxRuntime;
          return okTime && av.ids.length > 0 ? m : null;
        }),
    );
    for (const m of checked) {
      if (!m) continue;
      const existing = byId.get(m.id);
      const score = 2.5 + m.vote_average / 5 + 2 * genreAffinity(taste, m.genre_ids ?? []);
      byId.set(m.id, { ...m, score: Math.max(score, existing?.score ?? 0) + 1, similar: true });
    }
  }

  const picks = pick([...byId.values()], count);

  return Promise.all(
    picks.map(async (f) => {
      const [av, details] = await Promise.all([
        availability(f.id, p.providerIds),
        tmdb<TmdbDetails>(`/movie/${f.id}`, { language: "fr-FR" }).catch(() => null),
      ]);
      return {
        id: f.id,
        title: f.title,
        year: f.release_date?.slice(0, 4) ?? "",
        runtime: details?.runtime ?? null,
        rating: Math.round(f.vote_average * 10) / 10,
        overview: f.overview,
        poster: f.poster_path ? POSTER + f.poster_path : null,
        genres: f.genre_ids ?? details?.genres.map((g) => g.id) ?? [],
        providers: providerNames(av.ids),
        watchLink: av.link,
        letterboxdUrl: letterboxdUrl(f.id),
        similar: f.similar,
      } satisfies Film;
    }),
  );
}

// ---------- Mode démo (sans clé TMDB) ----------

function recommendFromDemo(p: RecommendParams): Film[] {
  const avoid = p.avoidGenres ?? [];
  const groups = genreGroups(p.moodIds, avoid);
  const time = TIMES.find((t) => t.id === p.timeId) ?? TIMES[TIMES.length - 1];
  const taste = p.taste ?? null;
  const excluded = new Set([...(p.exclude ?? []), ...(taste?.seen ?? []), ...(taste?.disliked ?? [])]);

  const cands: Candidate[] = DEMO_FILMS.filter(
    (f) =>
      matchesGenres(f.genres, groups, avoid) &&
      (time.maxRuntime === null || f.runtime <= time.maxRuntime) &&
      inEra(p.eraId ?? "tous", f.year) &&
      f.providers.some((id) => p.providerIds.includes(id)) &&
      !excluded.has(f.id),
  ).map((f) => ({
    id: f.id,
    title: f.title,
    vote_average: f.rating,
    overview: f.overview,
    poster_path: null,
    genre_ids: f.genres,
    score: f.rating / 5 + 2 * genreAffinity(taste, f.genres),
    similar: false,
  }));

  return pick(cands, p.count ?? 3).map((c) => {
    const f = DEMO_FILMS.find((d) => d.id === c.id)!;
    return {
      id: f.id,
      title: f.title,
      year: f.year,
      runtime: f.runtime,
      rating: f.rating,
      overview: f.overview,
      poster: null,
      genres: f.genres,
      providers: providerNames(f.providers.filter((id) => p.providerIds.includes(id))),
      watchLink: null,
      letterboxdUrl: letterboxdUrl(f.id),
      similar: false,
    };
  });
}

export async function recommend(p: RecommendParams): Promise<RecommendResult> {
  const personalized = Boolean(p.taste && (p.taste.seen.size > 0 || p.taste.disliked.size > 0));
  if (!hasTmdb()) return { films: recommendFromDemo(p), demo: true, personalized };
  return { films: await recommendFromTmdb(p), demo: false, personalized };
}
