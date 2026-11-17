import type { SupabaseClient, User } from "@supabase/supabase-js";
import { FilmEvent, buildTaste } from "./taste";

export async function loadEvents(supabase: SupabaseClient, user: User): Promise<FilmEvent[]> {
  const { data } = await supabase
    .from("film_events")
    .select("tmdb_id, title, genres, rating, status")
    .eq("user_id", user.id)
    .limit(5000);
  return (data ?? []) as FilmEvent[];
}

export async function loadTaste(supabase: SupabaseClient, user: User) {
  return buildTaste(await loadEvents(supabase, user));
}

export const unauthorized = () =>
  Response.json({ error: "Connecte-toi pour utiliser cette fonction." }, { status: 401 });
