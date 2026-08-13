import React, { useState, useMemo, useEffect } from 'react';
import { GAMES } from './data/games';
import { Game, SortOption, ActiveTab } from './types';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { HomeShelves } from './components/HomeShelves';
import { GameLibraryView } from './components/GameLibraryView';
import { GameDetailPage } from './components/GameDetailPage';
import { MyGamesView } from './components/MyGamesView';
import { AchievementsView } from './components/AchievementsView';
import { GameModal } from './components/GameModal';
import { SurpriseModal } from './components/SurpriseModal';
import { InstallPwaBanner } from './components/InstallPwaBanner';
import { AchievementToast } from './components/AchievementToast';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Footer } from './components/Footer';
import { soundManager } from './utils/audio';
import { getPlayerStats, getAchievements } from './utils/playerStorage';
import { updateHomeSEO } from './utils/seo';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [selectedGameDetail, setSelectedGameDetail] = useState<Game | null>(null);
  const [activeGameModal, setActiveGameModal] = useState<Game | null>(null);
  const [isSurpriseOpen, setIsSurpriseOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [isMuted, setIsMuted] = useState<boolean>(() => soundManager.getMuted());
  const [isMusicMuted, setIsMusicMuted] = useState<boolean>(() => soundManager.getMusicMuted());

  // Favorites state persisted in localStorage
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('gamescrafter_favorites');
      return saved ? JSON.parse(saved) : ['cyber-runner-2099', 'neon-clash-2p', 'galactic-strike'];
    } catch {
      return ['cyber-runner-2099', 'neon-clash-2p', 'galactic-strike'];
    }
  });

  const [unlockedAchievementsCount, setUnlockedAchievementsCount] = useState<number>(0);

  // Listen for direct URL routing on mount & popstate
  useEffect(() => {
    const handleUrlRoute = () => {
      const path = window.location.pathname;
      if (path.startsWith('/games/')) {
        const gameId = path.replace('/games/', '').trim();
        const found = GAMES.find((g) => g.id === gameId);
        if (found) {
          setSelectedGameDetail(found);
          setActiveTab('game-detail');
          return;
        }
      }
      if (path === '/library') {
        setActiveTab('library');
      } else if (path === '/my-games') {
        setActiveTab('my-games');
      } else if (path === '/achievements') {
        setActiveTab('achievements');
      } else {
        setActiveTab('home');
        updateHomeSEO();
      }
    };

    handleUrlRoute();
    window.addEventListener('popstate', handleUrlRoute);

    // Initial unlocked achievements count
    const achs = getAchievements();
    setUnlockedAchievementsCount(achs.filter((a) => a.unlockedAt).length);

    return () => window.removeEventListener('popstate', handleUrlRoute);
  }, []);

  // Sync favorites
  useEffect(() => {
    try {
      localStorage.setItem('gamescrafter_favorites', JSON.stringify(favorites));
    } catch {
      // ignore
    }
  }, [favorites]);

  const toggleFavorite = (gameId: string) => {
    setFavorites((prev) =>
      prev.includes(gameId) ? prev.filter((id) => id !== gameId) : [...prev, gameId]
    );
  };

  const toggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  const toggleMusic = () => {
    const musicMuted = soundManager.toggleMusic();
    setIsMusicMuted(musicMuted);
  };

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab === 'home') {
      window.history.pushState(null, '', '/');
      updateHomeSEO();
    } else if (tab === 'library') {
      window.history.pushState(null, '', '/library');
    } else if (tab === 'my-games') {
      window.history.pushState(null, '', '/my-games');
    } else if (tab === 'achievements') {
      window.history.pushState(null, '', '/achievements');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenGameDetail = (game: Game) => {
    setSelectedGameDetail(game);
    setActiveTab('game-detail');
    window.history.pushState(null, '', `/games/${game.id}`);
  };

  const handleSelectGenreFromShelf = (genre: string) => {
    setSelectedGenre(genre);
    setActiveTab('library');
    window.history.pushState(null, '', '/library');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Featured game for hero
  const featuredGame = useMemo(() => {
    return GAMES.find((g) => g.id === 'cyber-runner-2099') || GAMES[0];
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#070c18] text-slate-100 font-sans selection:bg-cyan-500 selection:text-black">
      
      {/* Smart PWA Install Banner */}
      <InstallPwaBanner />

      {/* Live Achievement HUD Toast */}
      <AchievementToast />

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          if (q.trim() && activeTab !== 'library') {
            setActiveTab('library');
          }
        }}
        favoritesCount={favorites.length}
        unlockedAchievementsCount={unlockedAchievementsCount}
        onTriggerSurprise={() => setIsSurpriseOpen(true)}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        isMusicMuted={isMusicMuted}
        onToggleMusic={toggleMusic}
      />

      {/* Main View Router */}
      <main className="flex-1 w-full">
        {/* VIEW 1: HOMEPAGE */}
        {activeTab === 'home' && (
          <div className="space-y-8 animate-fade-in">
            {/* Hero Section */}
            <HeroSection
              featuredGame={featuredGame}
              onPlayGame={(g) => setActiveGameModal(g)}
              onExploreClick={() => handleTabChange('library')}
            />

            {/* Curated Shelves & Categories */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
              <HomeShelves
                games={GAMES}
                onPlayGame={(g) => setActiveGameModal(g)}
                onOpenGameDetail={handleOpenGameDetail}
                onSelectGenre={handleSelectGenreFromShelf}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
              />
            </div>
          </div>
        )}

        {/* VIEW 2: GAME LIBRARY */}
        {activeTab === 'library' && (
          <GameLibraryView
            games={GAMES}
            selectedGenre={selectedGenre}
            onSelectGenre={setSelectedGenre}
            onPlayGame={(g) => setActiveGameModal(g)}
            onOpenGameDetail={handleOpenGameDetail}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}

        {/* VIEW 3: DEDICATED GAME DETAIL PAGE */}
        {activeTab === 'game-detail' && selectedGameDetail && (
          <GameDetailPage
            game={selectedGameDetail}
            onPlay={(g) => setActiveGameModal(g)}
            onOpenGameDetail={handleOpenGameDetail}
            onBack={() => handleTabChange('library')}
            isFavorite={favorites.includes(selectedGameDetail.id)}
            onToggleFavorite={toggleFavorite}
            favorites={favorites}
          />
        )}

        {/* VIEW 4: MY GAMES (Favorites, Recents, High Scores, Stats) */}
        {activeTab === 'my-games' && (
          <MyGamesView
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            onPlayGame={(g) => setActiveGameModal(g)}
            onOpenGameDetail={handleOpenGameDetail}
            onSelectGenre={handleSelectGenreFromShelf}
          />
        )}

        {/* VIEW 5: ACHIEVEMENTS VIEW */}
        {activeTab === 'achievements' && (
          <AchievementsView />
        )}
      </main>

      {/* Active Game Modal Popup (Instant Canvas Gameplay with Virtual Controls) */}
      <GameModal
        game={activeGameModal}
        onClose={() => setActiveGameModal(null)}
        isFavorite={activeGameModal ? favorites.includes(activeGameModal.id) : false}
        onToggleFavorite={toggleFavorite}
        onSwitchGame={(newGame) => setActiveGameModal(newGame)}
      />

      {/* Surprise Me Roulette Modal */}
      <SurpriseModal
        isOpen={isSurpriseOpen}
        onClose={() => setIsSurpriseOpen(false)}
        onPlayGame={(g) => setActiveGameModal(g)}
        onOpenGameDetail={handleOpenGameDetail}
      />

      {/* Mobile Bottom Navigation Bar (Fixed for Mobile Screens) */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        favoritesCount={favorites.length}
        unlockedAchievementsCount={unlockedAchievementsCount}
        onTriggerSurprise={() => setIsSurpriseOpen(true)}
      />

      {/* Footer */}
      <Footer onSelectGenre={handleSelectGenreFromShelf} />

    </div>
  );
}
