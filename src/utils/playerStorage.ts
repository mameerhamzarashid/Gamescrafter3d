import { Achievement, PlayerStats } from '../types';
import { soundManager } from './audio';

const STORAGE_KEYS = {
  STATS: 'gamescrafter_stats',
  ACHIEVEMENTS: 'gamescrafter_achievements',
  FAVORITES: 'gamescrafter_favorites',
  RECENT_PLAYS: 'gamescrafter_recent_plays',
  HIGH_SCORES: 'gamescrafter_high_scores',
  RATINGS: 'gamescrafter_ratings',
};

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-game',
    title: 'First Game',
    description: 'Launch and play your very first HTML5 cyber game.',
    icon: '🏆',
    unlockedAt: null,
    progress: 0,
    maxProgress: 1,
    badgeColor: 'from-amber-400 to-orange-500',
    category: 'play'
  },
  {
    id: '10-games',
    title: 'Arcade Veteran',
    description: 'Complete 10 total game sessions across the platform.',
    icon: '🔥',
    unlockedAt: null,
    progress: 0,
    maxProgress: 10,
    badgeColor: 'from-rose-500 to-pink-600',
    category: 'play'
  },
  {
    id: 'score-100',
    title: 'Century Club',
    description: 'Score 100 or more points in any arcade or runner game.',
    icon: '💯',
    unlockedAt: null,
    progress: 0,
    maxProgress: 100,
    badgeColor: 'from-cyan-400 to-blue-500',
    category: 'score'
  },
  {
    id: 'beat-high-score',
    title: 'High Score Master',
    description: 'Surpass your previous personal best high score.',
    icon: '👑',
    unlockedAt: null,
    progress: 0,
    maxProgress: 1,
    badgeColor: 'from-yellow-400 to-amber-600',
    category: 'score'
  },
  {
    id: 'perfect-run',
    title: 'Perfect Run',
    description: 'Reach a legendary score of 250+ in any game session.',
    icon: '🎯',
    unlockedAt: null,
    progress: 0,
    maxProgress: 250,
    badgeColor: 'from-emerald-400 to-teal-500',
    category: 'mastery'
  },
  {
    id: 'speed-demon',
    title: 'Speed Demon',
    description: 'Play any Racing or supersonic high-speed game.',
    icon: '⚡',
    unlockedAt: null,
    progress: 0,
    maxProgress: 1,
    badgeColor: 'from-yellow-300 to-amber-500',
    category: 'explore'
  },
  {
    id: 'co-op-champion',
    title: 'Dual Combatant',
    description: 'Battle or team up in any 2-Player head-to-head game.',
    icon: '👥',
    unlockedAt: null,
    progress: 0,
    maxProgress: 1,
    badgeColor: 'from-indigo-500 to-violet-600',
    category: 'explore'
  },
  {
    id: 'curator',
    title: 'Game Curator',
    description: 'Bookmark 5 or more games to your Favorites collection.',
    icon: '❤️',
    unlockedAt: null,
    progress: 0,
    maxProgress: 5,
    badgeColor: 'from-rose-400 to-red-600',
    category: 'explore'
  },
  {
    id: 'surprise-me',
    title: 'Mystery Seeker',
    description: 'Use the "Surprise Me" roulette to roll a random game.',
    icon: '🎲',
    unlockedAt: null,
    progress: 0,
    maxProgress: 1,
    badgeColor: 'from-purple-400 to-indigo-600',
    category: 'explore'
  },
  {
    id: 'night-owl',
    title: 'Night Owl',
    description: 'Play a game session between 8:00 PM and 5:00 AM.',
    icon: '🌙',
    unlockedAt: null,
    progress: 0,
    maxProgress: 1,
    badgeColor: 'from-slate-700 to-indigo-950',
    category: 'explore'
  },
  {
    id: 'mobile-master',
    title: 'Mobile Master',
    description: 'Play a game using touch gestures or on-screen controls.',
    icon: '📱',
    unlockedAt: null,
    progress: 0,
    maxProgress: 1,
    badgeColor: 'from-cyan-400 to-teal-600',
    category: 'play'
  },
  {
    id: 'all-star',
    title: 'Grandmaster',
    description: 'Unlock 6 or more player achievements on GamesCrafter.',
    icon: '🌟',
    unlockedAt: null,
    progress: 0,
    maxProgress: 6,
    badgeColor: 'from-amber-300 via-rose-400 to-purple-600',
    category: 'mastery'
  }
];

type AchievementListener = (achievement: Achievement) => void;
const achievementListeners: Set<AchievementListener> = new Set();

export function onAchievementUnlocked(listener: AchievementListener) {
  achievementListeners.add(listener);
  return () => {
    achievementListeners.delete(listener);
  };
}

function notifyAchievementUnlocked(achievement: Achievement) {
  soundManager.playScore();
  achievementListeners.forEach((fn) => fn(achievement));
}

// Get Player Stats
export function getPlayerStats(): PlayerStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STATS);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return {
    gamesPlayedCount: 0,
    totalPlayTimeSeconds: 0,
    highScores: {},
    recentGameIds: [],
    favoriteGameIds: ['cyber-runner-2099', 'neon-clash-2p'],
    gameRatings: {},
    unlockedAchievementIds: []
  };
}

