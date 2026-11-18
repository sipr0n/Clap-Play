import type { NextRequest } from "next/server";
import { recommend } from "@/lib/recommend";
import { AVOIDABLE_GENRES, ERAS, MAX_MOODS, MOODS, PROVIDERS, TIMES } from "@/lib/options";
import { getUser } from "@/lib/supabase/server";
import { loadTaste } from "@/lib/me";

// GET /api/recommendations?mood=rire,frissons&time=normal&era=recent&providers=8,119&avoid=16,27&exclude=123,456&count=3
// mood : 1 ou 2 styles (le film doit correspondre aux deux) · avoid : genres TMDB à ne jamais proposer
// Renvoie des films adaptés à l'humeur, au temps disponible, aux abonnements
// et, si l'utilisateur est connecté, à ses goûts (films déjà vus exclus).
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const moodIds = [...new Set((q.get("mood") ?? "").split(",").filter(Boolean))];
  const time = q.get("time") ?? "illimite";
  const era = q.get("era") ?? "tous";
  const toIds = (s: string | null) =>
    (s ?? "").split(",").map(Number).filter((n) => Number.isInteger(n) && n > 0);

  const providerIds = toIds(q.get("providers")).filter((id) => PROVIDERS.some((p) => p.id === id));
  const exclude = toIds(q.get("exclude")).slice(0, 500);
  const avoidGenres = toIds(q.get("avoid")).filter((g) => AVOIDABLE_GENRES.some((a) => a.id === g));
  const count = Math.min(Math.max(Number(q.get("count")) || 3, 1), 3);

  if (moodIds.length === 0 || moodIds.length > MAX_MOODS || !moodIds.every((id) => MOODS.some((m) => m.id === id))) {
    return Response.json({ error: `Choisis 1 ou ${MAX_MOODS} styles parmi la liste.` }, { status: 400 });
  }
  if (!TIMES.some((t) => t.id === time)) return Response.json({ error: "Durée inconnue." }, { status: 400 });
  if (!ERAS.some((e) => e.id === era)) return Response.json({ error: "Époque inconnue." }, { status: 400 });
  if (providerIds.length === 0) {
    return Response.json({ error: "Choisis au moins une plateforme." }, { status: 400 });
  }

  try {
    const { supabase, user } = await getUser();
    const taste = supabase && user ? await loadTaste(supabase, user) : null;
    const result = await recommend({ moodIds, timeId: time, eraId: era, providerIds, avoidGenres, exclude, count, taste });
    return Response.json(result);
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Impossible de joindre le catalogue de films pour le moment." }, { status: 502 });
  }
}
