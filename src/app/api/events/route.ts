import { createClient } from "@/lib/supabase/server";
import { MOODS, ERAS } from "@/lib/options";

const ACTIONS = ["shown", "trailer", "watch", "letterboxd", "liked", "seen", "disliked"];
const REASONS = ["similar", "director", "actor", "taste", "acclaimed", "classic", "recent", "trending", "rated", "critics"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Incoming = {
  searchId?: string;
  tmdbId?: number;
  position?: number;
  action?: string;
  reasons?: string[];
  score?: number;
  moods?: string[];
  era?: string;
};

// POST /api/events  { events: [...] } : mesure anonyme de ce que deviennent les propositions.
// Aucune donnée personnelle n'est enregistrée (ni compte, ni identifiant de navigateur).
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const list: Incoming[] = Array.isArray(body?.events) ? body.events.slice(0, 20) : [];
  const supabase = await createClient();
  if (!supabase || list.length === 0) return new Response(null, { status: 204 });

  const { data } = await supabase.auth.getUser();
  const rows = list
    .filter(
      (e) =>
        typeof e.searchId === "string" &&
        UUID.test(e.searchId) &&
        Number.isInteger(e.tmdbId) &&
        (e.tmdbId as number) > 0 &&
        ACTIONS.includes(e.action ?? ""),
    )
    .map((e) => ({
      search_id: e.searchId,
      tmdb_id: e.tmdbId,
      position: Number.isInteger(e.position) ? Math.min(Math.max(e.position as number, 1), 3) : null,
      action: e.action,
      reasons: (e.reasons ?? []).filter((r) => REASONS.includes(r)).slice(0, 5),
      score: typeof e.score === "number" && Number.isFinite(e.score) ? e.score : null,
      moods: (e.moods ?? []).filter((m) => MOODS.some((x) => x.id === m)).slice(0, 2),
      era: ERAS.some((x) => x.id === e.era) ? e.era : null,
      logged_in: Boolean(data.user),
    }));
  if (rows.length) await supabase.from("reco_events").insert(rows); // table absente (migration 005) : ignoré
  return new Response(null, { status: 204 });
}