// Save Player Stats
export function savePlayerStats(stats: PlayerStats) {
  try {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  } catch {
    // ignore
  }
}

// Get Achievements
export function getAchievements(): Achievement[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
    if (raw) {
      const saved: Achievement[] = JSON.parse(raw);
      // Merge with initial in case new ones were added
      return INITIAL_ACHIEVEMENTS.map((init) => {
        const found = saved.find((s) => s.id === init.id);
        return found ? { ...init, ...found } : init;
      });
    }
  } catch {
    // fallback
  }
  return INITIAL_ACHIEVEMENTS;
}

// Save Achievements
export function saveAchievements(achievements: Achievement[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(achievements));
  } catch {
    // ignore
  }
}

// Unlock or Progress Achievement
export function updateAchievementProgress(id: string, amountToAddOrSet: number, isDirectSet: boolean = false): Achievement | null {
  const list = getAchievements();
  const index = list.findIndex((a) => a.id === id);
  if (index === -1) return null;

  const item = list[index];
  if (item.unlockedAt) return null; // already unlocked

  const newProgress = isDirectSet ? amountToAddOrSet : Math.min(item.maxProgress, item.progress + amountToAddOrSet);
  item.progress = Math.max(item.progress, newProgress);

  if (item.progress >= item.maxProgress && !item.unlockedAt) {
    item.unlockedAt = new Date().toISOString();
    saveAchievements(list);
    notifyAchievementUnlocked(item);
    
    // Check if Grandmaster is unlocked
    const unlockedCount = list.filter((a) => a.unlockedAt).length;
    if (unlockedCount >= 6 && id !== 'all-star') {
      updateAchievementProgress('all-star', unlockedCount, true);
    }
    return item;
  }

  saveAchievements(list);
  return null;
}

// Record Game Played
export function recordGameSession(gameId: string, genre: string, isTwoPlayer: boolean, isTouchUsed: boolean = false) {
  const stats = getPlayerStats();
  stats.gamesPlayedCount += 1;

  // Add to recents
  const now = Date.now();
  stats.recentGameIds = [
    { gameId, timestamp: now },
    ...stats.recentGameIds.filter((r) => r.gameId !== gameId)
  ].slice(0, 20);

  savePlayerStats(stats);

  // Check achievements
  updateAchievementProgress('first-game', 1, true);
  updateAchievementProgress('10-games', stats.gamesPlayedCount, true);

  if (genre === 'Racing' || genre === 'Action') {
    updateAchievementProgress('speed-demon', 1, true);
  }
  if (isTwoPlayer) {
    updateAchievementProgress('co-op-champion', 1, true);
  }
  if (isTouchUsed) {
    updateAchievementProgress('mobile-master', 1, true);
  }

  const hour = new Date().getHours();
  if (hour >= 20 || hour < 5) {
    updateAchievementProgress('night-owl', 1, true);
  }
}

// Record High Score
export function recordHighScore(gameId: string, score: number): { isNewBest: boolean; bestScore: number } {
  if (score <= 0) return { isNewBest: false, bestScore: 0 };

  const stats = getPlayerStats();
  const previousBest = stats.highScores[gameId] || 0;
  const isNewBest = score > previousBest;

  if (isNewBest) {
    stats.highScores[gameId] = score;
    savePlayerStats(stats);

    if (previousBest > 0) {
      updateAchievementProgress('beat-high-score', 1, true);
    }
  }

  if (score >= 100) {
    updateAchievementProgress('score-100', score, true);
  }
  if (score >= 250) {
    updateAchievementProgress('perfect-run', score, true);
  }

  return { isNewBest, bestScore: Math.max(previousBest, score) };
}

// Record Play Time (in seconds)
export function recordPlayTime(seconds: number) {
  if (seconds <= 0) return;
  const stats = getPlayerStats();
  stats.totalPlayTimeSeconds = (stats.totalPlayTimeSeconds || 0) + Math.round(seconds);
  savePlayerStats(stats);
}

// Reset Player Stats & Achievements
export function resetPlayerData() {
  try {
    localStorage.removeItem(STORAGE_KEYS.STATS);
    localStorage.removeItem(STORAGE_KEYS.ACHIEVEMENTS);
    localStorage.removeItem(STORAGE_KEYS.FAVORITES);
    localStorage.removeItem(STORAGE_KEYS.RECENT_PLAYS);
    localStorage.removeItem(STORAGE_KEYS.HIGH_SCORES);
    localStorage.removeItem(STORAGE_KEYS.RATINGS);
  } catch {}
}

// Record Game Rating
export function recordUserRating(gameId: string, rating: number) {
  const stats = getPlayerStats();
  stats.gameRatings[gameId] = rating;
  savePlayerStats(stats);
}

// Get User Rating for a game
export function getUserRating(gameId: string): number {
  const stats = getPlayerStats();
  return stats.gameRatings[gameId] || 0;
}
