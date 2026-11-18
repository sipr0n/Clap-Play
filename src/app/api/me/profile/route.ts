import { getUser } from "@/lib/supabase/server";
import { loadEvents, unauthorized } from "@/lib/me";
import { AVOIDABLE_GENRES, PROVIDERS } from "@/lib/options";

// GET /api/me/profile : profil + statistiques de l'utilisateur connecté.
export async function GET() {
  const { supabase, user } = await getUser();
  if (!supabase || !user) return unauthorized();

  const [{ data: profile }, events] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    loadEvents(supabase, user),
  ]);
  return Response.json({
    email: user.email,
    name: user.user_metadata?.full_name ?? null,
    letterboxdUsername: profile?.letterboxd_username ?? null,
    providers: profile?.providers ?? [],
    avoidGenres: profile?.avoid_genres ?? [],
    stats: {
      total: events.length,
      liked: events.filter((e) => e.status === "liked" || (e.rating ?? 0) >= 4).length,
      disliked: events.filter((e) => e.status === "disliked").length,
    },
  });
}

// PATCH /api/me/profile  { providers?: number[], avoidGenres?: number[] } : enregistre les préférences.
export async function PATCH(request: Request) {
  const { supabase, user } = await getUser();
  if (!supabase || !user) return unauthorized();
  const body = await request.json().catch(() => null);
  const ids = (v: unknown, allowed: number[]) =>
    Array.isArray(v) ? [...new Set(v.map(Number))].filter((id) => allowed.includes(id)) : undefined;
  const providers = ids(body?.providers, PROVIDERS.map((p) => p.id));
  const avoidGenres = ids(body?.avoidGenres, AVOIDABLE_GENRES.map((g) => g.id));
  if (!providers && !avoidGenres) return Response.json({ error: "Requête invalide." }, { status: 400 });

  const row: Record<string, unknown> = { id: user.id, updated_at: new Date().toISOString() };
  if (providers) row.providers = providers;
  if (avoidGenres) row.avoid_genres = avoidGenres;

  let { error } = await supabase.from("profiles").upsert(row);
  // Colonne avoid_genres pas encore créée (migration 002) : on enregistre au moins les abonnements.
  if (error && avoidGenres && /avoid_genres/.test(error.message)) {
    delete row.avoid_genres;
    ({ error } = await supabase.from("profiles").upsert(row));
    if (!error) return Response.json({ ok: true, warning: "avoid_genres_missing" });
  }
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
