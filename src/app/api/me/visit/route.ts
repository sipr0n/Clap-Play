import { getUser } from "@/lib/supabase/server";
import { unauthorized } from "@/lib/me";
import { AUTO_SYNC_HOURS, syncLetterboxd } from "@/lib/letterboxdSync";

// POST /api/me/visit : appelé à chaque visite de l'accueil par un utilisateur connecté.
// - note la date de dernière visite (comptes inactifs supprimés au bout de 2 ans, RGPD) ;
// - resynchronise le journal Letterboxd si la dernière synchronisation date de plus de 6 heures.
export async function POST() {
  const { supabase, user } = await getUser();
  if (!supabase || !user) return unauthorized();

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (profile) {
    await supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", user.id);
  }

  const username = profile?.letterboxd_username as string | null | undefined;
  const last = profile?.letterboxd_synced_at ? new Date(profile.letterboxd_synced_at).getTime() : 0;
  if (!username || Date.now() - last < AUTO_SYNC_HOURS * 3600_000) {
    return Response.json({ ok: true, synced: false });
  }
  try {
    const { added } = await syncLetterboxd(supabase, user, username);
    return Response.json({ ok: true, synced: true, added });
  } catch {
    return Response.json({ ok: true, synced: false });
  }
}
