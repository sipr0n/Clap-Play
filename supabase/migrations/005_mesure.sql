-- Clap & Play, phase 3 : mesure anonyme des propositions, pour améliorer l'algorithme.
-- Aucune donnée personnelle : ni compte, ni identifiant de navigateur. Seulement « ce film, proposé
-- pour ces raisons, a reçu telle action ». À coller dans Supabase → SQL Editor → Run.

create table if not exists public.reco_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  search_id uuid not null,          -- regroupe les films d'une même recherche (tiré au hasard, non conservé)
  tmdb_id int not null,
  position smallint,                -- 1, 2 ou 3 dans la recherche
  action text not null check (action in ('shown', 'trailer', 'watch', 'letterboxd', 'liked', 'seen', 'disliked')),
  reasons text[] not null default '{}',  -- types de justification affichés (acclaimed, similar, director…)
  score real,                       -- score de l'algorithme au moment de la proposition
  moods text[] not null default '{}',
  era text,
  logged_in boolean not null default false
);

alter table public.reco_events enable row level security;

-- Tout le monde peut ajouter une mesure ; personne ne peut les lire depuis le site
-- (lecture uniquement depuis le tableau de bord Supabase).
drop policy if exists "ajout de mesures" on public.reco_events;
create policy "ajout de mesures" on public.reco_events for insert to anon, authenticated with check (true);

create index if not exists reco_events_created_at on public.reco_events (created_at);

-- Les mesures sont gardées 13 mois (tâche planifiée chaque lundi à 3h23 ; nécessite pg_cron, migration 004).
select cron.schedule(
  'clap-play-mesures-13-mois',
  '23 3 * * 1',
  $$ delete from public.reco_events where created_at < now() - interval '13 months' $$
);
