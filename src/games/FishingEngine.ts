import { GameEngineCallbacks, GameEngineInstance } from './types';
import { soundManager } from '../utils/audio';

interface Fish {
  x: number;
  y: number;
  vx: number;
  radius: number;
  type: 'guppy' | 'trout' | 'angler' | 'squid' | 'shark' | 'treasure';
  value: number;
  weight: number;
  color: string;
  hooked: boolean;
}

export class FishingEngine implements GameEngineInstance {
  private callbacks: GameEngineCallbacks;
  private canvasWidth = 800;
  private canvasHeight = 450;

  private state: 'menu' | 'playing' | 'paused' | 'gameover' = 'menu';
  private score = 0;
  private highScore = 0;
  private timeLeft = 60;

  // Boat & Hook
  private hook = {
    x: 400,
    y: 80,
    targetX: 400,
    targetY: 80,
    speed: 3.5,
    isReeling: false,
    maxLoad: 3,
    caughtFish: [] as Fish[]
  };

  private fishList: Fish[] = [];

  constructor(callbacks: GameEngineCallbacks) {
    this.callbacks = callbacks;
    try {
      const saved = localStorage.getItem('gamescrafter_highscore_fishing');
      if (saved) this.highScore = Number(saved) || 0;
    } catch {}
  }

  public getCustomControls() {
    return {
      type: 'fishing' as const,
      buttons: [
        { id: 'reel', label: '🎣 REEL UP', color: '#38bdf8' }
      ]
    };
  }

  public handlePointerDown(x: number, y: number) {
    if (this.state === 'menu' || this.state === 'gameover') {
      this.restart();
      return;
    }

    if (y > 90) {
      this.hook.targetX = x;
      this.hook.targetY = y;
      this.hook.isReeling = false;
      soundManager.playSwoosh();
    }
  }

  public handlePointerMove(x: number, y: number) {
    if (this.state === 'playing' && y > 90) {
      this.hook.targetX = x;
      this.hook.targetY = y;
    }
  }

  public handleVirtualActionDown(action: string) {
    if (action === 'reel') {
      this.hook.targetY = 80;
      this.hook.isReeling = true;
      soundManager.playSwoosh();
    }
  }

  public restart() {
    this.state = 'playing';
    this.score = 0;
    this.timeLeft = 60;
    this.hook.x = 400;
    this.hook.y = 80;
    this.hook.targetX = 400;
    this.hook.targetY = 80;
    this.hook.isReeling = false;
    this.hook.caughtFish = [];
    this.fishList = [];
    this.spawnFishBatch();
    this.callbacks.onScoreUpdate(0);
    soundManager.playScore();
  }

  private spawnFishBatch() {
    for (let i = 0; i < 14; i++) {
      this.spawnSingleFish();
    }
  }

  private spawnSingleFish() {
    const rand = Math.random();
    let type: 'guppy' | 'trout' | 'angler' | 'squid' | 'shark' | 'treasure' = 'guppy';
    let value = 25;
    let weight = 1;
    let color = '#38bdf8';
    let radius = 10;
    let y = 120 + Math.random() * 80;

    if (rand > 0.85) {
      type = 'shark';
      value = 150;
      weight = 3;
      color = '#ef4444';
      radius = 24;
      y = 330 + Math.random() * 70;
    } else if (rand > 0.65) {
      type = 'angler';
      value = 80;
      weight = 2;
      color = '#a855f7';
      radius = 16;
      y = 260 + Math.random() * 80;
    } else if (rand > 0.4) {
      type = 'trout';
      value = 45;
      weight = 1;
      color = '#fbbf24';
      radius = 12;
      y = 180 + Math.random() * 90;
    }

    const fromLeft = Math.random() < 0.5;
    this.fishList.push({
      x: fromLeft ? -30 : this.canvasWidth + 30,
      y,
      vx: fromLeft ? 1 + Math.random() * 1.5 : -(1 + Math.random() * 1.5),
      radius,
      type,
      value,
      weight,
      color,
      hooked: false
    });
  }

  public pause() {
    if (this.state === 'playing') this.state = 'paused';
  }

  public resume() {
    if (this.state === 'paused') this.state = 'playing';
  }

  public destroy() {}

  public update(dt: number) {
    if (this.state !== 'playing') return;

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.gameOver();
      return;
    }

    // Hook Movement towards target
    const hdx = this.hook.targetX - this.hook.x;
    const hdy = this.hook.targetY - this.hook.y;
    const hdist = Math.hypot(hdx, hdy);

    if (hdist > 4) {
      this.hook.x += (hdx / hdist) * this.hook.speed;
      this.hook.y += (hdy / hdist) * this.hook.speed;
    }

