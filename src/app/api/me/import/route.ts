import { getUser } from "@/lib/supabase/server";
import { unauthorized } from "@/lib/me";
import { TmdbMovie, hasTmdb, mapLimit, tmdb } from "@/lib/tmdb";

export const maxDuration = 60;

const MAX_ROWS = 400; // par envoi, pour rester dans les limites gratuites

type Row = { title?: string; year?: string; rating?: number | null; imdbId?: string };

// POST /api/me/import  { format: "letterboxd" | "imdb", rows: Row[] }
// Importe un historique exporté depuis Letterboxd (watched.csv / ratings.csv) ou IMDb.
// Le fichier CSV est lu dans le navigateur, seules les lignes utiles sont envoyées.
export async function POST(request: Request) {
  const { supabase, user } = await getUser();
  if (!supabase || !user) return unauthorized();
  if (!hasTmdb()) {
    return Response.json({ error: "L'import nécessite la clé TMDB (catalogue de films)." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const format = body?.format;
  if ((format !== "letterboxd" && format !== "imdb") || !Array.isArray(body?.rows)) {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }
  const rows: Row[] = body.rows.slice(0, MAX_ROWS);

  // Retrouve l'identifiant TMDB de chaque film.
  const found = await mapLimit(rows, 8, async (r): Promise<TmdbMovie | null> => {
    try {
      if (format === "imdb" && r.imdbId && /^tt\d+$/.test(r.imdbId)) {
        const res = await tmdb<{ movie_results: TmdbMovie[] }>(`/find/${r.imdbId}`, { external_source: "imdb_id" });
        return res.movie_results[0] ?? null;
      }
      if (!r.title) return null;
      const params: Record<string, string> = { query: r.title };
      if (r.year) params.year = String(r.year);
      const res = await tmdb<{ results: TmdbMovie[] }>("/search/movie", params);
      return res.results[0] ?? null;
    } catch {
      return null;
    }
  });

  const byId = new Map<number, object>();
  rows.forEach((r, i) => {
    const m = found[i];
    if (!m) return;
    const rating = typeof r.rating === "number" && r.rating > 0 ? Math.min(r.rating, 5) : null;
    byId.set(m.id, {
      user_id: user.id,
      tmdb_id: m.id,
      title: m.title,
      year: m.release_date?.slice(0, 4) ?? r.year ?? null,
      genres: m.genre_ids ?? [],
      rating,
      status: "seen",
      source: format === "imdb" ? "csv_imdb" : "csv_letterboxd",
    });
  });

  const toSave = [...byId.values()];
  if (toSave.length > 0) {
    const { error } = await supabase.from("film_events").upsert(toSave);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true, imported: toSave.length, notFound: rows.length - toSave.length });
}
