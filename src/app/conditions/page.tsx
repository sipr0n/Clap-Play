import Link from "next/link";
import Contact from "@/components/Contact";

export const metadata = { title: "Conditions d'utilisation · Clap & Play" };

export default function Conditions() {
  return (
    <div className="page legal">
      <h1>Conditions d&apos;utilisation</h1>
      <p className="lead">Dernière mise à jour : novembre 2026</p>

      <h2>Le service</h2>
      <p>
        Clap &amp; Play est un site gratuit qui propose des idées de films selon ton humeur, ton temps libre et tes
        abonnements streaming. Il ne diffuse aucun film : il t&apos;indique seulement où les regarder.
      </p>

      <h2>Les informations affichées</h2>
      <p>
        Les catalogues, affiches et résumés viennent de TMDB et JustWatch. Les disponibilités peuvent changer ou avoir
        quelques jours de retard : vérifie sur la plateforme avant de t&apos;abonner pour un film. Ce produit utilise
        l&apos;API TMDB mais n&apos;est ni approuvé ni certifié par TMDB.
      </p>

      <h2>Letterboxd</h2>
      <p>
        Clap &amp; Play n&apos;est pas affilié à Letterboxd. Le bouton « Noter sur Letterboxd » ouvre simplement la
        page du film sur leur site.
      </p>

      <h2>Ton compte</h2>
      <p>
        La connexion se fait avec ton compte Google. Tu peux supprimer tes données à tout moment depuis ton profil.
        Voir les <Link href="/confidentialite">règles de confidentialité</Link>.
      </p>

      <h2>Contact</h2>
      <p>
        Pour toute question : <Contact />.
      </p>
    </div>
  );
}
