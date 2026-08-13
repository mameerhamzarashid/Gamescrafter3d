import React, { useState, useEffect } from 'react';
import { Achievement } from '../types';
import { getAchievements } from '../utils/playerStorage';
import { Trophy, CheckCircle2, Lock, Sparkles, Flame, Star, Shield, Award } from 'lucide-react';
import { soundManager } from '../utils/audio';

export const AchievementsView: React.FC = () => {
  const [achievements, setAchievements] = useState<Achievement[]>(() => getAchievements());
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  useEffect(() => {
    setAchievements(getAchievements());
  }, []);

  const unlockedCount = achievements.filter((a) => a.unlockedAt).length;
  const progressPercent = Math.round((unlockedCount / achievements.length) * 100);

  const filtered = achievements.filter((item) => {
    if (filter === 'unlocked') return !!item.unlockedAt;
    if (filter === 'locked') return !item.unlockedAt;
    return true;
  });

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 pb-20 animate-fade-in">
      
      {/* Top Banner Showcase */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-amber-950/40 via-[#0b1120] to-indigo-950/40 border border-amber-500/30 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-600 flex items-center justify-center text-3xl shadow-xl shadow-amber-400/20 flex-shrink-0">
              🏆
            </div>
            <div>
              <span className="text-xs font-mono text-amber-400 uppercase tracking-wider block">Player Honors</span>
              <h2 className="font-orbitron text-2xl sm:text-3xl font-black text-white">
                Arcade Achievements
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                Unlock badges by playing games, setting high scores, exploring categories, and mastering arcade challenges.
              </p>
            </div>
          </div>

          {/* Progress Indicator Card */}
          <div className="w-full md:w-64 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-bold">Total Unlocked</span>
              <span className="font-orbitron font-bold text-amber-400">
                {unlockedCount} / {achievements.length}
              </span>
            </div>
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 text-right font-mono">
              {progressPercent}% Complete
            </p>
          </div>
        </div>
      </div>

      {/* Filter Selector */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => {
            soundManager.playClick();
            setFilter('all');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filter === 'all'
              ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/20'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          All ({achievements.length})
        </button>

        <button
          onClick={() => {
            soundManager.playClick();
            setFilter('unlocked');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filter === 'unlocked'
              ? 'bg-emerald-400 text-slate-950 font-black shadow-md shadow-emerald-400/20'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          Unlocked ({unlockedCount})
        </button>

        <button
          onClick={() => {
            soundManager.playClick();
            setFilter('locked');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filter === 'locked'
              ? 'bg-slate-700 text-white font-black'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          Locked ({achievements.length - unlockedCount})
        </button>
      </div>

      {/* Achievements Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item) => {
          const isUnlocked = !!item.unlockedAt;
          return (
            <div
              key={item.id}
              className={`relative p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between space-y-4 ${
                isUnlocked
                  ? 'bg-[#0b1120] border-amber-500/40 shadow-lg shadow-amber-500/10'
                  : 'bg-[#0b1120]/60 border-slate-800/80 opacity-75'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Badge Icon */}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg flex-shrink-0 ${
                  isUnlocked
                    ? `bg-gradient-to-br ${item.badgeColor} shadow-amber-500/20`
                    : 'bg-slate-800 text-slate-600 grayscale'
                }`}>
                  {item.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`font-orbitron font-bold text-sm truncate ${
                      isUnlocked ? 'text-white' : 'text-slate-400'
                    }`}>
                      {item.title}
                    </h4>

                    {isUnlocked ? (
                      <span className="p-1 rounded-full bg-emerald-500/20 text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="p-1 rounded-full bg-slate-800 text-slate-500">
                        <Lock className="w-4 h-4" />
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Progress Bar and Status */}
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">
                    {isUnlocked ? (
                      <span className="text-emerald-400 font-bold">Unlocked</span>
                    ) : (
                      <span>Progress: {item.progress} / {item.maxProgress}</span>
                    )}
                  </span>

                  {item.unlockedAt ? (
                    <span className="text-slate-500 text-[10px]">
                      {new Date(item.unlockedAt).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-slate-500 text-[10px]">
                      {Math.round((item.progress / item.maxProgress) * 100)}%
                    </span>
                  )}
                </div>

                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isUnlocked
                        ? 'bg-amber-400'
                        : 'bg-slate-600'
                    }`}
                    style={{ width: `${Math.min(100, Math.round((item.progress / item.maxProgress) * 100))}%` }}
                  />
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
