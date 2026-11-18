"use client";

import type { TrailerLang } from "@/lib/trailer";

import { useEffect, useRef, useState } from "react";

// Accord pour charger les vidéos YouTube, gardé sur cet appareil si la personne le demande.
const CONSENT_KEY = "cp.youtube";
const hasConsent = () => {
  try {
    return localStorage.getItem(CONSENT_KEY) === "ok";
  } catch {
    return false;
  }
};

type Props = {
  title: string;
  videoKey: string;
  lang: TrailerLang;
  onClose: () => void;
};

// Fenêtre qui lit la bande-annonce YouTube sur le site, sans le quitter.
export default function TrailerModal({ title, videoKey, lang, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [allowed, setAllowed] = useState(hasConsent);
  const [remember, setRemember] = useState(false);

  function play() {
    if (remember) {
      try {
        localStorage.setItem(CONSENT_KEY, "ok");
      } catch {}
    }
    setAllowed(true);
  }

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoKey)}?autoplay=1&rel=0&hl=fr&cc_lang_pref=fr&cc_load_policy=${lang === "vo" ? 1 : 0}`;

  return (
    <dialog
      ref={ref}
      className="trailer"
      aria-label={`Bande-annonce de ${title}`}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // clic en dehors de la vidéo
      }}
    >
      <div className="trailer-head">
        <strong>{title}</strong>
        <span className="badge badge-yellow">{lang === "vf" ? "VF" : lang === "vostfr" ? "VOSTFR" : "VO"}</span>
        <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Fermer la bande-annonce">
          ✕ Fermer
        </button>
      </div>
      <div className="trailer-frame">
        {allowed ? (
          <iframe
            src={src}
            title={`Bande-annonce de ${title}`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : (
          <div className="trailer-consent">
            <p>
              Cette bande-annonce est une vidéo <strong>YouTube</strong>. En la lançant, YouTube peut déposer des
              cookies sur ton appareil.
            </p>
            <button className="btn btn-primary btn-lg" onClick={play} autoFocus>
              ▶ Lancer la vidéo
            </button>
            <label className="trailer-remember">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Ne plus me demander sur cet appareil
            </label>
          </div>
        )}
      </div>
    </dialog>
  );
}
