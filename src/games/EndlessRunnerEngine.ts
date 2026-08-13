import { GameEngineCallbacks, GameEngineInstance } from './types';
import { soundManager } from '../utils/audio';

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'hurdle' | 'high_beam' | 'drone' | 'laser';
  color: string;
}

interface Coin {
  x: number;
  y: number;
  radius: number;
  collected: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export class EndlessRunnerEngine implements GameEngineInstance {
  private callbacks: GameEngineCallbacks;
  private canvasWidth = 800;
  private canvasHeight = 450;
  private groundY = 360;

  private state: 'menu' | 'playing' | 'paused' | 'gameover' = 'menu';
  private score = 0;
  private coinsCount = 0;
  private highScore = 0;
  private speed = 6;
  private distance = 0;
  private frame = 0;

  // Powerups
  private hasShield = false;
  private shieldTimer = 0;
  private hasMagnet = false;
  private magnetTimer = 0;
  private scoreMultiplier = 1;
  private multiplierTimer = 0;

  // Player
  private player = {
    x: 100,
    y: 300,
    width: 32,
    height: 48,
    vy: 0,
    isGrounded: true,
    isSliding: false,
    slideTimer: 0,
    jumpsLeft: 2
  };

  private obstacles: Obstacle[] = [];
  private coins: Coin[] = [];
  private particles: Particle[] = [];
  private keys: { [key: string]: boolean } = {};

  constructor(callbacks: GameEngineCallbacks) {
    this.callbacks = callbacks;
    try {
      const saved = localStorage.getItem('gamescrafter_highscore_endless-runner');
      if (saved) this.highScore = Number(saved) || 0;
    } catch {}
  }

  public getCustomControls() {
    return {
      type: 'platformer' as const,
      buttons: [
        { id: 'slide', label: '⬇️ SLIDE', color: '#f59e0b' },
        { id: 'jump', label: '⬆️ JUMP', color: '#38bdf8' }
      ]
    };
  }

  public handlePointerDown(x: number, y: number) {
    if (this.state === 'menu' || this.state === 'gameover') {
      this.restart();
      return;
    }
    // Left half = slide, Right half = jump
    if (x < this.canvasWidth / 2) {
      this.slide();
    } else {
      this.jump();
    }
  }

  public handleKeyDown(code: string) {
    this.keys[code] = true;
    if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') {
      if (this.state === 'menu' || this.state === 'gameover') {
        this.restart();
      } else {
        this.jump();
      }
    }
    if (code === 'ArrowDown' || code === 'KeyS') {
      this.slide();
    }
  }

  public handleKeyUp(code: string) {
    this.keys[code] = false;
  }

  public handleVirtualActionDown(action: string) {
    if (action === 'jump') this.jump();
    if (action === 'slide') this.slide();
  }

  private jump() {
    if (this.state !== 'playing') return;
    if (this.player.jumpsLeft > 0) {
      this.player.isSliding = false;
      this.player.height = 48;
      this.player.vy = -13.5;
      this.player.jumpsLeft--;
      this.player.isGrounded = false;
      soundManager.playJump();

      // Jump particles
      for (let i = 0; i < 8; i++) {
        this.particles.push({
          x: this.player.x + 16,
          y: this.player.y + 48,
          vx: (Math.random() - 0.5) * 4,
          vy: Math.random() * 2 + 1,
          life: 0.3,
          color: '#38bdf8',
          size: 3
        });
      }
    }
  }

  private slide() {
    if (this.state !== 'playing') return;
    this.player.isSliding = true;
    this.player.slideTimer = 28;
    this.player.height = 24;
    soundManager.playSwoosh();
  }

  public restart() {
    this.state = 'playing';
    this.score = 0;
    this.coinsCount = 0;
    this.speed = 6;
    this.distance = 0;
    this.frame = 0;
    this.hasShield = false;
    this.hasMagnet = false;
    this.scoreMultiplier = 1;
    this.player = {
      x: 100,
      y: 300,
      width: 32,
      height: 48,
      vy: 0,
      isGrounded: true,
      isSliding: false,
      slideTimer: 0,
      jumpsLeft: 2
    };
    this.obstacles = [];
    this.coins = [];
    this.particles = [];
    this.callbacks.onScoreUpdate(0);
    soundManager.playScore();
  }

