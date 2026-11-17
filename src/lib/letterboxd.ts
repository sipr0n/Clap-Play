// Letterboxd n'a pas d'API publique. On lit le flux RSS public d'un membre,
// qui contient ses derniers films vus, ses notes et l'identifiant TMDB de chaque film.

export type LetterboxdEntry = { tmdbId: number; title: string; year: string; rating: number | null };

const tag = (xml: string, name: string) =>
  xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1]?.trim() ?? null;

export function isValidUsername(u: string) {
  return /^[A-Za-z0-9_]{2,30}$/.test(u);
}

export async function fetchLetterboxdDiary(username: string): Promise<LetterboxdEntry[]> {
  if (!isValidUsername(username)) throw new Error("Pseudo Letterboxd invalide.");
  const res = await fetch(`https://letterboxd.com/${username}/rss/`, {
    headers: { "user-agent": "ClapAndPlay/1.0" },
    cache: "no-store",
  });
  if (res.status === 404) throw new Error("Ce profil Letterboxd n'existe pas.");
  if (!res.ok) throw new Error("Letterboxd ne répond pas pour le moment.");
  const xml = await res.text();

  const entries: LetterboxdEntry[] = [];
  for (const item of xml.split("<item>").slice(1)) {
    const tmdbId = Number(tag(item, "tmdb:movieId"));
    const title = tag(item, "letterboxd:filmTitle");
    if (!tmdbId || !title) continue; // listes, critiques de séries, etc.
    const rating = tag(item, "letterboxd:memberRating");
    entries.push({
      tmdbId,
      title: title.replace(/<!\[CDATA\[|\]\]>/g, ""),
      year: tag(item, "letterboxd:filmYear") ?? "",
      rating: rating ? Number(rating) : null,
    });
  }
  return entries;
}
