import { GameEngineCallbacks, GameEngineInstance } from './types';
import { soundManager } from '../utils/audio';

interface MineralNode {
  name: string;
  hp: number;
  maxHp: number;
  value: number;
  color: string;
  depth: number;
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

export class MiningIdleEngine implements GameEngineInstance {
  private callbacks: GameEngineCallbacks;
  private canvasWidth = 800;
  private canvasHeight = 450;

  private state: 'menu' | 'playing' | 'paused' | 'gameover' = 'menu';
  private score = 0; // Total credits mined
  private credits = 0;
  private highScore = 0;
  private depthMeters = 10;

  // Upgrades
  private pickaxePower = 1;
  private pickaxeCost = 15;
  private autoDrillCount = 0;
  private autoDrillCost = 50;
  private refineryLevel = 1;
  private refineryCost = 120;

  private oreNode: MineralNode = {
    name: 'Iron Ore',
    hp: 20,
    maxHp: 20,
    value: 10,
    color: '#94a3b8',
    depth: 1
  };

  private particles: Particle[] = [];
  private clickAnim = 0;

  constructor(callbacks: GameEngineCallbacks) {
    this.callbacks = callbacks;
    try {
      const saved = localStorage.getItem('gamescrafter_highscore_mining-idle');
      if (saved) this.highScore = Number(saved) || 0;
    } catch {}
  }

  public getCustomControls() {
    return {
      type: 'idle-deck' as const,
      buttons: [
        { id: 'pickaxe', label: '⛏️ UPGRADE PICKAXE', color: '#38bdf8' },
        { id: 'drill', label: '⚡ BUY AUTO DRILL', color: '#f59e0b' },
        { id: 'refinery', label: '🏭 UPGRADE REFINERY', color: '#22c55e' }
      ]
    };
  }

  public handlePointerDown(x: number, y: number) {
    if (this.state === 'menu' || this.state === 'gameover') {
      this.restart();
      return;
    }

    // Check upgrade buttons on right panel
    if (x > this.canvasWidth - 280) {
      if (y >= 80 && y <= 130) this.buyPickaxe();
      else if (y >= 145 && y <= 195) this.buyAutoDrill();
      else if (y >= 210 && y <= 260) this.buyRefinery();
      return;
    }

    // Mine active Ore node (Left main canvas)
    this.mineOre(this.pickaxePower);
  }

  public handleVirtualActionDown(action: string) {
    if (action === 'pickaxe') this.buyPickaxe();
    if (action === 'drill') this.buyAutoDrill();
    if (action === 'refinery') this.buyRefinery();
  }

