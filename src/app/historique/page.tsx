import { Suspense } from "react";
import Link from "next/link";
import HistoryList, { type HistoryItem } from "@/components/HistoryList";
import LocalHistory from "@/components/LocalHistory";
import { getUser } from "@/lib/supabase/server";

export const metadata = { title: "Mon historique · Clap & Play" };

async function Content() {
  const { supabase, user } = await getUser();
  if (!supabase || !user) {
    return (
      <>
        <LocalHistory />
        <div className="panel">
          <h2>Garde ton historique partout</h2>
          <p>
            Avec un compte, ton historique est enregistré, il se remplit tout seul depuis Letterboxd et tu le retrouves
            sur tous tes appareils.
          </p>
          <Link href="/connexion" className="btn btn-primary">Se connecter</Link>
        </div>
      </>
    );
  }
  const { data } = await supabase
    .from("film_events")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5000);
  return <HistoryList initial={(data ?? []) as HistoryItem[]} />;
}

export default function Historique() {
  return (
    <div className="page">
      <h1>Mon historique</h1>
      <p className="lead">Les films que tu as vus ou écartés. Ils ne te sont plus proposés.</p>
      <Suspense fallback={<p className="lead">Chargement…</p>}>
        <Content />
      </Suspense>
    </div>
  );
}
