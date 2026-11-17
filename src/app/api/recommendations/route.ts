import type { NextRequest } from "next/server";
import { recommend } from "@/lib/recommend";
import { MOODS, PROVIDERS, TIMES } from "@/lib/options";
import { getUser } from "@/lib/supabase/server";
import { loadTaste } from "@/lib/me";

// GET /api/recommendations?mood=rire&time=normal&providers=8,119&exclude=123,456&count=3
// Renvoie des films adaptés à l'humeur, au temps disponible, aux abonnements
// et, si l'utilisateur est connecté, à ses goûts (films déjà vus exclus).
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const mood = q.get("mood") ?? "";
  const time = q.get("time") ?? "illimite";
  const toIds = (s: string | null) =>
    (s ?? "").split(",").map(Number).filter((n) => Number.isInteger(n) && n > 0);

  const providerIds = toIds(q.get("providers")).filter((id) => PROVIDERS.some((p) => p.id === id));
  const exclude = toIds(q.get("exclude")).slice(0, 500);
  const count = Math.min(Math.max(Number(q.get("count")) || 3, 1), 3);

  if (!MOODS.some((m) => m.id === mood)) return Response.json({ error: "Humeur inconnue." }, { status: 400 });
  if (!TIMES.some((t) => t.id === time)) return Response.json({ error: "Durée inconnue." }, { status: 400 });
  if (providerIds.length === 0) {
    return Response.json({ error: "Choisis au moins une plateforme." }, { status: 400 });
  }

  try {
    const { supabase, user } = await getUser();
    const taste = supabase && user ? await loadTaste(supabase, user) : null;
    const result = await recommend({ moodId: mood, timeId: time, providerIds, exclude, count, taste });
    return Response.json(result);
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Impossible de joindre le catalogue de films pour le moment." }, { status: 502 });
  }
}
