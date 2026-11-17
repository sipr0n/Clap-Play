import { getUser } from "@/lib/supabase/server";
import { unauthorized } from "@/lib/me";

const STATUSES = ["seen", "liked", "disliked"] as const;

// POST /api/me/feedback  { tmdbId, title, year, genres, status: "seen" | "liked" | "disliked" }
// Enregistre un avis donné sur le site (« Déjà vu », « J'aime », « Pas pour moi »).
export async function POST(request: Request) {
  const { supabase, user } = await getUser();
  if (!supabase || !user) return unauthorized();

  const body = await request.json().catch(() => null);
  const tmdbId = Number(body?.tmdbId);
  const status = body?.status;
  if (!Number.isInteger(tmdbId) || tmdbId <= 0 || !STATUSES.includes(status) || typeof body?.title !== "string") {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }
  const genres = Array.isArray(body.genres) ? body.genres.map(Number).filter(Number.isInteger).slice(0, 10) : [];

  const { error } = await supabase.from("film_events").upsert({
    user_id: user.id,
    tmdb_id: tmdbId,
    title: body.title.slice(0, 300),
    year: typeof body.year === "string" ? body.year.slice(0, 4) : null,
    genres,
    status,
    source: "site",
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
