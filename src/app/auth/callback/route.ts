import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Retour de Google après la connexion : on crée la session puis on revient sur le site.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  const supabase = await createClient();
  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return Response.redirect(new URL(safeNext, request.url), 303);
  }
  return Response.redirect(new URL("/connexion?erreur=1", request.url), 303);
}
