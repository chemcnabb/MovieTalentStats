export interface MovieCredit {
  id: string;
  title: string;
  year: number;
  role: 'Director' | 'Screenwriter' | 'Writer';
  vote_average: number;
  vote_count: number;
  budget?: number;
  revenue?: number;
  poster_url: string;
  is_franchise?: boolean;
}

export interface TalentFilmography {
  talent_name: string;
  avatar_url: string;
  bio?: string;
  movies: MovieCredit[];
}

// Built-in curated filmography and posters for notable filmmakers
// Fallback generator provides high-fidelity filmography for any creator
export const CURATED_FILMOGRAPHIES: Record<string, { avatar: string; bio: string; movies: MovieCredit[] }> = {
  'quentin tarantino': {
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    bio: 'Academy Award-winning auteur renowned for non-linear storytelling, sharp dialogue, and stylized homage to cinema history.',
    movies: [
      {
        id: 'pulp-fiction',
        title: 'Pulp Fiction',
        year: 1994,
        role: 'Director',
        vote_average: 8.9,
        vote_count: 24500,
        budget: 8500000,
        revenue: 213900000,
        poster_url: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
      {
        id: 'inglourious-basterds',
        title: 'Inglourious Basterds',
        year: 2009,
        role: 'Director',
        vote_average: 8.4,
        vote_count: 18900,
        budget: 70000000,
        revenue: 321455689,
        poster_url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
      {
        id: 'django-unchained',
        title: 'Django Unchained',
        year: 2012,
        role: 'Director',
        vote_average: 8.5,
        vote_count: 22100,
        budget: 100000000,
        revenue: 425368238,
        poster_url: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
      {
        id: 'reservoir-dogs',
        title: 'Reservoir Dogs',
        year: 1992,
        role: 'Director',
        vote_average: 8.3,
        vote_count: 12400,
        budget: 1200000,
        revenue: 2800000,
        poster_url: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
      {
        id: 'kill-bill-vol-1',
        title: 'Kill Bill: Vol. 1',
        year: 2003,
        role: 'Director',
        vote_average: 8.2,
        vote_count: 15300,
        budget: 30000000,
        revenue: 180949000,
        poster_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
        is_franchise: true,
      },
      {
        id: 'once-upon-a-time-in-hollywood',
        title: 'Once Upon a Time... in Hollywood',
        year: 2019,
        role: 'Director',
        vote_average: 7.6,
        vote_count: 11900,
        budget: 90000000,
        revenue: 377600000,
        poster_url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
    ],
  },
  'christopher nolan': {
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    bio: 'Master of high-concept non-linear epics, time mechanics, and large-format IMAX sensory storytelling.',
    movies: [
      {
        id: 'the-dark-knight',
        title: 'The Dark Knight',
        year: 2008,
        role: 'Director',
        vote_average: 9.0,
        vote_count: 29500,
        budget: 185000000,
        revenue: 1004558444,
        poster_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
        is_franchise: true,
      },
      {
        id: 'inception',
        title: 'Inception',
        year: 2010,
        role: 'Director',
        vote_average: 8.8,
        vote_count: 33400,
        budget: 160000000,
        revenue: 836836967,
        poster_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
      {
        id: 'interstellar',
        title: 'Interstellar',
        year: 2014,
        role: 'Director',
        vote_average: 8.7,
        vote_count: 31200,
        budget: 165000000,
        revenue: 701729206,
        poster_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
      {
        id: 'oppenheimer',
        title: 'Oppenheimer',
        year: 2023,
        role: 'Director',
        vote_average: 8.9,
        vote_count: 16800,
        budget: 100000000,
        revenue: 957000000,
        poster_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
      {
        id: 'memento',
        title: 'Memento',
        year: 2000,
        role: 'Director',
        vote_average: 8.4,
        vote_count: 13500,
        budget: 9000000,
        revenue: 39723096,
        poster_url: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
      {
        id: 'the-prestige',
        title: 'The Prestige',
        year: 2006,
        role: 'Director',
        vote_average: 8.5,
        vote_count: 14800,
        budget: 40000000,
        revenue: 109676311,
        poster_url: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
    ],
  },
  'martin scorsese': {
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
    bio: 'American cinematic giant celebrated for gritty character examinations, moral conflict, and kinetic pacing.',
    movies: [
      {
        id: 'goodfellas',
        title: 'GoodFellas',
        year: 1990,
        role: 'Director',
        vote_average: 8.7,
        vote_count: 12200,
        budget: 25000000,
        revenue: 46836394,
        poster_url: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
      {
        id: 'the-departed',
        title: 'The Departed',
        year: 2006,
        role: 'Director',
        vote_average: 8.5,
        vote_count: 14200,
        budget: 90000000,
        revenue: 291465033,
        poster_url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
      {
        id: 'taxi-driver',
        title: 'Taxi Driver',
        year: 1976,
        role: 'Director',
        vote_average: 8.3,
        vote_count: 10800,
        budget: 1300000,
        revenue: 28262574,
        poster_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
      {
        id: 'the-wolf-of-wall-street',
        title: 'The Wolf of Wall Street',
        year: 2013,
        role: 'Director',
        vote_average: 8.2,
        vote_count: 21300,
        budget: 100000000,
        revenue: 392000694,
        poster_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
      {
        id: 'casino',
        title: 'Casino',
        year: 1995,
        role: 'Director',
        vote_average: 8.2,
        vote_count: 9800,
        budget: 52000000,
        revenue: 116112375,
        poster_url: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
    ],
  },
  'david fincher': {
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    bio: 'Obsessive perfectionist renowned for clinical camera movement, dark psychological thrillers, and razor-sharp edits.',
    movies: [
      {
        id: 'fight-club',
        title: 'Fight Club',
        year: 1999,
        role: 'Director',
        vote_average: 8.8,
        vote_count: 26800,
        budget: 63000000,
        revenue: 101209702,
        poster_url: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
      {
        id: 'se7en',
        title: 'Se7en',
        year: 1995,
        role: 'Director',
        vote_average: 8.6,
        vote_count: 18900,
        budget: 33000000,
        revenue: 327333559,
        poster_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
      {
        id: 'the-social-network',
        title: 'The Social Network',
        year: 2010,
        role: 'Director',
        vote_average: 8.1,
        vote_count: 15400,
        budget: 40000000,
        revenue: 224920315,
        poster_url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
      {
        id: 'gone-girl',
        title: 'Gone Girl',
        year: 2014,
        role: 'Director',
        vote_average: 8.1,
        vote_count: 16700,
        budget: 61000000,
        revenue: 369330363,
        poster_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
      {
        id: 'zodiac',
        title: 'Zodiac',
        year: 2007,
        role: 'Director',
        vote_average: 7.9,
        vote_count: 10400,
        budget: 65000000,
        revenue: 84785914,
        poster_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
    ],
  },
  'denis villeneuve': {
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
    bio: 'Visionary Canadian architect of immense, contemplative sci-fi monuments with deep atmospheric world-building.',
    movies: [
      {
        id: 'dune-part-two',
        title: 'Dune: Part Two',
        year: 2024,
        role: 'Director',
        vote_average: 8.9,
        vote_count: 11200,
        budget: 190000000,
        revenue: 711844358,
        poster_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
        is_franchise: true,
      },
      {
        id: 'blade-runner-2049',
        title: 'Blade Runner 2049',
        year: 2017,
        role: 'Director',
        vote_average: 8.5,
        vote_count: 12800,
        budget: 150000000,
        revenue: 259239658,
        poster_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
        is_franchise: true,
      },
      {
        id: 'arrival',
        title: 'Arrival',
        year: 2016,
        role: 'Director',
        vote_average: 8.2,
        vote_count: 16100,
        budget: 47000000,
        revenue: 203388186,
        poster_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
      {
        id: 'sicario',
        title: 'Sicario',
        year: 2015,
        role: 'Director',
        vote_average: 8.0,
        vote_count: 11800,
        budget: 30000000,
        revenue: 84872444,
        poster_url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
      {
        id: 'incendies',
        title: 'Incendies',
        year: 2010,
        role: 'Director',
        vote_average: 8.3,
        vote_count: 4200,
        budget: 6800000,
        revenue: 16000000,
        poster_url: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
    ],
  },
  'greta gerwig': {
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    bio: 'Celebrated auteur bridging deeply empathetic coming-of-age portraits with transcendent box-office triumphs.',
    movies: [
      {
        id: 'barbie',
        title: 'Barbie',
        year: 2023,
        role: 'Director',
        vote_average: 7.8,
        vote_count: 14200,
        budget: 145000000,
        revenue: 1445638421,
        poster_url: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?auto=format&fit=crop&w=600&q=80',
        is_franchise: true,
      },
      {
        id: 'lady-bird',
        title: 'Lady Bird',
        year: 2017,
        role: 'Director',
        vote_average: 8.2,
        vote_count: 9400,
        budget: 10000000,
        revenue: 78985181,
        poster_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
      {
        id: 'little-women',
        title: 'Little Women',
        year: 2019,
        role: 'Director',
        vote_average: 8.2,
        vote_count: 7300,
        budget: 40000000,
        revenue: 218843495,
        poster_url: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=600&q=80',
        is_franchise: true,
      },
      {
        id: 'frances-ha',
        title: 'Frances Ha',
        year: 2012,
        role: 'Screenwriter',
        vote_average: 7.7,
        vote_count: 3600,
        budget: 3000000,
        revenue: 11260000,
        poster_url: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
    ],
  },
  'aaron sorkin': {
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
    bio: 'Premier Hollywood wordsmith celebrated for rhythmic "walk-and-talk" banter, rapid-fire intellectual discourse, and courtroom intensity.',
    movies: [
      {
        id: 'the-social-network-sw',
        title: 'The Social Network',
        year: 2010,
        role: 'Screenwriter',
        vote_average: 8.8,
        vote_count: 15400,
        budget: 40000000,
        revenue: 224920315,
        poster_url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
      {
        id: 'a-few-good-men',
        title: 'A Few Good Men',
        year: 1992,
        role: 'Screenwriter',
        vote_average: 8.4,
        vote_count: 8900,
        budget: 40000000,
        revenue: 243240178,
        poster_url: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
      {
        id: 'moneyball',
        title: 'Moneyball',
        year: 2011,
        role: 'Screenwriter',
        vote_average: 8.1,
        vote_count: 11500,
        budget: 50000000,
        revenue: 110206216,
        poster_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
      {
        id: 'the-trial-of-the-chicago-7',
        title: 'The Trial of the Chicago 7',
        year: 2020,
        role: 'Director',
        vote_average: 8.0,
        vote_count: 6700,
        budget: 35000000,
        revenue: 0,
        poster_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
      {
        id: 'steve-jobs',
        title: 'Steve Jobs',
        year: 2015,
        role: 'Screenwriter',
        vote_average: 7.9,
        vote_count: 5800,
        budget: 30000000,
        revenue: 34441873,
        poster_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
    ],
  },
  'wes anderson': {
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80',
    bio: 'Symmetrical visual stylist celebrated for pastel color palettes, quirky ensemble casts, and deadpan whimsical humor.',
    movies: [
      {
        id: 'the-grand-budapest-hotel',
        title: 'The Grand Budapest Hotel',
        year: 2014,
        role: 'Director',
        vote_average: 8.4,
        vote_count: 14700,
        budget: 25000000,
        revenue: 172900000,
        poster_url: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
      {
        id: 'moonrise-kingdom',
        title: 'Moonrise Kingdom',
        year: 2012,
        role: 'Director',
        vote_average: 8.0,
        vote_count: 8200,
        budget: 16000000,
        revenue: 68300000,
        poster_url: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
      {
        id: 'fantastic-mr-fox',
        title: 'Fantastic Mr. Fox',
        year: 2009,
        role: 'Director',
        vote_average: 8.2,
        vote_count: 9800,
        budget: 40000000,
        revenue: 46500000,
        poster_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
        is_franchise: true,
      },
      {
        id: 'the-royal-tenenbaums',
        title: 'The Royal Tenenbaums',
        year: 2001,
        role: 'Director',
        vote_average: 7.9,
        vote_count: 5800,
        budget: 21000000,
        revenue: 71400000,
        poster_url: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
    ],
  },
  'steven spielberg': {
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80',
    bio: 'The architect of modern cinema and blockbuster wonder, combining emotional human storytelling with grand scale.',
    movies: [
      {
        id: 'jurassic-park',
        title: 'Jurassic Park',
        year: 1993,
        role: 'Director',
        vote_average: 8.5,
        vote_count: 22400,
        budget: 63000000,
        revenue: 1046700000,
        poster_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
        is_franchise: true,
      },
      {
        id: 'schindlers-list',
        title: 'Schindler’s List',
        year: 1993,
        role: 'Director',
        vote_average: 9.0,
        vote_count: 14800,
        budget: 22000000,
        revenue: 322161245,
        poster_url: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
      {
        id: 'saving-private-ryan',
        title: 'Saving Private Ryan',
        year: 1998,
        role: 'Director',
        vote_average: 8.6,
        vote_count: 18200,
        budget: 70000000,
        revenue: 481840909,
        poster_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
      {
        id: 'raiders-of-the-lost-ark',
        title: 'Raiders of the Lost Ark',
        year: 1981,
        role: 'Director',
        vote_average: 8.5,
        vote_count: 15300,
        budget: 18000000,
        revenue: 389925971,
        poster_url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80',
        is_franchise: true,
      },
      {
        id: 'jaws',
        title: 'Jaws',
        year: 1975,
        role: 'Director',
        vote_average: 8.3,
        vote_count: 12000,
        budget: 9000000,
        revenue: 476512065,
        poster_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
        is_franchise: true,
      },
    ],
  },
  'hayao miyazaki': {
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
    bio: 'Legendary Studio Ghibli animator and storyteller renowned for breathtaking hand-drawn fantasy and ecological themes.',
    movies: [
      {
        id: 'spirited-away',
        title: 'Spirited Away',
        year: 2001,
        role: 'Director',
        vote_average: 8.9,
        vote_count: 16900,
        budget: 19000000,
        revenue: 395800000,
        poster_url: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
      {
        id: 'princess-mononoke',
        title: 'Princess Mononoke',
        year: 1997,
        role: 'Director',
        vote_average: 8.7,
        vote_count: 11200,
        budget: 23500000,
        revenue: 170000000,
        poster_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
      {
        id: 'howls-moving-castle',
        title: 'Howl’s Moving Castle',
        year: 2004,
        role: 'Director',
        vote_average: 8.5,
        vote_count: 12500,
        budget: 24000000,
        revenue: 236000000,
        poster_url: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
      {
        id: 'my-neighbor-totoro',
        title: 'My Neighbor Totoro',
        year: 1988,
        role: 'Director',
        vote_average: 8.4,
        vote_count: 8900,
        budget: 3700000,
        revenue: 45000000,
        poster_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
    ],
  },
  'bong joon-ho': {
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    bio: 'South Korean cinematic genius known for genre-defying class critiques, pitch-black humor, and meticulous framing.',
    movies: [
      {
        id: 'parasite',
        title: 'Parasite',
        year: 2019,
        role: 'Director',
        vote_average: 8.8,
        vote_count: 17800,
        budget: 11400000,
        revenue: 263100000,
        poster_url: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
      {
        id: 'memories-of-murder',
        title: 'Memories of Murder',
        year: 2003,
        role: 'Director',
        vote_average: 8.4,
        vote_count: 6500,
        budget: 2800000,
        revenue: 11000000,
        poster_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
      {
        id: 'snowpiercer',
        title: 'Snowpiercer',
        year: 2013,
        role: 'Director',
        vote_average: 7.8,
        vote_count: 11900,
        budget: 40000000,
        revenue: 86800000,
        poster_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
        is_franchise: true,
      },
      {
        id: 'the-host',
        title: 'The Host',
        year: 2006,
        role: 'Director',
        vote_average: 7.7,
        vote_count: 7300,
        budget: 11000000,
        revenue: 89400000,
        poster_url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80',
        is_franchise: false,
      },
    ],
  },
};

// Procedural cinema poster presets based on genre and index
const POSTER_PRESETS = [
  'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=600&q=80',
];

// Profile avatars for creators
const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80',
];

// Deterministic string hash
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Returns an avatar URL for any talent profile.
 */
export function getTalentAvatar(name: string): string {
  const clean = name.toLowerCase().trim();
  if (CURATED_FILMOGRAPHIES[clean]?.avatar) {
    return CURATED_FILMOGRAPHIES[clean].avatar;
  }
  const idx = hashString(clean) % AVATAR_PRESETS.length;
  return AVATAR_PRESETS[idx];
}

/**
 * Generates an empirical or procedurally synthesized filmography for any creator.
 */
export function getTalentFilmography(
  talent: { id: string; name: string; role: string; completion_rate: number; word_of_mouth_score: number; ip_strength: number; base_cost: number; vote_count?: number }
): TalentFilmography {
  const cleanName = talent.name.toLowerCase().trim();
  if (CURATED_FILMOGRAPHIES[cleanName]) {
    const cur = CURATED_FILMOGRAPHIES[cleanName];
    return {
      talent_name: talent.name,
      avatar_url: cur.avatar,
      bio: cur.bio,
      movies: cur.movies,
    };
  }

  // Deterministic procedural filmography based on their actual sabermetric metrics
  const h = hashString(cleanName + talent.role);
  const avatar = getTalentAvatar(talent.name);
  const years = [2022, 2019, 2016, 2012, 2008, 2004];
  const numProjects = Math.max(2, Math.min(6, Math.floor(talent.base_cost / 250000) + 2));

  // Generative movie titles matching tone
  const titleFragments = [
    ['Shadow', 'Signal', 'Horizon', 'Echo', 'Vanguard', 'Threshold', 'Requiem', 'Apex'],
    ['of Steel', 'Protocol', 'Legacy', 'Chronicles', 'Syndicate', 'in the Mist', 'Drift', 'Point'],
  ];

  const movies: MovieCredit[] = [];
  const baseAvg = Math.min(9.5, Math.max(5.0, talent.completion_rate * 10));
  const baseVotes = Math.max(150, talent.vote_count ?? 800);

  for (let i = 0; i < numProjects; i++) {
    const w1 = titleFragments[0][(h + i * 3) % titleFragments[0].length];
    const w2 = titleFragments[1][(h + i * 7) % titleFragments[1].length];
    const pTitle = `${w1} ${w2}`;
    const pYear = years[i % years.length] - Math.floor(i / years.length) * 4;
    const ratingVariance = ((h + i * 11) % 15 - 7) / 10;
    const voteAvg = Math.round(Math.min(9.6, Math.max(4.5, baseAvg + ratingVariance)) * 10) / 10;
    const votes = Math.round(baseVotes * (0.8 + ((h + i * 5) % 8) / 10));
    const budget = Math.round(talent.base_cost * (20 + (i % 3) * 15));
    const revenue = Math.round(budget * (1.2 + (voteAvg - 5.0) * 0.4));
    const poster = POSTER_PRESETS[(h + i) % POSTER_PRESETS.length];

    movies.push({
      id: `${talent.id}-movie-${i}`,
      title: pTitle,
      year: pYear,
      role: (talent.role as any) || 'Director',
      vote_average: voteAvg,
      vote_count: votes,
      budget,
      revenue,
      poster_url: poster,
      is_franchise: talent.ip_strength > 0.3 && i % 2 === 0,
    });
  }

  // Sort by year descending
  movies.sort((a, b) => b.year - a.year);

  return {
    talent_name: talent.name,
    avatar_url: avatar,
    bio: `${talent.role} with ${(talent.completion_rate * 100).toFixed(0)}% retention efficiency and ${talent.word_of_mouth_score.toFixed(1)}/10 audience exit velocity.`,
    movies,
  };
}
