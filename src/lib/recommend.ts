import { DEMO_FILMS } from "./demo";
import { Film, MOODS, PROVIDERS, TIMES, WATCH_REGION, eraRange, inEra, letterboxdUrl } from "./options";
import type { Taste } from "./taste";
import { type ScoreInput, type Scored, pickJustified, scoreFilm } from "./scoring";
import { criticScores, criticsText } from "./omdb";
import { POSTER, type TmdbDetails, type TmdbMovie, directorsOf, hasTmdb, mapLimit, tmdb } from "./tmdb";

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

type Candidate = TmdbMovie & { similarTo: string | null; popularityRank: number; input: ScoreInput; scored: Scored };

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
  const mixed = groups.length > 1;

  const params: Record<string, string> = {
    language: "fr-FR",
    watch_region: WATCH_REGION,
    with_watch_monetization_types: "flatrate", // inclus dans l'abonnement
    with_watch_providers: p.providerIds.join("|"), // « | » = OU
    "vote_count.gte": "300",
    "vote_average.gte": "6.3",
    "with_runtime.gte": "60",
  };
  if (avoid.length) params.without_genres = avoid.join(",");
  if (time.maxRuntime) params["with_runtime.lte"] = String(time.maxRuntime);
  const era = eraRange(p.eraId ?? "tous");
  if (era.from) params["primary_release_date.gte"] = era.from;
  if (era.to) params["primary_release_date.lte"] = era.to;
  if (p.eraId === "recent") params["vote_count.gte"] = "100"; // les films récents ont encore peu de votes
  if (mixed) params["vote_count.gte"] = String(Math.min(Number(params["vote_count.gte"]), 150)); // mélanges plus rares
  // Liste « mieux notés » : seulement des films avec beaucoup d'avis, pour que la note soit fiable.
  const acclaimedVotes = p.eraId === "recent" ? "300" : mixed ? "500" : "1500";

  // 1) Pour chaque requête de genres, deux listes : les plus populaires (1re page + une page au hasard)
  //    et les mieux notés par le public.
  const lists = await Promise.all(
    genreQueries(groups).map(async (withGenres) => {
      const q = withGenres ? { ...params, with_genres: withGenres } : params;
      const [popular, acclaimed] = await Promise.all([
        tmdb<DiscoverResponse>("/discover/movie", { ...q, sort_by: "popularity.desc", page: "1" }),
        tmdb<DiscoverResponse>("/discover/movie", {
          ...q,
          sort_by: "vote_average.desc",
          "vote_count.gte": acclaimedVotes,
          page: "1",
        }).catch(() => null),
      ]);
      const maxPage = Math.min(popular.total_pages, 6);
      const more =
        maxPage >= 2
          ? await tmdb<DiscoverResponse>("/discover/movie", {
              ...q,
              sort_by: "popularity.desc",
              page: String(2 + Math.floor(Math.random() * (maxPage - 1))),
            }).catch(() => null)
          : null;
      return [
        ...popular.results.map((m, i) => ({ m, rank: i })),
        ...(more?.results ?? []).map((m, i) => ({ m, rank: 20 + i })),
        ...(acclaimed?.results ?? []).map((m, i) => ({ m, rank: 15 + i })),
      ];
    }),
  );

  const byId = new Map<number, Candidate>();
  const add = (m: TmdbMovie, rank: number, similarTo: string | null) => {
    if (excluded.has(m.id) || !matchesGenres(m.genre_ids ?? [], groups, avoid)) return;
    const prev = byId.get(m.id);
    const popularityRank = Math.min(rank, prev?.popularityRank ?? rank);
    const sim = similarTo ?? prev?.similarTo ?? null;
    const input: ScoreInput = {
      id: m.id,
      rating: m.vote_average,
      votes: m.vote_count ?? 0,
      year: Number(m.release_date?.slice(0, 4)) || null,
      genres: m.genre_ids ?? [],
      popularityRank,
      similarTo: sim,
    };
    byId.set(m.id, { ...m, similarTo: sim, popularityRank, input, scored: scoreFilm(input, taste) });
  };
  for (const list of lists) for (const { m, rank } of list) add(m, rank, null);

  // 2) Si l'utilisateur est connecté : films proches de ses coups de cœur.
  if (taste && taste.favorites.length > 0) {
    const seeds = shuffle(taste.favorites).slice(0, 3);
    const recos = await Promise.all(
      seeds.map((id) =>
        tmdb<DiscoverResponse>(`/movie/${id}/recommendations`, { language: "fr-FR" })
          .then((r) => r.results.map((m) => ({ m, seed: taste.favoriteTitles.get(id) ?? null })))
          .catch(() => []),
      ),
    );
    const similar = recos
      .flat()
      .filter(
        ({ m }) =>
          !excluded.has(m.id) &&
          matchesGenres(m.genre_ids ?? [], groups, avoid) &&
          inEra(p.eraId ?? "tous", m.release_date?.slice(0, 4)) &&
          (m.vote_count ?? 0) >= 300,
      );
    // Les recommandations TMDB ne savent pas filtrer par plateforme ni par durée : on vérifie les meilleures.
    const toCheck = shuffle(similar).slice(0, 8);
    const checked = await Promise.all(
      toCheck.map(async ({ m, seed }) => {
        const [details, av] = await Promise.all([
          tmdb<TmdbDetails>(`/movie/${m.id}`).catch(() => null),
          availability(m.id, p.providerIds),
        ]);
        const okTime =
          (!time.maxRuntime || (details?.runtime ?? 999) <= time.maxRuntime) && (details?.runtime ?? 0) >= 60;
        return okTime && av.ids.length > 0 ? { m, seed } : null;
      }),
    );
    for (const c of checked) if (c) add(c.m, 30, c.seed);
  }

  // 3) Réalisateurs : un des meilleurs candidats a-t-il le même réalisateur qu'un coup de cœur ?
  const details = new Map<number, TmdbDetails | null>();
  const withCredits = (id: number) =>
    tmdb<TmdbDetails>(`/movie/${id}`, { language: "fr-FR", append_to_response: "credits" }).catch(() => null);
  const shortlist = [...byId.values()]
    .filter((c) => c.scored.tier !== "none")
    .sort((a, b) => b.scored.score - a.scored.score)
    .slice(0, 12);
  if (taste && taste.favorites.length > 0) {
    const favIds = shuffle(taste.favorites).slice(0, 15);
    const [favDetails, candDetails] = await Promise.all([
      mapLimit(favIds, 8, withCredits),
      mapLimit(shortlist, 8, (c) => withCredits(c.id)),
    ]);
    const favDirectors = new Map<number, { name: string; title: string }>();
    favIds.forEach((id, i) => {
      for (const d of directorsOf(favDetails[i])) {
        if (!favDirectors.has(d.id)) favDirectors.set(d.id, { name: d.name, title: taste.favoriteTitles.get(id) ?? "" });
      }
    });
    shortlist.forEach((c, i) => {
      details.set(c.id, candDetails[i]);
      const match = directorsOf(candDetails[i]).find((d) => favDirectors.get(d.id)?.title);
      if (match) {
        const sameDirector = favDirectors.get(match.id)!;
        c.input = { ...c.input, sameDirector };
        c.scored = scoreFilm(c.input, taste);
      }
    });
  }

  // 4) Seuls les films justifiés sont proposés, les mieux classés ayant le plus de chances.
  const picks = pickJustified([...byId.values()], count);

  return Promise.all(
    picks.map(async (f) => {
      const [av, detail] = await Promise.all([
        availability(f.id, p.providerIds),
        details.get(f.id) ? Promise.resolve(details.get(f.id)!) : withCredits(f.id),
      ]);
      // Notes des critiques et du public sur IMDb / Rotten Tomatoes / Metacritic (si la clé OMDb est configurée).
      const critics = await criticScores(detail?.imdb_id);
      const criticsLine = critics ? criticsText(critics) : null;
      return {
        id: f.id,
        title: f.title,
        year: f.release_date?.slice(0, 4) ?? "",
        runtime: detail?.runtime ?? null,
        rating: Math.round(f.vote_average * 10) / 10,
        overview: f.overview,
        poster: f.poster_path ? POSTER + f.poster_path : null,
        genres: f.genre_ids ?? detail?.genres.map((g) => g.id) ?? [],
        providers: providerNames(av.ids),
        watchLink: av.link,
        letterboxdUrl: letterboxdUrl(f.id),
        similar: Boolean(f.similarTo),
        reasons: criticsLine ? [...f.scored.reasons, { kind: "critics", text: criticsLine }] : f.scored.reasons,
        score: Math.round(f.scored.score * 100) / 100,
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

  const cands = DEMO_FILMS.filter(
    (f) =>
      matchesGenres(f.genres, groups, avoid) &&
      (time.maxRuntime === null || f.runtime <= time.maxRuntime) &&
      inEra(p.eraId ?? "tous", f.year) &&
      f.providers.some((id) => p.providerIds.includes(id)) &&
      !excluded.has(f.id),
  ).map((f, i) => ({
    f,
    // Le catalogue de démo n'a pas le nombre de votes : on suppose des films connus.
    scored: scoreFilm({ id: f.id, rating: f.rating, votes: 20000, year: Number(f.year), genres: f.genres, popularityRank: i }, taste),
  }));

  return pickJustified(cands, p.count ?? 3).map(({ f, scored }) => ({
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
    reasons: scored.reasons,
  }));
}

export async function recommend(p: RecommendParams): Promise<RecommendResult> {
  const personalized = Boolean(p.taste && (p.taste.seen.size > 0 || p.taste.disliked.size > 0));
  if (!hasTmdb()) return { films: recommendFromDemo(p), demo: true, personalized };
  return { films: await recommendFromTmdb(p), demo: false, personalized };
}
