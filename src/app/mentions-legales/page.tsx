import Link from "next/link";
import Contact from "@/components/Contact";

export const metadata = { title: "Mentions légales · Clap & Play" };

export default function MentionsLegales() {
  return (
    <div className="page legal">
      <h1>Mentions légales</h1>
      <p className="lead">Dernière mise à jour : 18 novembre 2026</p>

      <h2>Éditeur</h2>
      <p>
        Clap &amp; Play est un site personnel, non commercial, réalisé dans le cadre d&apos;un projet d&apos;études.
        Conformément à l&apos;article 6, III, 2° de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans
        l&apos;économie numérique, l&apos;éditeur, personne physique agissant à titre non professionnel, a communiqué
        son identité à l&apos;hébergeur. Contact : <Contact />.
      </p>

      <h2>Hébergeur</h2>
      <p>
        Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.{" "}
        <a href="https://vercel.com" target="_blank" rel="noreferrer">vercel.com</a>
      </p>

      <h2>Données des films</h2>
      <p>
        Les informations, affiches et résumés des films viennent de{" "}
        <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">TMDB</a>, les disponibilités sur les
        plateformes de <a href="https://www.justwatch.com" target="_blank" rel="noreferrer">JustWatch</a>. Ce produit
        utilise l&apos;API TMDB mais n&apos;est ni approuvé ni certifié par TMDB. Les marques et logos des plateformes
        appartiennent à leurs propriétaires.
      </p>

      <h2>Données personnelles</h2>
      <p>
        Voir les <Link href="/confidentialite">règles de confidentialité</Link>.
      </p>
    </div>
  );
}
