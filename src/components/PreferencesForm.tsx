"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AVOIDABLE_GENRES, PROVIDERS } from "@/lib/options";
import type { Prefs } from "@/lib/prefs";
import { readLocalPrefs, writeLocalPrefs } from "@/lib/localPrefs";

type Props = {
  loggedIn: boolean;
  accountsEnabled: boolean;
  initial: Prefs | null;
  welcome: boolean; // première visite : on vient de l'accueil
};

export default function PreferencesForm({ loggedIn, accountsEnabled, initial, welcome }: Props) {
  const router = useRouter();
  const [providers, setProviders] = useState<number[]>(initial?.providers ?? []);
  const [avoid, setAvoid] = useState<number[]>(initial?.avoidGenres ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rien dans le profil : on reprend ce qui a été choisi sur cet appareil.
  useEffect(() => {
    if (initial) return;
    const local = readLocalPrefs();
    if (local) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProviders(local.providers);
      setAvoid(local.avoidGenres);
    }
  }, [initial]);

  const toggle = (list: number[], id: number) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  async function save() {
    setSaving(true);
    setError(null);
    const prefs = { providers, avoidGenres: avoid };
    writeLocalPrefs(prefs);
    if (loggedIn) {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(prefs),
      }).catch(() => null);
      if (!res?.ok) {
        setError("L'enregistrement a échoué. Vérifie ta connexion et réessaie.");
        setSaving(false);
        return;
      }
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="page prefs">
      <h1>{welcome ? "Bienvenue ! Deux questions pour commencer" : "Mes préférences"}</h1>
      <p className="lead">
        {loggedIn
          ? "Enregistrées dans ton profil : tu les retrouves sur tous tes appareils."
          : "Gardées sur cet appareil : pas besoin de les redonner à chaque visite."}{" "}
        Tu peux les modifier à tout moment.
      </p>

      <section className="panel" aria-labelledby="prefs-providers">
        <h2 id="prefs-providers">Quels abonnements as-tu ?</h2>
        <p>On ne te proposera que des films inclus dans ces abonnements.</p>
        <div className="provider-grid">
          {PROVIDERS.map((p) => {
            const on = providers.includes(p.id);
            return (
              <button
                key={p.id}
                className="provider-tile"
                aria-pressed={on}
                onClick={() => setProviders((l) => toggle(l, p.id))}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.logo} alt="" width={56} height={56} />
                <span>{p.name}</span>
                <span className="tick" aria-hidden="true">{on ? "✓" : ""}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel" aria-labelledby="prefs-avoid">
        <h2 id="prefs-avoid">Qu&apos;est-ce que tu ne veux pas voir ?</h2>
        <p>Ces genres ne te seront jamais proposés. Laisse vide si tout te va.</p>
        <div className="chips">
          {AVOIDABLE_GENRES.map((g) => (
            <button
              key={g.id}
              className="chip chip-avoid"
              aria-pressed={avoid.includes(g.id)}
              onClick={() => setAvoid((l) => toggle(l, g.id))}
            >
              {avoid.includes(g.id) ? "🚫 " : ""}
              {g.label}
            </button>
          ))}
        </div>
      </section>

      <div className="row">
        <button className="btn btn-primary btn-lg" onClick={save} disabled={saving || providers.length === 0}>
          {saving ? "Enregistrement…" : welcome ? "C'est parti 🎬" : "Enregistrer"}
        </button>
        {!welcome && (
          <Link href="/" className="btn btn-ghost">
            Annuler
          </Link>
        )}
      </div>
      {providers.length === 0 && <p className="step-hint" style={{ margin: "10px 0 0" }}>Choisis au moins un abonnement.</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {!loggedIn && accountsEnabled && (
        <p className="step-hint" style={{ margin: "16px 0 0" }}>
          <Link href="/connexion">Connecte-toi</Link> pour retrouver tes préférences sur tous tes appareils.
        </p>
      )}
    </div>
  );
}