    // Sell Fish when hook reaches surface boat
    if (this.hook.y <= 85 && this.hook.caughtFish.length > 0) {
      let earned = 0;
      for (const f of this.hook.caughtFish) {
        earned += f.value;
      }
      this.score += earned;
      this.timeLeft += this.hook.caughtFish.length * 3; // Bonus time
      this.hook.caughtFish = [];
      this.callbacks.onScoreUpdate(this.score);
      soundManager.playCoin();
    }

    // Maintain fish count
    if (this.fishList.length < 12) {
      this.spawnSingleFish();
    }

    // Update Fish Swimming & Catching
    for (let i = this.fishList.length - 1; i >= 0; i--) {
      const f = this.fishList[i];

      if (f.hooked) {
        // Stick to hook
        f.x = this.hook.x;
        f.y = this.hook.y + 12 + this.hook.caughtFish.indexOf(f) * 14;
        continue;
      }

      f.x += f.vx;

      // Check collision with hook
      const dist = Math.hypot(f.x - this.hook.x, f.y - this.hook.y);
      if (dist < f.radius + 12 && this.hook.caughtFish.length < this.hook.maxLoad) {
        f.hooked = true;
        this.hook.caughtFish.push(f);
        soundManager.playSplash();
        // Auto reel up when max load full
        if (this.hook.caughtFish.length >= this.hook.maxLoad) {
          this.hook.targetY = 80;
          this.hook.isReeling = true;
        }
      }

      if (f.x < -60 || f.x > this.canvasWidth + 60) {
        this.fishList.splice(i, 1);
      }
    }
  }

  private gameOver() {
    this.state = 'gameover';
    soundManager.playGameOver();
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        localStorage.setItem('gamescrafter_highscore_fishing', String(this.highScore));
      } catch {}
      this.callbacks.onHighScoreUpdate(this.highScore);
    }
    this.callbacks.onGameOver(this.score);
  }

  public render(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;

    // Sky Surface
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, 80);

    // Deep Ocean Water Gradient
    const waterGrad = ctx.createLinearGradient(0, 80, 0, height);
    waterGrad.addColorStop(0, '#0369a1');
    waterGrad.addColorStop(0.5, '#0c4a6e');
    waterGrad.addColorStop(1, '#020617');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, 80, width, height - 80);

    // Surface Water Line
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 80);
    ctx.lineTo(width, 80);
    ctx.stroke();

    // Boat
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(this.hook.x - 30, 80);
    ctx.lineTo(this.hook.x + 30, 80);
    ctx.lineTo(this.hook.x + 20, 92);
    ctx.lineTo(this.hook.x - 20, 92);
    ctx.closePath();
    ctx.fill();

    // Fishing Line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(this.hook.x, 80);
    ctx.lineTo(this.hook.x, this.hook.y);
    ctx.stroke();

    // Hook
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.hook.x, this.hook.y, 8, 0, Math.PI);
    ctx.stroke();

    // Render Fish
    for (const f of this.fishList) {
      ctx.save();
      ctx.fillStyle = f.color;
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 8;

      // Fish Body
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, f.radius * 1.5, f.radius, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tail
      const tailX = f.vx > 0 ? f.x - f.radius * 1.5 : f.x + f.radius * 1.5;
      ctx.beginPath();
      ctx.moveTo(tailX, f.y);
      ctx.lineTo(tailX + (f.vx > 0 ? -8 : 8), f.y - 6);
      ctx.lineTo(tailX + (f.vx > 0 ? -8 : 8), f.y + 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Top HUD
    if (this.state === 'playing') {
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`CASH EARNED: 💰 $${this.score}`, 20, 32);
      ctx.fillText(`HOOK LOAD: 🐟 ${this.hook.caughtFish.length}/${this.hook.maxLoad}`, 20, 58);

      ctx.textAlign = 'right';
      ctx.fillStyle = this.timeLeft <= 10 ? '#ef4444' : '#22c55e';
      ctx.font = 'bold 22px Orbitron, sans-serif';
      ctx.fillText(`⏱️ ${Math.ceil(this.timeLeft)}s`, width - 20, 36);
    }

    // Menu Overlay
    if (this.state === 'menu') {
      ctx.fillStyle = 'rgba(7, 12, 24, 0.85)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 32px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🎣 DEEP SEA CYBER FISHING', width / 2, height / 2 - 50);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px sans-serif';
      ctx.fillText('Tap to cast deep into ocean depths & hook rare bioluminescent species', width / 2, height / 2);
      ctx.fillText('Reel your catch back to the surface boat for huge cash rewards!', width / 2, height / 2 + 25);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.fillText('👉 TAP TO CAST LINE 👈', width / 2, height / 2 + 75);
    }

    // Game Over
    if (this.state === 'gameover') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 34px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('EXPEDITION FINISHED!', width / 2, height / 2 - 50);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '16px Orbitron, sans-serif';
      ctx.fillText(`TOTAL VALUATION: $${this.score}`, width / 2, height / 2 - 10);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.fillText('TAP TO FISH AGAIN', width / 2, height / 2 + 55);
    }
  }
}
