import { getUser } from "@/lib/supabase/server";
import { unauthorized } from "@/lib/me";
import { fetchLetterboxdDiary, isValidUsername } from "@/lib/letterboxd";
import { TmdbDetails, hasTmdb, mapLimit, tmdb } from "@/lib/tmdb";

// POST /api/me/letterboxd  { username }
// Lie un compte Letterboxd et importe ses derniers films vus et notés (flux RSS public).
export async function POST(request: Request) {
  const { supabase, user } = await getUser();
  if (!supabase || !user) return unauthorized();

  const body = await request.json().catch(() => null);
  const username = String(body?.username ?? "").trim().replace(/^@/, "");
  if (!isValidUsername(username)) return Response.json({ error: "Pseudo Letterboxd invalide." }, { status: 400 });

  let entries;
  try {
    entries = await fetchLetterboxdDiary(username);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }

  // On récupère les genres de chaque film pour affiner les goûts.
  const genres = hasTmdb()
    ? await mapLimit(entries, 8, (e) =>
        tmdb<TmdbDetails>(`/movie/${e.tmdbId}`).then((d) => d.genres.map((g) => g.id)).catch(() => []),
      )
    : entries.map(() => []);

  const rows = entries.map((e, i) => ({
    user_id: user.id,
    tmdb_id: e.tmdbId,
    title: e.title,
    year: e.year,
    genres: genres[i],
    rating: e.rating,
    status: "seen" as const,
    source: "letterboxd" as const,
  }));

  await supabase.from("profiles").upsert({ id: user.id, letterboxd_username: username, updated_at: new Date().toISOString() });
  if (rows.length > 0) {
    const { error } = await supabase.from("film_events").upsert(rows);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true, imported: rows.length });
}
