import { Suspense } from "react";
import PreferencesForm from "@/components/PreferencesForm";
import { getUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { loadPrefs } from "@/lib/prefs";

export const metadata = { title: "Mes préférences · Clap & Play" };

async function Form({ searchParams }: { searchParams: PageProps<"/preferences">["searchParams"] }) {
  const [{ supabase, user }, { bienvenue }] = await Promise.all([getUser(), searchParams]);
  const initial = supabase && user ? await loadPrefs(supabase, user) : null;
  return (
    <PreferencesForm
      loggedIn={Boolean(user)}
      accountsEnabled={isSupabaseConfigured}
      initial={initial}
      welcome={Boolean(bienvenue)}
    />
  );
}

export default function Preferences({ searchParams }: PageProps<"/preferences">) {
  return (
    <Suspense fallback={<div className="page"><p className="lead">Chargement…</p></div>}>
      <Form searchParams={searchParams} />
    </Suspense>
  );
}
