import React from 'react';
import { Genre, SortOption } from '../types';
import { Filter, Users, Flame, Star, Clock, ArrowUpDown, Heart } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface CategoryFilterBarProps {
  selectedGenre: string;
  onSelectGenre: (genre: string) => void;
  selectedPlayerFilter: string;
  onSelectPlayerFilter: (mode: string) => void;
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
  totalResults: number;
  showFavoritesOnly: boolean;
  onToggleFavorites: () => void;
  favoritesCount: number;
}

const GENRES: Genre[] = [
  'All',
  '2-Player',
  'Action',
  'Arcade',
  'Puzzle',
  'Racing',
  'Retro',
  'Sci-Fi',
  'Shooter',
  'Sports'
];

export const CategoryFilterBar: React.FC<CategoryFilterBarProps> = ({
  selectedGenre,
  onSelectGenre,
  selectedPlayerFilter,
  onSelectPlayerFilter,
  sortOption,
  onSortChange,
  totalResults,
  showFavoritesOnly,
  onToggleFavorites,
  favoritesCount
}) => {
  return (
    <div className="bg-[#0b1120] border-y border-slate-800 py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-4">
        
        {/* Top Row: Genres Horizontal Slider */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {/* Favorites Filter Pill */}
          <button
            onClick={() => {
              soundManager.playClick();
              onToggleFavorites();
            }}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              showFavoritesOnly
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 scale-105'
                : 'bg-slate-900 text-slate-300 border border-slate-700 hover:border-rose-500/50 hover:text-rose-400'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${showFavoritesOnly ? 'fill-white' : ''}`} />
            <span>Favorites</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px]">
              {favoritesCount}
            </span>
          </button>

          <div className="h-5 w-[1px] bg-slate-800 flex-shrink-0" />

          {/* Genre Pills */}
          {GENRES.map((g) => {
            const isActive = selectedGenre === g && !showFavoritesOnly;
            return (
              <button
                key={g}
                onClick={() => {
                  soundManager.playClick();
                  if (showFavoritesOnly) onToggleFavorites();
                  onSelectGenre(g);
                }}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30 scale-105 font-black'
                    : 'bg-slate-900/90 text-slate-300 border border-slate-800 hover:border-cyan-500/50 hover:text-cyan-300'
                }`}
              >
                {g === '2-Player' ? '👥 2-Player' : g}
              </button>
            );
          })}
        </div>

        {/* Bottom Row: Player Mode Filter, Sort, Results Count */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800/80">
          
          {/* Player Mode Pills */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                soundManager.playClick();
                onSelectPlayerFilter('All');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedPlayerFilter === 'All'
                  ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Modes
            </button>
            <button
              onClick={() => {
                soundManager.playClick();
                onSelectPlayerFilter('1 Player');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedPlayerFilter === '1 Player'
                  ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              1 Player
            </button>
            <button
              onClick={() => {
                soundManager.playClick();
                onSelectPlayerFilter('2 Players');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedPlayerFilter === '2 Players'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'text-slate-400 hover:text-rose-400'
              }`}
            >
              👥 2 Players
            </button>
          </div>

          {/* Results count & Sort */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400 font-medium">
              Showing <strong className="text-cyan-400">{totalResults}</strong> Games
            </span>

            {/* Sort options */}
            <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
              <select
                value={sortOption}
                onChange={(e) => {
                  soundManager.playClick();
                  onSortChange(e.target.value as SortOption);
                }}
                className="bg-transparent text-slate-200 font-bold focus:outline-none cursor-pointer"
              >
                <option value="popular" className="bg-[#0b1120]">🔥 Most Popular</option>
                <option value="rating" className="bg-[#0b1120]">⭐ Top Rated</option>
                <option value="newest" className="bg-[#0b1120]">✨ Newest Games</option>
                <option value="title" className="bg-[#0b1120]">🔤 Title (A-Z)</option>
              </select>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
