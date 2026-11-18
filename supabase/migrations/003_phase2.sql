-- Clap & Play, phase 2 : historique, synchronisation Letterboxd, RGPD.
-- À coller dans Supabase → SQL Editor → Run (une seule fois). Sans risque si on le relance.

-- Historique : affiche du film
alter table public.film_events add column if not exists poster text;

-- Synchronisation Letterboxd automatique et dernière visite (durée de conservation RGPD)
alter table public.profiles add column if not exists letterboxd_synced_at timestamptz;
alter table public.profiles add column if not exists last_seen_at timestamptz not null default now();

-- RGPD : chacun peut supprimer complètement son compte (le profil et les films partent avec).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Non connecté';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
