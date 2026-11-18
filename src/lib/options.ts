// Données partagées entre le site et l'API.
// Les identifiants de genres et de plateformes sont ceux de TMDB (themoviedb.org).

export type Mood = {
  id: string;
  label: string;
  emoji: string;
  genres: number[]; // genres TMDB : un film doit en avoir au moins un
};

// Styles proposés sur l'accueil. On peut en choisir jusqu'à 2 : le film doit alors correspondre aux deux.
export const MOODS: Mood[] = [
  { id: "rire", label: "Rire", emoji: "😂", genres: [35] },
  { id: "action", label: "Action", emoji: "💥", genres: [28] },
  { id: "suspense", label: "Suspense", emoji: "😰", genres: [53] },
  { id: "enquete", label: "Enquête", emoji: "🕵️", genres: [9648, 80] },
  { id: "frissons", label: "Frissons", emoji: "👻", genres: [27] },
  { id: "amour", label: "Romance", emoji: "💛", genres: [10749] },
  { id: "emotion", label: "Émotion", emoji: "🥲", genres: [18] },
  { id: "sf", label: "Science-fiction", emoji: "🚀", genres: [878] },
  { id: "fantastique", label: "Fantastique", emoji: "🐉", genres: [14] },
  { id: "aventure", label: "Aventure", emoji: "🧭", genres: [12] },
  { id: "famille", label: "En famille", emoji: "🛋️", genres: [10751] },
  { id: "anime", label: "Animation", emoji: "🎨", genres: [16] },
  { id: "histoire", label: "Histoire & guerre", emoji: "🏛️", genres: [36, 10752] },
  { id: "musique", label: "Musique", emoji: "🎵", genres: [10402] },
  { id: "curieux", label: "Documentaire", emoji: "🧠", genres: [99] },
];

export const MAX_MOODS = 2;

// Genres qu'on peut choisir de ne jamais voir (page « Mes préférences »).
export const AVOIDABLE_GENRES: { id: number; label: string }[] = [
  { id: 16, label: "Animation" },
  { id: 27, label: "Horreur" },
  { id: 53, label: "Thriller" },
  { id: 10752, label: "Guerre" },
  { id: 10749, label: "Romance" },
  { id: 10402, label: "Comédie musicale" },
  { id: 99, label: "Documentaire" },
  { id: 37, label: "Western" },
  { id: 878, label: "Science-fiction" },
  { id: 14, label: "Fantastique" },
  { id: 10751, label: "Familial" },
];

// Un style est masqué si tous ses genres sont exclus par l'utilisateur.
export function visibleMoods(excluded: number[]) {
  return MOODS.filter((m) => m.genres.some((g) => !excluded.includes(g)));
}

export type TimeOption = {
  id: string;
  label: string;
  maxRuntime: number | null; // en minutes, null = pas de limite
};

export const TIMES: TimeOption[] = [
  { id: "court", label: "Moins de 1h30", maxRuntime: 90 },
  { id: "normal", label: "Jusqu'à 2h", maxRuntime: 120 },
  { id: "long", label: "Jusqu'à 2h30", maxRuntime: 150 },
  { id: "illimite", label: "J'ai toute la soirée", maxRuntime: null },
];

export type Era = {
  id: string;
  label: string;
};

// Époque des films. Les dates exactes sont calculées au moment de la recherche (voir eraRange).
export const ERAS: Era[] = [
  { id: "tous", label: "Peu importe" },
  { id: "recent", label: "Récents (3 dernières années)" },
  { id: "moderne", label: "Depuis 2000" },
  { id: "classique", label: "Classiques (avant 2000)" },
];

// Bornes de dates de sortie pour une époque (format AAAA-MM-JJ, compris dans l'intervalle).
export function eraRange(eraId: string, now = new Date()): { from: string | null; to: string | null } {
  const year = now.getFullYear();
  if (eraId === "recent") return { from: `${year - 3}-01-01`, to: null };
  if (eraId === "moderne") return { from: "2000-01-01", to: null };
  if (eraId === "classique") return { from: null, to: "1999-12-31" };
  return { from: null, to: null };
}

