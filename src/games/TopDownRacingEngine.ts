import { GameEngineCallbacks, GameEngineInstance } from './types';
import { soundManager } from '../utils/audio';

interface RivalCar {
  x: number;
  y: number;
  speed: number;
  lane: number;
  width: number;
  height: number;
  color: string;
}

interface RoadObstacle {
  x: number;
  y: number;
  type: 'oil' | 'turbo' | 'barrier';
  width: number;
  height: number;
}

interface SkidMark {
  x: number;
  y: number;
  life: number;
}

export class TopDownRacingEngine implements GameEngineInstance {
  private callbacks: GameEngineCallbacks;
  private canvasWidth = 800;
  private canvasHeight = 450;

  private state: 'menu' | 'playing' | 'paused' | 'gameover' = 'menu';
  private score = 0;
  private highScore = 0;
  private distance = 0;
  private speed = 0;
  private maxSpeed = 180; // km/h
  private nitro = 100;
  private isNitroActive = false;

  // Road
  private roadOffset = 0;
  private roadWidth = 360;

  // Player car
  private car = {
    x: 400,
    y: 350,
    width: 28,
    height: 48,
    angle: 0,
    steerSpeed: 4.2
  };

  private rivals: RivalCar[] = [];
  private roadItems: RoadObstacle[] = [];
  private skidMarks: SkidMark[] = [];

  private keys: { [key: string]: boolean } = {};
  private steerInput = 0;
  private throttleInput = false;
  private brakeInput = false;

  constructor(callbacks: GameEngineCallbacks) {
    this.callbacks = callbacks;
    try {
      const saved = localStorage.getItem('gamescrafter_highscore_top-down-racing');
      if (saved) this.highScore = Number(saved) || 0;
    } catch {}
  }

  public getCustomControls() {
    return {
      type: 'steer' as const,
      buttons: [
        { id: 'left', label: '◀️ STEER', color: '#38bdf8' },
        { id: 'right', label: 'STEER ▶️', color: '#38bdf8' },
        { id: 'gas', label: '⚡ GAS', color: '#22c55e' },
        { id: 'brake', label: '🛑 BRAKE', color: '#ef4444' },
        { id: 'nitro', label: '🔥 NITRO', color: '#f59e0b' }
      ]
    };
  }

  public handlePointerDown(x: number) {
    if (this.state === 'menu' || this.state === 'gameover') {
      this.restart();
      return;
    }
    if (x < this.canvasWidth * 0.35) {
      this.steerInput = -1;
    } else if (x > this.canvasWidth * 0.65) {
      this.steerInput = 1;
    } else {
      this.throttleInput = true;
    }
  }

  public handlePointerUp() {
    this.steerInput = 0;
    this.throttleInput = false;
  }

  public handleKeyDown(code: string) {
    this.keys[code] = true;
    if (code === 'Space' && (this.state === 'menu' || this.state === 'gameover')) {
      this.restart();
    }
  }

  public handleKeyUp(code: string) {
    this.keys[code] = false;
  }

  public handleVirtualActionDown(action: string) {
    if (action === 'left') this.steerInput = -1;
    if (action === 'right') this.steerInput = 1;
    if (action === 'gas') this.throttleInput = true;
    if (action === 'brake') this.brakeInput = true;
    if (action === 'nitro' && this.nitro > 15) this.isNitroActive = true;
  }

  public handleVirtualActionUp(action: string) {
    if (action === 'left' && this.steerInput === -1) this.steerInput = 0;
    if (action === 'right' && this.steerInput === 1) this.steerInput = 0;
    if (action === 'gas') this.throttleInput = false;
    if (action === 'brake') this.brakeInput = false;
    if (action === 'nitro') this.isNitroActive = false;
  }

