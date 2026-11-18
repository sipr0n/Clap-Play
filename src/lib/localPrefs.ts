"use client";

import type { Prefs } from "./prefs";

// Préférences des visiteurs sans compte, gardées dans le navigateur de cet appareil.
const KEY = "cp.prefs";

export function readLocalPrefs(): Prefs | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Prefs;
      return p.providers?.length ? { providers: p.providers, avoidGenres: p.avoidGenres ?? [] } : null;
    }
    // Ancienne version du site : seuls les abonnements étaient gardés.
    const old = JSON.parse(localStorage.getItem("cp.providers") ?? "[]") as number[];
    return old.length ? { providers: old, avoidGenres: [] } : null;
  } catch {
    return null;
  }
}

export function writeLocalPrefs(prefs: Prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {}
}
