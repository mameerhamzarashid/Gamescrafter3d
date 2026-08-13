import React from 'react';
import { Game } from '../types';
import { Play, Flame, Users, Sparkles, ShieldCheck, Zap, Star } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface HeroSectionProps {
  featuredGame: Game;
  onPlayGame: (game: Game) => void;
  onExploreClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  featuredGame,
  onPlayGame,
  onExploreClick
}) => {
  return (
    <div className="relative overflow-hidden bg-[#090d16] border-b border-cyan-500/10 py-12 lg:py-16 bg-cyber-grid">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Hero Copy */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold tracking-wide uppercase shadow-lg shadow-cyan-500/10">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span>Next-Gen Online Cyber Gaming Portal</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-orbitron text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight">
              PLAY <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-500 glow-text-cyan">30+ INSTANT</span> BROWSER GAMES
            </h1>

            {/* Subtext */}
            <p className="text-slate-300 text-base sm:text-lg max-w-2xl leading-relaxed">
              Zero downloads. Zero installs. Experience high-octane 1-Player & 2-Player HTML5 games directly in your browser with responsive controls, crisp sound effects, and zero lag.
            </p>

            {/* CTA Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => {
                  soundManager.playClick();
                  onPlayGame(featuredGame);
                }}
                className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-xl font-orbitron font-bold text-slate-950 bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-400 hover:from-cyan-300 hover:to-sky-200 transition-all duration-300 shadow-xl shadow-cyan-500/25 hover:scale-[1.02] cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current transition-transform group-hover:scale-110" />
                <span>PLAY FEATURED NOW</span>
              </button>

              <button
                onClick={() => {
                  soundManager.playClick();
                  onExploreClick();
                }}
                className="px-6 py-4 rounded-xl font-orbitron font-bold text-cyan-300 bg-[#0b1120] border border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-500/10 transition-all duration-300 shadow-lg"
              >
                EXPLORE CATALOG
              </button>
            </div>

            {/* High-Converting Feature Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">0 Downloads</div>
                  <div className="text-[11px] text-slate-400">Instant Load</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">1P & 2P Modes</div>
                  <div className="text-[11px] text-slate-400">Local VS & AI</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">30+ Games</div>
                  <div className="text-[11px] text-slate-400">Arcade & Retro</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">100% Free</div>
                  <div className="text-[11px] text-slate-400">Unrestricted</div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Featured Card Preview */}
          <div className="lg:col-span-5">
            <div className="relative group rounded-2xl bg-slate-900/90 border border-cyan-500/30 p-4 shadow-2xl shadow-cyan-500/10 overflow-hidden hover:border-cyan-400 transition-all duration-300">
              {/* Featured Ribbon */}
              <div className="absolute top-6 left-6 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-black text-xs font-black tracking-wider uppercase shadow-md">
                <Flame className="w-3.5 h-3.5 fill-current" />
                <span>Featured Game</span>
              </div>

              {/* Cover Image Container */}
              <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950">
                <img
                  src={featuredGame.thumbnailUrl}
                  alt={featuredGame.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b1120] via-transparent to-black/30" />
                
                {/* Overlay Play Button */}
                <button
                  onClick={() => {
                    soundManager.playClick();
                    onPlayGame(featuredGame);
                  }}
                  className="absolute inset-0 flex items-center justify-center group-hover:bg-cyan-950/40 transition-colors"
                >
                  <div className="w-16 h-16 rounded-full bg-cyan-400/90 text-slate-950 flex items-center justify-center shadow-2xl shadow-cyan-400/50 group-hover:scale-110 transition-transform">
                    <Play className="w-8 h-8 fill-current ml-1" />
                  </div>
                </button>
              </div>

              {/* Featured Metadata */}
              <div className="pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-orbitron font-bold text-lg text-white">
                    {featuredGame.title}
                  </h3>
                  <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                    <Star className="w-4 h-4 fill-amber-400" />
                    <span>{featuredGame.rating}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">
                  {featuredGame.description}
                </p>
                <div className="flex items-center justify-between pt-2 text-xs">
                  <span className="px-2.5 py-1 rounded bg-slate-800 text-cyan-300 font-semibold border border-slate-700">
                    {featuredGame.playerMode}
                  </span>
                  <span className="text-slate-400 font-mono">
                    {(featuredGame.plays / 1000).toFixed(1)}K plays
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
