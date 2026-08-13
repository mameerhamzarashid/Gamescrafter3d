import React, { useState } from 'react';
import { Gamepad2, Search, Heart, Volume2, VolumeX, Music, Maximize2, Sparkles, Menu, X, Users, Flame, Trophy, Dices, Download } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { ActiveTab } from '../types';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  favoritesCount: number;
  unlockedAchievementsCount: number;
  onTriggerSurprise: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isMusicMuted: boolean;
  onToggleMusic: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  favoritesCount,
  unlockedAchievementsCount,
  onTriggerSurprise,
  isMuted,
  onToggleMute,
  isMusicMuted,
  onToggleMusic
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleFullscreen = () => {
    soundManager.playClick();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0b1120]/95 backdrop-blur-md border-b border-cyan-500/20 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          
          {/* Logo & Brand */}
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => { 
              onTabChange('home'); 
              soundManager.playClick(); 
            }}
          >
            <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/30 group-hover:scale-105 transition-transform duration-300">
              <div className="w-full h-full bg-[#0b1120] rounded-[14px] flex items-center justify-center">
                <Gamepad2 className="w-6 h-6 text-cyan-400 group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-orbitron text-xl sm:text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400">
                  GAMESCRAFTER
                </span>
                <span className="bg-cyan-500/15 text-cyan-300 text-[10px] font-black tracking-widest px-2 py-0.5 rounded-md border border-cyan-500/30 font-mono">
                  STORE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                30+ Instant HTML5 Cyber Games
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => {
                soundManager.playClick();
                onTabChange('home');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'home'
                  ? 'bg-cyan-400 text-slate-950 font-black shadow-md shadow-cyan-400/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Home
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                onTabChange('library');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'library'
                  ? 'bg-cyan-400 text-slate-950 font-black shadow-md shadow-cyan-400/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              All Games
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                onTabChange('my-games');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'my-games'
                  ? 'bg-rose-500 text-white font-black shadow-md shadow-rose-500/20'
                  : 'text-slate-300 hover:text-rose-400 hover:bg-slate-800'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${activeTab === 'my-games' ? 'fill-current' : ''}`} />
              <span>My Games</span>
              {favoritesCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px]">
                  {favoritesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                onTabChange('achievements');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'achievements'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/20'
                  : 'text-slate-300 hover:text-amber-400 hover:bg-slate-800'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Badges</span>
              {unlockedAchievementsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px]">
                  {unlockedAchievementsCount}
                </span>
              )}
            </button>

            {/* Surprise Button */}
            <button
              onClick={() => {
                soundManager.playLaser();
                onTriggerSurprise();
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-indigo-600 text-white hover:brightness-110 shadow-md shadow-cyan-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Dices className="w-4 h-4 animate-spin" />
              <span>Surprise Me</span>
            </button>
          </nav>

          {/* Utilities & Controls */}
          <div className="flex items-center gap-2">
            
            {/* Sound SFX Toggle */}
            <button
              onClick={onToggleMute}
              className={`p-2.5 rounded-xl border transition-all flex items-center justify-center ${
                isMuted
                  ? 'bg-slate-800/60 text-slate-500 border-slate-700'
                  : 'bg-[#0b1120] text-cyan-400 border-cyan-500/40 hover:border-cyan-400 shadow-md shadow-cyan-400/10'
              }`}
              title={isMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {/* Music BGM Toggle */}
            <button
              onClick={onToggleMusic}
              className={`p-2.5 rounded-xl border transition-all flex items-center justify-center ${
                isMusicMuted
                  ? 'bg-slate-800/60 text-slate-500 border-slate-700'
                  : 'bg-[#0b1120] text-indigo-400 border-indigo-500/40 hover:border-indigo-400 shadow-md shadow-indigo-400/10'
              }`}
              title={isMusicMuted ? 'Play Cyber Background Music' : 'Mute Cyber Background Music'}
            >
              <Music className="w-5 h-5" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="hidden sm:flex p-2.5 rounded-xl bg-[#0b1120] text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white transition-all items-center justify-center"
              title="Fullscreen Mode"
            >
              <Maximize2 className="w-5 h-5" />
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2.5 rounded-xl bg-[#0b1120] text-slate-300 border border-slate-700 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>

        {/* Mobile Quick Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-slate-800 space-y-3 animate-fade-in">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  onTabChange('library');
                }}
                placeholder="Search 30+ games, genres, tags..."
                className="w-full pl-10 pr-10 py-2.5 bg-[#0b1120] border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  onTabChange('home');
                  setMobileMenuOpen(false);
                }}
                className="py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-white text-center"
              >
                Home
              </button>

              <button
                onClick={() => {
                  onTabChange('library');
                  setMobileMenuOpen(false);
                }}
                className="py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-cyan-400 text-center"
              >
                Games Library
              </button>

              <button
                onClick={() => {
                  onTabChange('my-games');
                  setMobileMenuOpen(false);
                }}
                className="py-2.5 px-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-bold text-rose-400 text-center flex items-center justify-center gap-1"
              >
                <Heart className="w-3.5 h-3.5 fill-current" />
                <span>My Games ({favoritesCount})</span>
              </button>

              <button
                onClick={() => {
                  onTabChange('achievements');
                  setMobileMenuOpen(false);
                }}
                className="py-2.5 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-400 text-center flex items-center justify-center gap-1"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Achievements</span>
              </button>
            </div>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onTriggerSurprise();
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-orbitron font-bold text-xs flex items-center justify-center gap-2 shadow-lg"
            >
              <Dices className="w-4 h-4" />
              <span>Surprise Me With a Random Game</span>
            </button>
          </div>
        )}

      </div>
    </header>
  );
};
