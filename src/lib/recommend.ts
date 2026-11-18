import { DEMO_FILMS } from "./demo";
import { Film, MOODS, PROVIDERS, TIMES, WATCH_REGION, eraRange, inEra, letterboxdUrl } from "./options";
import type { Taste } from "./taste";
import { type ScoreInput, type Scored, pickJustified, scoreFilm } from "./scoring";
import { criticScores, criticsText } from "./omdb";
import { POSTER, type TmdbDetails, type TmdbMovie, hasTmdb, mapLimit, movieWithCredits, tmdb } from "./tmdb";
import { type People, buildPeople, matchPeople, topPeople } from "./people";

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
// Films d'animation : pas de malus si le style Animation est choisi, malus réduit pour « En famille ».
export function animationPenalty(moodIds: string[]) {
  if (moodIds.includes("anime")) return 0;
  if (moodIds.includes("famille")) return 0.7;
  return 1;
}

export function genreQueries(groups: number[][]): string[] {
  if (groups.length === 0) return [""];
  if (groups.length === 1) return [groups[0].join("|")];
  const [a, b] = groups;
  const pairs = a.flatMap((x) => b.filter((y) => y !== x).map((y) => `${x},${y}`)).slice(0, 4);
  return pairs.length ? pairs : [a.join("|")];
}

// ---------- Catalogue réel (TMDB) ----------

type DiscoverResponse = { total_pages: number; results: TmdbMovie[] };

// Nombre maximum de pages lues par liste (20 films par page).
const MAX_PAGES = 10;
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

  // Candidats, notés et justifiés au fur et à mesure.
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
      animationPenalty: animationPenalty(p.moodIds),
    };
    byId.set(m.id, { ...m, similarTo: sim, popularityRank, input, scored: scoreFilm(input, taste) });
  };

  // 0) Acteurs et réalisateurs préférés, d'après les coups de cœur (jusqu'à 40 films).
  let people: People | null = null;
  if (taste && taste.favorites.length > 0) {
    const favIds = taste.favorites.slice(0, 40);
    const favDetails = await mapLimit(favIds, 8, movieWithCredits);
    people = buildPeople(favIds.map((id, i) => ({ title: taste.favoriteTitles.get(id) ?? "", details: favDetails[i] })));
  }

  // 1) Pour chaque requête de genres, deux listes : les plus populaires et les mieux notés par le public.
  //    On avance page par page (jusqu'à 10) tant qu'il manque des films justifiés pas encore vus :
  //    « 3 autres films » peut ainsi continuer longtemps.
  const queries = genreQueries(groups).map((withGenres) => (withGenres ? { ...params, with_genres: withGenres } : params));
  // Sans le style Animation, les listes principales l'excluent : on veut surtout des films en prises de vue réelles.
  // Une seule liste « mieux notés » la garde, pour que les chefs-d'œuvre d'animation restent possibles.
  const skipAnimation = animationPenalty(p.moodIds) > 0 && !avoid.includes(16);
  const withoutAnimation = (q: Record<string, string>) =>
    skipAnimation ? { ...q, without_genres: [...avoid, 16].join(",") } : q;
  const lastPage = queries.map(() => ({ popular: MAX_PAGES, acclaimed: MAX_PAGES }));
  const wanted = Math.max(count * 4, 12);
  const justified = () => [...byId.values()].filter((c) => c.scored.tier !== "none").length;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const fetches = queries.flatMap((q, qi) =>
      (["popular", "acclaimed"] as const)
        .filter((list) => page <= lastPage[qi][list])
        .map(async (list) => {
          const res = await tmdb<DiscoverResponse>("/discover/movie", {
            ...withoutAnimation(q),
            ...(list === "popular"
              ? { sort_by: "popularity.desc" }
              : { sort_by: "vote_average.desc", "vote_count.gte": acclaimedVotes }),
            page: String(page),
          }).catch(() => null);
          lastPage[qi][list] = Math.min(lastPage[qi][list], res?.total_pages ?? 0);
          // Rang dans la popularité : sert au petit bonus des films les plus populaires.
          const offset = (page - 1) * 20 + (list === "acclaimed" ? 15 : 0);
          for (const [i, m] of (res?.results ?? []).entries()) add(m, offset + i, null);
        }),
    );
    if (fetches.length === 0) break; // plus aucune page à lire
    await Promise.all(fetches);
    if (justified() >= wanted) break;
  }

  // Chefs-d'œuvre d'animation (une page, très bien notés) quand l'animation est exclue des listes principales.
  if (skipAnimation) {
    await Promise.all(
      queries.map(async (q) => {
        const res = await tmdb<DiscoverResponse>("/discover/movie", {
          ...q,
          with_genres: q.with_genres ? `${q.with_genres},16` : "16",
          sort_by: "vote_average.desc",
          "vote_count.gte": "3000",
          page: "1",
        }).catch(() => null);
        for (const [i, m] of (res?.results ?? []).slice(0, 5).entries()) add(m, 30 + i, null);
      }),
    );
  }

  // 1 bis) Films des acteurs et réalisateurs préférés, dans les mêmes styles et abonnements.
  if (people) {
    const actorIds = topPeople(people.actors, 8).map((p) => p.id);
    const directorIds = topPeople(people.directors, 8).map((p) => p.id);
    await Promise.all(
      queries.flatMap((q) =>
        (
          [
            actorIds.length ? { with_cast: actorIds.join("|") } : null,
            directorIds.length ? { with_crew: directorIds.join("|") } : null,
          ] as (Record<string, string> | null)[]
        )
          .filter((x): x is Record<string, string> => Boolean(x))
          .map(async (who) => {
            const res = await tmdb<DiscoverResponse>("/discover/movie", {
              ...q,
              ...who,
              sort_by: "popularity.desc",
              page: "1",
            }).catch(() => null);
            for (const [i, m] of (res?.results ?? []).entries()) add(m, 25 + i, null);
          }),
      ),
    );
  }

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

  // 3) Acteurs et réalisateurs : on compare le générique des 20 meilleurs candidats au profil de l'utilisateur.
  const details = new Map<number, TmdbDetails | null>();
  if (people && (people.actors.size || people.directors.size)) {
    const shortlist = [...byId.values()]
      .filter((c) => c.scored.tier !== "none")
      .sort((a, b) => b.scored.score - a.scored.score)
      .slice(0, 20);
    const credits = await mapLimit(shortlist, 8, (c) => movieWithCredits(c.id));
    shortlist.forEach((c, i) => {
      details.set(c.id, credits[i]);
      const { actor, director } = matchPeople(credits[i], people!, c.title);
      if (!actor && !director) return;
      c.input = {
        ...c.input,
        sameDirector: director ? { name: director.name, title: director.titles[0], count: director.count } : null,
        favActor: actor ? { name: actor.name, count: actor.count } : null,
      };
      c.scored = scoreFilm(c.input, taste);
    });
  }

  // 4) Seuls les films justifiés sont proposés, les mieux classés ayant le plus de chances.
  const picks = pickJustified([...byId.values()], count);

  return Promise.all(
    picks.map(async (f) => {
      const [av, detail] = await Promise.all([
        availability(f.id, p.providerIds),
        details.get(f.id) ? Promise.resolve(details.get(f.id)!) : movieWithCredits(f.id),
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
    scored: scoreFilm(
      {
        id: f.id,
        rating: f.rating,
        votes: 20000,
        year: Number(f.year),
        genres: f.genres,
        popularityRank: i,
        animationPenalty: animationPenalty(p.moodIds),
      },
      taste,
    ),
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
