import { getUser } from "@/lib/supabase/server";
import { unauthorized } from "@/lib/me";

// DELETE /api/me/account : supprime complètement le compte (connexion, profil, historique) puis déconnecte.
export async function DELETE() {
  const { supabase, user } = await getUser();
  if (!supabase || !user) return unauthorized();

  const { error } = await supabase.rpc("delete_my_account");
  if (error) {
    // Fonction pas encore créée (migration 003) : on efface au moins toutes les données.
    const [films, profile] = await Promise.all([
      supabase.from("film_events").delete().eq("user_id", user.id),
      supabase.from("profiles").delete().eq("id", user.id),
    ]);
    const dataError = films.error ?? profile.error;
    if (dataError) return Response.json({ error: dataError.message }, { status: 500 });
    await supabase.auth.signOut();
    return Response.json({ ok: true, accountKept: true });
  }
  await supabase.auth.signOut();
  return Response.json({ ok: true });
}
