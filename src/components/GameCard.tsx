import React from 'react';
import { Game } from '../types';
import { Play, Star, Heart, Users, Flame, Sparkles, Smartphone, ChevronRight } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface GameCardProps {
  game: Game;
  onPlay: (game: Game) => void;
  onOpenDetail?: (game: Game) => void;
  isFavorite: boolean;
  onToggleFavorite: (gameId: string) => void;
  dense?: boolean;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  onPlay,
  onOpenDetail,
  isFavorite,
  onToggleFavorite,
  dense = false
}) => {
  const handleCardClick = () => {
    soundManager.playClick();
    if (onOpenDetail) {
      onOpenDetail(game);
    } else {
      onPlay(game);
    }
  };

  return (
    <div 
      onClick={handleCardClick}
      className={`group relative rounded-2xl bg-[#0b1120] border border-slate-800/90 hover:border-cyan-400/80 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-lg hover:shadow-cyan-500/15 hover:-translate-y-1 cursor-pointer active:scale-[0.98] ${
        dense ? 'text-sm' : ''
      }`}
    >
      
      {/* Top Cover Section */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
        <img
          src={game.thumbnailUrl}
          alt={game.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1120] via-transparent to-black/40 opacity-90 group-hover:opacity-60 transition-opacity" />

        {/* Favorite Bookmark Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            soundManager.playClick();
            onToggleFavorite(game.id);
          }}
          className={`absolute top-2.5 right-2.5 p-2 rounded-xl backdrop-blur-md transition-all z-10 ${
            isFavorite
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40 scale-105'
              : 'bg-black/40 text-slate-300 hover:text-rose-400 hover:bg-black/60'
          }`}
          title={isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-white' : ''}`} />
        </button>

        {/* Top-Left Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap max-w-[75%]">
          {game.is3D && (
            <span className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md shadow-purple-500/30 border border-purple-300/40">
              <Sparkles className="w-3 h-3" /> 3D WEBGL
            </span>
          )}

          {game.isTwoPlayer ? (
            <span className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-rose-500 to-pink-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md shadow-rose-500/20">
              <Users className="w-3 h-3" /> 2P
            </span>
          ) : !game.is3D ? (
            <span className="px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider font-mono">
              1P
            </span>
          ) : null}

          {game.isNew && (
            <span className="px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[9px] font-black uppercase tracking-wider">
              NEW
            </span>
          )}

          {game.isTrending && !game.isNew && (
            <span className="px-1.5 py-0.5 rounded-md bg-rose-500/90 text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-0.5">
              <Flame className="w-2.5 h-2.5 fill-current" /> HOT
            </span>
          )}
        </div>

        {/* Hover Instant Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-xs">
          <button
            onClick={(e) => {
              e.stopPropagation();
              soundManager.playLaser();
              onPlay(game);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-orbitron font-bold text-xs text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-300 hover:scale-105 transition-transform shadow-xl shadow-cyan-400/30 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>PLAY NOW</span>
          </button>
        </div>
      </div>

      {/* Details Body */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-bold tracking-wider uppercase text-cyan-400 font-mono">
              {game.genre}
            </span>
            <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span>{game.rating}</span>
            </div>
          </div>

          <h3 className="font-orbitron font-bold text-slate-100 text-sm sm:text-base group-hover:text-cyan-300 transition-colors line-clamp-1">
            {game.title}
          </h3>

          <p className="text-xs text-slate-400 line-clamp-2 mt-1">
            {game.description}
          </p>
        </div>

        {/* Footer info & Play Action */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
            <span>{(game.plays / 1000).toFixed(1)}k plays</span>
            {game.difficulty && (
              <>
                <span>•</span>
                <span className={`text-[10px] ${
                  game.difficulty === 'Casual' ? 'text-emerald-400' :
                  game.difficulty === 'Medium' ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {game.difficulty}
                </span>
              </>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              soundManager.playLaser();
              onPlay(game);
            }}
            className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center gap-1 transition-all"
          >
            Play <Play className="w-3 h-3 fill-current" />
          </button>
        </div>
      </div>

    </div>
  );
};
