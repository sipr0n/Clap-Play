// Petit catalogue de démonstration, utilisé tant qu'aucune clé TMDB n'est configurée.
// Les plateformes indiquées ici sont fictives : seules les vraies données TMDB font foi.

type DemoFilm = {
  id: number;
  title: string;
  year: string;
  runtime: number;
  rating: number;
  genres: number[];
  providers: number[];
  overview: string;
};

export const DEMO_FILMS: DemoFilm[] = [
  { id: 77338, title: "Intouchables", year: "2011", runtime: 112, rating: 8.3, genres: [35, 18], providers: [8, 381], overview: "Un aristocrate tétraplégique engage comme aide à domicile un jeune de banlieue tout juste sorti de prison." },
  { id: 194, title: "Le Fabuleux Destin d'Amélie Poulain", year: "2001", runtime: 122, rating: 7.9, genres: [35, 10749], providers: [119, 381], overview: "Amélie, jeune serveuse à Montmartre, décide de changer la vie des gens qui l'entourent." },
  { id: 27205, title: "Inception", year: "2010", runtime: 148, rating: 8.4, genres: [28, 878, 12], providers: [8, 1899], overview: "Un voleur spécialisé dans l'extraction de secrets enfouis dans les rêves reçoit une mission impossible." },
  { id: 496243, title: "Parasite", year: "2019", runtime: 132, rating: 8.5, genres: [35, 53, 18], providers: [381, 11], overview: "Une famille pauvre s'infiltre peu à peu dans la vie d'une famille aisée." },
  { id: 419430, title: "Get Out", year: "2017", runtime: 104, rating: 7.6, genres: [9648, 53, 27], providers: [119, 381], overview: "Un jeune homme rend visite à la famille de sa petite amie, et quelque chose cloche." },
  { id: 76341, title: "Mad Max: Fury Road", year: "2015", runtime: 120, rating: 7.6, genres: [28, 12, 878], providers: [1899, 8], overview: "Dans un désert post-apocalyptique, une course-poursuite effrénée pour la liberté." },
  { id: 354912, title: "Coco", year: "2017", runtime: 105, rating: 8.2, genres: [16, 10751, 14], providers: [337], overview: "Miguel, passionné de musique, se retrouve au pays des morts le jour de la fête des défunts." },
  { id: 129, title: "Le Voyage de Chihiro", year: "2001", runtime: 125, rating: 8.5, genres: [16, 10751, 14], providers: [8], overview: "Une fillette se retrouve piégée dans un monde d'esprits et doit sauver ses parents." },
  { id: 313369, title: "La La Land", year: "2016", runtime: 128, rating: 7.9, genres: [35, 18, 10749, 10402], providers: [119, 381], overview: "À Los Angeles, une actrice et un pianiste de jazz tombent amoureux en poursuivant leurs rêves." },
  { id: 546554, title: "À couteaux tirés", year: "2019", runtime: 131, rating: 7.8, genres: [35, 80, 9648], providers: [119, 8], overview: "Un célèbre romancier meurt le soir de ses 85 ans. Un détective excentrique mène l'enquête." },
  { id: 157336, title: "Interstellar", year: "2014", runtime: 169, rating: 8.4, genres: [12, 18, 878], providers: [119, 531], overview: "Des explorateurs traversent un trou de ver pour trouver une nouvelle planète habitable." },
  { id: 120467, title: "The Grand Budapest Hotel", year: "2014", runtime: 100, rating: 8.0, genres: [35, 18], providers: [337, 381], overview: "Les aventures d'un concierge légendaire et de son jeune groom dans un palace d'Europe centrale." },
  { id: 493922, title: "Hérédité", year: "2018", runtime: 127, rating: 7.3, genres: [27, 9648, 53], providers: [381, 119], overview: "Après la mort de la grand-mère, une famille découvre des secrets terrifiants." },
  { id: 244786, title: "Whiplash", year: "2014", runtime: 107, rating: 8.4, genres: [18, 10402], providers: [8, 381], overview: "Un jeune batteur de jazz est poussé à bout par un professeur tyrannique." },
  { id: 120, title: "Le Seigneur des anneaux : La Communauté de l'anneau", year: "2001", runtime: 179, rating: 8.4, genres: [12, 14, 28], providers: [119, 1899], overview: "Un hobbit hérite d'un anneau maléfique et doit le détruire avant qu'il ne tombe entre de mauvaises mains." },
  { id: 515042, title: "Free Solo", year: "2018", runtime: 100, rating: 7.9, genres: [99], providers: [337], overview: "Alex Honnold tente l'ascension d'El Capitan, sans corde ni assurance." },
  { id: 346648, title: "Paddington 2", year: "2017", runtime: 104, rating: 7.6, genres: [12, 35, 10751], providers: [8, 381], overview: "Paddington cherche le cadeau parfait pour sa tante et se retrouve accusé d'un vol." },
  { id: 531428, title: "Portrait de la jeune fille en feu", year: "2019", runtime: 122, rating: 8.1, genres: [18, 10749, 36], providers: [11, 381], overview: "En 1770, une peintre doit réaliser en secret le portrait d'une jeune femme qui refuse de poser." },
  { id: 1124, title: "Le Prestige", year: "2006", runtime: 130, rating: 8.2, genres: [18, 9648, 878], providers: [119, 8], overview: "Deux magiciens rivaux se livrent une guerre sans merci pour réaliser le tour ultime." },
  { id: 438631, title: "Dune", year: "2021", runtime: 155, rating: 7.8, genres: [878, 12], providers: [1899, 119], overview: "Paul Atreides, héritier d'une grande famille, doit survivre sur la planète la plus dangereuse de l'univers." },
  { id: 245891, title: "John Wick", year: "2014", runtime: 101, rating: 7.4, genres: [28, 53], providers: [119, 8], overview: "Un ancien tueur à gages reprend du service pour se venger." },
  { id: 447332, title: "Sans un bruit", year: "2018", runtime: 91, rating: 7.4, genres: [27, 18, 878], providers: [531, 119], overview: "Une famille doit vivre dans le silence absolu pour échapper à des créatures qui chassent au son." },
  { id: 862, title: "Toy Story", year: "1995", runtime: 81, rating: 8.0, genres: [16, 12, 35, 10751], providers: [337], overview: "Woody, cow-boy en plastique, voit arriver un nouveau jouet : Buzz l'Éclair." },
];
