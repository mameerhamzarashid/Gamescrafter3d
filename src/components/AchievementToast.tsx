import React, { useEffect, useState } from 'react';
import { Achievement } from '../types';
import { onAchievementUnlocked } from '../utils/playerStorage';
import { Sparkles, Trophy, X } from 'lucide-react';

export const AchievementToast: React.FC = () => {
  const [currentToast, setCurrentToast] = useState<Achievement | null>(null);

  useEffect(() => {
    const unsubscribe = onAchievementUnlocked((achievement) => {
      setCurrentToast(achievement);
      const timer = setTimeout(() => {
        setCurrentToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    });
    return unsubscribe;
  }, []);

  if (!currentToast) return null;

  return (
    <div className="fixed top-20 right-4 sm:right-6 z-50 animate-bounce max-w-sm w-[calc(100vw-2rem)] sm:w-auto">
      <div className="relative p-4 rounded-2xl bg-[#0b1120]/95 backdrop-blur-xl border border-cyan-400/80 shadow-2xl shadow-cyan-500/30 flex items-center gap-3">
        {/* Glow corner */}
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-ping" />

        {/* Icon */}
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${currentToast.badgeColor} flex items-center justify-center text-2xl shadow-lg flex-shrink-0`}>
          {currentToast.icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-1.5 text-cyan-400 text-[11px] font-orbitron font-bold tracking-wider uppercase">
            <Trophy className="w-3.5 h-3.5" />
            <span>Achievement Unlocked!</span>
          </div>
          <h4 className="text-sm font-bold text-white truncate font-orbitron mt-0.5">
            {currentToast.title}
          </h4>
          <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
            {currentToast.description}
          </p>
        </div>

        {/* Close */}
        <button
          onClick={() => setCurrentToast(null)}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
