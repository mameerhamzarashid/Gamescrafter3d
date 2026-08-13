import { GameEngineCallbacks, GameEngineInstance } from './types';
import { soundManager } from '../utils/audio';

interface PathPoint {
  x: number;
  y: number;
}

interface Creep {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  baseSpeed: number;
  radius: number;
  type: 'scout' | 'drone' | 'armored' | 'boss';
  color: string;
  pathIndex: number;
  reward: number;
  slowTimer: number;
}

interface Tower {
  x: number;
  y: number;
  type: 'gatling' | 'laser' | 'cryo' | 'mortar';
  level: number;
  range: number;
  damage: number;
  fireRate: number;
  fireCooldown: number;
  target: Creep | null;
  cost: number;
}

interface Projectile {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  targetCreep: Creep | null;
  speed: number;
  damage: number;
  type: 'bullet' | 'mortar' | 'laser';
  color: string;
  splashRadius?: number;
}

export class TowerDefenseEngine implements GameEngineInstance {
  private callbacks: GameEngineCallbacks;
  private canvasWidth = 800;
  private canvasHeight = 450;

  private state: 'menu' | 'playing' | 'paused' | 'gameover' = 'menu';
  private score = 0;
  private highScore = 0;
  private gold = 350;
  private baseHp = 10;
  private maxBaseHp = 10;
  private wave = 1;
  private waveActive = false;
  private creepsToSpawn: Array<{ type: 'scout' | 'drone' | 'armored' | 'boss'; delay: number }> = [];
  private spawnTimer = 0;

  private selectedTowerType: 'gatling' | 'laser' | 'cryo' | 'mortar' = 'gatling';
  private selectedPlacedTower: Tower | null = null;

  // Path Waypoints
  private path: PathPoint[] = [
    { x: 0, y: 120 },
    { x: 220, y: 120 },
    { x: 220, y: 320 },
    { x: 480, y: 320 },
    { x: 480, y: 160 },
    { x: 700, y: 160 },
    { x: 700, y: 450 }
  ];

  private towers: Tower[] = [];
  private creeps: Creep[] = [];
  private projectiles: Projectile[] = [];

  constructor(callbacks: GameEngineCallbacks) {
    this.callbacks = callbacks;
    try {
      const saved = localStorage.getItem('gamescrafter_highscore_tower-defense');
      if (saved) this.highScore = Number(saved) || 0;
    } catch {}
  }

  public getCustomControls() {
    return {
      type: 'tower-deck' as const,
      buttons: [
        { id: 'gatling', label: '🔫 Gatling (100g)', color: '#38bdf8' },
        { id: 'laser', label: '⚡ Laser (175g)', color: '#a855f7' },
        { id: 'cryo', label: '❄️ Cryo (150g)', color: '#06b6d4' },
        { id: 'mortar', label: '💣 Mortar (250g)', color: '#f59e0b' },
        { id: 'wave', label: '▶️ START WAVE', color: '#22c55e' }
      ]
    };
  }

  public handlePointerDown(x: number, y: number) {
    if (this.state === 'menu' || this.state === 'gameover') {
      this.restart();
      return;
    }

    // Check if clicked an existing tower
    for (const t of this.towers) {
      if (Math.hypot(t.x - x, t.y - y) < 24) {
        this.selectedPlacedTower = t;
        soundManager.playClick();
        return;
      }
    }

    // Bottom deck button area
    if (y > this.canvasHeight - 50) {
      if (x < 150) this.selectedTowerType = 'gatling';
      else if (x < 300) this.selectedTowerType = 'laser';
      else if (x < 450) this.selectedTowerType = 'cryo';
      else if (x < 600) this.selectedTowerType = 'mortar';
      else if (x >= 600 && !this.waveActive) this.startNextWave();
      soundManager.playClick();
      return;
    }

    // Attempt tower placement
    this.placeTower(x, y);
  }

  public handleVirtualActionDown(action: string) {
    if (action === 'gatling') this.selectedTowerType = 'gatling';
    if (action === 'laser') this.selectedTowerType = 'laser';
    if (action === 'cryo') this.selectedTowerType = 'cryo';
    if (action === 'mortar') this.selectedTowerType = 'mortar';
    if (action === 'wave' && !this.waveActive) this.startNextWave();
  }

