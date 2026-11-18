# Registre des traitements — Clap & Play

Mis à jour le 18 novembre 2026. Modèle inspiré du registre simplifié proposé par la CNIL.

**Responsable du traitement :** l'éditeur de Clap & Play (projet personnel, non commercial). Contact : adresse indiquée dans la variable `NEXT_PUBLIC_CONTACT_EMAIL` du site.

| Traitement | Finalité | Base légale | Personnes | Données | Destinataires / sous-traitants | Transfert hors UE | Conservation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Comptes utilisateurs | Permettre la connexion et retrouver ses préférences | Exécution du service demandé | Utilisateurs inscrits | E-mail, nom et photo Google, dates de création, de connexion et de dernière visite | Supabase (base), Google (connexion), Vercel (hébergement) | Oui : Google et Vercel (États-Unis), Data Privacy Framework ou clauses types | Tant que le compte existe ; suppression après 2 ans sans visite |
| Préférences | Ne proposer que des films disponibles et à son goût | Exécution du service demandé | Utilisateurs inscrits | Abonnements streaming, genres à éviter | Supabase, Vercel | Oui : Vercel | Idem compte |
| Historique et goûts | Ne plus proposer les films vus, personnaliser les propositions | Exécution du service demandé | Utilisateurs inscrits | Films vus, aimés, écartés, notes, source, dates | Supabase, Vercel | Oui : Vercel | Idem compte |
| Import Letterboxd | Importer le journal public de l'utilisateur | Consentement (lien du compte par l'utilisateur) | Utilisateurs qui lient leur pseudo | Pseudo Letterboxd, films et notes du journal public | Supabase, Vercel ; lecture du flux public de Letterboxd | Oui : Vercel | Idem compte ; supprimé avec le compte |

**Mesures de sécurité :**
- connexion uniquement via Google (pas de mot de passe stocké) ;
- base protégée par des règles d'accès par ligne : chaque utilisateur ne lit et ne modifie que ses données ;
- clés secrètes stockées dans les variables d'environnement de l'hébergeur, jamais dans le code ;
- échanges chiffrés (HTTPS).

**Droits des personnes :** export JSON et suppression du compte en libre-service depuis la page Profil ; correction et retrait des films depuis la page Historique ; contact par e-mail pour toute autre demande.

**Pas de traitement :** pas de publicité, pas de profilage à des fins commerciales, pas de revente, pas de cookies autres que ceux nécessaires à la connexion. Les vidéos YouTube ne sont chargées qu'après accord.
