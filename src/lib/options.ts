// Données partagées entre le site et l'API.
// Les identifiants de genres et de plateformes sont ceux de TMDB (themoviedb.org).

export type Mood = {
  id: string;
  label: string;
  emoji: string;
  genres: number[]; // genres TMDB (un film doit en avoir au moins un)
};

export const MOODS: Mood[] = [
  { id: "rire", label: "Envie de rire", emoji: "😂", genres: [35] },
  { id: "adrenaline", label: "Adrénaline", emoji: "💥", genres: [28, 53] },
  { id: "amour", label: "Romantique", emoji: "💛", genres: [10749] },
  { id: "frissons", label: "Frissons", emoji: "👻", genres: [27] },
  { id: "emotion", label: "Émotion", emoji: "🥲", genres: [18] },
  { id: "evasion", label: "Évasion", emoji: "🚀", genres: [12, 14, 878] },
  { id: "enquete", label: "Mystère", emoji: "🕵️", genres: [9648, 80] },
  { id: "cocooning", label: "Cocooning", emoji: "🛋️", genres: [16, 10751] },
  { id: "curieux", label: "Curieux", emoji: "🧠", genres: [99, 36] },
];

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
};

export const PROVIDERS: Provider[] = [
  { id: 8, name: "Netflix", color: "#E50914" },
  { id: 119, name: "Prime Video", color: "#00A8E1" },
  { id: 337, name: "Disney+", color: "#113CCF" },
  { id: 381, name: "Canal+", color: "#E6E6E6" },
  { id: 350, name: "Apple TV+", color: "#A2AAAD" },
  { id: 1899, name: "Max", color: "#002BE7" },
  { id: 531, name: "Paramount+", color: "#0064FF" },
  { id: 11, name: "MUBI", color: "#9B9B9B" },
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
};

export function letterboxdUrl(tmdbId: number) {
  // Letterboxd redirige automatiquement /tmdb/<id> vers la bonne page de film.
  return `https://letterboxd.com/tmdb/${tmdbId}/`;
}
