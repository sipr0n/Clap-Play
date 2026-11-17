import Link from "next/link";
import Contact from "@/components/Contact";

export const metadata = { title: "Confidentialité · Clap & Play" };

export default function Confidentialite() {
  return (
    <div className="page legal">
      <h1>Règles de confidentialité</h1>
      <p className="lead">Dernière mise à jour : novembre 2026</p>

      <h2>Sans compte</h2>
      <p>
        Tu peux utiliser Clap &amp; Play sans te connecter. Tes abonnements et les films marqués « Déjà vu » sont
        alors enregistrés uniquement dans ton navigateur (stockage local) et ne nous sont pas envoyés.
      </p>

      <h2>Avec un compte Google</h2>
      <p>Quand tu te connectes avec Google, nous recevons et conservons :</p>
      <ul>
        <li>ton adresse e-mail, ton nom et ta photo de profil Google, pour t&apos;identifier ;</li>
        <li>tes abonnements streaming choisis sur le site ;</li>
        <li>les films que tu marques « Déjà vu », « Vu &amp; aimé » ou « Pas pour moi » ;</li>
        <li>
          si tu le choisis : ton pseudo Letterboxd et les films de ton journal Letterboxd public, ou ceux d&apos;un
          fichier CSV que tu importes (titre, année, note).
        </li>
      </ul>
      <p>
        Ces données servent uniquement à te proposer des films adaptés à tes goûts. Elles ne sont ni vendues, ni
        partagées, ni utilisées pour de la publicité.
      </p>

      <h2>Où sont stockées les données</h2>
      <p>
        Le site est hébergé par Vercel. Les comptes et les données sont stockés chez Supabase, dans une base protégée
        où chaque utilisateur ne peut accéder qu&apos;à ses propres données. Les informations sur les films viennent
        de TMDB et JustWatch : nous n&apos;y envoyons aucune donnée personnelle.
      </p>

      <h2>Tes droits</h2>
      <p>
        Tu peux supprimer à tout moment tes données depuis ta page <Link href="/profil">Profil</Link>, avec le bouton
        « Supprimer mes données ». Pour supprimer complètement ton compte ou pour toute question, écris à <Contact />.
      </p>
    </div>
  );
}
