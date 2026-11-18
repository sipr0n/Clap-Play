-- Clap & Play, RGPD : suppression automatique des comptes inactifs depuis 2 ans.
-- À coller dans Supabase → SQL Editor → Run, APRÈS la migration 003.
-- Utilise l'extension pg_cron de Supabase (tâche planifiée chaque dimanche à 3h17).

create extension if not exists pg_cron;

select cron.schedule(
  'clap-play-comptes-inactifs',
  '17 3 * * 0',
  $$
    delete from auth.users u
    using public.profiles p
    where p.id = u.id
      and greatest(coalesce(u.last_sign_in_at, u.created_at), p.last_seen_at) < now() - interval '2 years';
    delete from auth.users u
    where not exists (select 1 from public.profiles p where p.id = u.id)
      and coalesce(u.last_sign_in_at, u.created_at) < now() - interval '2 years';
  $$
);
