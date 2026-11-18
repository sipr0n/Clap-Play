import { tmdb } from "./tmdb";

export type Video = {
  key: string;
  site: string;
  type: string;
  official: boolean;
  iso_639_1: string;
  name: string;
  published_at?: string;
};

export type TrailerLang = "vf" | "vostfr" | "vo";
export type Trailer = { key: string; lang: TrailerLang; name: string };

// Une vidéo en français peut être une version doublée (VF) ou sous-titrée (VOSTFR) : on le lit dans son titre.
const isSubtitled = (v: Video) => /vost|sous[- ]?titr/i.test(v.name);

// Classe les vidéos : bande-annonce > teaser > extrait, officielle d'abord, puis la plus récente.
function rank(v: Video) {
  const type = v.type === "Trailer" ? 0 : v.type === "Teaser" ? 1 : 2;
  return type * 10 + (v.official ? 0 : 1);
}

export function pickTrailer(videos: Video[], originalLanguage?: string): Trailer | null {
  const youtube = videos.filter((v) => v.site === "YouTube" && ["Trailer", "Teaser", "Clip"].includes(v.type));
  const sorted = (list: Video[]) =>
    [...list].sort((a, b) => rank(a) - rank(b) || (b.published_at ?? "").localeCompare(a.published_at ?? ""));

  const fr = youtube.filter((v) => v.iso_639_1 === "fr");
  const dubbed = sorted(fr.filter((v) => !isSubtitled(v)));
  if (dubbed.length) return { key: dubbed[0].key, lang: "vf", name: dubbed[0].name };
  const subtitled = sorted(fr.filter(isSubtitled));
  if (subtitled.length) return { key: subtitled[0].key, lang: "vostfr", name: subtitled[0].name };

  // Pas de VF : version originale, sinon anglaise, sinon n'importe laquelle.
  const vo =
    sorted(youtube.filter((v) => v.iso_639_1 === originalLanguage))[0] ??
    sorted(youtube.filter((v) => v.iso_639_1 === "en"))[0] ??
    sorted(youtube)[0];
  return vo ? { key: vo.key, lang: originalLanguage === "fr" ? "vf" : "vo", name: vo.name } : null;
}

export async function findTrailer(tmdbId: number): Promise<Trailer | null> {
  const [videos, details] = await Promise.all([
    tmdb<{ results: Video[] }>(`/movie/${tmdbId}/videos`, { include_video_language: "fr,en,null" }),
    tmdb<{ original_language?: string }>(`/movie/${tmdbId}`).catch(() => ({ original_language: undefined })),
  ]);
  let list = videos.results;
  // Langue originale ni française ni anglaise : on va chercher ses vidéos aussi.
  const lang = details.original_language;
  if (lang && lang !== "fr" && lang !== "en") {
    const more = await tmdb<{ results: Video[] }>(`/movie/${tmdbId}/videos`, { include_video_language: lang }).catch(
      () => ({ results: [] as Video[] }),
    );
    list = [...list, ...more.results];
  }
  return pickTrailer(list, lang);
}