  private placeTower(x: number, y: number) {
    // Check path clearance
    for (let i = 0; i < this.path.length - 1; i++) {
      const p1 = this.path[i];
      const p2 = this.path[i + 1];
      const dist = this.distToSegment({ x, y }, p1, p2);
      if (dist < 38) return; // too close to road
    }

    // Check overlap with other towers
    for (const t of this.towers) {
      if (Math.hypot(t.x - x, t.y - y) < 40) return;
    }

    const costs = { gatling: 100, laser: 175, cryo: 150, mortar: 250 };
    const cost = costs[this.selectedTowerType];

    if (this.gold >= cost) {
      this.gold -= cost;
      let range = 110;
      let damage = 20;
      let fireRate = 12;

      if (this.selectedTowerType === 'laser') {
        range = 140;
        damage = 35;
        fireRate = 18;
      } else if (this.selectedTowerType === 'cryo') {
        range = 100;
        damage = 8;
        fireRate = 25;
      } else if (this.selectedTowerType === 'mortar') {
        range = 160;
        damage = 80;
        fireRate = 45;
      }

      this.towers.push({
        x,
        y,
        type: this.selectedTowerType,
        level: 1,
        range,
        damage,
        fireRate,
        fireCooldown: 0,
        target: null,
        cost
      });
      soundManager.playScore();
    }
  }

  private distToSegment(p: PathPoint, v: PathPoint, w: PathPoint) {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  }

  private startNextWave() {
    this.waveActive = true;
    this.creepsToSpawn = [];
    const count = 6 + this.wave * 4;

    for (let i = 0; i < count; i++) {
      let type: 'scout' | 'drone' | 'armored' | 'boss' = 'scout';
      if (this.wave >= 2 && i % 3 === 0) type = 'drone';
      if (this.wave >= 3 && i % 4 === 0) type = 'armored';
      if (this.wave >= 4 && i === count - 1) type = 'boss';
      this.creepsToSpawn.push({ type, delay: i * 35 });
    }
    soundManager.playLaser();
  }

