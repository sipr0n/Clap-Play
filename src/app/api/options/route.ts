import { ERAS, MOODS, PROVIDERS, TIMES } from "@/lib/options";

// GET /api/options : liste des humeurs, durées, époques et plateformes disponibles.
export async function GET() {
  return Response.json({ moods: MOODS, times: TIMES, eras: ERAS, providers: PROVIDERS });
}
