import React from 'react';
import { Gamepad2, ArrowUp, ShieldCheck, Zap, Heart, Sparkles } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface FooterProps {
  onSelectGenre: (genre: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectGenre }) => {
  const scrollToTop = () => {
    soundManager.playClick();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#070c18] border-t border-slate-800 text-slate-400 text-sm py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Brand Info */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-cyan-500/20">
                <Gamepad2 className="w-5 h-5 text-slate-950" />
              </div>
              <span className="font-orbitron text-xl font-black text-white tracking-wider">
                GAMESCRAFTER <span className="text-cyan-400 font-mono text-xs">STORE</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              GamesCrafter Store is a high-performance cyber-gaming portal featuring 30+ instant HTML5 browser games. Play single-player and 2-player arcade classics, space shooters, racing simulators, and retro puzzles with zero downloads.
            </p>
            <div className="flex items-center gap-2 text-xs text-cyan-400">
              <Zap className="w-4 h-4" />
              <span>Built for fast loading on Cloudflare & GitHub Pages</span>
            </div>
          </div>

          {/* Quick Categories */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="font-orbitron font-bold text-white text-xs tracking-wider uppercase">
              Popular Categories
            </h4>
            <ul className="space-y-2 text-xs">
              {['2-Player', 'Action', 'Arcade', 'Puzzle', 'Racing', 'Sci-Fi'].map((genre) => (
                <li key={genre}>
                  <button
                    onClick={() => {
                      onSelectGenre(genre);
                      soundManager.playClick();
                      window.scrollTo({ top: 400, behavior: 'smooth' });
                    }}
                    className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"
                  >
                    <span className="text-cyan-500">›</span> {genre} Games
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Key Features */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="font-orbitron font-bold text-white text-xs tracking-wider uppercase">
              Platform Guarantee
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2 bg-[#0b1120] p-2.5 rounded-xl border border-slate-800">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>100% Free & Safe: No registrations, no hidden installs.</span>
              </div>
              <div className="flex items-start gap-2 bg-[#0b1120] p-2.5 rounded-xl border border-slate-800">
                <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>Responsive Canvas Engines: Play on Desktop, Mobile, & Tablet.</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>© {new Date().getFullYear()} GamesCrafter Store. All rights reserved.</p>

          <button
            onClick={scrollToTop}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-cyan-400 border border-slate-800 hover:border-cyan-500 transition-all cursor-pointer font-bold"
          >
            <span>Back to Top</span>
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>

      </div>
    </footer>
  );
};