  public pause() {
    if (this.state === 'playing') this.state = 'paused';
  }

  public resume() {
    if (this.state === 'paused') this.state = 'playing';
  }

  public destroy() {
    this.keys = {};
  }

  public update(dt: number) {
    if (this.state !== 'playing') return;

    this.frame++;
    this.distance += this.speed * dt * 8;
    this.score = Math.floor(this.distance * this.scoreMultiplier) + this.coinsCount * 25;
    this.callbacks.onScoreUpdate(this.score);

    // Speed progression
    this.speed = Math.min(14, 6 + Math.floor(this.distance / 400) * 0.5);

    // Powerup Timers
    if (this.shieldTimer > 0) {
      this.shieldTimer -= dt;
      if (this.shieldTimer <= 0) this.hasShield = false;
    }
    if (this.magnetTimer > 0) {
      this.magnetTimer -= dt;
      if (this.magnetTimer <= 0) this.hasMagnet = false;
    }
    if (this.multiplierTimer > 0) {
      this.multiplierTimer -= dt;
      if (this.multiplierTimer <= 0) this.scoreMultiplier = 1;
    }

    // Player Physics
    if (this.player.isSliding) {
      this.player.slideTimer--;
      if (this.player.slideTimer <= 0) {
        this.player.isSliding = false;
        this.player.height = 48;
      }
    }

    this.player.vy += 0.65; // gravity
    this.player.y += this.player.vy;

    const currentFloor = this.groundY - this.player.height;
    if (this.player.y >= currentFloor) {
      this.player.y = currentFloor;
      this.player.vy = 0;
      this.player.isGrounded = true;
      this.player.jumpsLeft = 2;
    }

    // Spawn Obstacles & Coins
    if (this.frame % Math.max(45, 90 - Math.floor(this.speed * 3)) === 0) {
      const rand = Math.random();
      if (rand < 0.4) {
        // Low Hurdle (must jump)
        this.obstacles.push({
          x: this.canvasWidth + 20,
          y: this.groundY - 36,
          width: 28,
          height: 36,
          type: 'hurdle',
          color: '#f43f5e'
        });
      } else if (rand < 0.7) {
        // High Overhead Laser (must slide)
        this.obstacles.push({
          x: this.canvasWidth + 20,
          y: this.groundY - 70,
          width: 42,
          height: 38,
          type: 'high_beam',
          color: '#e11d48'
        });
      } else {
        // Drone in middle air
        this.obstacles.push({
          x: this.canvasWidth + 20,
          y: this.groundY - 52,
          width: 32,
          height: 30,
          type: 'drone',
          color: '#a855f7'
        });
      }

      // Spawn coins pattern
      const coinCount = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < coinCount; i++) {
        this.coins.push({
          x: this.canvasWidth + 60 + i * 28,
          y: rand < 0.5 ? this.groundY - 30 : this.groundY - 80,
          radius: 8,
          collected: false
        });
      }
    }

    // Update Obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= this.speed;

      // Collision Check
      if (
        this.player.x < obs.x + obs.width &&
        this.player.x + this.player.width > obs.x &&
        this.player.y < obs.y + obs.height &&
        this.player.y + this.player.height > obs.y
      ) {
        if (this.hasShield) {
          // Shield absorbs crash
          this.hasShield = false;
          soundManager.playExplosion();
          this.obstacles.splice(i, 1);
          continue;
        } else {
          this.gameOver();
          return;
        }
      }

