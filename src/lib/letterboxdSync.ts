import type { SupabaseClient, User } from "@supabase/supabase-js";
import { fetchLetterboxdDiary } from "./letterboxd";
import { POSTER, type TmdbDetails, hasTmdb, mapLimit, tmdb } from "./tmdb";
import { upsertTolerant } from "./db";

// Délai minimum entre deux synchronisations automatiques.
export const AUTO_SYNC_HOURS = 6;

// Importe le journal Letterboxd public (derniers films vus) dans l'historique.
// Ne remplace jamais un avis donné sur le site (« Vu & aimé », « Pas pour moi ») :
// pour un film déjà connu, seule la note Letterboxd est mise à jour.
export async function syncLetterboxd(supabase: SupabaseClient, user: User, username: string) {
  const entries = await fetchLetterboxdDiary(username);

  const { data: known } = await supabase
    .from("film_events")
    .select("tmdb_id")
    .eq("user_id", user.id)
    .in("tmdb_id", entries.map((e) => e.tmdbId));
  const knownIds = new Set((known ?? []).map((k) => k.tmdb_id as number));
  // Un film revu apparaît plusieurs fois dans le journal : on ne garde que l'entrée la plus récente.
  const seenIds = new Set<number>();
  const fresh = entries.filter((e) => !knownIds.has(e.tmdbId) && !seenIds.has(e.tmdbId) && seenIds.add(e.tmdbId));

  // Genres et affiche des nouveaux films, pour l'historique et les goûts.
  const details = hasTmdb()
    ? await mapLimit(fresh, 8, (e) => tmdb<TmdbDetails>(`/movie/${e.tmdbId}`, { language: "fr-FR" }).catch(() => null))
    : fresh.map(() => null);

  const rows = fresh.map((e, i) => ({
    user_id: user.id,
    tmdb_id: e.tmdbId,
    title: details[i]?.title ?? e.title,
    year: e.year,
    genres: details[i]?.genres.map((g) => g.id) ?? [],
    poster: details[i]?.poster_path ? POSTER + details[i]!.poster_path : null,
    rating: e.rating,
    status: "seen",
    source: "letterboxd",
  }));
  if (rows.length) {
    const { error } = await upsertTolerant(supabase, "film_events", rows, ["poster"], { ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }

  // Films déjà connus : on met juste à jour la note Letterboxd si elle a changé.
  await Promise.all(
    entries
      .filter((e) => knownIds.has(e.tmdbId) && e.rating !== null)
      .map((e) =>
        supabase.from("film_events").update({ rating: e.rating }).eq("user_id", user.id).eq("tmdb_id", e.tmdbId),
      ),
  );

  await upsertTolerant(
    supabase,
    "profiles",
    [{ id: user.id, letterboxd_username: username, letterboxd_synced_at: new Date().toISOString() }],
    ["letterboxd_synced_at"],
  );
  return { found: entries.length, added: rows.length };
}
