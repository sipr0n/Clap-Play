import type { SupabaseClient, User } from "@supabase/supabase-js";

// Préférences de visionnage : abonnements et genres à éviter.
export type Prefs = { providers: number[]; avoidGenres: number[] };

// Préférences enregistrées dans le profil, ou null si l'utilisateur ne les a jamais remplies.
// Lit toutes les colonnes : fonctionne aussi tant que la colonne avoid_genres n'existe pas encore.
export async function loadPrefs(supabase: SupabaseClient, user: User): Promise<Prefs | null> {
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const providers: number[] = data?.providers ?? [];
  if (providers.length === 0) return null;
  return { providers, avoidGenres: data?.avoid_genres ?? [] };
}
