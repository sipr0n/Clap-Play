"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseCsv, toImportRows } from "@/lib/csv";

const BATCH = 400;

export function LetterboxdLink({ current }: { current: string | null }) {
  const router = useRouter();
  const [username, setUsername] = useState(current ?? "");
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function sync() {
    setLoading(true);
    setStatus(null);
    const res = await fetch("/api/me/letterboxd", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return setStatus({ ok: false, text: data.error ?? "Erreur inconnue." });
    setStatus({ ok: true, text: `${data.imported} film(s) récupéré(s) depuis ton journal Letterboxd.` });
    router.refresh();
  }

  return (
    <>
      <div className="row">
        <input
          className="input"
          placeholder="Ton pseudo Letterboxd"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          aria-label="Pseudo Letterboxd"
        />
        <button className="btn btn-teal" onClick={sync} disabled={loading || !username.trim()}>
          {loading ? "Synchronisation…" : current ? "Resynchroniser" : "Lier mon compte"}
        </button>
      </div>
      {status && (
        <p className={status.ok ? "" : "error"} style={{ marginTop: 10, marginBottom: 0 }} role="status">
          {status.text}
        </p>
      )}
    </>
  );
}

export function CsvImport() {
  const router = useRouter();
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    setError(null);
    const parsed = toImportRows(parseCsv(await file.text()));
    if (!parsed || parsed.rows.length === 0) {
      setError("Fichier non reconnu. Utilise watched.csv ou ratings.csv (Letterboxd), ou ratings.csv (IMDb).");
      return;
    }
    setBusy(true);
    let imported = 0;
    let notFound = 0;
    for (let i = 0; i < parsed.rows.length; i += BATCH) {
      setProgress(`Import en cours… ${Math.min(i + BATCH, parsed.rows.length)}/${parsed.rows.length}`);
      const res = await fetch("/api/me/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ format: parsed.format, rows: parsed.rows.slice(i, i + BATCH) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "L'import a échoué.");
        break;
      }
      imported += data.imported;
      notFound += data.notFound;
    }
    setBusy(false);
    setProgress(
      `${imported} film(s) importé(s)${notFound ? `, ${notFound} non trouvé(s)` : ""}.`,
    );
    router.refresh();
  }

  return (
    <>
      <label className="btn" style={{ opacity: busy ? 0.6 : 1 }}>
        📄 Choisir un fichier CSV
        <input
          type="file"
          accept=".csv,text/csv"
          hidden
          disabled={busy}
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
      </label>
      {progress && <p style={{ marginTop: 10, marginBottom: 0 }} role="status">{progress}</p>}
      {error && <p className="error" style={{ marginTop: 10, marginBottom: 0 }} role="alert">{error}</p>}
    </>
  );
}

export function DeleteData() {
  const [step, setStep] = useState<"idle" | "confirm" | "busy">("idle");
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setStep("busy");
    setError(null);
    const res = await fetch("/api/me/account", { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "La suppression a échoué. Réessaie.");
      setStep("confirm");
      return;
    }
    // Rechargement complet voulu : l'en-tête doit refléter la déconnexion.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/";
  }

  return (
    <>
      <div className="row">
        <a className="btn" href="/api/me/export" download>
          ⬇️ Télécharger mes données
        </a>
        {step === "idle" && (
          <button className="btn btn-danger" onClick={() => setStep("confirm")}>
            Supprimer mon compte
          </button>
        )}
      </div>
      {step !== "idle" && (
        <div style={{ marginTop: 14 }}>
          <p style={{ color: "var(--text)" }}>
            Ton compte, ton historique, ton lien Letterboxd et tes préférences seront effacés définitivement, puis tu
            seras déconnecté.
          </p>
          <div className="row">
            <button className="btn btn-danger" onClick={remove} disabled={step === "busy"}>
              {step === "busy" ? "Suppression…" : "Oui, tout supprimer"}
            </button>
            <button className="btn btn-ghost" onClick={() => setStep("idle")} disabled={step === "busy"}>
              Annuler
            </button>
          </div>
        </div>
      )}
      {error && <p className="error" role="alert" style={{ marginTop: 10, marginBottom: 0 }}>{error}</p>}
    </>
  );
}
