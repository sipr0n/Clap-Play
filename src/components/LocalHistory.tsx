"use client";

import { useEffect, useState } from "react";

// Visiteur sans compte : les films marqués « Déjà vu » sont gardés sur cet appareil.
export default function LocalHistory() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCount((JSON.parse(localStorage.getItem("cp.seen") ?? "[]") as number[]).length);
    } catch {
      setCount(0);
    }
  }, []);

  function clear() {
    try {
      localStorage.removeItem("cp.seen");
    } catch {}
    setCount(0);
  }

  return (
    <div className="panel">
      <h2>Sur cet appareil</h2>
      <p>
        {count === null
          ? "…"
          : count === 0
            ? "Aucun film marqué « Déjà vu » ou « Pas pour moi » pour l'instant."
            : `${count} film${count > 1 ? "s" : ""} marqué${count > 1 ? "s" : ""} « Déjà vu » ou « Pas pour moi » : ils ne te sont plus proposés.`}
      </p>
      {count ? (
        <button className="btn btn-sm" onClick={clear}>
          Tout effacer
        </button>
      ) : null}
    </div>
  );
}
