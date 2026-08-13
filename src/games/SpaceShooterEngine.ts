import { GameEngineCallbacks, GameEngineInstance } from './types';
import { soundManager } from '../utils/audio';

interface Enemy {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  radius: number;
  type: 'scout' | 'fighter' | 'cruiser' | 'boss';
  color: string;
  shootCooldown: number;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  color: string;
  isEnemy?: boolean;
}

interface Star {
  x: number;
  y: number;
  speed: number;
  size: number;
}

interface Drop {
  x: number;
  y: number;
  type: 'weapon' | 'shield' | 'bomb' | 'heal';
  radius: number;
}

export class SpaceShooterEngine implements GameEngineInstance {
  private callbacks: GameEngineCallbacks;
  private canvasWidth = 800;
  private canvasHeight = 450;

  private state: 'menu' | 'playing' | 'paused' | 'gameover' = 'menu';
  private score = 0;
  private highScore = 0;
  private wave = 1;
  private bossActive = false;

  // Player Ship
  private ship = {
    x: 400,
    y: 380,
    radius: 16,
    speed: 5.5,
    hp: 100,
    maxHp: 100,
    weaponTier: 1, // 1 to 4
    bombs: 2,
    hasShield: false,
    shieldTimer: 0,
    fireCooldown: 0
  };

  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private stars: Star[] = [];
  private drops: Drop[] = [];

  private keys: { [key: string]: boolean } = {};
  private touchPos = { x: 400, y: 380, isDown: false };
  private moveVec = { x: 0, y: 0 };

  constructor(callbacks: GameEngineCallbacks) {
    this.callbacks = callbacks;
    try {
      const saved = localStorage.getItem('gamescrafter_highscore_space-shooter');
      if (saved) this.highScore = Number(saved) || 0;
    } catch {}

    // Init background stars
    for (let i = 0; i < 60; i++) {
      this.stars.push({
        x: Math.random() * 800,
        y: Math.random() * 450,
        speed: 0.5 + Math.random() * 2,
        size: 1 + Math.random() * 2
      });
    }
  }

  public getCustomControls() {
    return {
      type: 'dpad' as const,
      buttons: [
        { id: 'bomb', label: '💣 BOMB', color: '#ef4444' },
        { id: 'fire', label: '⚡ FIRE', color: '#38bdf8' }
      ]
    };
  }

  public handlePointerDown(x: number, y: number) {
    this.touchPos = { x, y, isDown: true };
    if (this.state === 'menu' || this.state === 'gameover') {
      this.restart();
      return;
    }
    // Snap ship towards touch point smoothly
    this.ship.x = x;
    this.ship.y = y;
  }

  public handlePointerMove(x: number, y: number) {
    if (this.touchPos.isDown && this.state === 'playing') {
      this.ship.x = x;
      this.ship.y = y;
    }
  }

  public handlePointerUp() {
    this.touchPos.isDown = false;
  }

  public handleKeyDown(code: string) {
    this.keys[code] = true;
    if (code === 'Space' && (this.state === 'menu' || this.state === 'gameover')) {
      this.restart();
    }
    if (code === 'KeyB' || code === 'Enter') {
      this.triggerBomb();
    }
  }

  public handleKeyUp(code: string) {
    this.keys[code] = false;
  }

  public handleVirtualActionDown(action: string) {
    if (action === 'bomb') this.triggerBomb();
    if (action === 'left') this.moveVec.x = -1;
    if (action === 'right') this.moveVec.x = 1;
    if (action === 'up') this.moveVec.y = -1;
    if (action === 'down') this.moveVec.y = 1;
  }

  public handleVirtualActionUp(action: string) {
    if (action === 'left' && this.moveVec.x === -1) this.moveVec.x = 0;
    if (action === 'right' && this.moveVec.x === 1) this.moveVec.x = 0;
    if (action === 'up' && this.moveVec.y === -1) this.moveVec.y = 0;
    if (action === 'down' && this.moveVec.y === 1) this.moveVec.y = 0;
  }

  private triggerBomb() {
    if (this.ship.bombs <= 0 || this.state !== 'playing') return;
    this.ship.bombs--;
    soundManager.playExplosion();

    // Destroy all regular enemy bullets and damage enemies
    this.bullets = this.bullets.filter((b) => !b.isEnemy);
    for (const e of this.enemies) {
      e.hp -= 200;
    }
  }

