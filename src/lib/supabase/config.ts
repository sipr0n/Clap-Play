// Clés publiques Supabase (à mettre dans .env.local et dans Vercel).
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Tant que Supabase n'est pas configuré, le site marche sans comptes.
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);
