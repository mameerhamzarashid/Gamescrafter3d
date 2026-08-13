import { GameEngineCallbacks, GameEngineInstance } from './types';
import { soundManager } from '../utils/audio';

interface Enemy {
  x: number;
  y: number;
  vx: number;
  hp: number;
  maxHp: number;
  type: 'ronin' | 'gunner' | 'boss';
  color: string;
  attackCooldown: number;
}

interface Shuriken {
  x: number;
  y: number;
  vx: number;
  rotation: number;
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

export class NinjaActionEngine implements GameEngineInstance {
  private callbacks: GameEngineCallbacks;
  private canvasWidth = 800;
  private canvasHeight = 450;
  private groundY = 360;

  private state: 'menu' | 'playing' | 'paused' | 'gameover' = 'menu';
  private score = 0;
  private highScore = 0;
  private combo = 0;
  private energy = 100;
  private wave = 1;

  // Player Ninja
  private ninja = {
    x: 150,
    y: 300,
    vx: 0,
    vy: 0,
    width: 28,
    height: 48,
    hp: 100,
    maxHp: 100,
    isSlashing: false,
    slashTimer: 0,
    slashCombo: 1,
    isGrounded: true,
    facing: 1 // 1 for right, -1 for left
  };

  private enemies: Enemy[] = [];
  private shurikens: Shuriken[] = [];
  private particles: Particle[] = [];

  private keys: { [key: string]: boolean } = {};
  private touchMove = 0;

  constructor(callbacks: GameEngineCallbacks) {
    this.callbacks = callbacks;
    try {
      const saved = localStorage.getItem('gamescrafter_highscore_ninja-action');
      if (saved) this.highScore = Number(saved) || 0;
    } catch {}
  }

  public getCustomControls() {
    return {
      type: 'fighter' as const,
      buttons: [
        { id: 'left', label: '◀️', color: '#38bdf8' },
        { id: 'right', label: '▶️', color: '#38bdf8' },
        { id: 'jump', label: '⬆️ JUMP', color: '#38bdf8' },
        { id: 'slash', label: '⚔️ KATANA', color: '#ef4444' },
        { id: 'shuriken', label: '⭐ SHURIKEN', color: '#f59e0b' },
        { id: 'dash', label: '💨 SHADOW DASH', color: '#a855f7' }
      ]
    };
  }

  public handlePointerDown(x: number) {
    if (this.state === 'menu' || this.state === 'gameover') {
      this.restart();
      return;
    }
    // Tap left side = attack, tap right side = attack
    this.slash();
  }

  public handleKeyDown(code: string) {
    this.keys[code] = true;
    if (code === 'Space' && (this.state === 'menu' || this.state === 'gameover')) {
      this.restart();
    }
    if (code === 'KeyJ' || code === 'KeyZ') this.slash();
    if (code === 'KeyK' || code === 'KeyX') this.throwShuriken();
    if (code === 'KeyL' || code === 'KeyC') this.shadowDash();
    if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') this.jump();
  }

  public handleKeyUp(code: string) {
    this.keys[code] = false;
  }

  public handleVirtualActionDown(action: string) {
    if (action === 'left') this.touchMove = -1;
    if (action === 'right') this.touchMove = 1;
    if (action === 'jump') this.jump();
    if (action === 'slash') this.slash();
    if (action === 'shuriken') this.throwShuriken();
    if (action === 'dash') this.shadowDash();
  }

  public handleVirtualActionUp(action: string) {
    if (action === 'left' && this.touchMove === -1) this.touchMove = 0;
    if (action === 'right' && this.touchMove === 1) this.touchMove = 0;
  }

  private jump() {
    if (this.ninja.isGrounded && this.state === 'playing') {
      this.ninja.vy = -13;
      this.ninja.isGrounded = false;
      soundManager.playJump();
    }
  }

  private slash() {
    if (this.state !== 'playing') return;
    this.ninja.isSlashing = true;
    this.ninja.slashTimer = 15;
    this.ninja.slashCombo = (this.ninja.slashCombo % 3) + 1;
    soundManager.playSlash();

    // Damage enemies in front
    const hitX = this.ninja.x + (this.ninja.facing === 1 ? 20 : -50);
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (Math.abs(e.x - hitX) < 45 && Math.abs(e.y - this.ninja.y) < 50) {
        e.hp -= 40;
        e.x += this.ninja.facing * 30; // Knockback
        this.combo++;
        this.score += 25 * this.combo;
        this.energy = Math.min(100, this.energy + 10);
        this.callbacks.onScoreUpdate(this.score);
        soundManager.playHit();

        // Blood / Slash sparks
        for (let p = 0; p < 8; p++) {
          this.particles.push({
            x: e.x,
            y: e.y + 20,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 0.35,
            color: '#ef4444',
            size: 4
          });
        }

        if (e.hp <= 0) {
          soundManager.playExplosion();
          this.enemies.splice(i, 1);
        }
      }
    }
  }

