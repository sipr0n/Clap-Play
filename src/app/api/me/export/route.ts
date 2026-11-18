import { getUser } from "@/lib/supabase/server";
import { unauthorized } from "@/lib/me";

// GET /api/me/export : toutes les données de l'utilisateur, en JSON téléchargeable (RGPD : accès et portabilité).
export async function GET() {
  const { supabase, user } = await getUser();
  if (!supabase || !user) return unauthorized();

  const [{ data: profile }, { data: films }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("film_events").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);
  const body = {
    exporte_le: new Date().toISOString(),
    compte: {
      email: user.email,
      nom: user.user_metadata?.full_name ?? null,
      fournisseur_de_connexion: user.app_metadata?.provider ?? null,
      cree_le: user.created_at,
      derniere_connexion: user.last_sign_in_at ?? null,
    },
    profil: profile ?? null,
    films: films ?? [],
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="clap-and-play-mes-donnees.json"`,
      "cache-control": "no-store",
    },
  });
}
