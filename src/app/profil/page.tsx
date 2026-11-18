import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { loadEvents } from "@/lib/me";
import { CsvImport, DeleteData, LetterboxdLink } from "@/components/ProfileTools";

export const metadata = { title: "Mon profil · Clap & Play" };

async function ProfileContent() {
  const { supabase, user } = await getUser();
  if (!supabase || !user) redirect("/connexion");

  const [{ data: profile }, events] = await Promise.all([
    supabase.from("profiles").select("letterboxd_username").eq("id", user.id).maybeSingle(),
    loadEvents(supabase, user),
  ]);
  const liked = events.filter((e) => e.status === "liked" || (e.rating ?? 0) >= 4).length;
  const name = (user.user_metadata?.full_name as string | undefined) ?? user.email;

  return (
    <div className="page">
      <h1>Salut {name?.split(" ")[0]} 👋</h1>
      <p className="lead">Plus Clap &amp; Play connaît tes goûts, meilleures sont ses propositions.</p>

      <div className="panel">
        <h2>Ton profil ciné</h2>
        <div className="stats">
          <div className="stat"><b>{events.length}</b><span>films connus</span></div>
          <div className="stat"><b>{liked}</b><span>coups de cœur</span></div>
          <div className="stat"><b>{events.filter((e) => e.status === "disliked").length}</b><span>pas pour toi</span></div>
        </div>
      </div>

      <div className="panel">
        <h2>Abonnements et genres à éviter</h2>
        <p>Les plateformes auxquelles tu es abonné et les genres que tu ne veux jamais voir.</p>
        <Link href="/preferences" className="btn">⚙️ Mes préférences</Link>
      </div>

      <div className="panel">
        <h2>Letterboxd</h2>
        <p>
          On lit ton journal public (tes derniers films vus et notés) : ces films ne te seront plus proposés et tes
          notes affinent tes goûts. Ton profil Letterboxd doit être public.
        </p>
        <LetterboxdLink current={profile?.letterboxd_username ?? null} />
      </div>

      <div className="panel">
        <h2>Importer tout ton historique</h2>
        <p>
          Le flux Letterboxd ne contient que tes derniers films. Pour tout importer : sur Letterboxd, va dans{" "}
          <strong>Settings → Import &amp; Export → Export Your Data</strong>, décompresse le fichier et envoie{" "}
          <code>ratings.csv</code> ou <code>watched.csv</code>. Le fichier <code>ratings.csv</code> exporté
          depuis IMDb fonctionne aussi.
        </p>
        <CsvImport />
      </div>

      <Link href="/" className="btn btn-primary">🎬 Trouver un film</Link>

      <div className="panel danger-zone" style={{ marginTop: 40 }}>
        <h2>Tes données</h2>
        <p>
          Voir les <Link href="/confidentialite">règles de confidentialité</Link>. Tu peux effacer à tout moment tout
          ce que Clap &amp; Play a enregistré sur toi.
        </p>
        <DeleteData />
      </div>
    </div>
  );
}

export default function Profil() {
  return (
    <Suspense fallback={<div className="page"><p className="lead">Chargement du profil…</p></div>}>
      <ProfileContent />
    </Suspense>
  );
}