  public restart() {
    this.state = 'playing';
    this.score = 0;
    this.wave = 1;
    this.bossActive = false;
    this.ship = {
      x: 400,
      y: 380,
      radius: 16,
      speed: 5.5,
      hp: 100,
      maxHp: 100,
      weaponTier: 1,
      bombs: 2,
      hasShield: false,
      shieldTimer: 0,
      fireCooldown: 0
    };
    this.enemies = [];
    this.bullets = [];
    this.drops = [];
    this.callbacks.onScoreUpdate(0);
    this.callbacks.onWaveUpdate?.(1);
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

    // Stars scrolling
    for (const s of this.stars) {
      s.y += s.speed;
      if (s.y > this.canvasHeight) {
        s.y = 0;
        s.x = Math.random() * this.canvasWidth;
      }
    }

    // Ship Keyboard Movement
    let mx = this.moveVec.x;
    let my = this.moveVec.y;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) mx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) mx += 1;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) my -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) my += 1;

    if (mx !== 0 || my !== 0) {
      this.ship.x += mx * this.ship.speed;
      this.ship.y += my * this.ship.speed;
    }

    this.ship.x = Math.max(20, Math.min(this.canvasWidth - 20, this.ship.x));
    this.ship.y = Math.max(20, Math.min(this.canvasHeight - 20, this.ship.y));

    // Shield Timer
    if (this.ship.shieldTimer > 0) {
      this.ship.shieldTimer -= dt;
      if (this.ship.shieldTimer <= 0) this.ship.hasShield = false;
    }

    // Auto Fire Player Blasters
    this.ship.fireCooldown--;
    if (this.ship.fireCooldown <= 0) {
      this.ship.fireCooldown = 8;
      soundManager.playLaser();

      if (this.ship.weaponTier === 1) {
        this.bullets.push({ x: this.ship.x, y: this.ship.y - 18, vx: 0, vy: -12, damage: 25, color: '#38bdf8' });
      } else if (this.ship.weaponTier === 2) {
        this.bullets.push({ x: this.ship.x - 8, y: this.ship.y - 18, vx: 0, vy: -12, damage: 25, color: '#38bdf8' });
        this.bullets.push({ x: this.ship.x + 8, y: this.ship.y - 18, vx: 0, vy: -12, damage: 25, color: '#38bdf8' });
      } else if (this.ship.weaponTier === 3) {
        this.bullets.push({ x: this.ship.x, y: this.ship.y - 18, vx: 0, vy: -13, damage: 30, color: '#a855f7' });
        this.bullets.push({ x: this.ship.x - 10, y: this.ship.y - 18, vx: -2.5, vy: -12, damage: 25, color: '#38bdf8' });
        this.bullets.push({ x: this.ship.x + 10, y: this.ship.y - 18, vx: 2.5, vy: -12, damage: 25, color: '#38bdf8' });
      } else {
        // Tier 4 Quantum Spread
        for (let i = -2; i <= 2; i++) {
          this.bullets.push({ x: this.ship.x + i * 4, y: this.ship.y - 18, vx: i * 2, vy: -14, damage: 35, color: '#fbbf24' });
        }
      }
    }

    // Spawn Enemy Waves
    if (!this.bossActive && Math.random() < 0.035 && this.enemies.length < 8) {
      const typeRand = Math.random();
      let type: 'scout' | 'fighter' | 'cruiser' = 'scout';
      let hp = 30 + this.wave * 10;
      let radius = 14;
      let color = '#22c55e';

      if (typeRand > 0.6) {
        type = 'fighter';
        hp = 50 + this.wave * 15;
        radius = 18;
        color = '#eab308';
      } else if (typeRand > 0.85) {
        type = 'cruiser';
        hp = 120 + this.wave * 30;
        radius = 26;
        color = '#ef4444';
      }

      this.enemies.push({
        x: 40 + Math.random() * (this.canvasWidth - 80),
        y: -30,
        vx: (Math.random() - 0.5) * 2,
        vy: 1.5 + Math.random() * 1.5,
        hp,
        maxHp: hp,
        radius,
        type,
        color,
        shootCooldown: 40 + Math.random() * 60
      });
    }

    // Spawn Boss on score threshold
    if (!this.bossActive && this.score > this.wave * 600) {
      this.bossActive = true;
      this.enemies.push({
        x: this.canvasWidth / 2,
        y: -60,
        vx: 2,
        vy: 0.8,
        hp: 500 + this.wave * 300,
        maxHp: 500 + this.wave * 300,
        radius: 45,
        type: 'boss',
        color: '#dc2626',
        shootCooldown: 30
      });
      soundManager.playLevelUp();
    }

    // Update Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.x += e.vx;
      e.y += e.vy;

      if (e.type === 'boss') {
        if (e.y > 90) e.vy = 0;
        if (e.x < 100 || e.x > this.canvasWidth - 100) e.vx *= -1;
      } else {
        if (e.x < 30 || e.x > this.canvasWidth - 30) e.vx *= -1;
      }

      // Enemy shooting
      e.shootCooldown--;
      if (e.shootCooldown <= 0 && e.y > 0) {
        if (e.type === 'boss') {
          for (let b = -2; b <= 2; b++) {
            this.bullets.push({ x: e.x, y: e.y + 35, vx: b * 1.5, vy: 5, damage: 15, color: '#f43f5e', isEnemy: true });
          }
          e.shootCooldown = 45;
        } else {
          this.bullets.push({ x: e.x, y: e.y + e.radius, vx: 0, vy: 5.5, damage: 12, color: '#f43f5e', isEnemy: true });
          e.shootCooldown = 80 + Math.random() * 40;
        }
      }

      // Check collision with ship
      const dist = Math.hypot(e.x - this.ship.x, e.y - this.ship.y);
      if (dist < e.radius + this.ship.radius) {
        if (!this.ship.hasShield) {
          this.ship.hp -= 25;
          soundManager.playExplosion();
          if (this.ship.hp <= 0) {
            this.gameOver();
            return;
          }
        }
      }

      if (e.y > this.canvasHeight + 40) {
        this.enemies.splice(i, 1);
      }
    }

    // Update Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx;
      b.y += b.vy;

      if (b.isEnemy) {
        // Enemy bullet hits player
        const dist = Math.hypot(b.x - this.ship.x, b.y - this.ship.y);
        if (dist < 18) {
          this.bullets.splice(i, 1);
          if (!this.ship.hasShield) {
            this.ship.hp -= b.damage;
            soundManager.playHit();
            if (this.ship.hp <= 0) {
              this.gameOver();
              return;
            }
          }
          continue;
        }
      } else {
        // Player bullet hits enemy
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          const dist = Math.hypot(b.x - e.x, b.y - e.y);
          if (dist < e.radius + 6) {
            e.hp -= b.damage;
            this.bullets.splice(i, 1);

            if (e.hp <= 0) {
              // Enemy destroyed
              const points = e.type === 'boss' ? 500 : e.type === 'cruiser' ? 80 : 30;
              this.score += points;
              this.callbacks.onScoreUpdate(this.score);
              soundManager.playExplosion();

              if (e.type === 'boss') {
                this.bossActive = false;
                this.wave++;
                this.callbacks.onWaveUpdate?.(this.wave);
                soundManager.playLevelUp();
              }

              // Powerup drop chance
              if (Math.random() < 0.3) {
                const types: Array<'weapon' | 'shield' | 'bomb' | 'heal'> = ['weapon', 'shield', 'bomb', 'heal'];
                this.drops.push({
                  x: e.x,
                  y: e.y,
                  type: types[Math.floor(Math.random() * types.length)],
                  radius: 12
                });
              }

              this.enemies.splice(j, 1);
            }
            break;
          }
        }
      }

      if (b.y < -20 || b.y > this.canvasHeight + 20) {
        this.bullets.splice(i, 1);
      }
    }

    // Update Drops
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.y += 2;
      const dist = Math.hypot(d.x - this.ship.x, d.y - this.ship.y);
      if (dist < d.radius + this.ship.radius) {
        soundManager.playPowerup();
        if (d.type === 'weapon') this.ship.weaponTier = Math.min(4, this.ship.weaponTier + 1);
        if (d.type === 'shield') {
          this.ship.hasShield = true;
          this.ship.shieldTimer = 10;
        }
        if (d.type === 'bomb') this.ship.bombs++;
        if (d.type === 'heal') this.ship.hp = Math.min(this.ship.maxHp, this.ship.hp + 35);
        this.drops.splice(i, 1);
        continue;
      }
      if (d.y > this.canvasHeight + 30) this.drops.splice(i, 1);
    }
  }

  private gameOver() {
    this.state = 'gameover';
    soundManager.playGameOver();
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        localStorage.setItem('gamescrafter_highscore_space-shooter', String(this.highScore));
      } catch {}
      this.callbacks.onHighScoreUpdate(this.highScore);
    }
    this.callbacks.onGameOver(this.score);
  }

  public render(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;

    // Deep Cosmic Background
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, width, height);

    // Stars
    ctx.fillStyle = '#ffffff';
    for (const s of this.stars) {
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }

    // Render Drops
    for (const d of this.drops) {
      ctx.save();
      ctx.fillStyle = d.type === 'weapon' ? '#fbbf24' : d.type === 'shield' ? '#38bdf8' : d.type === 'bomb' ? '#ef4444' : '#22c55e';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Render Bullets
    for (const b of this.bullets) {
      ctx.save();
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 8;
      ctx.fillRect(b.x - 2.5, b.y - 6, 5, 12);
      ctx.restore();
    }

    // Render Enemies
    for (const e of this.enemies) {
      ctx.save();
      ctx.fillStyle = e.color;
      ctx.shadowColor = e.color;
      ctx.shadowBlur = 12;

      if (e.type === 'boss') {
        // Colossal Boss Ship
        ctx.beginPath();
        ctx.moveTo(e.x, e.y + 40);
        ctx.lineTo(e.x + 60, e.y - 30);
        ctx.lineTo(e.x - 60, e.y - 30);
        ctx.closePath();
        ctx.fill();

        // Boss Health Bar
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(e.x - 50, e.y - 45, 100, 8);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(e.x - 50, e.y - 45, (e.hp / e.maxHp) * 100, 8);
      } else {
        // Regular Fighters
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Render Player Ship
    if (this.state === 'playing' || this.state === 'paused') {
      ctx.save();
      ctx.fillStyle = '#0284c7';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 15;

      // Delta Wing Ship
      ctx.beginPath();
      ctx.moveTo(this.ship.x, this.ship.y - 20);
      ctx.lineTo(this.ship.x + 18, this.ship.y + 14);
      ctx.lineTo(this.ship.x, this.ship.y + 8);
      ctx.lineTo(this.ship.x - 18, this.ship.y + 14);
      ctx.closePath();
      ctx.fill();

      // Shield Bubble
      if (this.ship.hasShield) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(this.ship.x, this.ship.y, 28, 0, Math.PI * 2);
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
      ctx.fillText(`WAVE: ${this.wave}`, 16, 48);
      ctx.fillText(`BOMBS: 💣 ${this.ship.bombs}`, 16, 70);

      // HP Bar
      const hpWidth = 120;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(width - hpWidth - 16, 14, hpWidth, 14);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(width - hpWidth - 16, 14, (this.ship.hp / this.ship.maxHp) * hpWidth, 14);
      ctx.strokeStyle = '#f8fafc';
      ctx.strokeRect(width - hpWidth - 16, 14, hpWidth, 14);
    }

    // Menu Overlay
    if (this.state === 'menu') {
      ctx.fillStyle = 'rgba(7, 12, 24, 0.85)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 32px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🚀 GALAXY STRIKE SHOOTER', width / 2, height / 2 - 50);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px sans-serif';
      ctx.fillText('Drag finger / WASD to fly ship • Blasters fire automatically', width / 2, height / 2);
      ctx.fillText('Defeat alien armadas, grab upgrades, and launch Screen-Clearing Bombs!', width / 2, height / 2 + 25);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.fillText('👉 TAP TO LAUNCH SHIP 👈', width / 2, height / 2 + 75);
    }

    // Game Over Overlay
    if (this.state === 'gameover') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 34px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SHIP DESTROYED!', width / 2, height / 2 - 50);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '16px Orbitron, sans-serif';
      ctx.fillText(`FINAL SCORE: ${this.score}`, width / 2, height / 2 - 10);
      ctx.fillText(`WAVE REACHED: ${this.wave}`, width / 2, height / 2 + 15);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.fillText('TAP TO RETRY MISSION', width / 2, height / 2 + 65);
    }
  }
}