export function inEra(eraId: string, year: string | number | undefined): boolean {
  const { from, to } = eraRange(eraId);
  const y = Number(year);
  if (!y) return eraId === "tous";
  if (from && y < Number(from.slice(0, 4))) return false;
  if (to && y > Number(to.slice(0, 4))) return false;
  return true;
}

export type Provider = {
  id: number; // identifiant TMDB de la plateforme (région FR)
  name: string;
  color: string;
  logo: string; // logo officiel fourni par TMDB
};

const LOGO = "https://image.tmdb.org/t/p/w92";

export const PROVIDERS: Provider[] = [
  { id: 8, name: "Netflix", color: "#E50914", logo: `${LOGO}/rK1KljqmbvO9HQa1PBFLILWah72.png` },
  { id: 119, name: "Prime Video", color: "#00A8E1", logo: `${LOGO}/gMZdpavHmxFNnLpMHwVxfqeux2g.png` },
  { id: 337, name: "Disney+", color: "#113CCF", logo: `${LOGO}/5eZ872CghnHFLB1j8grszbrx0dx.png` },
  { id: 381, name: "Canal+", color: "#E6E6E6", logo: `${LOGO}/gliWKhLJVdm7QwL1braBCRko5dx.png` },
  { id: 350, name: "Apple TV", color: "#A2AAAD", logo: `${LOGO}/9icYBfYFcwgCbky5VdGUIKJ4C5i.png` },
  { id: 1899, name: "HBO Max", color: "#002BE7", logo: `${LOGO}/skypuy7SXuugIQeYg0IglmzoKaS.png` },
  { id: 531, name: "Paramount+", color: "#0064FF", logo: `${LOGO}/pkx3klJlwW5JdtaulvDx6hDNtch.png` },
  { id: 11, name: "MUBI", color: "#9B9B9B", logo: `${LOGO}/k7iSlvgWzZuO4zU5PcBjhABMuia.png` },
];

export const WATCH_REGION = "FR";

export type Film = {
  id: number; // identifiant TMDB
  title: string;
  year: string;
  runtime: number | null;
  rating: number; // note moyenne sur 10
  overview: string;
  poster: string | null;
  genres: number[];
  providers: string[]; // noms des plateformes (parmi celles choisies) qui proposent le film
  watchLink: string | null;
  letterboxdUrl: string;
  similar: boolean; // proposé car proche d'un film que l'utilisateur a adoré
  reasons: Reason[]; // pourquoi ce film est proposé (toujours au moins une raison)
  score?: number; // score de l'algorithme (sert à la mesure anonyme des propositions)
};

export type Reason = {
  kind: "similar" | "director" | "actor" | "taste" | "acclaimed" | "classic" | "recent" | "rated" | "critics";
  text: string;
};

// Noms des genres TMDB, au pluriel pour les justifications (« Tu as aimé 12 comédies »).
export const GENRE_PLURAL: Record<number, string> = {
  28: "films d'action",
  12: "films d'aventure",
  16: "films d'animation",
  35: "comédies",
  80: "films policiers",
  99: "documentaires",
  18: "drames",
  10751: "films familiaux",
  14: "films fantastiques",
  36: "films historiques",
  27: "films d'horreur",
  10402: "films musicaux",
  9648: "films à mystère",
  10749: "films romantiques",
  878: "films de science-fiction",
  53: "thrillers",
  10752: "films de guerre",
  37: "westerns",
};

export function letterboxdUrl(tmdbId: number) {
  // Letterboxd redirige automatiquement /tmdb/<id> vers la bonne page de film.
  return `https://letterboxd.com/tmdb/${tmdbId}/`;
}
