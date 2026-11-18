import type { NextRequest } from "next/server";
import { hasTmdb } from "@/lib/tmdb";
import { findTrailer } from "@/lib/trailer";

// GET /api/films/27205/trailer : bande-annonce YouTube du film, en VF si elle existe.
// Réponse : { trailer: { key, lang: "vf" | "vo", name } | null }
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/films/[id]/trailer">) {
  const { id } = await ctx.params;
  const tmdbId = Number(id);
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    return Response.json({ error: "Identifiant de film invalide." }, { status: 400 });
  }
  if (!hasTmdb()) return Response.json({ trailer: null });
  try {
    return Response.json({ trailer: await findTrailer(tmdbId) });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Bande-annonce indisponible pour le moment." }, { status: 502 });
  }
}
