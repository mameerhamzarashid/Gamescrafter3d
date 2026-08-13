import { GameEngineCallbacks, GameEngineInstance } from './types';
import { soundManager } from '../utils/audio';

interface Zombie {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  type: 'walker' | 'runner' | 'brute' | 'spitter';
  color: string;
  shootCooldown?: number;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  color: string;
  isZombie?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Pickup {
  x: number;
  y: number;
  type: 'medkit' | 'ammo' | 'shotgun' | 'plasma' | 'nuke';
  radius: number;
  duration: number;
}

export class ZombieSurvivalEngine implements GameEngineInstance {
  private callbacks: GameEngineCallbacks;
  private canvasWidth = 800;
  private canvasHeight = 450;

  private state: 'menu' | 'playing' | 'paused' | 'gameover' = 'menu';
  private score = 0;
  private highScore = 0;
  private wave = 1;
  private waveTimer = 0;
  private waveState: 'spawning' | 'intermission' = 'intermission';
  private intermissionTimer = 3;

  // Player
  private player = {
    x: 400,
    y: 225,
    radius: 16,
    speed: 3.5,
    hp: 100,
    maxHp: 100,
    angle: 0,
    weapon: 'pistol' as 'pistol' | 'shotgun' | 'plasma',
    ammo: {
      pistol: Infinity,
      shotgun: 24,
      plasma: 60
    },
    fireCooldown: 0,
    invincibleTimer: 0
  };

  private zombies: Zombie[] = [];
  private bullets: Bullet[] = [];
  private particles: Particle[] = [];
  private pickups: Pickup[] = [];

  // Input tracking
  private keys: { [key: string]: boolean } = {};
  private moveVec = { x: 0, y: 0 };
  private aimVec = { x: 0, y: 0 };
  private isAutoFiring = false;
  private pointerPos = { x: 400, y: 225, isDown: false };

  constructor(callbacks: GameEngineCallbacks) {
    this.callbacks = callbacks;
    try {
      const saved = localStorage.getItem('gamescrafter_highscore_zombie-survival');
      if (saved) this.highScore = Number(saved) || 0;
    } catch {}
  }

  public getCustomControls() {
    return {
      type: 'dual-stick' as const,
      buttons: [
        { id: 'pistol', label: '🔫 Pistol', color: '#38bdf8' },
        { id: 'shotgun', label: '💥 Shotgun', color: '#f59e0b' },
        { id: 'plasma', label: '⚡ Plasma', color: '#a855f7' }
      ]
    };
  }

  public handlePointerDown(x: number, y: number) {
    this.pointerPos = { x, y, isDown: true };
    if (this.state === 'menu' || this.state === 'gameover') {
      this.restart();
      return;
    }
    // Aim towards touch point
    const dx = x - this.player.x;
    const dy = y - this.player.y;
    this.player.angle = Math.atan2(dy, dx);
    this.isAutoFiring = true;
  }

  public handlePointerMove(x: number, y: number) {
    this.pointerPos.x = x;
    this.pointerPos.y = y;
    if (this.state === 'playing') {
      const dx = x - this.player.x;
      const dy = y - this.player.y;
      this.player.angle = Math.atan2(dy, dx);
    }
  }

  public handlePointerUp() {
    this.pointerPos.isDown = false;
    this.isAutoFiring = false;
  }

  public handleKeyDown(code: string) {
    this.keys[code] = true;
    if (code === 'Digit1') this.player.weapon = 'pistol';
    if (code === 'Digit2' && this.player.ammo.shotgun > 0) this.player.weapon = 'shotgun';
    if (code === 'Digit3' && this.player.ammo.plasma > 0) this.player.weapon = 'plasma';
    if (code === 'Space' && (this.state === 'menu' || this.state === 'gameover')) {
      this.restart();
    }
  }

  public handleKeyUp(code: string) {
    this.keys[code] = false;
  }

  public handleVirtualActionDown(action: string) {
    if (action === 'pistol') this.player.weapon = 'pistol';
    if (action === 'shotgun') this.player.weapon = 'shotgun';
    if (action === 'plasma') this.player.weapon = 'plasma';
    if (action === 'fire') this.isAutoFiring = true;
    if (action === 'left') this.moveVec.x = -1;
    if (action === 'right') this.moveVec.x = 1;
    if (action === 'up') this.moveVec.y = -1;
    if (action === 'down') this.moveVec.y = 1;
  }

