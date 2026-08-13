import { GameEngineCallbacks, GameEngineInstance } from './types';
import { soundManager } from '../utils/audio';

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isAirborne: boolean;
  scored: boolean;
}

export class BasketballEngine implements GameEngineInstance {
  private callbacks: GameEngineCallbacks;
  private canvasWidth = 800;
  private canvasHeight = 450;

  private state: 'menu' | 'playing' | 'paused' | 'gameover' = 'menu';
  private score = 0;
  private highScore = 0;
  private timeLeft = 60;
  private streak = 0;
  private multiplier = 1;

  // Hoop specs
  private hoop = {
    x: 640,
    y: 180,
    rimRadius: 36,
    backboardX: 680,
    backboardY1: 100,
    backboardY2: 240,
    vy: 1.2,
    isMoving: false
  };

  // Ball
  private ball: Ball = {
    x: 160,
    y: 350,
    vx: 0,
    vy: 0,
    radius: 18,
    isAirborne: false,
    scored: false
  };

  // Aiming Drag
  private isAiming = false;
  private dragStart = { x: 0, y: 0 };
  private dragCurrent = { x: 0, y: 0 };

  constructor(callbacks: GameEngineCallbacks) {
    this.callbacks = callbacks;
    try {
      const saved = localStorage.getItem('gamescrafter_highscore_basketball');
      if (saved) this.highScore = Number(saved) || 0;
    } catch {}
  }

  public getCustomControls() {
    return {
      type: 'sports' as const,
      buttons: [
        { id: 'shoot', label: '🏀 SHOOT HOOP', color: '#f97316' }
      ]
    };
  }

  public handlePointerDown(x: number, y: number) {
    if (this.state === 'menu' || this.state === 'gameover') {
      this.restart();
      return;
    }

    if (!this.ball.isAirborne) {
      this.isAiming = true;
      this.dragStart = { x, y };
      this.dragCurrent = { x, y };
    }
  }

  public handlePointerMove(x: number, y: number) {
    if (this.isAiming) {
      this.dragCurrent = { x, y };
    }
  }

  public handlePointerUp() {
    if (this.isAiming) {
      this.isAiming = false;
      const dx = this.dragStart.x - this.dragCurrent.x;
      const dy = this.dragStart.y - this.dragCurrent.y;
      const power = Math.min(100, Math.hypot(dx, dy));

      if (power > 15) {
        this.shootBall(dx * 0.16, dy * 0.16);
      }
    }
  }

  public handleVirtualActionDown(action: string) {
    if (action === 'shoot' && !this.ball.isAirborne) {
      // Auto aimed shot
      this.shootBall(13.8, -14.5);
    }
  }

  private shootBall(vx: number, vy: number) {
    this.ball.vx = Math.max(5, Math.min(22, vx));
    this.ball.vy = Math.min(-6, Math.max(-20, vy));
    this.ball.isAirborne = true;
    this.ball.scored = false;
    soundManager.playSwoosh();
  }

  public restart() {
    this.state = 'playing';
    this.score = 0;
    this.timeLeft = 60;
    this.streak = 0;
    this.multiplier = 1;
    this.resetBall();
    this.callbacks.onScoreUpdate(0);
    soundManager.playScore();
  }

  private resetBall() {
    this.ball = {
      x: 140 + Math.random() * 80,
      y: 350,
      vx: 0,
      vy: 0,
      radius: 18,
      isAirborne: false,
      scored: false
    };
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

    // Timer Countdown
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.gameOver();
      return;
    }

    // Moving Hoop after 300 points
    if (this.score > 200) {
      this.hoop.isMoving = true;
      this.hoop.y += this.hoop.vy;
      if (this.hoop.y < 130 || this.hoop.y > 230) {
        this.hoop.vy *= -1;
      }
    }

