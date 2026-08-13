import React, { useEffect, useState } from 'react';
import { Game } from '../types';
import { GAMES } from '../data/games';
import { GameCard } from './GameCard';
import { AdBanner } from './AdBanner';
import { 
  Play, Star, Heart, Share2, ArrowLeft, Trophy, Keyboard, Smartphone, 
  Gamepad2, Users, Flame, Sparkles, Check, Clock, Cpu, ShieldCheck 
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import { getPlayerStats, getUserRating, recordUserRating } from '../utils/playerStorage';
import { updateGameSEO } from '../utils/seo';

interface GameDetailPageProps {
  game: Game;
  onPlay: (game: Game) => void;
  onOpenGameDetail: (game: Game) => void;
  onBack: () => void;
  isFavorite: boolean;
  onToggleFavorite: (gameId: string) => void;
  favorites: string[];
}

export const GameDetailPage: React.FC<GameDetailPageProps> = ({
  game,
  onPlay,
  onOpenGameDetail,
  onBack,
  isFavorite,
  onToggleFavorite,
  favorites
}) => {
  const [userRating, setUserRating] = useState<number>(() => getUserRating(game.id));
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [highScore, setHighScore] = useState<number>(0);

  useEffect(() => {
    updateGameSEO(game);
    const stats = getPlayerStats();
    setHighScore(stats.highScores[game.id] || 0);
    setUserRating(getUserRating(game.id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [game]);

  const handleRate = (stars: number) => {
    soundManager.playScore();
    setUserRating(stars);
    recordUserRating(game.id, stars);
  };

  const handleShare = async () => {
    soundManager.playClick();
    const shareUrl = `${window.location.origin}/games/${game.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${game.title} | GamesCrafter Store`,
          text: `Play ${game.title} instantly in your browser on GamesCrafter!`,
          url: shareUrl
        });
        return;
      } catch {
        // fallback to clipboard
      }
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  // Related games (same genre or multiplayer)
  const relatedGames = GAMES.filter(
    (g) => g.id !== game.id && (g.genre === game.genre || (game.isTwoPlayer && g.isTwoPlayer))
  ).slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-fade-in pb-20">
      
      {/* Top Back Nav & Quick Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            soundManager.playClick();
            onBack();
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-cyan-400/50 text-xs font-bold transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Games</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Share Button */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-400 text-xs font-bold transition-all cursor-pointer"
            title="Share Game"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{copied ? 'Link Copied!' : 'Share'}</span>
          </button>

          {/* Favorite Button */}
          <button
            onClick={() => {
              soundManager.playClick();
              onToggleFavorite(game.id);
            }}
            className={`p-2.5 rounded-xl border transition-all flex items-center justify-center cursor-pointer ${
              isFavorite
                ? 'bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-500/30'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-rose-500/50 hover:text-rose-400'
            }`}
            title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Hero Showcase */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#0b1120] to-slate-950 border border-cyan-500/30 shadow-2xl p-6 sm:p-8 lg:p-10">
        
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          
          {/* Cover Thumbnail with Instant Play Overlay */}
          <div className="lg:col-span-6 relative aspect-video rounded-2xl overflow-hidden border border-slate-700 shadow-2xl group bg-slate-950">
            <img
              src={game.thumbnailUrl}
              alt={game.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Floating Play Button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={() => {
                  soundManager.playLaser();
                  onPlay(game);
                }}
                className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-400 to-sky-300 text-slate-950 flex items-center justify-center shadow-2xl shadow-cyan-400/50 hover:scale-110 active:scale-95 transition-all cursor-pointer group/play"
                title="Play Game"
              >
                <Play className="w-8 h-8 fill-current translate-x-0.5 group-hover/play:scale-110 transition-transform" />
              </button>
            </div>

            {/* Badges on Thumbnail */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-white">
              <span className="px-3 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 font-mono text-[11px]">
                {game.is3D ? '✨ WebGL 3D Three.js • 60 FPS' : 'HTML5 Canvas 60 FPS'}
              </span>
              <span className="px-3 py-1 rounded-lg bg-cyan-500/80 text-slate-950 font-bold uppercase font-orbitron text-[11px]">
                Free to Play
              </span>
            </div>
          </div>

          {/* Game Info & Big CTA */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Badges Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-bold uppercase font-mono">
                {game.genre}
              </span>

              {game.isTwoPlayer ? (
                <span className="px-3 py-1 rounded-lg bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-black uppercase flex items-center gap-1.5 shadow-md shadow-rose-500/20">
                  <Users className="w-3.5 h-3.5" /> 2 Players Head-to-Head
                </span>
              ) : (
                <span className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold">
                  1 Player Solo
                </span>
              )}

              {game.difficulty && (
                <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                  game.difficulty === 'Casual' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                  game.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                  'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}>
                  {game.difficulty} Difficulty
                </span>
              )}
            </div>

            {/* Title */}
            <div>
              <h1 className="font-orbitron font-black text-2xl sm:text-4xl text-white tracking-wide leading-tight">
                {game.title}
              </h1>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span className="text-sm">{game.rating}</span>
                  <span className="text-slate-500 font-normal">/ 5.0 Rating</span>
                </div>
                <span>•</span>
                <span className="font-mono text-cyan-400 font-bold">
                  {(game.plays / 1000).toFixed(1)}k Total Plays
                </span>
              </div>
            </div>

            {/* Short description */}
            <p className="text-sm text-slate-300 leading-relaxed">
              {game.description}
            </p>

            {/* Big Primary Play Button */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  soundManager.playLaser();
                  onPlay(game);
                }}
                className="flex-1 py-4 px-8 rounded-2xl font-orbitron font-black text-base text-slate-950 bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-3 shadow-xl shadow-cyan-400/30 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>PLAY GAME NOW</span>
              </button>

              {highScore > 0 && (
                <div className="px-5 py-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Your Best Score</span>
                    <span className="text-base font-orbitron font-bold text-amber-400">{highScore} pts</span>
                  </div>
                </div>
              )}
            </div>

            {/* Interactive User Rating Stars */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs text-slate-400">Rate this game:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRate(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 text-slate-600 hover:text-amber-400 transition-colors"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        (hoverRating || userRating) >= star
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-600'
                      }`}
                    />
                  </button>
                ))}
                {userRating > 0 && (
                  <span className="text-xs text-amber-400 font-bold ml-2">
                    Rated {userRating}/5
                  </span>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Controls & Specifications Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Controls Breakdown Card */}
        <div className="p-6 rounded-2xl bg-[#0b1120] border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-cyan-400 font-orbitron font-bold text-base">
            <Gamepad2 className="w-5 h-5" />
            <span>How to Play & Controls</span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Desktop / Keyboard Controls */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 text-white font-bold">
                <Keyboard className="w-4 h-4 text-cyan-400" />
                <span>Keyboard Controls (Player 1)</span>
              </div>
              <p className="text-slate-300 font-mono text-[11px] pl-6">
                {game.controls.p1}
              </p>
            </div>

            {/* 2-Player Controls (if applicable) */}
            {game.isTwoPlayer && game.controls.p2 && (
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 text-rose-300 font-bold">
                  <Users className="w-4 h-4 text-rose-400" />
                  <span>Keyboard Controls (Player 2)</span>
                </div>
                <p className="text-slate-300 font-mono text-[11px] pl-6">
                  {game.controls.p2}
                </p>
              </div>
            )}

            {/* Mobile Touch Controls */}
            <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-1.5">
              <div className="flex items-center gap-2 text-cyan-300 font-bold">
                <Smartphone className="w-4 h-4 text-cyan-400" />
                <span>Mobile & Touch Controls</span>
              </div>
              <p className="text-slate-300 text-[11px] pl-6">
                {game.controls.mobile || 'On-screen virtual D-Pad and responsive touch controls automatically enabled on mobile phones and tablets.'}
              </p>
            </div>
          </div>
        </div>

        {/* Technical Specifications Card */}
        <div className="p-6 rounded-2xl bg-[#0b1120] border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-cyan-400 font-orbitron font-bold text-base">
            <Cpu className="w-5 h-5" />
            <span>Technical Specifications</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-mono">Game Engine</span>
              <span className="text-white font-bold font-mono capitalize">{game.engineType.replace('-', ' ')}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-mono">Platform</span>
              <span className="text-white font-bold">Web, Android, iOS</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-mono">Framerate</span>
              <span className="text-emerald-400 font-bold font-mono">60 FPS Native</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-mono">Developer</span>
              <span className="text-white font-bold">GamesCrafter Studio</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-mono">Sound Effects</span>
              <span className="text-cyan-400 font-bold">8-Bit Web Audio API</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-mono">Offline Ready</span>
              <span className="text-emerald-400 font-bold">Yes (PWA Cached)</span>
            </div>
          </div>

          {/* Tags */}
          <div className="pt-2">
            <span className="text-[11px] text-slate-400 block mb-2 font-mono">Tags:</span>
            <div className="flex flex-wrap gap-1.5">
              {game.tags.map((tag) => (
                <span key={tag} className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-mono">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* AdSense Ready Slot */}
      <AdBanner format="leaderboard" />

      {/* 🔥 You May Also Like Section */}
      {relatedGames.length > 0 && (
        <section className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-rose-500 fill-rose-500" />
            <h3 className="font-orbitron font-bold text-xl text-white">You May Also Like</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {relatedGames.map((relGame) => (
              <GameCard
                key={relGame.id}
                game={relGame}
                onPlay={onPlay}
                onOpenDetail={onOpenGameDetail}
                isFavorite={favorites.includes(relGame.id)}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </section>
      )}

    </div>
  );
};
