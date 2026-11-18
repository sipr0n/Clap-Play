import { getUser } from "@/lib/supabase/server";
import { unauthorized } from "@/lib/me";
import { isValidUsername } from "@/lib/letterboxd";
import { syncLetterboxd } from "@/lib/letterboxdSync";

// POST /api/me/letterboxd  { username }
// Lie un compte Letterboxd et importe ses derniers films vus et notés (flux RSS public).
export async function POST(request: Request) {
  const { supabase, user } = await getUser();
  if (!supabase || !user) return unauthorized();

  const body = await request.json().catch(() => null);
  const username = String(body?.username ?? "").trim().replace(/^@/, "");
  if (!isValidUsername(username)) return Response.json({ error: "Pseudo Letterboxd invalide." }, { status: 400 });

  try {
    const { found, added } = await syncLetterboxd(supabase, user, username);
    return Response.json({ ok: true, imported: found, added });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
