import Link from "next/link";
import Contact from "@/components/Contact";

export const metadata = { title: "Confidentialité · Clap & Play" };

export default function Confidentialite() {
  return (
    <div className="page legal">
      <h1>Règles de confidentialité</h1>
      <p className="lead">Dernière mise à jour : 18 novembre 2026</p>

      <h2>En bref</h2>
      <ul>
        <li>Sans compte, rien ne nous est envoyé : tes choix restent dans ton navigateur.</li>
        <li>Avec un compte, nous gardons seulement ce qui sert à te proposer des films.</li>
        <li>Pas de publicité, pas de revente, pas de pistage.</li>
        <li>Tu peux télécharger ou supprimer tes données à tout moment depuis ton profil.</li>
      </ul>

      <h2>Responsable du traitement</h2>
      <p>
        Clap &amp; Play est un projet personnel et non commercial. Pour toute question sur tes données, écris à{" "}
        <Contact />. Voir aussi les <Link href="/mentions-legales">mentions légales</Link>.
      </p>

      <h2>Sans compte</h2>
      <p>
        Tes abonnements, les genres à éviter et les films marqués «&nbsp;Déjà vu&nbsp;» sont enregistrés uniquement dans
        ton navigateur (stockage local). Ils ne nous sont pas envoyés. Tu peux les effacer depuis la page{" "}
        <Link href="/historique">Historique</Link> ou en vidant les données du site dans ton navigateur.
      </p>

      <h2>Avec un compte Google : ce que nous gardons et pourquoi</h2>
      <ul>
        <li>
          <strong>Ton identité Google</strong> (adresse e-mail, nom, photo) : pour te connecter. Base légale : exécution
          du service que tu demandes.
        </li>
        <li>
          <strong>Tes préférences</strong> (abonnements, genres à éviter) : pour ne te proposer que des films
          accessibles et à ton goût. Base légale : exécution du service.
        </li>
        <li>
          <strong>Ton historique</strong> (films vus, aimés ou écartés, avec leur note) : pour ne plus te proposer ces
          films et apprendre tes goûts. Base légale : exécution du service.
        </li>
        <li>
          <strong>Ton pseudo Letterboxd</strong>, si tu le donnes : pour importer ton journal public, puis le
          resynchroniser au plus toutes les 6 heures quand tu visites le site. Base légale : ton consentement, que tu
          retires en supprimant ton pseudo ou ton compte.
        </li>
        <li>
          <strong>La date de ta dernière visite</strong> : pour appliquer la durée de conservation ci-dessous.
        </li>
      </ul>

      <h2>Durée de conservation</h2>
      <p>
        Tes données sont gardées tant que ton compte existe. Un compte sans connexion ni visite pendant 2 ans est
        supprimé avec toutes ses données.
      </p>

      <h2>Qui traite les données pour nous</h2>
      <ul>
        <li>
          <strong>Vercel Inc.</strong> (États-Unis) : héberge le site.
        </li>
        <li>
          <strong>Supabase Inc.</strong> : héberge les comptes et la base de données sur des serveurs situés en
          Irlande (Union européenne). La base est protégée pour que chaque utilisateur n&apos;accède qu&apos;à ses
          propres données.
        </li>
        <li>
          <strong>Google</strong> (États-Unis) : gère la connexion avec ton compte Google.
        </li>
      </ul>
      <p>
        Tes données sont donc stockées dans l&apos;Union européenne. Les transferts vers les États-Unis (hébergement
        du site et connexion Google) sont encadrés par le cadre de protection des données UE–États-Unis (Data
        Privacy Framework) ou par les clauses contractuelles types de la Commission européenne. Les informations sur
        les films viennent de TMDB et JustWatch : nous ne leur envoyons aucune donnée personnelle.
      </p>

      <h2>Mesure anonyme des propositions</h2>
      <p>
        Pour améliorer les propositions, nous enregistrons ce que deviennent les films proposés : affiché, bande-annonce
        regardée, «&nbsp;Où regarder&nbsp;» cliqué, «&nbsp;Vu &amp; aimé&nbsp;» ou «&nbsp;Pas pour moi&nbsp;», avec les
        raisons affichées et les styles choisis. Ces mesures sont anonymes : elles ne contiennent ni ton compte, ni ton
        adresse, ni identifiant de ton navigateur, et ne permettent pas de te reconnaître. Elles sont supprimées
        au bout de 13 mois.
      </p>

      <h2>Cookies et vidéos</h2>
      <p>
        Le site utilise uniquement des cookies nécessaires : celui qui te garde connecté. Ils ne demandent pas de
        consentement. Les bandes-annonces sont des vidéos YouTube : elles ne sont chargées que si tu cliques sur
        «&nbsp;Bande-annonce&nbsp;», puis après ton accord, car YouTube peut alors déposer ses propres cookies.
      </p>

      <h2>Tes droits</h2>
      <p>
        Tu peux accéder à tes données, les corriger, les supprimer, les récupérer dans un fichier, t&apos;opposer à un
        traitement ou retirer ton consentement :
      </p>
      <ul>
        <li>
          depuis ton <Link href="/profil">profil</Link> : «&nbsp;Télécharger mes données&nbsp;» et «&nbsp;Supprimer mon
          compte&nbsp;» ;
        </li>
        <li>
          depuis ton <Link href="/historique">historique</Link> : corriger ou retirer un film ;
        </li>
        <li>
          ou en écrivant à <Contact />.
        </li>
      </ul>
      <p>
        Si tu estimes que tes droits ne sont pas respectés, tu peux adresser une réclamation à la CNIL (
        <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noreferrer">
          cnil.fr/fr/plaintes
        </a>
        ).
      </p>
    </div>
  );
}
