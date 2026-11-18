-- Clap & Play : genres que l'utilisateur ne veut pas voir.
-- À coller dans Supabase → SQL Editor → Run (une seule fois).
alter table public.profiles add column if not exists avoid_genres int[] not null default '{}';
