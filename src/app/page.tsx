import { Suspense } from "react";
import Picker from "@/components/Picker";
import Logo from "@/components/Logo";
import { getUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { loadPrefs } from "@/lib/prefs";

async function PersonalPicker() {
  const { supabase, user } = await getUser();
  const prefs = supabase && user ? await loadPrefs(supabase, user) : null;
  return <Picker loggedIn={Boolean(user)} accountsEnabled={isSupabaseConfigured} initialPrefs={prefs} />;
}

// Affiché le temps de savoir qui est connecté (quelques millisecondes).
function Loading() {
  return (
    <section className="hero">
      <Logo size={190} className="hero-logo" />
      <h1>
        Indécis ? <em>3 films</em> pour ce soir.
      </h1>
    </section>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<Loading />}>
      <PersonalPicker />
    </Suspense>
  );
}
