import React, { useEffect, useState } from 'react';
import { Game } from '../types';
import { GAMES } from '../data/games';
import { Dices, Play, RotateCcw, X, Star, Users, Flame, Info } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { updateAchievementProgress } from '../utils/playerStorage';

interface SurpriseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayGame: (game: Game) => void;
  onOpenGameDetail: (game: Game) => void;
}

export const SurpriseModal: React.FC<SurpriseModalProps> = ({
  isOpen,
  onClose,
  onPlayGame,
  onOpenGameDetail
}) => {
  const [selectedGame, setSelectedGame] = useState<Game>(GAMES[0]);
  const [isRolling, setIsRolling] = useState<boolean>(true);

  const rollGame = () => {
    setIsRolling(true);
    soundManager.playLaser();
    updateAchievementProgress('surprise-me', 1, true);

    let count = 0;
    const maxRolls = 15;
    const interval = setInterval(() => {
      count++;
      const randomIndex = Math.floor(Math.random() * GAMES.length);
      setSelectedGame(GAMES[randomIndex]);
      soundManager.playClick();

      if (count >= maxRolls) {
        clearInterval(interval);
        setIsRolling(false);
        soundManager.playScore();
      }
    }, 90);
  };

  useEffect(() => {
    if (isOpen) {
      rollGame();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#0b1120] border border-cyan-500/40 rounded-3xl overflow-hidden shadow-2xl shadow-cyan-500/20 p-6 space-y-6">
        
        {/* Background cyber glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <Dices className={`w-5 h-5 ${isRolling ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 className="font-orbitron font-bold text-lg text-white">Surprise Game</h3>
              <p className="text-xs text-cyan-400 font-mono">Random Matchmaker</p>
            </div>
          </div>

          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Game Card Showcase */}
        <div className={`relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 transition-all duration-300 ${
          isRolling ? 'scale-95 opacity-80' : 'scale-100 opacity-100 shadow-xl border-cyan-400/60'
        }`}>
          <div className="aspect-video w-full relative overflow-hidden bg-slate-950">
            <img
              src={selectedGame.thumbnailUrl}
              alt={selectedGame.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
            
            <div className="absolute top-3 left-3 flex gap-1.5">
              <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold uppercase font-mono">
                {selectedGame.genre}
              </span>
              {selectedGame.isTwoPlayer && (
                <span className="px-2.5 py-1 rounded-lg bg-rose-500/80 text-white text-[10px] font-black uppercase flex items-center gap-1">
                  <Users className="w-3 h-3" /> 2P
                </span>
              )}
            </div>

            <div className="absolute bottom-3 left-3 right-3">
              <h4 className="font-orbitron font-black text-xl text-white drop-shadow-md">
                {selectedGame.title}
              </h4>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
              <div className="flex items-center gap-1 text-amber-400 font-bold">
                <Star className="w-4 h-4 fill-amber-400" />
                <span>{selectedGame.rating}</span>
                <span className="text-slate-500">/ 5.0</span>
              </div>
              <span className="text-slate-400 font-mono">
                {(selectedGame.plays / 1000).toFixed(1)}k players
              </span>
            </div>

            <p className="text-xs text-slate-400 line-clamp-2">
              {selectedGame.description}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            disabled={isRolling}
            onClick={() => {
              soundManager.playClick();
              onPlayGame(selectedGame);
              onClose();
            }}
            className="w-full py-3.5 rounded-xl font-orbitron font-bold text-sm bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 text-slate-950 hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-400/30 cursor-pointer disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>PLAY THIS GAME NOW</span>
          </button>

          <div className="flex gap-2">
            <button
              disabled={isRolling}
              onClick={rollGame}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-500 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRolling ? 'animate-spin' : ''}`} />
              <span>Roll Again</span>
            </button>

            <button
              disabled={isRolling}
              onClick={() => {
                soundManager.playClick();
                onOpenGameDetail(selectedGame);
                onClose();
              }}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-800 text-cyan-400 border border-cyan-500/30 hover:border-cyan-400 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Game Page</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
