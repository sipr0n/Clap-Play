import type { NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { unauthorized } from "@/lib/me";
import { upsertTolerant } from "@/lib/db";

const STATUSES = ["seen", "liked", "disliked"] as const;
type Status = (typeof STATUSES)[number];
const isStatus = (s: unknown): s is Status => STATUSES.includes(s as Status);
const validId = (v: unknown) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// POST /api/me/feedback  { tmdbId, title, year, genres, poster, status: "seen" | "liked" | "disliked" }
// Enregistre un avis donné sur le site (« Déjà vu », « Vu & aimé », « Pas pour moi »).
export async function POST(request: Request) {
  const { supabase, user } = await getUser();
  if (!supabase || !user) return unauthorized();

  const body = await request.json().catch(() => null);
  const tmdbId = validId(body?.tmdbId);
  if (!tmdbId || !isStatus(body?.status) || typeof body?.title !== "string") {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }
  const genres = Array.isArray(body.genres) ? body.genres.map(Number).filter(Number.isInteger).slice(0, 10) : [];
  const poster =
    typeof body.poster === "string" && body.poster.startsWith("https://image.tmdb.org/") ? body.poster : null;

  const { error } = await upsertTolerant(
    supabase,
    "film_events",
    [
      {
        user_id: user.id,
        tmdb_id: tmdbId,
        title: body.title.slice(0, 300),
        year: typeof body.year === "string" ? body.year.slice(0, 4) : null,
        genres,
        poster,
        status: body.status,
        source: "site",
      },
    ],
    ["poster"],
  );
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

// PATCH /api/me/feedback  { tmdbId, status } : change l'avis sur un film de l'historique.
export async function PATCH(request: Request) {
  const { supabase, user } = await getUser();
  if (!supabase || !user) return unauthorized();
  const body = await request.json().catch(() => null);
  const tmdbId = validId(body?.tmdbId);
  if (!tmdbId || !isStatus(body?.status)) return Response.json({ error: "Requête invalide." }, { status: 400 });

  const { error } = await supabase
    .from("film_events")
    .update({ status: body.status })
    .eq("user_id", user.id)
    .eq("tmdb_id", tmdbId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

// DELETE /api/me/feedback?tmdbId=27205 : retire un film de l'historique (il pourra être reproposé).
export async function DELETE(request: NextRequest) {
  const { supabase, user } = await getUser();
  if (!supabase || !user) return unauthorized();
  const tmdbId = validId(request.nextUrl.searchParams.get("tmdbId"));
  if (!tmdbId) return Response.json({ error: "Requête invalide." }, { status: 400 });

  const { error } = await supabase.from("film_events").delete().eq("user_id", user.id).eq("tmdb_id", tmdbId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
