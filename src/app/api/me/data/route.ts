import { getUser } from "@/lib/supabase/server";
import { unauthorized } from "@/lib/me";

// DELETE /api/me/data : supprime toutes les données de l'utilisateur (films, profil) puis le déconnecte.
export async function DELETE() {
  const { supabase, user } = await getUser();
  if (!supabase || !user) return unauthorized();

  const [films, profile] = await Promise.all([
    supabase.from("film_events").delete().eq("user_id", user.id),
    supabase.from("profiles").delete().eq("id", user.id),
  ]);
  const error = films.error ?? profile.error;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  await supabase.auth.signOut();
  return Response.json({ ok: true });
}
