import React from 'react';
import { ActiveTab } from '../types';
import { Home, Gamepad2, Sparkles, Heart, Trophy, Dices } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  favoritesCount: number;
  unlockedAchievementsCount: number;
  onTriggerSurprise: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  favoritesCount,
  unlockedAchievementsCount,
  onTriggerSurprise
}) => {
  return (
    <nav 
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0b1120]/95 backdrop-blur-xl border-t border-slate-800/90 pb-[env(safe-area-inset-bottom)] shadow-2xl"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {/* Home */}
        <button
          onClick={() => {
            soundManager.playClick();
            onTabChange('home');
          }}
          className={`flex-1 flex flex-col items-center justify-center h-full py-1 transition-all relative ${
            activeTab === 'home' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {activeTab === 'home' && (
            <span className="absolute top-0 w-8 h-1 bg-cyan-400 rounded-b-full shadow-lg shadow-cyan-400/50" />
          )}
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-bold tracking-tight">Home</span>
        </button>

        {/* Library */}
        <button
          onClick={() => {
            soundManager.playClick();
            onTabChange('library');
          }}
          className={`flex-1 flex flex-col items-center justify-center h-full py-1 transition-all relative ${
            activeTab === 'library' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {activeTab === 'library' && (
            <span className="absolute top-0 w-8 h-1 bg-cyan-400 rounded-b-full shadow-lg shadow-cyan-400/50" />
          )}
          <Gamepad2 className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-bold tracking-tight">Library</span>
        </button>

        {/* Surprise Me (Prominent Center Button) */}
        <button
          onClick={() => {
            soundManager.playLaser();
            onTriggerSurprise();
          }}
          className="flex-1 flex flex-col items-center justify-center h-full py-1 group"
        >
          <div className="w-11 h-11 -mt-4 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/30 group-active:scale-95 transition-transform">
            <div className="w-full h-full bg-[#0b1120] rounded-[14px] flex items-center justify-center text-cyan-400 group-hover:text-white">
              <Dices className="w-6 h-6 animate-pulse" />
            </div>
          </div>
          <span className="text-[9px] font-orbitron font-bold text-cyan-300 mt-1 uppercase">Surprise</span>
        </button>

        {/* My Games */}
        <button
          onClick={() => {
            soundManager.playClick();
            onTabChange('my-games');
          }}
          className={`flex-1 flex flex-col items-center justify-center h-full py-1 transition-all relative ${
            activeTab === 'my-games' ? 'text-rose-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {activeTab === 'my-games' && (
            <span className="absolute top-0 w-8 h-1 bg-rose-500 rounded-b-full shadow-lg shadow-rose-500/50" />
          )}
          <div className="relative">
            <Heart className={`w-5 h-5 mb-0.5 ${activeTab === 'my-games' ? 'fill-rose-500' : ''}`} />
            {favoritesCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md">
                {favoritesCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold tracking-tight">My Games</span>
        </button>

        {/* Achievements */}
        <button
          onClick={() => {
            soundManager.playClick();
            onTabChange('achievements');
          }}
          className={`flex-1 flex flex-col items-center justify-center h-full py-1 transition-all relative ${
            activeTab === 'achievements' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {activeTab === 'achievements' && (
            <span className="absolute top-0 w-8 h-1 bg-amber-400 rounded-b-full shadow-lg shadow-amber-400/50" />
          )}
          <div className="relative">
            <Trophy className="w-5 h-5 mb-0.5" />
            {unlockedAchievementsCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-amber-500 text-slate-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md">
                {unlockedAchievementsCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold tracking-tight">Badges</span>
        </button>
      </div>
    </nav>
  );
};