  private mineOre(damage: number) {
    this.oreNode.hp -= damage;
    this.clickAnim = 6;
    soundManager.playDig();

    // Spawn Ore Sparks
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x: 250 + (Math.random() - 0.5) * 40,
        y: 220 + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 0.35,
        color: this.oreNode.color,
        size: 4
      });
    }

    if (this.oreNode.hp <= 0) {
      const earned = this.oreNode.value * this.refineryLevel;
      this.credits += earned;
      this.score += earned;
      this.depthMeters += 5;
      this.callbacks.onScoreUpdate(this.score);
      soundManager.playCoin();
      this.spawnNextOre();
    }
  }

  private spawnNextOre() {
    const tier = Math.floor(this.depthMeters / 50);
    const ores = [
      { name: 'Iron Ore', maxHp: 20, value: 10, color: '#94a3b8' },
      { name: 'Cobalt Crystal', maxHp: 50, value: 35, color: '#38bdf8' },
      { name: 'Titanium Vein', maxHp: 120, value: 90, color: '#cbd5e1' },
      { name: 'Plasma Geode', maxHp: 280, value: 240, color: '#a855f7' },
      { name: 'Dark Matter Core', maxHp: 650, value: 600, color: '#ef4444' }
    ];
    const ore = ores[Math.min(ores.length - 1, tier)];
    this.oreNode = {
      name: ore.name,
      hp: ore.maxHp,
      maxHp: ore.maxHp,
      value: ore.value,
      color: ore.color,
      depth: tier + 1
    };
  }

  private buyPickaxe() {
    if (this.credits >= this.pickaxeCost) {
      this.credits -= this.pickaxeCost;
      this.pickaxePower += 2;
      this.pickaxeCost = Math.floor(this.pickaxeCost * 1.6);
      soundManager.playPowerup();
    }
  }

  private buyAutoDrill() {
    if (this.credits >= this.autoDrillCost) {
      this.credits -= this.autoDrillCost;
      this.autoDrillCount++;
      this.autoDrillCost = Math.floor(this.autoDrillCost * 1.7);
      soundManager.playPowerup();
    }
  }

  private buyRefinery() {
    if (this.credits >= this.refineryCost) {
      this.credits -= this.refineryCost;
      this.refineryLevel++;
      this.refineryCost = Math.floor(this.refineryCost * 1.9);
      soundManager.playLevelUp();
    }
  }

  public restart() {
    this.state = 'playing';
    this.score = 0;
    this.credits = 0;
    this.depthMeters = 10;
    this.pickaxePower = 1;
    this.pickaxeCost = 15;
    this.autoDrillCount = 0;
    this.autoDrillCost = 50;
    this.refineryLevel = 1;
    this.refineryCost = 120;
    this.spawnNextOre();
    this.callbacks.onScoreUpdate(0);
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

    if (this.clickAnim > 0) this.clickAnim--;

    // Auto Drill Mining over time
    if (this.autoDrillCount > 0) {
      this.mineOre(this.autoDrillCount * 0.2);
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        localStorage.setItem('gamescrafter_highscore_mining-idle', String(this.highScore));
      } catch {}
      this.callbacks.onHighScoreUpdate(this.highScore);
    }
  }

  public render(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;

    // Deep Mine Cave Background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // Left Shaft Area
    const shaftWidth = width - 300;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(16, 16, shaftWidth - 24, height - 32);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(16, 16, shaftWidth - 24, height - 32);

    // Render Massive Ore Rock
    const oreX = shaftWidth / 2;
    const oreY = height / 2 + 10;
    const oreSize = 65 + (this.clickAnim > 0 ? -6 : 0);

    ctx.save();
    ctx.fillStyle = this.oreNode.color;
    ctx.shadowColor = this.oreNode.color;
    ctx.shadowBlur = 18;

    // Rock poly shape
    ctx.beginPath();
    ctx.moveTo(oreX, oreY - oreSize);
    ctx.lineTo(oreX + oreSize * 0.9, oreY - oreSize * 0.4);
    ctx.lineTo(oreX + oreSize * 0.7, oreY + oreSize * 0.8);
    ctx.lineTo(oreX - oreSize * 0.7, oreY + oreSize * 0.8);
    ctx.lineTo(oreX - oreSize * 0.9, oreY - oreSize * 0.4);
    ctx.closePath();
    ctx.fill();

    // Node Health Bar
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(oreX - 70, oreY - oreSize - 25, 140, 10);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(oreX - 70, oreY - oreSize - 25, (this.oreNode.hp / this.oreNode.maxHp) * 140, 10);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(oreX - 70, oreY - oreSize - 25, 140, 10);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.oreNode.name} (${Math.ceil(this.oreNode.hp)}/${this.oreNode.maxHp})`, oreX, oreY - oreSize - 32);
    ctx.restore();

    // Render Mining Particles
    for (const p of this.particles) {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.restore();
    }

    // Right Upgrade Panel
    const panelX = width - 280;
    ctx.fillStyle = '#111827';
    ctx.fillRect(panelX, 16, 264, height - 32);
    ctx.strokeStyle = '#38bdf8';
    ctx.strokeRect(panelX, 16, 264, height - 32);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ MINE UPGRADES', panelX + 132, 45);

    // Pickaxe Upgrade Button
    ctx.fillStyle = this.credits >= this.pickaxeCost ? '#0284c7' : '#1e293b';
    ctx.fillRect(panelX + 16, 80, 232, 50);
    ctx.strokeStyle = '#38bdf8';
    ctx.strokeRect(panelX + 16, 80, 232, 50);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`⛏️ Pickaxe Power (Lvl ${this.pickaxePower})`, panelX + 132, 100);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`Cost: 🟡 ${this.pickaxeCost} credits`, panelX + 132, 120);

    // Auto Drill Button
    ctx.fillStyle = this.credits >= this.autoDrillCost ? '#059669' : '#1e293b';
    ctx.fillRect(panelX + 16, 145, 232, 50);
    ctx.strokeStyle = '#10b981';
    ctx.strokeRect(panelX + 16, 145, 232, 50);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`⚡ Laser Drills (${this.autoDrillCount} Active)`, panelX + 132, 165);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`Cost: 🟡 ${this.autoDrillCost} credits`, panelX + 132, 185);

    // Refinery Button
    ctx.fillStyle = this.credits >= this.refineryCost ? '#d97706' : '#1e293b';
    ctx.fillRect(panelX + 16, 210, 232, 50);
    ctx.strokeStyle = '#f59e0b';
    ctx.strokeRect(panelX + 16, 210, 232, 50);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`🏭 Smelter Refinery (x${this.refineryLevel})`, panelX + 132, 230);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`Cost: 🟡 ${this.refineryCost} credits`, panelX + 132, 250);

    // Top Stats Left HUD
    if (this.state === 'playing') {
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`CREDITS: 🟡 ${this.credits}`, 32, 42);
      ctx.fillText(`DEPTH: ⛏️ ${this.depthMeters}M`, 32, 66);
    }

    // Menu Overlay
    if (this.state === 'menu') {
      ctx.fillStyle = 'rgba(7, 12, 24, 0.85)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 32px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⛏️ GALACTIC CYBER MINER', width / 2, height / 2 - 50);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px sans-serif';
      ctx.fillText('Tap to smash rich planetary ore veins & excavate down into planetary core', width / 2, height / 2);
      ctx.fillText('Invest credits into Auto Drills & Mineral Smelters for massive yields!', width / 2, height / 2 + 25);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.fillText('👉 TAP TO BEGIN MINING 👈', width / 2, height / 2 + 75);
    }
  }
}