  private throwShuriken() {
    if (this.state !== 'playing') return;
    this.shurikens.push({
      x: this.ninja.x + (this.ninja.facing === 1 ? 20 : -10),
      y: this.ninja.y + 20,
      vx: this.ninja.facing * 12,
      rotation: 0
    });
    soundManager.playLaser();
  }

  private shadowDash() {
    if (this.energy < 30 || this.state !== 'playing') return;
    this.energy -= 30;
    this.ninja.x += this.ninja.facing * 140;
    this.ninja.x = Math.max(30, Math.min(this.canvasWidth - 30, this.ninja.x));
    soundManager.playSwoosh();

    // Dash trail
    for (let i = 0; i < 12; i++) {
      this.particles.push({
        x: this.ninja.x - this.ninja.facing * i * 10,
        y: this.ninja.y + 20,
        vx: 0,
        vy: 0,
        life: 0.4,
        color: '#a855f7',
        size: 6
      });
    }
  }

  public restart() {
    this.state = 'playing';
    this.score = 0;
    this.combo = 0;
    this.energy = 100;
    this.wave = 1;
    this.ninja = {
      x: 150,
      y: 300,
      vx: 0,
      vy: 0,
      width: 28,
      height: 48,
      hp: 100,
      maxHp: 100,
      isSlashing: false,
      slashTimer: 0,
      slashCombo: 1,
      isGrounded: true,
      facing: 1
    };
    this.enemies = [];
    this.shurikens = [];
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

    // Movement
    let move = this.touchMove;
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) move = -1;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) move = 1;

    if (move !== 0) {
      this.ninja.facing = move;
      this.ninja.x += move * 5.5;
    }

    this.ninja.x = Math.max(30, Math.min(this.canvasWidth - 30, this.ninja.x));

    // Gravity
    this.ninja.vy += 0.65;
    this.ninja.y += this.ninja.vy;

    if (this.ninja.y >= this.groundY - this.ninja.height) {
      this.ninja.y = this.groundY - this.ninja.height;
      this.ninja.vy = 0;
      this.ninja.isGrounded = true;
    }

    if (this.ninja.slashTimer > 0) {
      this.ninja.slashTimer--;
      if (this.ninja.slashTimer <= 0) this.ninja.isSlashing = false;
    }

    // Energy recharge
    this.energy = Math.min(100, this.energy + 8 * dt);

    // Spawn Enemy Waves
    if (Math.random() < 0.025 && this.enemies.length < 5) {
      const fromRight = Math.random() < 0.7;
      const type = Math.random() < 0.7 ? 'ronin' : 'gunner';
      this.enemies.push({
        x: fromRight ? this.canvasWidth + 20 : -20,
        y: this.groundY - 48,
        vx: fromRight ? -2.2 : 2.2,
        hp: type === 'ronin' ? 50 : 35,
        maxHp: type === 'ronin' ? 50 : 35,
        type,
        color: type === 'ronin' ? '#dc2626' : '#ea580c',
        attackCooldown: 40
      });
    }

    // Update Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      // Move towards ninja
      const dx = this.ninja.x - e.x;
      e.vx = dx > 0 ? 2 : -2;
      e.x += e.vx;

      // Attack ninja
      if (Math.abs(dx) < 35 && Math.abs(e.y - this.ninja.y) < 30) {
        e.attackCooldown--;
        if (e.attackCooldown <= 0) {
          e.attackCooldown = 50;
          this.ninja.hp -= 15;
          this.combo = 0;
          soundManager.playHit();
          if (this.ninja.hp <= 0) {
            this.gameOver();
            return;
          }
        }
      }
    }

    // Update Shurikens
    for (let i = this.shurikens.length - 1; i >= 0; i--) {
      const s = this.shurikens[i];
      s.x += s.vx;
      s.rotation += 0.4;

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (Math.abs(s.x - e.x) < 25 && Math.abs(s.y - (e.y + 20)) < 25) {
          e.hp -= 25;
          this.shurikens.splice(i, 1);
          soundManager.playHit();
          if (e.hp <= 0) {
            this.score += 50;
            this.callbacks.onScoreUpdate(this.score);
            this.enemies.splice(j, 1);
          }
          break;
        }
      }

      if (s.x < -30 || s.x > this.canvasWidth + 30) {
        this.shurikens.splice(i, 1);
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
    soundManager.playGameOver();
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        localStorage.setItem('gamescrafter_highscore_ninja-action', String(this.highScore));
      } catch {}
      this.callbacks.onHighScoreUpdate(this.highScore);
    }
    this.callbacks.onGameOver(this.score);
  }

  public render(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;

    // Moonlight Cyber Rooftop
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#020617');
    skyGrad.addColorStop(0.6, '#0f172a');
    skyGrad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Neon Cyber Moon
    ctx.fillStyle = '#f8fafc';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(width - 120, 90, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Traditional Pagoda Roof Floor
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, this.groundY, width, height - this.groundY);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.lineTo(width, this.groundY);
    ctx.stroke();

    // Render Enemies
    for (const e of this.enemies) {
      ctx.save();
      ctx.fillStyle = e.color;
      ctx.shadowColor = e.color;
      ctx.shadowBlur = 8;
      ctx.fillRect(e.x - 14, e.y, 28, 48);

      // Enemy Mask
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(e.x - 6, e.y + 10, 12, 6);
      ctx.restore();
    }

    // Render Shurikens
    for (const s of this.shurikens) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rotation);
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8;
      ctx.fillRect(-6, -6, 12, 12);
      ctx.restore();
    }

    // Render Particles
    for (const p of this.particles) {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.restore();
    }

    // Render Ninja Player
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 12;

    // Body
    ctx.fillRect(this.ninja.x - this.ninja.width / 2, this.ninja.y, this.ninja.width, this.ninja.height);

    // Cyan Ninja Headband / Scarf
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(this.ninja.x - this.ninja.width / 2, this.ninja.y + 8, this.ninja.width, 6);
    // Trailing ribbon
    ctx.fillRect(this.ninja.x - this.ninja.facing * 20, this.ninja.y + 10, 16, 4);

    // Glowing Eye Visor
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(this.ninja.x + (this.ninja.facing === 1 ? 4 : -10), this.ninja.y + 8, 8, 4);

    // Katana Slash Arc
    if (this.ninja.isSlashing) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      const slashX = this.ninja.x + this.ninja.facing * 25;
      ctx.arc(slashX, this.ninja.y + 20, 32, this.ninja.facing === 1 ? -Math.PI / 3 : Math.PI * 0.7, this.ninja.facing === 1 ? Math.PI / 3 : Math.PI * 1.3);
      ctx.stroke();
    }
    ctx.restore();

    // Top HUD
    if (this.state === 'playing') {
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`SCORE: ${this.score}`, 20, 30);
      ctx.fillText(`COMBO: 🔥 x${this.combo}`, 20, 56);

      // HP Bar & Energy Bar
      const bWidth = 140;
      // HP
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(width - bWidth - 20, 16, bWidth, 12);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(width - bWidth - 20, 16, (this.ninja.hp / this.ninja.maxHp) * bWidth, 12);
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(width - bWidth - 20, 16, bWidth, 12);

      // Energy
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(width - bWidth - 20, 34, bWidth, 10);
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(width - bWidth - 20, 34, (this.energy / 100) * bWidth, 10);
      ctx.strokeRect(width - bWidth - 20, 34, bWidth, 10);
    }

    // Menu Overlay
    if (this.state === 'menu') {
      ctx.fillStyle = 'rgba(7, 12, 24, 0.85)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 32px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🥷 CYBER NINJA: SHADOW BLADE', width / 2, height / 2 - 50);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px sans-serif';
      ctx.fillText('Execute Katana Slashes, Shuriken Throws & Shadow Dashes', width / 2, height / 2);
      ctx.fillText('Defeat waves of rival cyborg assassins on moonlight rooftops!', width / 2, height / 2 + 25);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.fillText('👉 TAP TO DRAW BLADE 👈', width / 2, height / 2 + 75);
    }

    // Game Over
    if (this.state === 'gameover') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 34px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FALLEN IN BATTLE!', width / 2, height / 2 - 50);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '16px Orbitron, sans-serif';
      ctx.fillText(`FINAL NINJA SCORE: ${this.score}`, width / 2, height / 2 - 10);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.fillText('TAP TO RETRY TRIAL', width / 2, height / 2 + 55);
    }
  }
}