  public handleVirtualActionUp(action: string) {
    if (action === 'fire') this.isAutoFiring = false;
    if (action === 'left' && this.moveVec.x === -1) this.moveVec.x = 0;
    if (action === 'right' && this.moveVec.x === 1) this.moveVec.x = 0;
    if (action === 'up' && this.moveVec.y === -1) this.moveVec.y = 0;
    if (action === 'down' && this.moveVec.y === 1) this.moveVec.y = 0;
  }

  public restart() {
    this.state = 'playing';
    this.score = 0;
    this.wave = 1;
    this.waveState = 'intermission';
    this.intermissionTimer = 2;
    this.player = {
      x: 400,
      y: 225,
      radius: 16,
      speed: 3.5,
      hp: 100,
      maxHp: 100,
      angle: 0,
      weapon: 'pistol',
      ammo: { pistol: Infinity, shotgun: 30, plasma: 75 },
      fireCooldown: 0,
      invincibleTimer: 0
    };
    this.zombies = [];
    this.bullets = [];
    this.particles = [];
    this.pickups = [];
    this.callbacks.onScoreUpdate(0);
    this.callbacks.onWaveUpdate?.(1);
    this.callbacks.onHealthUpdate?.(100, 100);
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

  private shoot() {
    if (this.player.fireCooldown > 0) return;

    const angle = this.player.angle;
    const spawnDist = this.player.radius + 6;
    const sx = this.player.x + Math.cos(angle) * spawnDist;
    const sy = this.player.y + Math.sin(angle) * spawnDist;

    if (this.player.weapon === 'pistol') {
      this.bullets.push({
        x: sx,
        y: sy,
        vx: Math.cos(angle) * 11,
        vy: Math.sin(angle) * 11,
        damage: 25,
        radius: 3.5,
        color: '#38bdf8'
      });
      this.player.fireCooldown = 12;
      soundManager.playLaser();
    } else if (this.player.weapon === 'shotgun') {
      if (this.player.ammo.shotgun <= 0) {
        this.player.weapon = 'pistol';
        return;
      }
      this.player.ammo.shotgun--;
      for (let i = -2; i <= 2; i++) {
        const spread = angle + (i * 0.12);
        this.bullets.push({
          x: sx,
          y: sy,
          vx: Math.cos(spread) * (9 + Math.random() * 2),
          vy: Math.sin(spread) * (9 + Math.random() * 2),
          damage: 18,
          radius: 3,
          color: '#fbbf24'
        });
      }
      this.player.fireCooldown = 22;
      soundManager.playHit();
    } else if (this.player.weapon === 'plasma') {
      if (this.player.ammo.plasma <= 0) {
        this.player.weapon = 'pistol';
        return;
      }
      this.player.ammo.plasma--;
      this.bullets.push({
        x: sx,
        y: sy,
        vx: Math.cos(angle) * 14,
        vy: Math.sin(angle) * 14,
        damage: 40,
        radius: 5,
        color: '#c084fc'
      });
      this.player.fireCooldown = 6;
      soundManager.playLaser();
    }

    // Muzzle flash particle
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: sx,
        y: sy,
        vx: Math.cos(angle) * 3 + (Math.random() - 0.5) * 2,
        vy: Math.sin(angle) * 3 + (Math.random() - 0.5) * 2,
        life: 0.2,
        maxLife: 0.2,
        color: '#fef08a',
        size: 3
      });
    }
  }

  private spawnWaveZombies() {
    const totalZombies = 8 + this.wave * 4;
    for (let i = 0; i < totalZombies; i++) {
      // Spawn at canvas perimeter
      let x = 0;
      let y = 0;
      if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? -30 : this.canvasWidth + 30;
        y = Math.random() * this.canvasHeight;
      } else {
        x = Math.random() * this.canvasWidth;
        y = Math.random() < 0.5 ? -30 : this.canvasHeight + 30;
      }

      const rand = Math.random();
      let type: 'walker' | 'runner' | 'brute' | 'spitter' = 'walker';
      let hp = 30 + this.wave * 5;
      let speed = 1.3 + Math.random() * 0.4;
      let radius = 14;
      let color = '#22c55e';

      if (this.wave >= 2 && rand > 0.65) {
        type = 'runner';
        hp = 20 + this.wave * 3;
        speed = 2.4 + Math.random() * 0.5;
        radius = 12;
        color = '#eab308';
      } else if (this.wave >= 3 && rand > 0.85) {
        type = 'brute';
        hp = 120 + this.wave * 20;
        speed = 0.8;
        radius = 22;
        color = '#ef4444';
      } else if (this.wave >= 4 && rand < 0.2) {
        type = 'spitter';
        hp = 45 + this.wave * 5;
        speed = 1.1;
        radius = 15;
        color = '#a855f7';
      }

      this.zombies.push({
        x,
        y,
        hp,
        maxHp: hp,
        speed,
        radius,
        type,
        color,
        shootCooldown: 60 + Math.random() * 60
      });
    }
  }

  public update(dt: number) {
    if (this.state !== 'playing') return;

    // Wave Progression
    if (this.waveState === 'intermission') {
      this.intermissionTimer -= dt;
      if (this.intermissionTimer <= 0) {
        this.waveState = 'spawning';
        this.spawnWaveZombies();
      }
    } else if (this.waveState === 'spawning') {
      if (this.zombies.length === 0) {
        this.wave++;
        this.waveState = 'intermission';
        this.intermissionTimer = 2.5;
        this.score += 250;
        this.callbacks.onScoreUpdate(this.score);
        this.callbacks.onWaveUpdate?.(this.wave);
        soundManager.playLevelUp();
      }
    }

    // Player Movement (WASD / Arrows / Virtual stick)
    let mx = this.moveVec.x;
    let my = this.moveVec.y;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) mx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) mx += 1;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) my -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) my += 1;

    const len = Math.hypot(mx, my);
    if (len > 0) {
      this.player.x += (mx / len) * this.player.speed;
      this.player.y += (my / len) * this.player.speed;
    }

    // Clamp inside arena
    this.player.x = Math.max(this.player.radius, Math.min(this.canvasWidth - this.player.radius, this.player.x));
    this.player.y = Math.max(this.player.radius, Math.min(this.canvasHeight - this.player.radius, this.player.y));

    // Shooting
    if (this.player.fireCooldown > 0) this.player.fireCooldown--;
    if (this.player.invincibleTimer > 0) this.player.invincibleTimer--;

    if (this.isAutoFiring || this.keys['Space']) {
      this.shoot();
    }

    // Update Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx;
      b.y += b.vy;

      // Offscreen
      if (b.x < 0 || b.x > this.canvasWidth || b.y < 0 || b.y > this.canvasHeight) {
        this.bullets.splice(i, 1);
        continue;
      }

      if (b.isZombie) {
        // Zombie bullet hits player
        const dist = Math.hypot(b.x - this.player.x, b.y - this.player.y);
        if (dist < b.radius + this.player.radius) {
          this.bullets.splice(i, 1);
          if (this.player.invincibleTimer <= 0) {
            this.player.hp -= b.damage;
            this.player.invincibleTimer = 15;
            this.callbacks.onHealthUpdate?.(this.player.hp, this.player.maxHp);
            soundManager.playHit();
            if (this.player.hp <= 0) {
              this.gameOver();
            }
          }
          continue;
        }
      } else {
        // Player bullet hits zombie
        let bulletHit = false;
        for (let j = this.zombies.length - 1; j >= 0; j--) {
          const z = this.zombies[j];
          const dist = Math.hypot(b.x - z.x, b.y - z.y);
          if (dist < b.radius + z.radius) {
            z.hp -= b.damage;
            bulletHit = true;

            // Blood splatter particles
            for (let k = 0; k < 4; k++) {
              this.particles.push({
                x: z.x,
                y: z.y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 0.3,
                maxLife: 0.3,
                color: '#22c55e',
                size: 3
              });
            }

            if (z.hp <= 0) {
              // Zombie died
              this.score += z.type === 'brute' ? 60 : z.type === 'runner' ? 25 : 15;
              this.callbacks.onScoreUpdate(this.score);
              soundManager.playExplosion();

              // Drop pickup chance
              if (Math.random() < 0.25) {
                const types: Array<'medkit' | 'ammo' | 'shotgun' | 'plasma' | 'nuke'> = ['medkit', 'ammo', 'shotgun', 'plasma'];
                const pType = types[Math.floor(Math.random() * types.length)];
                this.pickups.push({
                  x: z.x,
                  y: z.y,
                  type: pType,
                  radius: 12,
                  duration: 400
                });
              }

              this.zombies.splice(j, 1);
            }
            break;
          }
        }
        if (bulletHit) {
          this.bullets.splice(i, 1);
        }
      }
    }

    // Update Zombies
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];
      const dx = this.player.x - z.x;
      const dy = this.player.y - z.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0) {
        z.x += (dx / dist) * z.speed;
        z.y += (dy / dist) * z.speed;
      }

      // Spitter zombie shoots acid
      if (z.type === 'spitter' && z.shootCooldown !== undefined) {
        z.shootCooldown--;
        if (z.shootCooldown <= 0 && dist < 300) {
          const sAngle = Math.atan2(dy, dx);
          this.bullets.push({
            x: z.x,
            y: z.y,
            vx: Math.cos(sAngle) * 5,
            vy: Math.sin(sAngle) * 5,
            damage: 15,
            radius: 4,
            color: '#a855f7',
            isZombie: true
          });
          z.shootCooldown = 90;
        }
      }

      // Melee attack player
      if (dist < z.radius + this.player.radius) {
        if (this.player.invincibleTimer <= 0) {
          const dmg = z.type === 'brute' ? 30 : z.type === 'runner' ? 12 : 15;
          this.player.hp -= dmg;
          this.player.invincibleTimer = 25;
          this.callbacks.onHealthUpdate?.(this.player.hp, this.player.maxHp);
          soundManager.playHit();

          if (this.player.hp <= 0) {
            this.gameOver();
          }
        }
      }
    }

    // Update Pickups
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.duration--;
      const dist = Math.hypot(p.x - this.player.x, p.y - this.player.y);
      if (dist < p.radius + this.player.radius) {
        soundManager.playScore();
        if (p.type === 'medkit') {
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + 35);
          this.callbacks.onHealthUpdate?.(this.player.hp, this.player.maxHp);
        } else if (p.type === 'ammo') {
          this.player.ammo.shotgun += 15;
          this.player.ammo.plasma += 40;
        } else if (p.type === 'shotgun') {
          this.player.weapon = 'shotgun';
          this.player.ammo.shotgun += 20;
        } else if (p.type === 'plasma') {
          this.player.weapon = 'plasma';
          this.player.ammo.plasma += 50;
        }
        this.pickups.splice(i, 1);
        continue;
      }
      if (p.duration <= 0) {
        this.pickups.splice(i, 1);
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const part = this.particles[i];
      part.x += part.vx;
      part.y += part.vy;
      part.life -= dt;
      if (part.life <= 0) this.particles.splice(i, 1);
    }
  }

  private gameOver() {
    this.state = 'gameover';
    soundManager.playGameOver();
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        localStorage.setItem('gamescrafter_highscore_zombie-survival', String(this.highScore));
      } catch {}
      this.callbacks.onHighScoreUpdate(this.highScore);
    }
    this.callbacks.onGameOver(this.score);
  }

  public render(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;

    // Dark cyber bunker floor
    ctx.fillStyle = '#080d1a';
    ctx.fillRect(0, 0, width, height);

    // Floor grid
    ctx.strokeStyle = 'rgba(30, 58, 138, 0.2)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Hazard borders
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, width - 4, height - 4);

    // Render Pickups
    for (const p of this.pickups) {
      ctx.save();
      ctx.shadowColor = p.type === 'medkit' ? '#22c55e' : p.type === 'ammo' ? '#fbbf24' : '#a855f7';
      ctx.shadowBlur = 10;
      ctx.fillStyle = p.type === 'medkit' ? '#22c55e' : p.type === 'ammo' ? '#fbbf24' : '#a855f7';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();

      // Icon text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = p.type === 'medkit' ? '+' : p.type === 'ammo' ? 'AM' : 'WP';
      ctx.fillText(label, p.x, p.y);
      ctx.restore();
    }

    // Render Zombies
    for (const z of this.zombies) {
      ctx.save();
      ctx.fillStyle = z.color;
      ctx.shadowColor = z.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
      ctx.fill();

      // Zombie Eyes
      const angle = Math.atan2(this.player.y - z.y, this.player.x - z.x);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(z.x + Math.cos(angle + 0.5) * (z.radius * 0.6), z.y + Math.sin(angle + 0.5) * (z.radius * 0.6), 2.5, 0, Math.PI * 2);
      ctx.arc(z.x + Math.cos(angle - 0.5) * (z.radius * 0.6), z.y + Math.sin(angle - 0.5) * (z.radius * 0.6), 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Health bar above brute
      if (z.type === 'brute' || z.hp < z.maxHp) {
        ctx.fillStyle = '#374151';
        ctx.fillRect(z.x - 16, z.y - z.radius - 8, 32, 4);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(z.x - 16, z.y - z.radius - 8, (z.hp / z.maxHp) * 32, 4);
      }
      ctx.restore();
    }

    // Render Bullets
    for (const b of this.bullets) {
      ctx.save();
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Render Particles
    for (const part of this.particles) {
      ctx.save();
      ctx.fillStyle = part.color;
      ctx.globalAlpha = Math.max(0, part.life / part.maxLife);
      ctx.fillRect(part.x - part.size / 2, part.y - part.size / 2, part.size, part.size);
      ctx.restore();
    }

    // Render Player
    if (this.state === 'playing' || this.state === 'paused') {
      ctx.save();
      if (this.player.invincibleTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
        ctx.globalAlpha = 0.4;
      }

      // Player circle
      ctx.fillStyle = '#0284c7';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
      ctx.fill();

      // Gun Barrel
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(this.player.x, this.player.y);
      ctx.lineTo(
        this.player.x + Math.cos(this.player.angle) * (this.player.radius + 10),
        this.player.y + Math.sin(this.player.angle) * (this.player.radius + 10)
      );
      ctx.stroke();

      // Flashlight Cone
      const grad = ctx.createRadialGradient(
        this.player.x, this.player.y, 10,
        this.player.x + Math.cos(this.player.angle) * 120,
        this.player.y + Math.sin(this.player.angle) * 120, 140
      );
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.15)');
      grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(this.player.x, this.player.y);
      ctx.arc(this.player.x, this.player.y, 150, this.player.angle - 0.45, this.player.angle + 0.45);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    // HUD Display
    if (this.state === 'playing') {
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 14px Orbitron, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`SCORE: ${this.score}`, 16, 26);
      ctx.fillText(`WAVE: ${this.wave}`, 16, 48);

      // Weapon & Ammo
      ctx.fillStyle = '#38bdf8';
      const ammoCount = this.player.weapon === 'pistol' ? '∞' : this.player.ammo[this.player.weapon];
      ctx.fillText(`WEAPON: ${this.player.weapon.toUpperCase()} [${ammoCount}]`, 16, 70);

      // Health Bar
      const hpWidth = 140;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(width - hpWidth - 16, 14, hpWidth, 16);
      ctx.fillStyle = this.player.hp > 40 ? '#22c55e' : '#ef4444';
      ctx.fillRect(width - hpWidth - 16, 14, (Math.max(0, this.player.hp) / this.player.maxHp) * hpWidth, 16);
      ctx.strokeStyle = '#64748b';
      ctx.strokeRect(width - hpWidth - 16, 14, hpWidth, 16);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`HP: ${Math.max(0, this.player.hp)} / 100`, width - hpWidth / 2 - 16, 26);

      if (this.waveState === 'intermission') {
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 22px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`WAVE ${this.wave} INCOMING...`, width / 2, height / 2 - 40);
      }
    }

    // Menu Overlay
    if (this.state === 'menu') {
      ctx.fillStyle = 'rgba(7, 12, 24, 0.85)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 32px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🧟 ZOMBIE SURVIVAL', width / 2, height / 2 - 50);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px sans-serif';
      ctx.fillText('Touch & drag / WASD to move • Tap screen to aim & shoot', width / 2, height / 2);
      ctx.fillText('Survive waves, collect weapon drops, and fight bosses!', width / 2, height / 2 + 25);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.fillText('👉 TAP OR PRESS SPACE TO START 👈', width / 2, height / 2 + 75);
    }

    // Game Over Overlay
    if (this.state === 'gameover') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 34px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('YOU WERE OVERRUN!', width / 2, height / 2 - 55);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '16px Orbitron, sans-serif';
      ctx.fillText(`FINAL SCORE: ${this.score}`, width / 2, height / 2 - 10);
      ctx.fillText(`WAVE REACHED: ${this.wave}`, width / 2, height / 2 + 15);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.fillText('TAP TO PLAY AGAIN', width / 2, height / 2 + 65);
    }
  }
}
