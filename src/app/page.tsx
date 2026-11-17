import { Suspense } from "react";
import Picker from "@/components/Picker";
import { getUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

async function PersonalPicker() {
  const { supabase, user } = await getUser();
  let providers: number[] = [];
  if (supabase && user) {
    const { data } = await supabase.from("profiles").select("providers").eq("id", user.id).maybeSingle();
    providers = data?.providers ?? [];
  }
  return <Picker loggedIn={Boolean(user)} accountsEnabled={isSupabaseConfigured} initialProviders={providers} />;
}

export default function Home() {
  return (
    <Suspense fallback={<Picker loggedIn={false} accountsEnabled={isSupabaseConfigured} initialProviders={[]} />}>
      <PersonalPicker />
    </Suspense>
  );
}
