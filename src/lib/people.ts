// Acteurs et réalisateurs préférés, déduits des coups de cœur de l'utilisateur.

import { type TmdbDetails, directorsOf, leadActorsOf } from "./tmdb";

export type Person = { id: number; name: string; count: number; titles: string[] };
export type People = { actors: Map<number, Person>; directors: Map<number, Person> };

// Un acteur compte s'il joue un rôle principal dans au moins 2 coups de cœur ; un réalisateur dès 1.
export const MIN_ACTOR_FILMS = 2;
export const MIN_DIRECTOR_FILMS = 1;

export function buildPeople(favorites: { title: string; details: TmdbDetails | null }[]): People {
  const actors = new Map<number, Person>();
  const directors = new Map<number, Person>();
  const count = (map: Map<number, Person>, p: { id: number; name: string }, title: string) => {
    const cur = map.get(p.id) ?? { id: p.id, name: p.name, count: 0, titles: [] };
    if (!cur.titles.includes(title)) {
      cur.count++;
      cur.titles.push(title);
    }
    map.set(p.id, cur);
  };
  for (const f of favorites) {
    for (const a of leadActorsOf(f.details)) count(actors, a, f.title);
    for (const d of directorsOf(f.details)) count(directors, d, f.title);
  }
  const keep = (map: Map<number, Person>, min: number) =>
    new Map([...map].filter(([, p]) => p.count >= min).sort((a, b) => b[1].count - a[1].count));
  return { actors: keep(actors, MIN_ACTOR_FILMS), directors: keep(directors, MIN_DIRECTOR_FILMS) };
}

// Les personnes les plus présentes, pour aller chercher directement leurs films.
export const topPeople = (map: Map<number, Person>, n: number) => [...map.values()].slice(0, n);

// Meilleure correspondance entre un film candidat et les personnes préférées.
export function matchPeople(details: TmdbDetails | null, people: People, excludeTitle?: string) {
  const pick = (list: { id: number }[], map: Map<number, Person>) =>
    list
      .map((x) => map.get(x.id))
      .filter((p): p is Person => Boolean(p) && !(p!.count === 1 && p!.titles[0] === excludeTitle))
      .sort((a, b) => b.count - a.count)[0] ?? null;
  return { actor: pick(leadActorsOf(details), people.actors), director: pick(directorsOf(details), people.directors) };
}