      if (obs.x < -60) {
        this.obstacles.splice(i, 1);
      }
    }

    // Update Coins & Magnet
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      coin.x -= this.speed;

      if (this.hasMagnet) {
        const dx = this.player.x + 16 - coin.x;
        const dy = this.player.y + 24 - coin.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 180 && dist > 0) {
          coin.x += (dx / dist) * 7;
          coin.y += (dy / dist) * 7;
        }
      }

      const dist = Math.hypot(coin.x - (this.player.x + 16), coin.y - (this.player.y + this.player.height / 2));
      if (dist < coin.radius + 18) {
        this.coinsCount++;
        soundManager.playCoin();
        this.coins.splice(i, 1);
        continue;
      }

      if (coin.x < -30) {
        this.coins.splice(i, 1);
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  private gameOver() {
    this.state = 'gameover';
    soundManager.playExplosion();
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        localStorage.setItem('gamescrafter_highscore_endless-runner', String(this.highScore));
      } catch {}
      this.callbacks.onHighScoreUpdate(this.highScore);
    }
    this.callbacks.onGameOver(this.score);
  }

  public render(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;

    // Cyber Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#040714');
    skyGrad.addColorStop(0.7, '#0b1329');
    skyGrad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Parallax City Skyline
    ctx.fillStyle = '#0f172a';
    for (let i = 0; i < 10; i++) {
      const bWidth = 60 + (i % 3) * 20;
      const bHeight = 100 + (i % 4) * 40;
      const bx = ((i * 90 - (this.distance * 0.2)) % (width + 100));
      ctx.fillRect(bx, this.groundY - bHeight, bWidth, bHeight);
    }

    // Grid Floor
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, this.groundY, width, height - this.groundY);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.lineTo(width, this.groundY);
    ctx.stroke();

    // Moving ground grid lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 1;
    const offset = (this.distance * 4) % 40;
    for (let x = -offset; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, this.groundY);
      ctx.lineTo(x - 60, height);
      ctx.stroke();
    }

    // Render Coins
    for (const coin of this.coins) {
      ctx.save();
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Render Obstacles
    for (const obs of this.obstacles) {
      ctx.save();
      ctx.fillStyle = obs.color;
      ctx.shadowColor = obs.color;
      ctx.shadowBlur = 12;
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

      if (obs.type === 'high_beam') {
        // Laser glow effect
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(obs.x + 2, obs.y + 2, obs.width - 4, obs.height - 4);
      }
      ctx.restore();
    }

    // Render Particles
    for (const p of this.particles) {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life / 0.3;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.restore();
    }

    // Render Player
    if (this.state === 'playing' || this.state === 'paused') {
      ctx.save();
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 14;

      // Cyber runner body
      ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);

      // Visor
      ctx.fillStyle = '#ffffff';
      const eyeY = this.player.isSliding ? this.player.y + 4 : this.player.y + 8;
      ctx.fillRect(this.player.x + 18, eyeY, 10, 6);

      // Jetpack flame
      if (!this.player.isGrounded) {
        ctx.fillStyle = '#f97316';
        ctx.fillRect(this.player.x - 8, this.player.y + 20, 8, 8);
      }

      // Shield Aura
      if (this.hasShield) {
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.player.x + 16, this.player.y + this.player.height / 2, 28, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // HUD
    if (this.state === 'playing') {
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 15px Orbitron, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`SCORE: ${this.score}`, 16, 26);
      ctx.fillText(`COINS: 🟡 ${this.coinsCount}`, 16, 48);
      ctx.fillText(`SPEED: ${Math.floor(this.speed * 10)} KM/H`, 16, 70);
    }

    // Menu Overlay
    if (this.state === 'menu') {
      ctx.fillStyle = 'rgba(7, 12, 24, 0.85)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 32px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏃 NEON CYBER RUNNER', width / 2, height / 2 - 50);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px sans-serif';
      ctx.fillText('Tap Right / [SPACE] to Jump • Tap Left / [DOWN] to Slide Under Lasers', width / 2, height / 2);
      ctx.fillText('Collect energy coins & survive at supersonic speeds!', width / 2, height / 2 + 25);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.fillText('👉 TAP TO RUN 👈', width / 2, height / 2 + 75);
    }

    // Game Over Overlay
    if (this.state === 'gameover') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 34px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CRASHED!', width / 2, height / 2 - 50);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '16px Orbitron, sans-serif';
      ctx.fillText(`DISTANCE: ${Math.floor(this.distance)} M`, width / 2, height / 2 - 10);
      ctx.fillText(`TOTAL SCORE: ${this.score}`, width / 2, height / 2 + 15);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.fillText('TAP TO PLAY AGAIN', width / 2, height / 2 + 65);
    }
  }
}
