import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import { getUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import "@fontsource/pacifico/400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clap & Play : 3 films pour ce soir",
  description:
    "Indécis ? Clap & Play te propose 3 films selon ton humeur, ton temps libre et tes abonnements streaming.",
};

async function UserNav() {
  const { user } = await getUser();
  const name = (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0];
  if (user) {
    return (
      <>
        <Link href="/historique" className="btn btn-ghost btn-sm">
          Historique
        </Link>
        <Link href="/profil" className="btn btn-sm">
          Profil<span className="nav-name">{name ? ` de ${name}` : ""}</span>
        </Link>
        <form action="/auth/signout" method="post">
          <button className="btn btn-ghost btn-sm">Déconnexion</button>
        </form>
      </>
    );
  }
  return isSupabaseConfigured ? (
    <Link href="/connexion" className="btn btn-primary btn-sm">
      Se connecter
    </Link>
  ) : null;
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr">
      <body>
        <header className="header">
          <div className="container header-inner">
            <Link href="/" className="logo">
              <Logo />
              <span className="logo-name">
                Clap <span className="amp">&amp;</span> Play
              </span>
            </Link>
            <nav className="nav">
              <Suspense fallback={null}>
                <UserNav />
              </Suspense>
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
        <footer className="footer">
          <div className="container">
            Données films et disponibilités :{" "}
            <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">TMDB</a> et{" "}
            <a href="https://www.justwatch.com" target="_blank" rel="noreferrer">JustWatch</a>. Ce produit utilise
            l&apos;API TMDB mais n&apos;est ni approuvé ni certifié par TMDB.
            <div className="footer-links">
              <Link href="/confidentialite">Confidentialité</Link>
              <Link href="/conditions">Conditions d&apos;utilisation</Link>
              <Link href="/mentions-legales">Mentions légales</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
