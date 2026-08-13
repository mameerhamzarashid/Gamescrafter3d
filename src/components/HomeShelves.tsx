import React from 'react';
import { Game, Genre } from '../types';
import { GameCard } from './GameCard';
import { AdBanner } from './AdBanner';
import { Flame, Star, Sparkles, Trophy, Smartphone, Swords, Car, Puzzle, Trophy as SportsIcon, Brain, Gem, ChevronRight, Users } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface HomeShelvesProps {
  games: Game[];
  onPlayGame: (game: Game) => void;
  onOpenGameDetail: (game: Game) => void;
  onSelectGenre: (genre: string) => void;
  favorites: string[];
  onToggleFavorite: (gameId: string) => void;
}

interface ShelfDefinition {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  filter: (game: Game) => boolean;
  genreTarget?: string;
  accentColor: string;
}

export const HomeShelves: React.FC<HomeShelvesProps> = ({
  games,
  onPlayGame,
  onOpenGameDetail,
  onSelectGenre,
  favorites,
  onToggleFavorite
}) => {
  const shelves: ShelfDefinition[] = [
    {
      id: '3d-games',
      title: 'Realistic 3D WebGL Games',
      subtitle: 'Immersive Three.js 3D physics, real-time lighting, shaders, and open-world survival',
      icon: <Sparkles className="w-5 h-5 text-purple-400 fill-purple-400" />,
      filter: (g) => !!g.is3D || g.tags.includes('3D WebGL'),
      accentColor: 'from-purple-500 to-indigo-500'
    },
    {
      id: 'trending',
      title: 'Trending Games',
      subtitle: 'Hot player favorites surging in the cyber arcade right now',
      icon: <Flame className="w-5 h-5 text-rose-500 fill-rose-500" />,
      filter: (g) => g.isTrending || g.plays > 170000,
      accentColor: 'from-rose-500 to-amber-500'
    },
    {
      id: 'most-played',
      title: 'Most Played',
      subtitle: 'All-time heavy hitters with over 150K+ player sessions',
      icon: <Star className="w-5 h-5 text-amber-400 fill-amber-400" />,
      filter: (g) => g.plays >= 160000,
      accentColor: 'from-amber-400 to-orange-500'
    },
    {
      id: 'new-games',
      title: 'New Releases',
      subtitle: 'Freshly launched HTML5 cyber games ready for instant play',
      icon: <Sparkles className="w-5 h-5 text-cyan-400" />,
      filter: (g) => !!g.isNew,
      accentColor: 'from-cyan-400 to-blue-500'
    },
    {
      id: 'top-rated',
      title: 'Top Rated',
      subtitle: 'Critically acclaimed titles rated 4.8 stars or higher',
      icon: <Trophy className="w-5 h-5 text-yellow-400" />,
      filter: (g) => g.rating >= 4.85,
      accentColor: 'from-yellow-400 to-amber-500'
    },
    {
      id: 'mobile-games',
      title: 'Mobile & Touch Games',
      subtitle: 'Ultra responsive games with dedicated on-screen touch gestures',
      icon: <Smartphone className="w-5 h-5 text-emerald-400" />,
      filter: (g) => g.orientation !== 'landscape' || g.difficulty === 'Casual' || g.tags.includes('Casual'),
      accentColor: 'from-emerald-400 to-teal-500'
    },
    {
      id: 'two-player',
      title: '2-Player Arena',
      subtitle: 'Compete head-to-head with friends on the same device screen',
      icon: <Users className="w-5 h-5 text-pink-500" />,
      filter: (g) => g.isTwoPlayer,
      genreTarget: '2-Player',
      accentColor: 'from-pink-500 to-rose-600'
    },
    {
      id: 'action-shelf',
      title: 'Action & Shooters',
      subtitle: 'Adrenaline-pumping parkour runners and orbital space fighters',
      icon: <Swords className="w-5 h-5 text-red-400" />,
      filter: (g) => g.genre === 'Action' || g.genre === 'Shooter',
      genreTarget: 'Action',
      accentColor: 'from-red-500 to-pink-500'
    },
    {
      id: 'racing-shelf',
      title: 'Racing & Speed',
      subtitle: 'High speed drift racers, neon highways, and moto challenges',
      icon: <Car className="w-5 h-5 text-sky-400" />,
      filter: (g) => g.genre === 'Racing',
      genreTarget: 'Racing',
      accentColor: 'from-sky-400 to-indigo-500'
    },
    {
      id: 'puzzle-shelf',
      title: 'Puzzle & Brain',
      subtitle: 'Sharpen your logic with quantum blocks, sudoku, and lasers',
      icon: <Puzzle className="w-5 h-5 text-purple-400" />,
      filter: (g) => g.genre === 'Puzzle',
      genreTarget: 'Puzzle',
      accentColor: 'from-purple-400 to-violet-600'
    },
    {
      id: 'sports-shelf',
      title: 'Sports & Competition',
      subtitle: 'Air hockey, hyper boxing, bowling, and precision physics',
      icon: <SportsIcon className="w-5 h-5 text-lime-400" />,
      filter: (g) => g.genre === 'Sports',
      genreTarget: 'Sports',
      accentColor: 'from-lime-400 to-emerald-500'
    },
    {
      id: 'strategy-shelf',
      title: 'Strategy & Tactics',
      subtitle: 'Laser chess, tic-tac-toe arenas, and tactical combat',
      icon: <Brain className="w-5 h-5 text-indigo-400" />,
      filter: (g) => g.genre === 'Strategy',
      genreTarget: 'Strategy',
      accentColor: 'from-indigo-400 to-purple-500'
    },
    {
      id: 'casual-shelf',
      title: 'Casual & Quick Hits',
      subtitle: 'Relaxing, bite-sized mini games perfect for mobile breaks',
      icon: <Gem className="w-5 h-5 text-teal-400" />,
      filter: (g) => g.genre === 'Casual' || g.difficulty === 'Casual',
      genreTarget: 'Casual',
      accentColor: 'from-teal-400 to-cyan-500'
    }
  ];

  return (
    <div className="space-y-12 pb-8">
      {shelves.map((shelf) => {
        const matchingGames = games.filter(shelf.filter).slice(0, 8);
        if (matchingGames.length === 0) return null;

        return (
          <section key={shelf.id} className="space-y-4">
            {/* Shelf Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-md">
                  {shelf.icon}
                </div>
                <div>
                  <h3 className="font-orbitron text-lg sm:text-xl font-bold text-white tracking-wide flex items-center gap-2">
                    <span>{shelf.title}</span>
                    <span className="text-xs text-slate-400 font-mono font-normal hidden sm:inline">
                      ({matchingGames.length})
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 hidden sm:block">
                    {shelf.subtitle}
                  </p>
                </div>
              </div>

              {/* View All button */}
              <button
                onClick={() => {
                  soundManager.playClick();
                  if (shelf.genreTarget) {
                    onSelectGenre(shelf.genreTarget);
                  } else {
                    onSelectGenre('All');
                  }
                }}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 group px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition-all cursor-pointer"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Games Card Shelf Grid (Mobile horizontal swipe scrollable, Desktop responsive grid) */}
            <div className="flex sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-x-auto pb-4 sm:pb-0 scrollbar-none snap-x snap-mandatory">
              {matchingGames.map((game) => (
                <div key={game.id} className="w-64 sm:w-auto flex-shrink-0 snap-start">
                  <GameCard
                    game={game}
                    onPlay={onPlayGame}
                    onOpenDetail={onOpenGameDetail}
                    isFavorite={favorites.includes(game.id)}
                    onToggleFavorite={onToggleFavorite}
                  />
                </div>
              ))}
            </div>

            {/* Non-intrusive AdSense ready slot */}
            {shelf.id === 'new-games' && (
              <div className="pt-4">
                <AdBanner format="leaderboard" />
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};