  public restart() {
    this.state = 'playing';
    this.score = 0;
    this.gold = 350;
    this.baseHp = 10;
    this.wave = 1;
    this.waveActive = false;
    this.towers = [];
    this.creeps = [];
    this.projectiles = [];
    this.creepsToSpawn = [];
    this.selectedPlacedTower = null;
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

  public destroy() {}

  public update(dt: number) {
    if (this.state !== 'playing') return;

    // Spawning Creeps
    if (this.waveActive) {
      this.spawnTimer++;
      for (let i = this.creepsToSpawn.length - 1; i >= 0; i--) {
        const item = this.creepsToSpawn[i];
        if (this.spawnTimer >= item.delay) {
          let hp = 40 + this.wave * 15;
          let speed = 1.6;
          let radius = 12;
          let color = '#22c55e';
          let reward = 15;

          if (item.type === 'drone') {
            hp = 30 + this.wave * 10;
            speed = 2.4;
            radius = 10;
            color = '#38bdf8';
            reward = 20;
          } else if (item.type === 'armored') {
            hp = 140 + this.wave * 40;
            speed = 0.9;
            radius = 16;
            color = '#f59e0b';
            reward = 35;
          } else if (item.type === 'boss') {
            hp = 500 + this.wave * 150;
            speed = 0.7;
            radius = 24;
            color = '#ef4444';
            reward = 120;
          }

          this.creeps.push({
            x: this.path[0].x,
            y: this.path[0].y,
            hp,
            maxHp: hp,
            speed,
            baseSpeed: speed,
            radius,
            type: item.type,
            color,
            pathIndex: 0,
            reward,
            slowTimer: 0
          });
          this.creepsToSpawn.splice(i, 1);
        }
      }

      // Check if wave is cleared
      if (this.creepsToSpawn.length === 0 && this.creeps.length === 0) {
        this.waveActive = false;
        this.spawnTimer = 0;
        this.gold += 60 + this.wave * 20;
        this.wave++;
        this.callbacks.onWaveUpdate?.(this.wave);
        soundManager.playLevelUp();
      }
    }

    // Update Creeps
    for (let i = this.creeps.length - 1; i >= 0; i--) {
      const c = this.creeps[i];

      // Handle Slow Timer
      if (c.slowTimer > 0) {
        c.slowTimer -= dt;
        c.speed = c.baseSpeed * 0.5;
      } else {
        c.speed = c.baseSpeed;
      }

      const targetPoint = this.path[c.pathIndex + 1];
      if (targetPoint) {
        const dx = targetPoint.x - c.x;
        const dy = targetPoint.y - c.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 4) {
          c.pathIndex++;
        } else {
          c.x += (dx / dist) * c.speed;
          c.y += (dy / dist) * c.speed;
        }
      } else {
        // Reached Core Base!
        this.baseHp--;
        soundManager.playHit();
        this.creeps.splice(i, 1);
        if (this.baseHp <= 0) {
          this.gameOver();
          return;
        }
      }
    }

    // Update Towers Targeting & Firing
    for (const t of this.towers) {
      if (t.fireCooldown > 0) t.fireCooldown--;

      // Find nearest creep in range
      let bestCreep: Creep | null = null;
      let minDistance = t.range;

      for (const c of this.creeps) {
        const dist = Math.hypot(c.x - t.x, c.y - t.y);
        if (dist < minDistance) {
          minDistance = dist;
          bestCreep = c;
        }
      }
      t.target = bestCreep;

      // Fire at target
      if (bestCreep && t.fireCooldown <= 0) {
        t.fireCooldown = t.fireRate;
        if (t.type === 'gatling') {
          this.projectiles.push({
            x: t.x,
            y: t.y,
            targetX: bestCreep.x,
            targetY: bestCreep.y,
            targetCreep: bestCreep,
            speed: 12,
            damage: t.damage,
            type: 'bullet',
            color: '#38bdf8'
          });
          soundManager.playLaser();
        } else if (t.type === 'laser') {
          bestCreep.hp -= t.damage;
          soundManager.playHit();
        } else if (t.type === 'cryo') {
          bestCreep.hp -= t.damage;
          bestCreep.slowTimer = 3;
          soundManager.playBounce();
        } else if (t.type === 'mortar') {
          this.projectiles.push({
            x: t.x,
            y: t.y,
            targetX: bestCreep.x,
            targetY: bestCreep.y,
            targetCreep: null,
            speed: 7,
            damage: t.damage,
            type: 'mortar',
            color: '#fbbf24',
            splashRadius: 60
          });
          soundManager.playExplosion();
        }
      }
    }

    // Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const targetX = p.targetCreep ? p.targetCreep.x : p.targetX;
      const targetY = p.targetCreep ? p.targetCreep.y : p.targetY;
      const dx = targetX - p.x;
      const dy = targetY - p.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 8) {
        // Hit
        if (p.type === 'mortar' && p.splashRadius) {
          for (const c of this.creeps) {
            if (Math.hypot(c.x - p.x, c.y - p.y) < p.splashRadius) {
              c.hp -= p.damage;
            }
          }
        } else if (p.targetCreep) {
          p.targetCreep.hp -= p.damage;
        }
        this.projectiles.splice(i, 1);
        continue;
      }