  public restart() {
    this.state = 'playing';
    this.score = 0;
    this.distance = 0;
    this.speed = 40;
    this.nitro = 100;
    this.isNitroActive = false;
    this.car.x = this.canvasWidth / 2;
    this.car.y = 350;
    this.rivals = [];
    this.roadItems = [];
    this.skidMarks = [];
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

    // Keyboard bindings
    let steer = this.steerInput;
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) steer = -1;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) steer = 1;

    let gas = this.throttleInput || this.keys['ArrowUp'] || this.keys['KeyW'];
    let brake = this.brakeInput || this.keys['ArrowDown'] || this.keys['KeyS'];
    let nitroKey = this.keys['Space'] || this.isNitroActive;

    // Acceleration & Speed
    if (nitroKey && this.nitro > 0) {
      this.speed = Math.min(260, this.speed + 80 * dt);
      this.nitro = Math.max(0, this.nitro - 25 * dt);
      if (Math.random() < 0.3) soundManager.playLaser();
    } else if (gas) {
      this.speed = Math.min(this.maxSpeed, this.speed + 45 * dt);
      this.nitro = Math.min(100, this.nitro + 5 * dt);
    } else if (brake) {
      this.speed = Math.max(20, this.speed - 90 * dt);
    } else {
      // Natural rolling friction
      this.speed = Math.max(50, this.speed - 15 * dt);
      this.nitro = Math.min(100, this.nitro + 6 * dt);
    }

    // Steering
    this.car.x += steer * this.car.steerSpeed * (this.speed / 120);
    this.car.angle = steer * 0.15;

    // Skid marks if turning sharply at high speed
    if (Math.abs(steer) > 0 && this.speed > 110) {
      this.skidMarks.push({ x: this.car.x, y: this.car.y + 20, life: 1.0 });
    }

    // Road Bounds check
    const roadLeft = (this.canvasWidth - this.roadWidth) / 2;
    const roadRight = roadLeft + this.roadWidth;
    if (this.car.x < roadLeft + 15 || this.car.x > roadRight - 15) {
      // Grass drag
      this.speed = Math.max(20, this.speed - 80 * dt);
      soundManager.playBounce();
    }

    // Update Distance & Score
    this.distance += (this.speed * dt * 3.5);
    this.score = Math.floor(this.distance / 10);
    this.callbacks.onScoreUpdate(this.score);

    this.roadOffset = (this.roadOffset + this.speed * dt * 5) % 80;

    // Spawn Rivals
    if (Math.random() < 0.025 && this.rivals.length < 6) {
      const lane = Math.floor(Math.random() * 3);
      const laneX = roadLeft + 45 + lane * 100;
      const colors = ['#f43f5e', '#a855f7', '#eab308', '#ec4899'];
      this.rivals.push({
        x: laneX,
        y: -80,
        speed: 70 + Math.random() * 40,
        lane,
        width: 28,
        height: 48,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    // Spawn Road items (Oil / Turbo Pads)
    if (Math.random() < 0.015 && this.roadItems.length < 4) {
      const itemType = Math.random() < 0.6 ? 'turbo' : 'oil';
      const lane = Math.floor(Math.random() * 3);
      this.roadItems.push({
        x: roadLeft + 45 + lane * 100,
        y: -50,
        type: itemType,
        width: 32,
        height: 32
      });
    }

    // Update Rivals
    for (let i = this.rivals.length - 1; i >= 0; i--) {
      const r = this.rivals[i];
      // Relative movement speed
      const relSpeed = (this.speed - r.speed) * dt * 4;
      r.y += relSpeed;

      // Collision with player
      if (
        Math.abs(this.car.x - r.x) < (this.car.width + r.width) / 2 &&
        Math.abs(this.car.y - r.y) < (this.car.height + r.height) / 2
      ) {
        if (this.speed > 140) {
          this.gameOver();
          return;
        } else {
          // Crash penalty
          this.speed = 30;
          soundManager.playExplosion();
          this.rivals.splice(i, 1);
          continue;
        }
      }

      if (r.y > this.canvasHeight + 100 || r.y < -200) {
        this.rivals.splice(i, 1);
      }
    }

    // Update Road Items
    for (let i = this.roadItems.length - 1; i >= 0; i--) {
      const item = this.roadItems[i];
      item.y += this.speed * dt * 4;

      // Collect item
      if (
        Math.abs(this.car.x - item.x) < 30 &&
        Math.abs(this.car.y - item.y) < 30
      ) {
        if (item.type === 'turbo') {
          this.speed = Math.min(240, this.speed + 70);
          soundManager.playPowerup();
        } else if (item.type === 'oil') {
          this.car.x += (Math.random() - 0.5) * 60;
          this.speed = Math.max(40, this.speed - 50);
          soundManager.playHit();
        }
        this.roadItems.splice(i, 1);
        continue;
      }

      if (item.y > this.canvasHeight + 50) {
        this.roadItems.splice(i, 1);
      }
    }

    // Update Skid Marks
    for (let i = this.skidMarks.length - 1; i >= 0; i--) {
      const s = this.skidMarks[i];
      s.y += this.speed * dt * 4;
      s.life -= dt * 0.8;
      if (s.life <= 0 || s.y > this.canvasHeight) {
        this.skidMarks.splice(i, 1);
      }
    }
  }

  private gameOver() {
    this.state = 'gameover';
    soundManager.playExplosion();
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        localStorage.setItem('gamescrafter_highscore_top-down-racing', String(this.highScore));
      } catch {}
      this.callbacks.onHighScoreUpdate(this.highScore);
    }
    this.callbacks.onGameOver(this.score);
  }

  public render(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;

    // Grass / Ground
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(0, 0, width, height);

    const roadLeft = (width - this.roadWidth) / 2;
    const roadRight = roadLeft + this.roadWidth;

    // Road asphalt
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(roadLeft, 0, this.roadWidth, height);

    // Red-White Curb Borders
    const curbWidth = 12;
    for (let y = -this.roadOffset; y < height; y += 40) {
      const isRed = Math.floor((y + this.roadOffset) / 40) % 2 === 0;
      ctx.fillStyle = isRed ? '#ef4444' : '#f8fafc';
      ctx.fillRect(roadLeft - curbWidth, y, curbWidth, 40);
      ctx.fillRect(roadRight, y, curbWidth, 40);
    }

    // Lane Striping
    ctx.strokeStyle = '#f8fafc';
    ctx.setLineDash([24, 24]);
    ctx.lineDashOffset = -this.roadOffset;
    ctx.lineWidth = 3;

    // Lane 1 & Lane 2 Dividers
    ctx.beginPath();
    ctx.moveTo(roadLeft + 120, 0);
    ctx.lineTo(roadLeft + 120, height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(roadLeft + 240, 0);
    ctx.lineTo(roadLeft + 240, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Render Skid Marks
    for (const s of this.skidMarks) {
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, ' + (s.life * 0.6) + ')';
      ctx.fillRect(s.x - 10, s.y, 4, 12);
      ctx.fillRect(s.x + 6, s.y, 4, 12);
      ctx.restore();
    }

    // Render Road Items
    for (const item of this.roadItems) {
      ctx.save();
      if (item.type === 'turbo') {
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#4ade80';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(item.x, item.y - 12);
        ctx.lineTo(item.x + 14, item.y + 12);
        ctx.lineTo(item.x - 14, item.y + 12);
        ctx.closePath();
        ctx.fill();
      } else {
        // Oil puddle
        ctx.fillStyle = '#09090b';
        ctx.beginPath();
        ctx.ellipse(item.x, item.y, 16, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Render Rivals
    for (const r of this.rivals) {
      ctx.save();
      ctx.fillStyle = r.color;
      ctx.shadowColor = r.color;
      ctx.shadowBlur = 8;
      ctx.fillRect(r.x - r.width / 2, r.y - r.height / 2, r.width, r.height);

      // Windshield & Tail lights
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(r.x - 10, r.y - 10, 20, 10);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(r.x - 10, r.y + 18, 6, 4);
      ctx.fillRect(r.x + 4, r.y + 18, 6, 4);
      ctx.restore();
    }

    // Render Player Car
    if (this.state === 'playing' || this.state === 'paused') {
      ctx.save();
      ctx.translate(this.car.x, this.car.y);
      ctx.rotate(this.car.angle);

      // Car body
      ctx.fillStyle = '#0284c7';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 14;
      ctx.fillRect(-this.car.width / 2, -this.car.height / 2, this.car.width, this.car.height);

      // Front headlights
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-this.car.width / 2 + 2, -this.car.height / 2 - 2, 6, 4);
      ctx.fillRect(this.car.width / 2 - 8, -this.car.height / 2 - 2, 6, 4);

      // Windshield
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-9, -12, 18, 14);

      // Nitro exhaust flames
      if (this.keys['Space'] || this.isNitroActive) {
        ctx.fillStyle = '#f97316';
        ctx.fillRect(-6, this.car.height / 2, 12, 16);
      }
      ctx.restore();
    }

    // HUD Display
    if (this.state === 'playing') {
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 15px Orbitron, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`SPEED: ${Math.floor(this.speed)} KM/H`, 16, 26);
      ctx.fillText(`DISTANCE: ${Math.floor(this.distance)} M`, 16, 48);

      // Nitro gauge
      const nWidth = 120;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(16, 60, nWidth, 14);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(16, 60, (this.nitro / 100) * nWidth, 14);
      ctx.strokeStyle = '#f8fafc';
      ctx.strokeRect(16, 60, nWidth, 14);
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('NITRO BOOST', 20, 71);
    }

    // Menu Overlay
    if (this.state === 'menu') {
      ctx.fillStyle = 'rgba(7, 12, 24, 0.85)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 32px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏎️ TOP-DOWN APEX RACER', width / 2, height / 2 - 50);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px sans-serif';
      ctx.fillText('Steer Left / Right • Gas, Brake & Drift through dense highway traffic', width / 2, height / 2);
      ctx.fillText('Grab green Turbo pads and hit Nitro for supersonic overtakes!', width / 2, height / 2 + 25);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.fillText('👉 TAP TO START RACE 👈', width / 2, height / 2 + 75);
    }

    // Game Over Overlay
    if (this.state === 'gameover') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 34px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('RACE CRASH!', width / 2, height / 2 - 50);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '16px Orbitron, sans-serif';
      ctx.fillText(`DISTANCE COVERED: ${Math.floor(this.distance)} M`, width / 2, height / 2 - 10);
      ctx.fillText(`SCORE: ${this.score}`, width / 2, height / 2 + 15);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.fillText('TAP TO RESTART RACE', width / 2, height / 2 + 65);
    }
  }
}
