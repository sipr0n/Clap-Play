import { Suspense } from "react";
import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import GoogleButton from "@/components/GoogleButton";
import { getUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata = { title: "Connexion · Clap & Play" };

async function LoginState({ searchParams }: { searchParams: PageProps<"/connexion">["searchParams"] }) {
  const { user } = await getUser();
  if (user) redirect("/profil");
  const { erreur } = await searchParams;
  return erreur ? <p className="error" style={{ marginTop: 16 }}>La connexion a échoué. Réessaie.</p> : null;
}

export default function Connexion({ searchParams }: PageProps<"/connexion">) {
  return (
    <div className="login-box">
      <Logo size={56} />
      <h1 style={{ margin: "16px 0 8px" }}>Bienvenue !</h1>
      <p className="lead">
        Connecte-toi pour enregistrer tes abonnements, lier ton Letterboxd et recevoir des propositions selon tes
        goûts.
      </p>
      {isSupabaseConfigured ? (
        <GoogleButton next="/profil" />
      ) : (
        <p className="notice">Les comptes ne sont pas encore activés sur ce site.</p>
      )}
      <Suspense fallback={null}>
        <LoginState searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