      p.x += (dx / dist) * p.speed;
      p.y += (dy / dist) * p.speed;
    }

    // Check Creep Deaths
    for (let i = this.creeps.length - 1; i >= 0; i--) {
      const c = this.creeps[i];
      if (c.hp <= 0) {
        this.gold += c.reward;
        this.score += c.reward * 5;
        this.callbacks.onScoreUpdate(this.score);
        soundManager.playCoin();
        this.creeps.splice(i, 1);
      }
    }
  }

  private gameOver() {
    this.state = 'gameover';
    soundManager.playGameOver();
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        localStorage.setItem('gamescrafter_highscore_tower-defense', String(this.highScore));
      } catch {}
      this.callbacks.onHighScoreUpdate(this.highScore);
    }
    this.callbacks.onGameOver(this.score);
  }

  public render(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;

    // Grass / Ground Grid
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Render Path Road
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 42;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(this.path[0].x, this.path[0].y);
    for (let i = 1; i < this.path.length; i++) {
      ctx.lineTo(this.path[i].x, this.path[i].y);
    }
    ctx.stroke();

    // Road Center Line
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Core Base Marker at end of path
    const endPoint = this.path[this.path.length - 1];
    ctx.fillStyle = '#22c55e';
    ctx.shadowColor = '#4ade80';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(endPoint.x, endPoint.y - 20, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Render Towers
    for (const t of this.towers) {
      ctx.save();
      // Range preview if selected
      if (this.selectedPlacedTower === t) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = t.type === 'gatling' ? '#38bdf8' : t.type === 'laser' ? '#a855f7' : t.type === 'cryo' ? '#06b6d4' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(t.x, t.y, 16, 0, Math.PI * 2);
      ctx.fill();

      // Gun Barrel towards target
      if (t.target) {
        const angle = Math.atan2(t.target.y - t.y, t.target.x - t.x);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(t.x, t.y);
        ctx.lineTo(t.x + Math.cos(angle) * 22, t.y + Math.sin(angle) * 22);
        ctx.stroke();

        if (t.type === 'laser') {
          // Laser beam visual
          ctx.strokeStyle = '#a855f7';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(t.x, t.y);
          ctx.lineTo(t.target.x, t.target.y);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // Render Creeps
    for (const c of this.creeps) {
      ctx.save();
      ctx.fillStyle = c.color;
      ctx.shadowColor = c.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
      ctx.fill();

      // Creep Health Bar
      ctx.fillStyle = '#374151';
      ctx.fillRect(c.x - 14, c.y - c.radius - 6, 28, 4);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(c.x - 14, c.y - c.radius - 6, (c.hp / c.maxHp) * 28, 4);
      ctx.restore();
    }

    // Render Projectiles
    for (const p of this.projectiles) {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Bottom Turret Deck & Action Bar
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.fillRect(0, height - 55, width, 55);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(0, height - 55, width, 55);

    const deckButtons = [
      { type: 'gatling', label: '🔫 GATLING (100g)' },
      { type: 'laser', label: '⚡ LASER (175g)' },
      { type: 'cryo', label: '❄️ CRYO (150g)' },
      { type: 'mortar', label: '💣 MORTAR (250g)' }
    ];

    deckButtons.forEach((b, i) => {
      const btnX = i * 150 + 10;
      ctx.fillStyle = this.selectedTowerType === b.type ? '#0284c7' : '#1e293b';
      ctx.fillRect(btnX, height - 48, 140, 40);
      ctx.strokeStyle = this.selectedTowerType === b.type ? '#38bdf8' : '#475569';
      ctx.strokeRect(btnX, height - 48, 140, 40);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.label, btnX + 70, height - 24);
    });

    // Wave Start Button
    ctx.fillStyle = this.waveActive ? '#475569' : '#16a34a';
    ctx.fillRect(width - 170, height - 48, 160, 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.waveActive ? 'DEFENDING...' : `▶ START WAVE ${this.wave}`, width - 90, height - 24);

    // Top HUD
    if (this.state === 'playing') {
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 15px Orbitron, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`GOLD: 🟡 ${this.gold}`, 16, 26);
      ctx.fillText(`CORE HP: ❤️ ${this.baseHp}/${this.maxBaseHp}`, 16, 48);
      ctx.fillText(`SCORE: ${this.score}`, 16, 70);
    }

    // Menu Overlay
    if (this.state === 'menu') {
      ctx.fillStyle = 'rgba(7, 12, 24, 0.85)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 32px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏰 CYBER CORE TOWER DEFENSE', width / 2, height / 2 - 50);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px sans-serif';
      ctx.fillText('Deploy Gatling, Laser, Cryo & Mortar turrets along the path', width / 2, height / 2);
      ctx.fillText('Stop enemy cyber bots before they breach the Core Base!', width / 2, height / 2 + 25);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.fillText('👉 TAP TO COMMAND DEFENSE 👈', width / 2, height / 2 + 75);
    }

    // Game Over
    if (this.state === 'gameover') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 34px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CORE OVERRUN!', width / 2, height / 2 - 50);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '16px Orbitron, sans-serif';
      ctx.fillText(`WAVE SURVIVED: ${this.wave - 1}`, width / 2, height / 2 - 10);
      ctx.fillText(`FINAL SCORE: ${this.score}`, width / 2, height / 2 + 15);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.fillText('TAP TO RETRY DEFENSE', width / 2, height / 2 + 65);
    }
  }
}
