import React, { useState, useMemo } from 'react';
import { Game, Genre, SortOption } from '../types';
import { GameCard } from './GameCard';
import { AdBanner } from './AdBanner';
import { Search, Filter, Users, ArrowUpDown, LayoutGrid, List, X, Sparkles, Gamepad2, Heart, Flame, Star, Trophy, Clock } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface GameLibraryViewProps {
  games: Game[];
  selectedGenre: string;
  onSelectGenre: (genre: string) => void;
  onPlayGame: (game: Game) => void;
  onOpenGameDetail: (game: Game) => void;
  favorites: string[];
  onToggleFavorite: (gameId: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

type DiscoveryTag = 'all' | 'trending' | 'most-played' | 'new' | 'top-rated' | 'favorites';

const CATEGORIES: Genre[] = [
  'All',
  '3D WebGL',
  '2-Player',
  'Action',
  'Adventure',
  'Arcade',
  'Puzzle',
  'Racing',
  'Retro',
  'Sci-Fi',
  'Shooter',
  'Simulation',
  'Sports',
  'Strategy',
  'Casual'
];

export const GameLibraryView: React.FC<GameLibraryViewProps> = ({
  games,
  selectedGenre,
  onSelectGenre,
  onPlayGame,
  onOpenGameDetail,
  favorites,
  onToggleFavorite,
  searchQuery,
  onSearchChange
}) => {
  const [selectedPlayerMode, setSelectedPlayerMode] = useState<string>('All');
  const [discoveryFilter, setDiscoveryFilter] = useState<DiscoveryTag>('all');
  const [sortOption, setSortOption] = useState<SortOption>('popular');
  const [viewMode, setViewMode] = useState<'grid' | 'dense'>('grid');

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = game.title.toLowerCase().includes(q);
        const matchesGenre = game.genre.toLowerCase().includes(q);
        const matchesTags = game.tags.some((t) => t.toLowerCase().includes(q));
        const matchesDesc = game.description.toLowerCase().includes(q);
        if (!matchesTitle && !matchesGenre && !matchesTags && !matchesDesc) return false;
      }

      // Discovery Filter
      if (discoveryFilter === 'trending' && !(game.isTrending || game.plays > 170000)) return false;
      if (discoveryFilter === 'most-played' && game.plays < 160000) return false;
      if (discoveryFilter === 'new' && !game.isNew) return false;
      if (discoveryFilter === 'top-rated' && game.rating < 4.85) return false;
      if (discoveryFilter === 'favorites' && !favorites.includes(game.id)) return false;

      // Genre
      if (selectedGenre !== 'All') {
        if (selectedGenre === '2-Player') {
          if (!game.isTwoPlayer) return false;
        } else if (selectedGenre === '3D WebGL') {
          if (!game.is3D && !game.tags.includes('3D WebGL')) return false;
        } else if (game.genre !== selectedGenre) {
          return false;
        }
      }

      // Player Mode
      if (selectedPlayerMode === '1 Player' && game.isTwoPlayer) return false;
      if (selectedPlayerMode === '2 Players' && !game.isTwoPlayer) return false;

      return true;
    }).sort((a, b) => {
      if (sortOption === 'popular') return b.plays - a.plays;
      if (sortOption === 'rating') return b.rating - a.rating;
      if (sortOption === 'newest') return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
      if (sortOption === 'title') return a.title.localeCompare(b.title);
      return 0;
    });
  }, [games, searchQuery, selectedGenre, selectedPlayerMode, discoveryFilter, favorites, sortOption]);

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-20">
      
      {/* Library Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="font-orbitron text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
            <Gamepad2 className="w-7 h-7 text-cyan-400" />
            <span>Games Library</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Browse and filter through our full catalogue of 30+ instant HTML5 cyber games.
          </p>
        </div>

        {/* Large Search Bar */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search games, genres, tags..."
            className="w-full pl-10 pr-10 py-2.5 bg-[#0b1120] border border-slate-700/90 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Discovery Quick Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => {
            soundManager.playClick();
            setDiscoveryFilter('all');
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 ${
            discoveryFilter === 'all'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          <span>All Games</span>
        </button>

        <button
          onClick={() => {
            soundManager.playClick();
            setDiscoveryFilter(discoveryFilter === 'trending' ? 'all' : 'trending');
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 ${
            discoveryFilter === 'trending'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-rose-400'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          <span>Trending</span>
        </button>

        <button
          onClick={() => {
            soundManager.playClick();
            setDiscoveryFilter(discoveryFilter === 'most-played' ? 'all' : 'most-played');
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 ${
            discoveryFilter === 'most-played'
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-400'
          }`}
        >
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>Most Played</span>
        </button>

        <button
          onClick={() => {
            soundManager.playClick();
            setDiscoveryFilter(discoveryFilter === 'new' ? 'all' : 'new');
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 ${
            discoveryFilter === 'new'
              ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-blue-400'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>New Releases</span>
        </button>

        <button
          onClick={() => {
            soundManager.playClick();
            setDiscoveryFilter(discoveryFilter === 'top-rated' ? 'all' : 'top-rated');
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 ${
            discoveryFilter === 'top-rated'
              ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/20'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-yellow-400'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 text-yellow-400" />
          <span>Top Rated</span>
        </button>

        <button
          onClick={() => {
            soundManager.playClick();
            setDiscoveryFilter(discoveryFilter === 'favorites' ? 'all' : 'favorites');
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 ${
            discoveryFilter === 'favorites'
              ? 'bg-pink-500 text-white shadow-md shadow-pink-500/20'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-pink-400'
          }`}
        >
          <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400" />
          <span>Favorites ({favorites.length})</span>
        </button>
      </div>

      {/* Category Pills Bar (Horizontal swipeable on mobile) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const isActive = selectedGenre === cat;
          return (
            <button
              key={cat}
              onClick={() => {
                soundManager.playClick();
                onSelectGenre(cat);
              }}
              className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-400/30 scale-105 font-black'
                  : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-cyan-400/40 hover:text-cyan-300'
              }`}
            >
              {cat === '2-Player' ? '👥 2-Player' : cat}
            </button>
          );
        })}
      </div>

      {/* Filter Options & Sort Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-2xl bg-[#0b1120] border border-slate-800/90">
        
        {/* Mode Selector */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => {
              soundManager.playClick();
              setSelectedPlayerMode('All');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedPlayerMode === 'All'
                ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Modes
          </button>
          <button
            onClick={() => {
              soundManager.playClick();
              setSelectedPlayerMode('1 Player');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedPlayerMode === '1 Player'
                ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            1 Player
          </button>
          <button
            onClick={() => {
              soundManager.playClick();
              setSelectedPlayerMode('2 Players');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedPlayerMode === '2 Players'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'text-slate-400 hover:text-rose-400'
            }`}
          >
            2 Players
          </button>
        </div>

        {/* Sorting and View Toggle */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            <strong className="text-cyan-400">{filteredGames.length}</strong> games
          </span>

          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={sortOption}
              onChange={(e) => {
                soundManager.playClick();
                setSortOption(e.target.value as SortOption);
              }}
              className="bg-transparent text-slate-200 font-bold focus:outline-none cursor-pointer"
            >
              <option value="popular" className="bg-[#0b1120]">🔥 Most Popular</option>
              <option value="rating" className="bg-[#0b1120]">⭐ Top Rated</option>
              <option value="newest" className="bg-[#0b1120]">✨ Newest</option>
              <option value="title" className="bg-[#0b1120]">🔤 Title (A-Z)</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="hidden sm:flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-white'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('dense')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'dense' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-white'
              }`}
              title="Compact View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Games Catalogue Grid */}
      {filteredGames.length > 0 ? (
        <div className={`grid gap-4 sm:gap-6 ${
          viewMode === 'grid'
            ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        }`}>
          {filteredGames.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              onPlay={onPlayGame}
              onOpenDetail={onOpenGameDetail}
              isFavorite={favorites.includes(game.id)}
              onToggleFavorite={onToggleFavorite}
              dense={viewMode === 'dense'}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="py-20 text-center bg-[#0b1120] rounded-3xl border border-slate-800 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
            <Search className="w-8 h-8 text-cyan-400" />
          </div>
          <h3 className="font-orbitron font-bold text-lg text-white">No matching games found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your search query or reset the genre filters to browse all games.
          </p>
          <button
            onClick={() => {
              soundManager.playClick();
              onSearchChange('');
              onSelectGenre('All');
              setSelectedPlayerMode('All');
            }}
            className="px-6 py-2.5 rounded-xl font-bold text-xs bg-cyan-400 text-slate-950 hover:bg-cyan-300 transition-all cursor-pointer shadow-lg shadow-cyan-400/20"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Non-intrusive AdSense Slot */}
      {filteredGames.length > 0 && (
        <div className="pt-4">
          <AdBanner format="responsive" />
        </div>
      )}

    </div>
  );
};
