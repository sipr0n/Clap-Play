-- Clap & Play : à coller dans Supabase → SQL Editor → Run.

-- Profil de chaque utilisateur
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  letterboxd_username text,
  providers int[] not null default '{}',     -- abonnements streaming (identifiants TMDB)
  avoid_genres int[] not null default '{}',  -- genres à ne jamais proposer (identifiants TMDB)
  updated_at timestamptz not null default now()
);

-- Films vus / notés / aimés, quelle que soit la source
create table if not exists public.film_events (
  user_id uuid not null references auth.users (id) on delete cascade,
  tmdb_id int not null,
  title text not null,
  year text,
  genres int[] not null default '{}',
  rating numeric(2,1),                        -- note sur 5 (comme Letterboxd), null si pas notée
  status text not null check (status in ('seen', 'liked', 'disliked')),
  source text not null check (source in ('site', 'letterboxd', 'csv_letterboxd', 'csv_imdb')),
  created_at timestamptz not null default now(),
  primary key (user_id, tmdb_id)
);

-- Sécurité : chacun ne voit et ne modifie que ses propres données
alter table public.profiles enable row level security;
alter table public.film_events enable row level security;

drop policy if exists "profil perso" on public.profiles;
create policy "profil perso" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "films perso" on public.film_events;
create policy "films perso" on public.film_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