    // Ball Physics
    if (this.ball.isAirborne) {
      this.ball.vy += 0.45; // gravity
      this.ball.x += this.ball.vx;
      this.ball.y += this.ball.vy;

      // Backboard collision
      if (
        this.ball.x + this.ball.radius >= this.hoop.backboardX &&
        this.ball.x - this.ball.radius <= this.hoop.backboardX + 12 &&
        this.ball.y >= this.hoop.backboardY1 &&
        this.ball.y <= this.hoop.backboardY2
      ) {
        this.ball.vx = -Math.abs(this.ball.vx) * 0.65;
        soundManager.playBounce();
      }

      // Rim Left & Right front collision
      const leftRimX = this.hoop.x - this.hoop.rimRadius;
      const rightRimX = this.hoop.x + this.hoop.rimRadius;

      if (Math.hypot(this.ball.x - leftRimX, this.ball.y - this.hoop.y) < this.ball.radius + 6) {
        this.ball.vx *= -0.7;
        this.ball.vy *= -0.7;
        soundManager.playBounce();
      }

      // Check Basket Score (passes downward through rim)
      if (
        !this.ball.scored &&
        this.ball.vy > 0 &&
        this.ball.y >= this.hoop.y - 10 &&
        this.ball.y <= this.hoop.y + 15 &&
        this.ball.x > leftRimX + 8 &&
        this.ball.x < rightRimX - 8
      ) {
        this.ball.scored = true;
        this.streak++;
        this.multiplier = this.streak >= 3 ? 3 : this.streak >= 2 ? 2 : 1;
        const pts = 2 * this.multiplier;
        this.score += pts;
        this.timeLeft += 2; // bonus time!
        this.callbacks.onScoreUpdate(this.score);
        soundManager.playPowerup();
      }

      // Floor & Wall bounds
      if (this.ball.y > this.canvasHeight - 20) {
        if (!this.ball.scored) {
          this.streak = 0;
          this.multiplier = 1;
        }
        this.resetBall();
      }
      if (this.ball.x > this.canvasWidth + 50 || this.ball.x < -50) {
        this.resetBall();
      }
    }
  }

  private gameOver() {
    this.state = 'gameover';
    soundManager.playGameOver();
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        localStorage.setItem('gamescrafter_highscore_basketball', String(this.highScore));
      } catch {}
      this.callbacks.onHighScoreUpdate(this.highScore);
    }
    this.callbacks.onGameOver(this.score);
  }

  public render(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;

    // Cyber Arena Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#020617');
    bgGrad.addColorStop(0.7, '#0f172a');
    bgGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Hardwood Cyber Court Floor
    ctx.fillStyle = '#78350f';
    ctx.fillRect(0, height - 60, width, 60);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height - 60);
    ctx.lineTo(width, height - 60);
    ctx.stroke();

    // 3-Point Line
    ctx.strokeStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(this.hoop.x, height - 60, 260, Math.PI, Math.PI * 1.5);
    ctx.stroke();

    // Render Backboard & Post
    ctx.fillStyle = '#475569';
    ctx.fillRect(this.hoop.backboardX + 8, this.hoop.backboardY1, 14, height - this.hoop.backboardY1 - 60);

    // Backboard Glass
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.fillRect(this.hoop.backboardX, this.hoop.backboardY1, 8, 140);

    // Target Box
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.strokeRect(this.hoop.backboardX - 1, this.hoop.y - 30, 4, 40);

    // Rim & Net
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(this.hoop.x, this.hoop.y, this.hoop.rimRadius, 8, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Net mesh
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.5;
    for (let i = -this.hoop.rimRadius + 4; i <= this.hoop.rimRadius - 4; i += 8) {
      ctx.beginPath();
      ctx.moveTo(this.hoop.x + i, this.hoop.y);
      ctx.lineTo(this.hoop.x + i * 0.6, this.hoop.y + 40);
      ctx.stroke();
    }

    // Render Basketball
    ctx.save();
    ctx.fillStyle = '#ea580c';
    ctx.shadowColor = this.multiplier > 1 ? '#f97316' : '#ea580c';
    ctx.shadowBlur = this.multiplier > 1 ? 16 : 6;
    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // Basketball seams
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.ball.x - this.ball.radius, this.ball.y);
    ctx.lineTo(this.ball.x + this.ball.radius, this.ball.y);
    ctx.stroke();
    ctx.restore();

    // Aiming Trajectory Guide
    if (this.isAiming) {
      const dx = (this.dragStart.x - this.dragCurrent.x) * 0.16;
      const dy = (this.dragStart.y - this.dragCurrent.y) * 0.16;

      ctx.fillStyle = '#38bdf8';
      let simX = this.ball.x;
      let simY = this.ball.y;
      let simVx = dx;
      let simVy = dy;

      for (let i = 0; i < 18; i++) {
        simVy += 0.45;
        simX += simVx;
        simY += simVy;
        ctx.beginPath();
        ctx.arc(simX, simY, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Top HUD
    if (this.state === 'playing') {
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`SCORE: ${this.score}`, 20, 30);
      ctx.fillText(`STREAK: 🔥 ${this.streak} (x${this.multiplier})`, 20, 56);

      // Shot Clock Timer
      ctx.textAlign = 'right';
      ctx.fillStyle = this.timeLeft <= 10 ? '#ef4444' : '#22c55e';
      ctx.font = 'bold 24px Orbitron, sans-serif';
      ctx.fillText(`⏱️ ${Math.ceil(this.timeLeft)}s`, width - 20, 36);
    }

    // Menu Overlay
    if (this.state === 'menu') {
      ctx.fillStyle = 'rgba(7, 12, 24, 0.85)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 32px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏀 CYBER HOOPS SHOOTOUT', width / 2, height / 2 - 50);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px sans-serif';
      ctx.fillText('Drag back from the ball to aim & release to shoot into the hoop', width / 2, height / 2);
      ctx.fillText('Build combo streaks for multiplier bonuses before time runs out!', width / 2, height / 2 + 25);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.fillText('👉 TAP TO SHOOT 👈', width / 2, height / 2 + 75);
    }

    // Game Over
    if (this.state === 'gameover') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 34px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TIME’S UP!', width / 2, height / 2 - 50);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '16px Orbitron, sans-serif';
      ctx.fillText(`FINAL BASKETBALL SCORE: ${this.score}`, width / 2, height / 2 - 10);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.fillText('TAP TO PLAY AGAIN', width / 2, height / 2 + 55);
    }
  }
}
