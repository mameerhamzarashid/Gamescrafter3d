import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone, Sparkles } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPwaBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Check if user dismissed recently
      const dismissed = localStorage.getItem('gamescrafter_pwa_dismissed');
      if (!dismissed) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // If iOS and not standalone and not dismissed
    if (isIosDevice && !localStorage.getItem('gamescrafter_pwa_dismissed')) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    soundManager.playClick();
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    soundManager.playClick();
    setShowBanner(false);
    localStorage.setItem('gamescrafter_pwa_dismissed', 'true');
  };

  if (!showBanner) return null;

  return (
    <>
      <aside 
        aria-label="Install App"
        className="w-full bg-gradient-to-r from-cyan-950 via-slate-900 to-indigo-950 border-b border-cyan-500/30 px-4 py-2.5"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 flex-shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <p className="font-orbitron font-bold text-white flex items-center gap-1.5">
                <span>Install GamesCrafter App</span>
                <span className="bg-cyan-400/20 text-cyan-300 text-[10px] px-1.5 py-0.2 rounded font-mono">PWA</span>
              </p>
              <p className="text-slate-400 text-[11px] hidden sm:block">
                Install on your Home Screen for instant offline play and faster full-screen performance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-400 text-slate-950 font-bold text-xs hover:bg-cyan-300 flex items-center gap-1.5 shadow-md shadow-cyan-400/20 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-white p-1"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* iOS Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0b1120] border border-cyan-500/40 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-orbitron font-bold text-white text-base">Install on iPhone / iPad</h3>
              <button onClick={() => setShowIOSModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <ol className="text-xs text-slate-300 space-y-3 list-decimal list-inside">
              <li>Tap the <strong className="text-cyan-400">Share</strong> button at the bottom of Safari browser.</li>
              <li>Scroll down and tap <strong className="text-cyan-400">"Add to Home Screen"</strong>.</li>
              <li>Tap <strong className="text-cyan-400">"Add"</strong> in the top-right corner.</li>
            </ol>
            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-cyan-400 text-slate-950 font-bold text-xs"
            >
              Got It!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
