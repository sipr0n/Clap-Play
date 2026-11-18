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
export function reliableRating(rating: number, votes: number) {
  return (votes / (votes + M)) * rating + (M / (votes + M)) * C;
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
};

export function scoreFilm(f: ScoreInput, taste: Taste | null, now = new Date()): Scored {
  const reliable = reliableRating(f.rating, f.votes);
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
    WEIGHTS.popularity * popularity -
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

  if (year && age >= 20 && f.votes >= 8000 && f.rating >= 7.8) {
    reasons.push({ kind: "classic", text: `Un classique : sorti en ${year}, toujours noté ${fmtRating(f.rating)}/10` });
  } else if (reliable >= 7.4 && f.votes >= 5000) {
    reasons.push({
      kind: "acclaimed",
      text: `Adoré du public : ${fmtRating(f.rating)}/10 sur ${fmtVotes(f.votes)} votes`,
    });
  } else if (year && age <= 1 && f.rating >= 7 && f.votes >= 150) {
    reasons.push({ kind: "recent", text: `Sorti en ${year} et déjà très bien noté : ${fmtRating(f.rating)}/10` });
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
  const publicStrong = reasons.some((r) => r.kind === "classic" || r.kind === "acclaimed" || r.kind === "recent") ||
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
