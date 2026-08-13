import React, { useEffect, useRef, useState } from 'react';
import { Game } from '../types';
import { GAMES } from '../data/games';
import { 
  X, RotateCcw, Volume2, VolumeX, Music, Maximize2, Minimize2, Heart, Share2, 
  ThumbsUp, Trophy, Play, Pause, Keyboard, Smartphone, ArrowUp, 
  ArrowDown, ArrowLeft, ArrowRight, Zap, Target, HelpCircle, Check, Sparkles, ChevronRight
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import { recordGameSession, recordHighScore, recordPlayTime } from '../utils/playerStorage';
import { GameEngineInstance } from '../games/types';
import { ZombieSurvival3DEngine } from '../games/ZombieSurvival3DEngine';
import { CityCarRacing3DEngine } from '../games/CityCarRacing3DEngine';
import { SurvivalIsland3DEngine } from '../games/SurvivalIsland3DEngine';
import { FarmingSimulator3DEngine } from '../games/FarmingSimulator3DEngine';
import { PoliceChase3DEngine } from '../games/PoliceChase3DEngine';
import { ZombieSurvivalEngine } from '../games/ZombieSurvivalEngine';
import { EndlessRunnerEngine } from '../games/EndlessRunnerEngine';
import { TopDownRacingEngine } from '../games/TopDownRacingEngine';
import { SpaceShooterEngine } from '../games/SpaceShooterEngine';
import { TowerDefenseEngine } from '../games/TowerDefenseEngine';
import { Match3PuzzleEngine } from '../games/Match3PuzzleEngine';
import { BasketballEngine } from '../games/BasketballEngine';
import { CricketEngine } from '../games/CricketEngine';
import { FishingEngine } from '../games/FishingEngine';
import { MiningIdleEngine } from '../games/MiningIdleEngine';
import { MemoryCardEngine } from '../games/MemoryCardEngine';
import { NinjaActionEngine } from '../games/NinjaActionEngine';

interface GameModalProps {
  game: Game | null;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (gameId: string) => void;
  onSwitchGame?: (game: Game) => void;
}

export const GameModal: React.FC<GameModalProps> = ({
  game,
  onClose,
  isFavorite,
  onToggleFavorite,
  onSwitchGame
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngineInstance | null>(null);
  const sessionStartRef = useRef<number>(Date.now());
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadProgress, setLoadProgress] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [p1Score, setP1Score] = useState<number>(0);
  const [p2Score, setP2Score] = useState<number>(0);
  const [wave, setWave] = useState<number>(1);
  const [highScore, setHighScore] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.getMuted());
  const [isMusicMuted, setIsMusicMuted] = useState<boolean>(soundManager.getMusicMuted());
  const [liked, setLiked] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showMobileControls, setShowMobileControls] = useState<boolean>(true);
  const [customControls, setCustomControls] = useState<{ type: string; buttons: Array<{ id: string; label: string; color: string }> } | null>(null);

  // Recommendations: games in same category or genre excluding current
  const recommendedGames = React.useMemo(() => {
    if (!game) return [];
    return GAMES.filter((g) => g.id !== game.id && (g.genre === game.genre || (game.isTwoPlayer && g.isTwoPlayer))).slice(0, 3);
  }, [game]);

  // Loading animation simulation
  useEffect(() => {
    if (!game) return;
    setIsLoading(true);
    setLoadProgress(15);
    sessionStartRef.current = Date.now();

    const t1 = setTimeout(() => setLoadProgress(55), 180);
    const t2 = setTimeout(() => setLoadProgress(100), 380);
    const t3 = setTimeout(() => setIsLoading(false), 520);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      // Record elapsed time on unmount or game switch
      const elapsedSec = (Date.now() - sessionStartRef.current) / 1000;
      recordPlayTime(elapsedSec);
    };
  }, [game]);

  // Key state tracker
  const keysRef = useRef<{ [key: string]: boolean }>({});

  // Trigger Key Press from Virtual Touch
  const handleVirtualKeyDown = (code: string) => {
    keysRef.current[code] = true;
    if (engineRef.current?.handleVirtualActionDown) {
      engineRef.current.handleVirtualActionDown(code);
    }
    if (code === 'Space' || code === 'ArrowUp') {
      soundManager.playClick();
    }
  };

  const handleVirtualKeyUp = (code: string) => {
    keysRef.current[code] = false;
    if (engineRef.current?.handleVirtualActionUp) {
      engineRef.current.handleVirtualActionUp(code);
    }
  };

  // Keyboard Event Listeners
  useEffect(() => {
    if (!game) return;

    recordGameSession(game.id, game.genre, game.isTwoPlayer, true);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      keysRef.current[e.code] = true;
      if (engineRef.current?.handleKeyDown) {
        engineRef.current.handleKeyDown(e.code);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
      if (engineRef.current?.handleKeyUp) {
        engineRef.current.handleKeyUp(e.code);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      keysRef.current = {};
    };
  }, [game]);

  // Fullscreen state listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    soundManager.playClick();
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const handleShare = async () => {
    if (!game) return;
    soundManager.playClick();
    const shareUrl = `${window.location.origin}/games/${game.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${game.title} | GamesCrafter Store`,
          text: `Play ${game.title} online for free on GamesCrafter!`,
          url: shareUrl
        });
        return;
      } catch {
        // fallback
      }
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  // Main Canvas Game Loop Effect
  useEffect(() => {
    if (!game || !canvasRef.current) return;
    const canvas = canvasRef.current;

    let animId: number;
    let isEnded = false;

    // Canvas internal size
    canvas.width = 800;
    canvas.height = 450;

    // Reset loop states
    setScore(0);
    setP1Score(0);
    setP2Score(0);
    setGameOver(false);
    setCustomControls(null);

    // =========================================================================
    // 3D WEBGL ENGINES (Three.js Realistic 3D Games)
    // =========================================================================
    const engines3D: { [key: string]: any } = {
      '3d-zombie-survival': ZombieSurvival3DEngine,
      '3d-city-racing': CityCarRacing3DEngine,
      '3d-survival-island': SurvivalIsland3DEngine,
      '3d-farming-simulator': FarmingSimulator3DEngine,
      '3d-police-chase': PoliceChase3DEngine
    };

    if (engines3D[game.engineType] || game.is3D) {
      const EngineClass = engines3D[game.engineType] || ZombieSurvival3DEngine;
      const engineInstance: GameEngineInstance = new EngineClass({
        onScoreUpdate: (newScore: number) => {
          setScore(newScore);
        },
        onGameOver: (finalScore: number) => {
          setGameOver(true);
          recordHighScore(game.id, finalScore);
        },
        onHighScoreUpdate: (hs: number) => {
          setHighScore(hs);
        },
        onWaveUpdate: (w: number) => {
          setWave(w);
        }
      });

      engineRef.current = engineInstance;
      if (engineInstance.init3D) {
        engineInstance.init3D(canvas);
      }
      if (engineInstance.getCustomControls) {
        setCustomControls(engineInstance.getCustomControls());
      }

      // Pointer event listeners with coordinate transformation
      const getCanvasCoords = (e: PointerEvent) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
          x: (e.clientX - rect.left) * scaleX,
          y: (e.clientY - rect.top) * scaleY
        };
      };

      const onPointerDown = (e: PointerEvent) => {
        const { x, y } = getCanvasCoords(e);
        engineInstance.handlePointerDown?.(x, y, e);
      };

      const onPointerMove = (e: PointerEvent) => {
        const { x, y } = getCanvasCoords(e);
        engineInstance.handlePointerMove?.(x, y, e);
      };

      const onPointerUp = (e: PointerEvent) => {
        const { x, y } = getCanvasCoords(e);
        engineInstance.handlePointerUp?.(x, y, e);
      };

      canvas.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);

      let lastTime = performance.now();
      const run3DEngineLoop = (currentTime: number) => {
        const dt = Math.min(0.1, (currentTime - lastTime) / 1000);
        lastTime = currentTime;

        if (!isPaused) {
          engineInstance.update(dt);
        }

        animId = requestAnimationFrame(run3DEngineLoop);
      };

      animId = requestAnimationFrame(run3DEngineLoop);

      return () => {
        cancelAnimationFrame(animId);
        canvas.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        engineInstance.destroy();
        engineRef.current = null;
      };
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // =========================================================================
    // MODULAR GAME ENGINES (12 HIGH PRIORITY GAMES)
    // =========================================================================
    const modularEngines: { [key: string]: any } = {
      'zombie-survival': ZombieSurvivalEngine,
      'endless-runner': EndlessRunnerEngine,
      'top-down-racing': TopDownRacingEngine,
      'space-shooter': SpaceShooterEngine,
      'tower-defense': TowerDefenseEngine,
      'match-3-puzzle': Match3PuzzleEngine,
      'basketball': BasketballEngine,
      'cricket': CricketEngine,
      'fishing': FishingEngine,
      'mining-idle': MiningIdleEngine,
      'memory-card': MemoryCardEngine,
      'ninja-action': NinjaActionEngine
    };

    if (modularEngines[game.engineType]) {
      const EngineClass = modularEngines[game.engineType];
      const engineInstance: GameEngineInstance = new EngineClass({
        onScoreUpdate: (newScore: number) => {
          setScore(newScore);
        },
        onGameOver: (finalScore: number) => {
          setGameOver(true);
          recordHighScore(game.id, finalScore);
        },
        onHighScoreUpdate: (hs: number) => {
          setHighScore(hs);
        },
        onWaveUpdate: (w: number) => {
          setWave(w);
        }
      });

      engineRef.current = engineInstance;
      if (engineInstance.getCustomControls) {
        setCustomControls(engineInstance.getCustomControls());
      }

      // Pointer event listeners with coordinate transformation
      const getCanvasCoords = (e: PointerEvent) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
          x: (e.clientX - rect.left) * scaleX,
          y: (e.clientY - rect.top) * scaleY
        };
      };

      const onPointerDown = (e: PointerEvent) => {
        const { x, y } = getCanvasCoords(e);
        engineInstance.handlePointerDown?.(x, y, e);
      };

      const onPointerMove = (e: PointerEvent) => {
        const { x, y } = getCanvasCoords(e);
        engineInstance.handlePointerMove?.(x, y, e);
      };

      const onPointerUp = (e: PointerEvent) => {
        const { x, y } = getCanvasCoords(e);
        engineInstance.handlePointerUp?.(x, y, e);
      };

      canvas.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);

      let lastTime = performance.now();
      const runEngineLoop = (currentTime: number) => {
        const dt = Math.min(0.1, (currentTime - lastTime) / 1000);
        lastTime = currentTime;

        if (!isPaused) {
          engineInstance.update(dt);
        }
        engineInstance.render(ctx, canvas.width, canvas.height);

        animId = requestAnimationFrame(runEngineLoop);
      };

      animId = requestAnimationFrame(runEngineLoop);

      return () => {
        cancelAnimationFrame(animId);
        canvas.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        engineInstance.destroy();
        engineRef.current = null;
      };
    }

    let localScore = 0;
    let localP1 = 0;
    let localP2 = 0;

    if (game.engineType === 'cyber-runner') {
      let player = { x: 80, y: 320, vy: 0, width: 30, height: 40, isGrounded: true };
      let obstacles: Array<{ x: number; width: number; height: number }> = [];
      let particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }> = [];
      let frame = 0;

      const loop = () => {
        if (!isPaused && !isEnded) {
          frame++;
          ctx.fillStyle = '#0b1120';
          ctx.fillRect(0, 0, 800, 450);

          // Grid background
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
          ctx.lineWidth = 1;
          for (let x = 0; x < 800; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 450);
            ctx.stroke();
          }

          // Ground floor
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(0, 360, 800, 90);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(0, 360);
          ctx.lineTo(800, 360);
          ctx.stroke();

          // Controls input: Jump on Space or ArrowUp or W or touch
          if ((keysRef.current['Space'] || keysRef.current['ArrowUp'] || keysRef.current['KeyW']) && player.isGrounded) {
            player.vy = -14;
            player.isGrounded = false;
            soundManager.playJump();
            // Jump particles
            for (let i = 0; i < 8; i++) {
              particles.push({
                x: player.x + 15,
                y: player.y + 40,
                vx: (Math.random() - 0.5) * 4,
                vy: Math.random() * 3,
                life: 1,
                color: '#38bdf8'
              });
            }
          }

          // Physics update
          player.vy += 0.7; // gravity
          player.y += player.vy;
          if (player.y >= 320) {
            player.y = 320;
            player.vy = 0;
            player.isGrounded = true;
          }

          // Draw Player (Cyber Robot)
          ctx.fillStyle = '#38bdf8';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 15;
          ctx.fillRect(player.x, player.y, player.width, player.height);
          // Eye visor
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(player.x + 18, player.y + 8, 10, 6);
          ctx.shadowBlur = 0;

          // Spawn Obstacles
          if (frame % 85 === 0) {
            obstacles.push({
              x: 800,
              width: 25 + Math.random() * 20,
              height: 35 + Math.random() * 25
            });
          }

          // Move & Draw Obstacles
          for (let i = obstacles.length - 1; i >= 0; i--) {
            const obs = obstacles[i];
            obs.x -= 6.5;

            ctx.fillStyle = '#f43f5e';
            ctx.shadowColor = '#f43f5e';
            ctx.shadowBlur = 12;
            ctx.fillRect(obs.x, 360 - obs.height, obs.width, obs.height);
            ctx.shadowBlur = 0;

            // Collision check
            if (
              player.x < obs.x + obs.width &&
              player.x + player.width > obs.x &&
              player.y + player.height > 360 - obs.height
            ) {
              isEnded = true;
              setGameOver(true);
              soundManager.playExplosion();
              recordHighScore(game.id, localScore);
            }

            // Remove offscreen obstacles & score
            if (obs.x < -50) {
              obstacles.splice(i, 1);
              localScore += 10;
              setScore(localScore);
              soundManager.playClick();
            }
          }

          // Render Particles
          for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.05;
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillRect(p.x, p.y, 4, 4);
            ctx.globalAlpha = 1;
            if (p.life <= 0) particles.splice(i, 1);
          }
        }

        if (!isEnded) animId = requestAnimationFrame(loop);
      };

      animId = requestAnimationFrame(loop);
    }

    // ==========================================
    // 2. GAME ENGINE: CYBER PONG (2-PLAYER)
    // ==========================================
    else if (game.engineType === 'cyber-pong') {
      let p1 = { y: 180, height: 80, width: 12 };
      let p2 = { y: 180, height: 80, width: 12 };
      let ball = { x: 400, y: 225, vx: 5, vy: 3, radius: 8 };

      const loop = () => {
        if (!isPaused && !isEnded) {
          ctx.fillStyle = '#0b1120';
          ctx.fillRect(0, 0, 800, 450);

          // Dashed Center Line
          ctx.strokeStyle = '#334155';
          ctx.setLineDash([10, 10]);
          ctx.beginPath();
          ctx.moveTo(400, 0);
          ctx.lineTo(400, 450);
          ctx.stroke();
          ctx.setLineDash([]);

          // P1 Controls (W/S or Up/Down)
          if (keysRef.current['KeyW'] || keysRef.current['ArrowUp']) p1.y = Math.max(0, p1.y - 7);
          if (keysRef.current['KeyS'] || keysRef.current['ArrowDown']) p1.y = Math.min(370, p1.y + 7);

          // P2 Controls (Up/Down or AI)
          if (game.isTwoPlayer) {
            if (keysRef.current['ArrowUp']) p2.y = Math.max(0, p2.y - 7);
            if (keysRef.current['ArrowDown']) p2.y = Math.min(370, p2.y + 7);
          } else {
            // Simple AI follow
            if (ball.y < p2.y + 40) p2.y = Math.max(0, p2.y - 4);
            if (ball.y > p2.y + 40) p2.y = Math.min(370, p2.y + 4);
          }

          // Move Ball
          ball.x += ball.vx;
          ball.y += ball.vy;

          // Wall bounce top/bottom
          if (ball.y - ball.radius <= 0 || ball.y + ball.radius >= 450) {
            ball.vy *= -1;
            soundManager.playBounce();
          }

          // Paddle 1 Collision
          if (
            ball.x - ball.radius <= 30 + p1.width &&
            ball.y >= p1.y &&
            ball.y <= p1.y + p1.height
          ) {
            ball.vx = Math.abs(ball.vx) + 0.3;
            ball.x = 30 + p1.width + ball.radius;
            soundManager.playBounce();
          }

          // Paddle 2 Collision
          if (
            ball.x + ball.radius >= 770 - p2.width &&
            ball.y >= p2.y &&
            ball.y <= p2.y + p2.height
          ) {
            ball.vx = -Math.abs(ball.vx) - 0.3;
            ball.x = 770 - p2.width - ball.radius;
            soundManager.playBounce();
          }

          // Score check
          if (ball.x < 0) {
            localP2++;
            setP2Score(localP2);
            soundManager.playScore();
            ball = { x: 400, y: 225, vx: 5, vy: (Math.random() > 0.5 ? 3 : -3), radius: 8 };
            if (localP2 >= 7) {
              isEnded = true;
              setGameOver(true);
            }
          }
          if (ball.x > 800) {
            localP1++;
            setP1Score(localP1);
            soundManager.playScore();
            ball = { x: 400, y: 225, vx: -5, vy: (Math.random() > 0.5 ? 3 : -3), radius: 8 };
            if (localP1 >= 7) {
              isEnded = true;
              setGameOver(true);
              recordHighScore(game.id, localP1 * 10);
            }
          }

          // Draw Paddles
          ctx.fillStyle = '#38bdf8';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 12;
          ctx.fillRect(30, p1.y, p1.width, p1.height);

          ctx.fillStyle = '#f43f5e';
          ctx.shadowColor = '#f43f5e';
          ctx.fillRect(770 - p2.width, p2.y, p2.width, p2.height);

          // Draw Ball
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        if (!isEnded) animId = requestAnimationFrame(loop);
      };

      animId = requestAnimationFrame(loop);
    }

    // ==========================================
    // 3. GAME ENGINE: GALACTIC DEFENDER
    // ==========================================
    else if (game.engineType === 'galactic-defender') {
      let ship = { x: 400, y: 390, width: 34, height: 26 };
      let lasers: Array<{ x: number; y: number }> = [];
      let enemies: Array<{ x: number; y: number; width: number; height: number; alive: boolean }> = [];
      let frame = 0;

      // Spawn enemy wave
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 8; c++) {
          enemies.push({
            x: 100 + c * 75,
            y: 40 + r * 45,
            width: 35,
            height: 25,
            alive: true
          });
        }
      }

      const loop = () => {
        if (!isPaused && !isEnded) {
          frame++;
          ctx.fillStyle = '#050b14';
          ctx.fillRect(0, 0, 800, 450);

          // Starfield background
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          for (let s = 0; s < 25; s++) {
            const sx = (s * 37 + frame * 0.5) % 800;
            const sy = (s * 59) % 450;
            ctx.fillRect(sx, sy, 2, 2);
          }

          // Controls
          if ((keysRef.current['ArrowLeft'] || keysRef.current['KeyA']) && ship.x > 20) {
            ship.x -= 6;
          }
          if ((keysRef.current['ArrowRight'] || keysRef.current['KeyD']) && ship.x < 746) {
            ship.x += 6;
          }
          if ((keysRef.current['Space'] || keysRef.current['KeyW']) && frame % 12 === 0) {
            lasers.push({ x: ship.x + 15, y: ship.y });
            soundManager.playLaser();
          }

          // Move Lasers
          for (let i = lasers.length - 1; i >= 0; i--) {
            lasers[i].y -= 8;
            ctx.fillStyle = '#38bdf8';
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 10;
            ctx.fillRect(lasers[i].x, lasers[i].y, 4, 12);
            ctx.shadowBlur = 0;

            if (lasers[i].y < -20) lasers.splice(i, 1);
          }

          // Draw & Check Enemies
          let allDead = true;
          for (let i = 0; i < enemies.length; i++) {
            const e = enemies[i];
            if (!e.alive) continue;
            allDead = false;

            // Wobble
            const ex = e.x + Math.sin(frame * 0.05) * 30;
            const ey = e.y + Math.floor(frame / 200) * 10;

            ctx.fillStyle = '#a855f7';
            ctx.shadowColor = '#a855f7';
            ctx.shadowBlur = 8;
            ctx.fillRect(ex, ey, e.width, e.height);
            ctx.shadowBlur = 0;

            // Check hit with lasers
            for (let l = lasers.length - 1; l >= 0; l--) {
              if (
                lasers[l].x > ex &&
                lasers[l].x < ex + e.width &&
                lasers[l].y > ey &&
                lasers[l].y < ey + e.height
              ) {
                e.alive = false;
                lasers.splice(l, 1);
                localScore += 25;
                setScore(localScore);
                soundManager.playExplosion();
                break;
              }
            }

            if (ey + e.height >= ship.y) {
              isEnded = true;
              setGameOver(true);
              recordHighScore(game.id, localScore);
            }
          }

          if (allDead) {
            localScore += 500;
            setScore(localScore);
            isEnded = true;
            setGameOver(true);
            soundManager.playScore();
            recordHighScore(game.id, localScore);
          }

          // Draw Ship
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.moveTo(ship.x + 17, ship.y);
          ctx.lineTo(ship.x + 34, ship.y + 26);
          ctx.lineTo(ship.x, ship.y + 26);
          ctx.closePath();
          ctx.fill();
        }

        if (!isEnded) animId = requestAnimationFrame(loop);
      };

      animId = requestAnimationFrame(loop);
    }

    // ==========================================
    // 4. GAME ENGINE: CYBER SNAKE
    // ==========================================
    else if (game.engineType === 'cyber-snake') {
      const gridSize = 20;
      let snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
      let dir = { x: 1, y: 0 };
      let nextDir = { x: 1, y: 0 };
      let food = { x: 25, y: 12 };
      let frame = 0;

      const loop = () => {
        if (!isPaused && !isEnded) {
          frame++;

          // Direction Input
          if ((keysRef.current['ArrowUp'] || keysRef.current['KeyW']) && dir.y === 0) nextDir = { x: 0, y: -1 };
          if ((keysRef.current['ArrowDown'] || keysRef.current['KeyS']) && dir.y === 0) nextDir = { x: 0, y: 1 };
          if ((keysRef.current['ArrowLeft'] || keysRef.current['KeyA']) && dir.x === 0) nextDir = { x: -1, y: 0 };
          if ((keysRef.current['ArrowRight'] || keysRef.current['KeyD']) && dir.x === 0) nextDir = { x: 1, y: 0 };

          if (frame % 7 === 0) {
            dir = nextDir;
            const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

            // Wall collision
            if (head.x < 0 || head.x >= 40 || head.y < 0 || head.y >= 22) {
              isEnded = true;
              setGameOver(true);
              soundManager.playExplosion();
              recordHighScore(game.id, localScore);
            }

            // Self collision
            for (let s of snake) {
              if (s.x === head.x && s.y === head.y) {
                isEnded = true;
                setGameOver(true);
                soundManager.playExplosion();
                recordHighScore(game.id, localScore);
              }
            }

            if (!isEnded) {
              snake.unshift(head);

              // Food check
              if (head.x === food.x && head.y === food.y) {
                localScore += 20;
                setScore(localScore);
                soundManager.playScore();
                food = {
                  x: Math.floor(Math.random() * 38) + 1,
                  y: Math.floor(Math.random() * 20) + 1
                };
              } else {
                snake.pop();
              }
            }
          }

          // Render
          ctx.fillStyle = '#0b1120';
          ctx.fillRect(0, 0, 800, 450);

          // Grid lines
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
          for (let x = 0; x < 800; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 450);
            ctx.stroke();
          }

          // Food
          ctx.fillStyle = '#f43f5e';
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = 12;
          ctx.fillRect(food.x * gridSize + 2, food.y * gridSize + 2, gridSize - 4, gridSize - 4);
          ctx.shadowBlur = 0;

          // Snake Body
          snake.forEach((segment, i) => {
            ctx.fillStyle = i === 0 ? '#38bdf8' : '#0284c7';
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = i === 0 ? 10 : 0;
            ctx.fillRect(segment.x * gridSize + 1, segment.y * gridSize + 1, gridSize - 2, gridSize - 2);
          });
        }

        if (!isEnded) animId = requestAnimationFrame(loop);
      };

      animId = requestAnimationFrame(loop);
    }

    // ==========================================
    // 5. GAME ENGINE: SPEED RACER
    // ==========================================
    else if (game.engineType === 'speed-racer') {
      let carX = 400;
      let speed = 7;
      let obstacles: Array<{ x: number; y: number; width: number; height: number; speed: number }> = [];
      let frame = 0;

      const loop = () => {
        if (!isPaused && !isEnded) {
          frame++;
          ctx.fillStyle = '#070d18';
          ctx.fillRect(0, 0, 800, 450);

          // Road borders
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(150, 0, 500, 450);

          // Road lines
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(150, 0); ctx.lineTo(150, 450);
          ctx.moveTo(650, 0); ctx.lineTo(650, 450);
          ctx.stroke();

          // Center dashes
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.setLineDash([20, 20]);
          ctx.lineDashOffset = -frame * speed;
          ctx.beginPath();
          ctx.moveTo(400, 0); ctx.lineTo(400, 450);
          ctx.stroke();
          ctx.setLineDash([]);

          // Controls
          if ((keysRef.current['ArrowLeft'] || keysRef.current['KeyA']) && carX > 170) carX -= 6;
          if ((keysRef.current['ArrowRight'] || keysRef.current['KeyD']) && carX < 600) carX += 6;
          if (keysRef.current['ArrowUp'] || keysRef.current['KeyW']) speed = 12;
          else speed = 7;

          // Spawn rival cars
          if (frame % 45 === 0) {
            obstacles.push({
              x: 180 + Math.random() * 400,
              y: -80,
              width: 36,
              height: 60,
              speed: 3 + Math.random() * 3
            });
          }

          // Move obstacles
          for (let i = obstacles.length - 1; i >= 0; i--) {
            const obs = obstacles[i];
            obs.y += speed - obs.speed + 3;

            ctx.fillStyle = '#f43f5e';
            ctx.shadowColor = '#f43f5e';
            ctx.shadowBlur = 10;
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            ctx.shadowBlur = 0;

            // Collision
            if (
              carX < obs.x + obs.width &&
              carX + 36 > obs.x &&
              350 < obs.y + obs.height &&
              350 + 60 > obs.y
            ) {
              isEnded = true;
              setGameOver(true);
              soundManager.playExplosion();
              recordHighScore(game.id, localScore);
            }

            if (obs.y > 500) {
              obstacles.splice(i, 1);
              localScore += 15;
              setScore(localScore);
            }
          }

          // Draw Player Car
          ctx.fillStyle = '#38bdf8';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 15;
          ctx.fillRect(carX, 350, 36, 60);
          // Headlights
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(carX + 4, 352, 6, 8);
          ctx.fillRect(carX + 26, 352, 6, 8);
          ctx.shadowBlur = 0;
        }

        if (!isEnded) animId = requestAnimationFrame(loop);
      };

      animId = requestAnimationFrame(loop);
    }

    // ==========================================
    // 6. DEFAULT ARCADE / MATRIX ENGINE FALLBACK
    // ==========================================
    else {
      let paddleX = 350;
      let ball = { x: 400, y: 200, vx: 4, vy: 4, radius: 8 };
      let bricks: Array<{ x: number; y: number; alive: boolean }> = [];

      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 9; c++) {
          bricks.push({ x: 80 + c * 70, y: 40 + r * 30, alive: true });
        }
      }

      const loop = () => {
        if (!isPaused && !isEnded) {
          ctx.fillStyle = '#0b1120';
          ctx.fillRect(0, 0, 800, 450);

          // Controls
          if ((keysRef.current['ArrowLeft'] || keysRef.current['KeyA']) && paddleX > 10) paddleX -= 7;
          if ((keysRef.current['ArrowRight'] || keysRef.current['KeyD']) && paddleX < 690) paddleX += 7;

          // Ball physics
          ball.x += ball.vx;
          ball.y += ball.vy;

          if (ball.x < 10 || ball.x > 790) {
            ball.vx *= -1;
            soundManager.playBounce();
          }
          if (ball.y < 10) {
            ball.vy *= -1;
            soundManager.playBounce();
          }

          // Paddle bounce
          if (ball.y > 390 && ball.y < 410 && ball.x > paddleX && ball.x < paddleX + 100) {
            ball.vy = -Math.abs(ball.vy);
            soundManager.playBounce();
          }

          // Bricks
          let remaining = 0;
          bricks.forEach((b) => {
            if (!b.alive) return;
            remaining++;
            ctx.fillStyle = '#a855f7';
            ctx.fillRect(b.x, b.y, 60, 20);

            if (ball.x > b.x && ball.x < b.x + 60 && ball.y > b.y && ball.y < b.y + 20) {
              b.alive = false;
              ball.vy *= -1;
              localScore += 50;
              setScore(localScore);
              soundManager.playScore();
            }
          });

          if (remaining === 0) {
            localScore += 500;
            setScore(localScore);
            isEnded = true;
            setGameOver(true);
            recordHighScore(game.id, localScore);
          }

          if (ball.y > 450) {
            isEnded = true;
            setGameOver(true);
            soundManager.playExplosion();
            recordHighScore(game.id, localScore);
          }

          // Draw Paddle & Ball
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(paddleX, 400, 100, 14);

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
          ctx.fill();
        }

        if (!isEnded) animId = requestAnimationFrame(loop);
      };

      animId = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [game, isPaused]);

  if (!game) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      
      <div 
        ref={containerRef}
        className="relative w-full max-w-5xl bg-[#0b1120] border border-cyan-500/40 rounded-3xl overflow-hidden shadow-2xl shadow-cyan-500/20 flex flex-col my-auto"
      >
        
        {/* Top Header Bar */}
        <div className="p-3 sm:p-4 bg-[#070d18] border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 flex-shrink-0">
              <div className="w-full h-full bg-[#0b1120] rounded-[10px] flex items-center justify-center text-cyan-400 font-bold">
                <Play className="w-5 h-5 fill-current" />
              </div>
            </div>
            <div className="min-w-0">
              <h3 className="font-orbitron font-bold text-sm sm:text-base text-white truncate">
                {game.title}
              </h3>
              <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-400">
                <span className="uppercase">{game.genre}</span>
                <span>•</span>
                <span>{game.playerMode}</span>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Pause / Resume */}
            <button
              onClick={() => {
                soundManager.playClick();
                setIsPaused(!isPaused);
              }}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1 transition-all"
              title={isPaused ? 'Resume Game' : 'Pause Game'}
            >
              {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-amber-400" />}
              <span className="hidden sm:inline">{isPaused ? 'Resume' : 'Pause'}</span>
            </button>

            {/* Sound FX toggle */}
            <button
              onClick={() => {
                const muted = soundManager.toggleMute();
                setIsMuted(muted);
              }}
              className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all ${
                isMuted
                  ? 'bg-slate-900/60 border-slate-800 text-slate-500'
                  : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
              }`}
              title={isMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span className="hidden sm:inline text-[11px] font-mono">{isMuted ? 'SFX OFF' : 'SFX'}</span>
            </button>

            {/* Music BGM toggle */}
            <button
              onClick={() => {
                const musicMuted = soundManager.toggleMusic();
                setIsMusicMuted(musicMuted);
              }}
              className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all ${
                isMusicMuted
                  ? 'bg-slate-900/60 border-slate-800 text-slate-500'
                  : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
              }`}
              title={isMusicMuted ? 'Play Background Music' : 'Mute Background Music'}
            >
              <Music className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px] font-mono">{isMusicMuted ? 'BGM OFF' : 'BGM'}</span>
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-all"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all"
              title="Close Game"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Canvas Screen */}
        <div className="relative bg-[#020617] w-full aspect-video flex items-center justify-center overflow-hidden touch-none select-none">
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain cursor-crosshair"
          />

          {/* Loading Screen */}
          {isLoading && (
            <div className="absolute inset-0 bg-[#020617] flex flex-col items-center justify-center p-6 space-y-4 z-30 animate-fade-in">
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 shadow-xl shadow-cyan-500/30 animate-pulse">
                <div className="w-full h-full bg-[#0b1120] rounded-[14px] flex items-center justify-center">
                  <Play className="w-8 h-8 text-cyan-400" />
                </div>
              </div>
              <div className="text-center">
                <h4 className="font-orbitron text-lg font-bold text-white tracking-wider">{game.title}</h4>
                <p className="text-xs text-cyan-400 font-mono mt-1">INITIALIZING HTML5 GAME ENGINE...</p>
              </div>
              <div className="w-48 sm:w-64 bg-slate-800 rounded-full h-1.5 overflow-hidden border border-slate-700">
                <div 
                  className="bg-gradient-to-r from-cyan-400 to-indigo-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${loadProgress}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-400 max-w-sm text-center font-mono">
                💡 Tip: {game.controls.p1}
              </div>
            </div>
          )}

          {/* Score Overlay Banner */}
          {!isLoading && (
            <div className="absolute top-3 left-3 z-10 flex items-center gap-3 bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-700 text-xs font-mono">
              {game.isTwoPlayer ? (
                <>
                  <span className="text-cyan-400 font-bold">P1: {p1Score}</span>
                  <span className="text-slate-500">|</span>
                  <span className="text-rose-400 font-bold">P2: {p2Score}</span>
                </>
              ) : (
                <span className="text-cyan-400 font-bold tracking-wider">SCORE: {score}</span>
              )}
            </div>
          )}

          {/* Game Over Screen Overlay with "You May Also Like" */}
          {gameOver && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 text-center space-y-4 animate-fade-in z-20 overflow-y-auto">
              <div className="flex flex-col items-center">
                <Trophy className="w-10 h-10 text-amber-400 animate-bounce mb-1" />
                <h3 className="font-orbitron text-xl sm:text-2xl font-black text-rose-400 tracking-wider">
                  GAME OVER
                </h3>
                <p className="text-slate-300 font-mono text-xs sm:text-sm mt-0.5">
                  Final Score: <span className="text-cyan-400 font-bold text-base sm:text-lg">{score} pts</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    soundManager.playClick();
                    setGameOver(false);
                    setIsPaused(false);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-orbitron font-bold text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-300 hover:brightness-110 active:scale-95 shadow-lg shadow-cyan-400/40 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" /> PLAY AGAIN
                </button>
              </div>

              {/* "You May Also Like" Recommendation Shelf */}
              {recommendedGames.length > 0 && (
                <div className="w-full max-w-xl border-t border-slate-800/80 pt-3 mt-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-orbitron font-bold text-cyan-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>You May Also Like</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono uppercase">{game.genre} Games</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {recommendedGames.map((rec) => (
                      <div
                        key={rec.id}
                        onClick={() => {
                          soundManager.playClick();
                          if (onSwitchGame) {
                            onSwitchGame(rec);
                          }
                        }}
                        className="group relative bg-[#0b1120] hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-xl p-1.5 text-left cursor-pointer transition-all flex flex-col items-center text-center"
                      >
                        <img
                          src={rec.thumbnailUrl}
                          alt={rec.title}
                          className="w-full aspect-video object-cover rounded-lg mb-1.5 group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                        <span className="font-orbitron font-bold text-[10px] text-slate-200 group-hover:text-cyan-300 truncate w-full">
                          {rec.title}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                          ⭐ {rec.rating}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Paused Overlay */}
          {isPaused && !gameOver && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 space-y-3 z-20">
              <Pause className="w-10 h-10 text-cyan-400 animate-pulse" />
              <h3 className="font-orbitron text-xl font-bold text-white">GAME PAUSED</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPaused(false)}
                  className="px-5 py-2 rounded-xl bg-cyan-400 text-slate-950 font-orbitron font-bold text-xs hover:bg-cyan-300 cursor-pointer"
                >
                  RESUME
                </button>
                <button
                  onClick={() => {
                    soundManager.playClick();
                    setGameOver(false);
                    setIsPaused(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-orbitron text-xs hover:bg-slate-700 cursor-pointer"
                >
                  RESTART
                </button>
              </div>

              {/* Recommended while paused */}
              {recommendedGames.length > 0 && (
                <div className="w-full max-w-md border-t border-slate-800/80 pt-3 mt-2">
                  <span className="text-[11px] font-orbitron font-bold text-slate-400 block mb-2">
                    More in {game.genre}:
                  </span>
                  <div className="flex items-center justify-center gap-2">
                    {recommendedGames.slice(0, 2).map((rec) => (
                      <button
                        key={rec.id}
                        onClick={() => {
                          soundManager.playClick();
                          if (onSwitchGame) onSwitchGame(rec);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 text-xs font-mono truncate max-w-[180px]"
                      >
                        {rec.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Virtual Controller (Touch Controls Overlay for Phones & Tablets) */}
        <div className="p-3 bg-[#070c18] border-t border-slate-800 space-y-3">
          
          {/* Mobile Controller Toggle Header */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-cyan-400 font-bold font-orbitron">
              <Smartphone className="w-4 h-4" />
              <span>Mobile Touch Controls</span>
            </span>

            <button
              onClick={() => setShowMobileControls(!showMobileControls)}
              className="text-[11px] text-slate-400 hover:text-cyan-300 underline"
            >
              {showMobileControls ? 'Hide Controls' : 'Show Controls'}
            </button>
          </div>

          {/* Virtual D-Pad & Action Buttons Grid */}
          {showMobileControls && (
            <div className="py-1 select-none">
              {customControls ? (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {customControls.buttons.map((btn) => (
                    <button
                      key={btn.id}
                      onPointerDown={() => handleVirtualKeyDown(btn.id)}
                      onPointerUp={() => handleVirtualKeyUp(btn.id)}
                      className="px-4 py-2.5 rounded-xl font-orbitron font-bold text-xs active:scale-95 shadow-md flex items-center justify-center border transition-all cursor-pointer select-none"
                      style={{
                        backgroundColor: `${btn.color}22`,
                        borderColor: `${btn.color}66`,
                        color: btn.color
                      }}
                    >
                      {btn.label}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      soundManager.playClick();
                      setGameOver(false);
                      setIsPaused(false);
                    }}
                    className="p-2.5 rounded-xl bg-slate-800 active:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-300 text-xs font-bold shadow-md cursor-pointer"
                    title="Reset Game"
                  >
                    <RotateCcw className="w-4 h-4 text-cyan-400" />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-12 gap-3 items-center">
                  {/* Virtual D-Pad (Left 6 Cols) */}
                  <div className="col-span-6 flex flex-col items-center justify-center">
                    <button
                      onPointerDown={() => handleVirtualKeyDown('ArrowUp')}
                      onPointerUp={() => handleVirtualKeyUp('ArrowUp')}
                      className="w-12 h-10 rounded-t-xl bg-slate-800 active:bg-cyan-500 border border-slate-700 active:border-cyan-400 flex items-center justify-center text-white active:text-slate-950 shadow-md"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <div className="flex gap-1 my-1">
                      <button
                        onPointerDown={() => handleVirtualKeyDown('ArrowLeft')}
                        onPointerUp={() => handleVirtualKeyUp('ArrowLeft')}
                        className="w-12 h-10 rounded-l-xl bg-slate-800 active:bg-cyan-500 border border-slate-700 active:border-cyan-400 flex items-center justify-center text-white active:text-slate-950 shadow-md"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <button
                        onPointerDown={() => handleVirtualKeyDown('ArrowDown')}
                        onPointerUp={() => handleVirtualKeyUp('ArrowDown')}
                        className="w-12 h-10 bg-slate-800 active:bg-cyan-500 border border-slate-700 active:border-cyan-400 flex items-center justify-center text-white active:text-slate-950 shadow-md"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        onPointerDown={() => handleVirtualKeyDown('ArrowRight')}
                        onPointerUp={() => handleVirtualKeyUp('ArrowRight')}
                        className="w-12 h-10 rounded-r-xl bg-slate-800 active:bg-cyan-500 border border-slate-700 active:border-cyan-400 flex items-center justify-center text-white active:text-slate-950 shadow-md"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons (Right 6 Cols) */}
                  <div className="col-span-6 flex items-center justify-center gap-3">
                    <button
                      onPointerDown={() => handleVirtualKeyDown('Space')}
                      onPointerUp={() => handleVirtualKeyUp('Space')}
                      className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500 to-sky-400 active:scale-95 text-slate-950 font-orbitron font-black text-xs shadow-lg shadow-cyan-500/30 flex flex-col items-center justify-center border border-cyan-300 cursor-pointer"
                    >
                      <Zap className="w-4 h-4 mb-0.5" />
                      <span>ACTION</span>
                    </button>

                    <button
                      onClick={() => {
                        soundManager.playClick();
                        setGameOver(false);
                        setIsPaused(false);
                      }}
                      className="w-12 h-12 rounded-2xl bg-slate-800 active:bg-slate-700 border border-slate-700 flex flex-col items-center justify-center text-slate-300 text-[10px] font-bold shadow-md cursor-pointer"
                      title="Reset Game"
                    >
                      <RotateCcw className="w-4 h-4 mb-0.5 text-cyan-400" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Social Footer Bar (Like, Favorite, Share) */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="text-slate-400 font-mono text-[11px] hidden sm:block">
              {game.controls.p1}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => {
                  soundManager.playClick();
                  setLiked(!liked);
                }}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl font-bold border transition-all ${
                  liked
                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                }`}
              >
                <ThumbsUp className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''}`} />
                <span>{liked ? 'Liked' : 'Like'}</span>
              </button>

              <button
                onClick={() => {
                  soundManager.playClick();
                  onToggleFavorite(game.id);
                }}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl font-bold border transition-all ${
                  isFavorite
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-rose-400'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
                <span>{isFavorite ? 'Saved' : 'Favorite'}</span>
              </button>

              <button
                onClick={handleShare}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-slate-900 text-slate-300 border border-slate-800 hover:text-white transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Share'}</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
