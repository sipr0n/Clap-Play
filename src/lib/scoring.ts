// Classement et justification des propositions.
//
// Deux règles :
// 1. L'avis général pèse le plus lourd : on utilise une note « fiable » (moyenne bayésienne)
//    qui tient compte du nombre de votes, puis la notoriété, puis les goûts de l'utilisateur.
// 2. Pas de proposition sans justification : chaque film doit avoir au moins une raison solide,
//    calculée à partir de données réelles. Sinon il n'est pas proposé.

import { GENRE_PLURAL, type Reason } from "./options";
import { genreAffinity, type Taste } from "./taste";

// Note fiable : un film avec peu de votes est ramené vers la moyenne générale.
// m = nombre de votes à partir duquel on fait confiance à la note du film ; C = note moyenne des films.
const M = 1500;
const C = 6.6;
// Un film sorti depuis moins de 2 ans n'a pas encore eu le temps d'accumuler les votes :
// on lui fait confiance plus tôt (400 votes au lieu de 1 500).
const M_RECENT = 400;
export function reliableRating(rating: number, votes: number, recent = false) {
  const m = recent ? M_RECENT : M;
  return (votes / (votes + m)) * rating + (m / (votes + m)) * C;
}

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

// Ancienneté en mois depuis la sortie (null si date inconnue ; négatif si pas encore sorti).
export function monthsSince(releaseDate: string | undefined | null, now = new Date()) {
  if (!releaseDate || !/^\d{4}-\d{2}/.test(releaseDate)) return null;
  const [y, m] = releaseDate.split("-").map(Number);
  return (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
}

// Bonus « sortie récente » : 1 jusqu'à 6 mois, puis décroît jusqu'à 0 à 3 ans.
export function recencyBoost(months: number | null) {
  if (months === null || months < 0) return 0;
  if (months <= 6) return 1;
  if (months <= 12) return 0.8;
  if (months <= 24) return 0.5;
  if (months <= 36) return 0.25;
  return 0;
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const fmtRating = (r: number) => r.toFixed(1).replace(".", ",");
const fmtVotes = (v: number) => v.toLocaleString("fr-FR");

export type ScoreInput = {
  id: number;
  rating: number; // note moyenne TMDB sur 10
  votes: number;
  year: number | null;
  genres: number[];
  popularityRank: number; // 0 = le plus populaire de la recherche
  releaseDate?: string | null; // AAAA-MM-JJ, pour le bonus « sortie récente »
  trendingRank?: number | null; // rang dans les sorties récentes les plus populaires du moment (0 = 1er)
  similarTo?: string | null; // titre du coup de cœur dont ce film est proche
  sameDirector?: { name: string; title: string; count: number } | null; // réalisateur d'un ou plusieurs coups de cœur
  favActor?: { name: string; count: number } | null; // acteur présent dans plusieurs coups de cœur
  animationPenalty?: number; // 0 à 1 : à quel point on évite l'animation (0 si l'utilisateur l'a demandée)
};

const ANIMATION = 16;

export type Scored = { score: number; tier: "strong" | "ok" | "none"; reasons: Reason[] };

// Poids des critères (somme des maximums ≈ 10). L'avis général domine.
// animation : malus des films d'animation quand l'utilisateur n'a pas choisi ce style (on préfère les films en prises de vue réelles).
export const WEIGHTS = {
  quality: 4,
  notoriety: 1.5,
  taste: 2,
  similar: 1.5,
  director: 1.5,
  actor: 1.5,
  popularity: 0.5,
  animation: 3,
  recency: 1.5, // sortie récente et bien accueillie : on en parle, ça donne envie
  trending: 0.8, // parmi les sorties récentes les plus populaires du moment (bouche-à-oreille)
};

export function scoreFilm(f: ScoreInput, taste: Taste | null, now = new Date()): Scored {
  const months = monthsSince(f.releaseDate ?? (f.year ? `${f.year}-06` : null), now);
  const reliable = reliableRating(f.rating, f.votes, months !== null && months <= 24);
  // Récent ET bien accueilli : sans ça, un film juste sorti mais moyen serait poussé à tort.
  const wellReceived = f.rating >= 6.8 && f.votes >= 100;
  const recency = wellReceived ? recencyBoost(months) : 0;
  const trending =
    recency > 0 && f.trendingRank !== null && f.trendingRank !== undefined && f.trendingRank < 10
      ? 1 - f.trendingRank / 10
      : 0;
  const quality = clamp((reliable - 6) / 2.2, 0, 1.2); // 6/10 → 0, 8,2/10 → 1
  const notoriety = clamp((Math.log10(Math.max(f.votes, 1)) - 2.5) / 2.3, 0, 1); // 300 votes → 0, 60 000 → 1
  const affinity = genreAffinity(taste, f.genres); // de -1 (genres peu aimés) à +1
  const popularity = clamp(1 - f.popularityRank / 40, 0, 1);

  const score =
    WEIGHTS.quality * quality +
    WEIGHTS.notoriety * notoriety +
    WEIGHTS.taste * clamp(affinity, -1, 1) +
    WEIGHTS.similar * (f.similarTo ? 1 : 0) +
    WEIGHTS.director * (f.sameDirector ? Math.min(1, 0.6 + 0.2 * f.sameDirector.count) : 0) +
    WEIGHTS.actor * (f.favActor ? Math.min(1, 0.4 + 0.2 * f.favActor.count) : 0) +
    WEIGHTS.popularity * popularity +
    WEIGHTS.recency * recency +
    WEIGHTS.trending * trending -
    WEIGHTS.animation * (f.genres.includes(ANIMATION) ? (f.animationPenalty ?? 1) : 0);

  // ---- Justifications ----
  const reasons: Reason[] = [];
  const year = f.year ?? 0;
  const age = now.getFullYear() - year;

  if (f.similarTo) reasons.push({ kind: "similar", text: `Proche de « ${f.similarTo} », un de tes coups de cœur` });
  if (f.sameDirector) {
    reasons.push({
      kind: "director",
      text:
        f.sameDirector.count > 1
          ? `Réalisé par ${f.sameDirector.name}, comme ${f.sameDirector.count} de tes coups de cœur`
          : `Même réalisateur que « ${f.sameDirector.title} » : ${f.sameDirector.name}`,
    });
  }
  if (f.favActor) {
    reasons.push({ kind: "actor", text: `Avec ${f.favActor.name}, que tu as aimé dans ${f.favActor.count} films` });
  }

  // Genre préféré : celui du film pour lequel l'utilisateur a le plus de coups de cœur (au moins 3).
  if (taste) {
    const best = f.genres
      .filter((g) => GENRE_PLURAL[g] && (taste.genreScore.get(g) ?? 0) > 0)
      .map((g) => ({ g, n: taste.genreLiked.get(g) ?? 0 }))
      .sort((a, b) => b.n - a.n)[0];
    if (best && best.n >= 3) reasons.push({ kind: "taste", text: `Tu as aimé ${best.n} ${GENRE_PLURAL[best.g]}` });
  }

  // Sortie récente et bien accueillie (jusqu'à 2 ans), et bouche-à-oreille.
  const recentReason = recency >= 0.5 && f.rating >= 7 && f.votes >= 150;
  if (recentReason) {
    const [y, m] = (f.releaseDate ?? `${year}-01`).split("-").map(Number);
    const when = f.releaseDate ? `${MONTHS[m - 1]} ${y}` : String(y);
    reasons.push({ kind: "recent", text: `Sorti en ${when}, déjà noté ${fmtRating(f.rating)}/10 par ${fmtVotes(f.votes)} spectateurs` });
  }
  if (trending >= 0.3) reasons.push({ kind: "trending", text: "Parmi les sorties récentes les plus populaires du moment" });

  if (year && age >= 20 && f.votes >= 8000 && f.rating >= 7.8) {
    reasons.push({ kind: "classic", text: `Un classique : sorti en ${year}, toujours noté ${fmtRating(f.rating)}/10` });
  } else if (recentReason) {
    // La raison « sortie récente » dit déjà la note : pas de doublon.
  } else if (reliable >= 7.4 && f.votes >= 5000) {
    reasons.push({
      kind: "acclaimed",
      text: `Adoré du public : ${fmtRating(f.rating)}/10 sur ${fmtVotes(f.votes)} votes`,
    });
  } else if (reliable >= 6.9 && f.votes >= 1000) {
    reasons.push({ kind: "rated", text: `Très bien noté : ${fmtRating(f.rating)}/10 sur ${fmtVotes(f.votes)} votes` });
  } else if (reliable >= 6.6) {
    reasons.push({ kind: "rated", text: `Bien noté : ${fmtRating(f.rating)}/10 sur ${fmtVotes(f.votes)} votes` });
  }

  // Niveau de justification :
  // - solide : vraiment apprécié du public, ou raison personnelle sur un film correctement noté ;
  // - acceptable : bien noté, utilisé seulement s'il manque des films solides ;
  // - aucune : jamais proposé.
  const personal = reasons.some((r) => ["similar", "director", "actor", "taste"].includes(r.kind));
  const publicStrong = reasons.some((r) => ["classic", "acclaimed", "recent", "trending"].includes(r.kind)) ||
    (reliable >= 6.9 && f.votes >= 1000);
  const tier: Scored["tier"] =
    reliable < 6.4 || affinity <= -0.6 // trop faible, ou genres que l'utilisateur n'aime pas
      ? "none"
      : publicStrong || (personal && reliable >= 6.6)
        ? "strong"
        : reasons.length
          ? "ok"
          : "none";

  return { score, tier, reasons: reasons.slice(0, 3) };
}

// Choisit les films : d'abord ceux avec une justification solide, puis acceptable.
// Pour varier sans sacrifier la qualité, on tire au sort parmi les meilleurs (12 au plus),
// avec plus de chances pour les mieux classés.
export function pickJustified<T extends { scored: Scored }>(cands: T[], count: number, random = Math.random) {
  const draw = (list: T[], n: number) => {
    const pool = [...list].sort((a, b) => b.scored.score - a.scored.score).slice(0, Math.max(12, n * 4));
    const out: T[] = [];
    while (out.length < n && pool.length) {
      const top = pool[0].scored.score;
      const weights = pool.map((c) => Math.exp(c.scored.score - top)); // écart de 1 point ≈ 2,7 fois moins de chances
      let r = random() * weights.reduce((a, b) => a + b, 0);
      let i = 0;
      while (i < pool.length - 1 && (r -= weights[i]) > 0) i++;
      out.push(pool.splice(i, 1)[0]);
    }
    return out;
  };
  const strong = draw(cands.filter((c) => c.scored.tier === "strong"), count);
  const ok = strong.length < count ? draw(cands.filter((c) => c.scored.tier === "ok"), count - strong.length) : [];
  return [...strong, ...ok];
}
