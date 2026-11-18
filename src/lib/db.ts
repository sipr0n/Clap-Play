import type { SupabaseClient } from "@supabase/supabase-js";

// Enregistre des lignes ; si une colonne récente n'existe pas encore (migration pas lancée),
// réessaie sans cette colonne au lieu d'échouer.
export async function upsertTolerant(
  supabase: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
  optionalColumns: string[],
  options?: { onConflict?: string; ignoreDuplicates?: boolean },
) {
  let { error } = await supabase.from(table).upsert(rows, options);
  const missing = optionalColumns.filter((c) => error?.message.includes(c));
  if (error && missing.length) {
    const trimmed = rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !missing.includes(k))));
    ({ error } = await supabase.from(table).upsert(trimmed, options));
  }
  return { error };
}
