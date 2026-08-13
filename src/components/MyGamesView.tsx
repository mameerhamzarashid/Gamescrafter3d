import React, { useState, useEffect } from 'react';
import { Game } from '../types';
import { GAMES } from '../data/games';
import { GameCard } from './GameCard';
import { 
  Heart, Clock, Trophy, BarChart3, Play, Trash2, Sparkles, 
  Flame, Gamepad2, Shield, Award, Zap, Star 
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import { getPlayerStats, getAchievements } from '../utils/playerStorage';

interface MyGamesViewProps {
  favorites: string[];
  onToggleFavorite: (gameId: string) => void;
  onPlayGame: (game: Game) => void;
  onOpenGameDetail: (game: Game) => void;
  onSelectGenre: (genre: string) => void;
}

type MyGamesSubTab = 'favorites' | 'recents' | 'high-scores' | 'stats';

export const MyGamesView: React.FC<MyGamesViewProps> = ({
  favorites,
  onToggleFavorite,
  onPlayGame,
  onOpenGameDetail,
  onSelectGenre
}) => {
  const [activeSubTab, setActiveSubTab] = useState<MyGamesSubTab>('favorites');
  const [stats, setStats] = useState(() => getPlayerStats());
  const [achievements, setAchievements] = useState(() => getAchievements());

  useEffect(() => {
    setStats(getPlayerStats());
    setAchievements(getAchievements());
  }, []);

  const favoriteGames = GAMES.filter((g) => favorites.includes(g.id));

  // Recent games mapped with timestamp
  const recentGames = stats.recentGameIds
    .map((r) => {
      const game = GAMES.find((g) => g.id === r.gameId);
      return game ? { game, timestamp: r.timestamp } : null;
    })
    .filter(Boolean) as { game: Game; timestamp: number }[];

  // High score games mapped
  const highScoreEntries = (Object.entries(stats.highScores)
    .map(([gameId, score]) => {
      const game = GAMES.find((g) => g.id === gameId);
      return game ? { game, score: Number(score) } : null;
    })
    .filter((entry): entry is { game: Game; score: number } => entry !== null))
    .sort((a, b) => b.score - a.score);

  const formatTimeAgo = (timestamp: number) => {
    const diffSecs = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSecs < 60) return 'Just now';
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const unlockedCount = achievements.filter((a) => a.unlockedAt).length;

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-20 animate-fade-in">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="font-orbitron text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
            <Heart className="w-7 h-7 text-rose-500 fill-rose-500" />
            <span>My Games Hub</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Track your bookmarked favorites, recent sessions, personal high scores, and arcade statistics.
          </p>
        </div>

        {/* Quick Stat Pill */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 text-xs">
            <Gamepad2 className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400">Total Played:</span>
            <span className="font-orbitron font-bold text-white">{stats.gamesPlayedCount}</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 text-xs">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-slate-400">Badges:</span>
            <span className="font-orbitron font-bold text-amber-400">{unlockedCount}/{achievements.length}</span>
          </div>
        </div>
      </div>

      {/* Sub Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-800/80">
        <button
          onClick={() => {
            soundManager.playClick();
            setActiveSubTab('favorites');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'favorites'
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Heart className={`w-4 h-4 ${activeSubTab === 'favorites' ? 'fill-current' : ''}`} />
          <span>Favorites</span>
          <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px]">
            {favorites.length}
          </span>
        </button>

        <button
          onClick={() => {
            soundManager.playClick();
            setActiveSubTab('recents');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'recents'
              ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-400/30 font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Recently Played</span>
          <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px]">
            {recentGames.length}
          </span>
        </button>

        <button
          onClick={() => {
            soundManager.playClick();
            setActiveSubTab('high-scores');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'high-scores'
              ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/30 font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>High Scores</span>
          <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px]">
            {highScoreEntries.length}
          </span>
        </button>

        <button
          onClick={() => {
            soundManager.playClick();
            setActiveSubTab('stats');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'stats'
              ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Game Statistics</span>
        </button>
      </div>

      {/* Tab 1: FAVORITES */}
      {activeSubTab === 'favorites' && (
        <div className="space-y-4">
          {favoriteGames.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {favoriteGames.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  onPlay={onPlayGame}
                  onOpenDetail={onOpenGameDetail}
                  isFavorite={true}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center bg-[#0b1120] rounded-3xl border border-slate-800 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                <Heart className="w-8 h-8 fill-current" />
              </div>
              <h3 className="font-orbitron font-bold text-lg text-white">No favorites saved yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Click the heart icon on any game card across the portal to add it to your personal favorites collection.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: RECENTLY PLAYED */}
      {activeSubTab === 'recents' && (
        <div className="space-y-4">
          {recentGames.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {recentGames.map(({ game, timestamp }) => (
                <div key={game.id} className="relative flex flex-col">
                  <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] text-cyan-300 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatTimeAgo(timestamp)}</span>
                  </div>
                  <GameCard
                    game={game}
                    onPlay={onPlayGame}
                    onOpenDetail={onOpenGameDetail}
                    isFavorite={favorites.includes(game.id)}
                    onToggleFavorite={onToggleFavorite}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center bg-[#0b1120] rounded-3xl border border-slate-800 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="font-orbitron font-bold text-lg text-white">No game history yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Play any game to automatically log your history and track your gameplay sessions.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: HIGH SCORES HALL OF FAME */}
      {activeSubTab === 'high-scores' && (
        <div className="space-y-4">
          {highScoreEntries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {highScoreEntries.map(({ game, score }, idx) => (
                <div 
                  key={game.id}
                  className="p-4 rounded-2xl bg-[#0b1120] border border-slate-800 hover:border-amber-400/50 transition-all flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-orbitron font-bold text-base ${
                      idx === 0 ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30' :
                      idx === 1 ? 'bg-slate-300 text-slate-950' :
                      idx === 2 ? 'bg-amber-700 text-white' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      #{idx + 1}
                    </div>

                    <div>
                      <h4 className="font-orbitron font-bold text-sm text-white line-clamp-1">
                        {game.title}
                      </h4>
                      <span className="text-[11px] text-cyan-400 font-mono uppercase">
                        {game.genre}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Personal Best</span>
                      <span className="font-orbitron font-black text-amber-400 text-base">
                        {score} pts
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        soundManager.playLaser();
                        onPlayGame(game);
                      }}
                      className="p-2.5 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 transition-colors"
                      title="Play again to beat high score"
                    >
                      <Play className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center bg-[#0b1120] rounded-3xl border border-slate-800 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
                <Trophy className="w-8 h-8" />
              </div>
              <h3 className="font-orbitron font-bold text-lg text-white">No high scores logged yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Play Cyber Runner, Galactic Defender, Snake, or Tetris to set your personal best records!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: GAME STATISTICS */}
      {activeSubTab === 'stats' && (
        <div className="space-y-6">
          
          {/* Main Stat Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[#0b1120] border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-cyan-400">
                <Gamepad2 className="w-5 h-5" />
                <span className="text-[10px] font-mono uppercase bg-cyan-400/10 px-2 py-0.5 rounded">Sessions</span>
              </div>
              <p className="font-orbitron font-black text-2xl sm:text-3xl text-white">
                {stats.gamesPlayedCount}
              </p>
              <p className="text-[11px] text-slate-400">Total games launched</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0b1120] border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-sky-400">
                <Clock className="w-5 h-5" />
                <span className="text-[10px] font-mono uppercase bg-sky-400/10 px-2 py-0.5 rounded">Play Time</span>
              </div>
              <p className="font-orbitron font-black text-2xl sm:text-3xl text-white">
                {stats.totalPlayTimeSeconds ? Math.floor(stats.totalPlayTimeSeconds / 60) : 0}m
              </p>
              <p className="text-[11px] text-slate-400">Total time in games</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0b1120] border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-amber-400">
                <Trophy className="w-5 h-5" />
                <span className="text-[10px] font-mono uppercase bg-amber-400/10 px-2 py-0.5 rounded">Badges</span>
              </div>
              <p className="font-orbitron font-black text-2xl sm:text-3xl text-white">
                {unlockedCount} / {achievements.length}
              </p>
              <p className="text-[11px] text-slate-400">Achievements unlocked</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0b1120] border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-emerald-400">
                <Zap className="w-5 h-5" />
                <span className="text-[10px] font-mono uppercase bg-emerald-400/10 px-2 py-0.5 rounded">Records</span>
              </div>
              <p className="font-orbitron font-black text-2xl sm:text-3xl text-white">
                {Object.keys(stats.highScores).length}
              </p>
              <p className="text-[11px] text-slate-400">Games with high scores</p>
            </div>
          </div>

          {/* Player Rank Banner */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-950 via-[#0b1120] to-cyan-950 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-400 to-indigo-500 p-0.5 shadow-xl shadow-cyan-400/20">
                <div className="w-full h-full bg-[#0b1120] rounded-[14px] flex items-center justify-center text-cyan-400 font-orbitron font-black text-xl">
                  {stats.gamesPlayedCount >= 20 ? 'S' : stats.gamesPlayedCount >= 10 ? 'A' : stats.gamesPlayedCount >= 1 ? 'B' : 'C'}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block">Gamer Tier Status</span>
                <h3 className="font-orbitron font-black text-xl text-white">
                  {stats.gamesPlayedCount >= 20 ? 'Master Cyber Champion' :
                   stats.gamesPlayedCount >= 10 ? 'Arcade Cyber Veteran' :
                   stats.gamesPlayedCount >= 1 ? 'Rookie Neon Gamer' : 'New Player'}
                </h3>
              </div>
            </div>

            <div className="text-center sm:text-right">
              <span className="text-xs text-slate-400 block mb-1">Badge Completion</span>
              <div className="w-48 h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-400 to-amber-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.round((unlockedCount / achievements.length) * 100)}%` }}
                />
              </div>
              <span className="text-[11px] text-cyan-400 font-mono mt-1 block">
                {Math.round((unlockedCount / achievements.length) * 100)}% Completed
              </span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
