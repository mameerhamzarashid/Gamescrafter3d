export type Genre = 
  | 'All' 
  | '3D WebGL'
  | '2-Player' 
  | 'Action' 
  | 'Adventure'
  | 'Arcade' 
  | 'Puzzle' 
  | 'Racing' 
  | 'Retro' 
  | 'Sci-Fi' 
  | 'Shooter'
  | 'Simulation'
  | 'Sports'
  | 'Strategy'
  | 'Casual';

export type PlayerMode = '1 Player' | '2 Players' | '1-2 Players';

export type GameDifficulty = 'Easy' | 'Casual' | 'Medium' | 'Hard' | 'Hardcore';

export type ScreenOrientation = 'portrait' | 'landscape' | 'any';

export interface Game {
  id: string;
  title: string;
  description: string;
  genre: Genre;
  playerMode: PlayerMode;
  isTwoPlayer: boolean;
  thumbnailUrl: string;
  plays: number;
  rating: number; // e.g. 4.9
  userRating?: number;
  tags: string[];
  isFeatured?: boolean;
  isNew?: boolean;
  isTrending?: boolean;
  is3D?: boolean;
  difficulty?: GameDifficulty;
  orientation?: ScreenOrientation;
  engineType: 
    | '3d-zombie-survival'
    | '3d-city-racing'
    | '3d-survival-island'
    | '3d-farming-simulator'
    | '3d-police-chase'
    | 'zombie-survival'
    | 'endless-runner'
    | 'top-down-racing'
    | 'space-shooter'
    | 'tower-defense'
    | 'match-3-puzzle'
    | 'basketball'
    | 'cricket'
    | 'fishing'
    | 'mining-idle'
    | 'memory-card'
    | 'ninja-action'
    | 'basketball-hoops'
    | 'cricket-championship'
    | 'deep-fishing'
    | 'mining-digger'
    | 'cyber-runner'
    | 'cyber-pong'
    | 'galactic-defender'
    | 'cyber-snake'
    | 'tank-duel'
    | 'neon-breakout'
    | 'memory-matrix'
    | 'tic-tac-toe'
    | 'tetris-blocks'
    | 'speed-racer'
    | 'arcade-matrix';
  controls: {
    p1: string;
    p2?: string;
    mobile?: string;
  };
}

export type SortOption = 'popular' | 'rating' | 'newest' | 'title';

export type ActiveTab = 'home' | 'library' | 'my-games' | 'achievements';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
  progress: number;
  maxProgress: number;
  badgeColor: string;
  category: 'play' | 'score' | 'mastery' | 'explore';
}

export interface PlayerStats {
  gamesPlayedCount: number;
  totalPlayTimeSeconds: number;
  highScores: Record<string, number>;
  recentGameIds: { gameId: string; timestamp: number }[];
  favoriteGameIds: string[];
  gameRatings: Record<string, number>;
  unlockedAchievementIds: string[];
}
