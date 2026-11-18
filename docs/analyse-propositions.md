# Analyser les propositions de Clap & Play

Les mesures anonymes sont dans la table `reco_events` (Supabase → Table Editor, ou SQL Editor pour les requêtes ci-dessous).
Chaque ligne = un film proposé (`shown`) ou une action sur ce film (`trailer`, `watch`, `letterboxd`, `liked`, `seen`, `disliked`).

## Taux d'intérêt par type de justification

Part des films affichés qui ont reçu un signal positif (bande-annonce, « Où regarder », Letterboxd ou « Vu & aimé »), selon la raison affichée.

```sql
with shown as (
  select search_id, tmdb_id, unnest(reasons) as reason
  from reco_events where action = 'shown' and created_at > now() - interval '30 days'
),
positive as (
  select distinct search_id, tmdb_id from reco_events
  where action in ('trailer', 'watch', 'letterboxd', 'liked')
)
select s.reason,
       count(*) as affichages,
       round(100.0 * count(p.tmdb_id) / count(*), 1) as taux_interet_pct
from shown s left join positive p using (search_id, tmdb_id)
group by s.reason order by taux_interet_pct desc;
```

## Rejets : « Déjà vu » et « Pas pour moi »

```sql
select action, count(*) from reco_events
where action in ('seen', 'disliked', 'liked') and created_at > now() - interval '30 days'
group by action;
```

## Le score de l'algorithme prédit-il l'intérêt ?

Si le taux d'intérêt monte avec le score, les poids sont bien réglés. Sinon, il faut les revoir (fichier `src/lib/scoring.ts`, constante `WEIGHTS`).

```sql
with shown as (
  select search_id, tmdb_id, width_bucket(score, 0, 10, 5) as tranche
  from reco_events where action = 'shown' and score is not null
),
positive as (
  select distinct search_id, tmdb_id from reco_events where action in ('trailer', 'watch', 'letterboxd', 'liked')
)
select tranche, count(*) as affichages, round(100.0 * count(p.tmdb_id) / count(*), 1) as taux_interet_pct
from shown s left join positive p using (search_id, tmdb_id)
group by tranche order by tranche;
```

## Position sur la page

```sql
select position, count(*) filter (where action = 'shown') as affichages,
       count(*) filter (where action in ('trailer', 'watch', 'letterboxd', 'liked')) as signaux_positifs
from reco_events group by position order by position;
```
