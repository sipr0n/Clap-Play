import type { NextRequest } from "next/server";
import { letterboxdUrl } from "@/lib/options";

// GET /api/letterboxd/27205 : redirige vers la page Letterboxd du film pour le noter.
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/letterboxd/[tmdbId]">) {
  const { tmdbId } = await ctx.params;
  const id = Number(tmdbId);
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: "Identifiant de film invalide." }, { status: 400 });
  }
  return Response.redirect(letterboxdUrl(id), 302);
}
