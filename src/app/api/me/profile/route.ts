import { getUser } from "@/lib/supabase/server";
import { loadEvents, unauthorized } from "@/lib/me";
import { PROVIDERS } from "@/lib/options";

// GET /api/me/profile : profil + statistiques de l'utilisateur connecté.
export async function GET() {
  const { supabase, user } = await getUser();
  if (!supabase || !user) return unauthorized();

  const [{ data: profile }, events] = await Promise.all([
    supabase.from("profiles").select("letterboxd_username, providers").eq("id", user.id).maybeSingle(),
    loadEvents(supabase, user),
  ]);
  return Response.json({
    email: user.email,
    name: user.user_metadata?.full_name ?? null,
    letterboxdUsername: profile?.letterboxd_username ?? null,
    providers: profile?.providers ?? [],
    stats: {
      total: events.length,
      liked: events.filter((e) => e.status === "liked" || (e.rating ?? 0) >= 4).length,
      disliked: events.filter((e) => e.status === "disliked").length,
    },
  });
}

// PATCH /api/me/profile  { providers: number[] } : enregistre les abonnements.
export async function PATCH(request: Request) {
  const { supabase, user } = await getUser();
  if (!supabase || !user) return unauthorized();
  const body = await request.json().catch(() => null);
  const providers = Array.isArray(body?.providers)
    ? body.providers.map(Number).filter((id: number) => PROVIDERS.some((p) => p.id === id))
    : null;
  if (!providers) return Response.json({ error: "Requête invalide." }, { status: 400 });

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, providers, updated_at: new Date().toISOString() });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
