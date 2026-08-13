import { GameEngineCallbacks, GameEngineInstance } from './types';
import { soundManager } from '../utils/audio';

export class CricketEngine implements GameEngineInstance {
  private callbacks: GameEngineCallbacks;
  private canvasWidth = 800;
  private canvasHeight = 450;

  private state: 'menu' | 'playing' | 'paused' | 'gameover' = 'menu';
  private score = 0;
  private wickets = 0;
  private maxWickets = 3;
  private ballsBowled = 0;
  private totalBalls = 12; // 2 overs
  private targetScore = 36;
  private highScore = 0;

  // Ball Delivery State
  private ball = {
    x: 400,
    y: 110,
    vy: 0,
    vx: 0,
    radius: 7,
    inDelivery: false,
    speed: 5.5,
    spin: 0,
    hitResult: ''
  };

  private batsman = {
    x: 400,
    y: 340,
    isSwinging: false,
    swingType: ''
  };

  private bowlerState = {
    y: 90,
    timer: 60
  };

  constructor(callbacks: GameEngineCallbacks) {
    this.callbacks = callbacks;
    try {
      const saved = localStorage.getItem('gamescrafter_highscore_cricket');
      if (saved) this.highScore = Number(saved) || 0;
    } catch {}
  }

  public getCustomControls() {
    return {
      type: 'cricket-shots' as const,
      buttons: [
        { id: 'drive', label: '🏏 STRAIGHT DRIVE', color: '#38bdf8' },
        { id: 'pull', label: '💥 LOFTED PULL (6)', color: '#f59e0b' },
        { id: 'cover', label: '⚡ COVER DRIVE (4)', color: '#22c55e' },
        { id: 'defend', label: '🛡️ DEFEND (1)', color: '#94a3b8' }
      ]
    };
  }

  public handlePointerDown(x: number) {
    if (this.state === 'menu' || this.state === 'gameover') {
      this.restart();
      return;
    }

    if (x < this.canvasWidth * 0.33) {
      this.playShot('cover');
    } else if (x > this.canvasWidth * 0.66) {
      this.playShot('pull');
    } else {
      this.playShot('drive');
    }
  }

  public handleVirtualActionDown(action: string) {
    if (action === 'drive') this.playShot('drive');
    if (action === 'pull') this.playShot('pull');
    if (action === 'cover') this.playShot('cover');
    if (action === 'defend') this.playShot('defend');
  }

  public handleKeyDown(code: string) {
    if (code === 'Space' && (this.state === 'menu' || this.state === 'gameover')) {
      this.restart();
    }
    if (code === 'ArrowUp' || code === 'KeyW') this.playShot('drive');
    if (code === 'ArrowRight' || code === 'KeyD') this.playShot('pull');
    if (code === 'ArrowLeft' || code === 'KeyA') this.playShot('cover');
    if (code === 'ArrowDown' || code === 'KeyS') this.playShot('defend');
  }

  private playShot(shotType: string) {
    if (this.batsman.isSwinging || !this.ball.inDelivery) return;
    this.batsman.isSwinging = true;
    this.batsman.swingType = shotType;
    soundManager.playSwoosh();

    // Timing check
    const diff = Math.abs(this.ball.y - this.batsman.y);

    if (diff < 22) {
      // Perfect Timing!
      if (shotType === 'pull') {
        this.registerRun(6, '💥 HUGE SIX OVER MID-WICKET!');
      } else if (shotType === 'cover') {
        this.registerRun(4, '⚡ BEAUTIFUL COVER BOUNDARY!');
      } else if (shotType === 'drive') {
        this.registerRun(4, '🏏 ELEGANT STRAIGHT BOUNDARY!');
      } else {
        this.registerRun(1, '🛡️ SOLID PUSH SINGLE');
      }
    } else if (diff < 45) {
      // Good Timing
      if (shotType === 'pull') {
        this.registerRun(2, '⚡ 2 RUNS INTO THE GAP');
      } else {
        this.registerRun(1, '🏃 1 RUN QUICKLY TAKEN');
      }
    } else if (diff > 80 && this.ball.y < this.batsman.y) {
      // Too early / Edged to keeper
      this.registerWicket('CAUGHT BEHIND! OUT!');
    }
  }

  private registerRun(runs: number, text: string) {
    this.ball.hitResult = text;
    this.score += runs;
    this.callbacks.onScoreUpdate(this.score);
    soundManager.playScore();
    this.endBallDelivery();
  }

  private registerWicket(text: string) {
    this.ball.hitResult = text;
    this.wickets++;
    soundManager.playHit();
    this.endBallDelivery();
  }

  private endBallDelivery() {
    this.ball.inDelivery = false;
    this.ballsBowled++;

    if (this.wickets >= this.maxWickets || this.ballsBowled >= this.totalBalls) {
      setTimeout(() => this.gameOver(), 1200);
    } else {
      setTimeout(() => this.prepareNextBall(), 1500);
    }
  }

  private prepareNextBall() {
    this.ball.inDelivery = false;
    this.batsman.isSwinging = false;
    this.bowlerState.timer = 45;
  }

  private startBowlerDelivery() {
    this.ball.x = 400 + (Math.random() - 0.5) * 40;
    this.ball.y = 110;
    this.ball.vx = (Math.random() - 0.5) * 1.5;
    this.ball.vy = 5 + Math.random() * 2.5; // Delivery speed
    this.ball.inDelivery = true;
    this.ball.hitResult = '';
    this.batsman.isSwinging = false;
  }

  public restart() {
    this.state = 'playing';
    this.score = 0;
    this.wickets = 0;
    this.ballsBowled = 0;
    this.prepareNextBall();
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

    if (!this.ball.inDelivery && this.ballsBowled < this.totalBalls && this.wickets < this.maxWickets) {
      this.bowlerState.timer--;
      if (this.bowlerState.timer <= 0) {
        this.startBowlerDelivery();
      }
    }

    if (this.ball.inDelivery) {
      this.ball.y += this.ball.vy;
      this.ball.x += this.ball.vx;

      // Ball pitches on wicket
      if (this.ball.y > 220 && this.ball.y < 230) {
        // slight bounce variation
        this.ball.vx += (Math.random() - 0.5) * 0.8;
      }

      // Ball passes batsman into stumps
      if (this.ball.y > this.batsman.y + 25) {
        if (!this.batsman.isSwinging) {
          // Bowled out!
          this.registerWicket('CLEAN BOWLED! STUMPS SHATTERED!');
        } else {
          // Missed swing
          this.registerRun(0, 'DOT BALL - BEATEN OUTSIDE OFF');
        }
      }
    }
  }

  private gameOver() {
    this.state = 'gameover';
    soundManager.playGameOver();
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        localStorage.setItem('gamescrafter_highscore_cricket', String(this.highScore));
      } catch {}
      this.callbacks.onHighScoreUpdate(this.highScore);
    }
    this.callbacks.onGameOver(this.score);
  }

  public render(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;

    // Cricket Stadium Outfield
    ctx.fillStyle = '#065f46';
    ctx.fillRect(0, 0, width, height);

    // Oval Boundary Rope
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(width / 2, height / 2, width * 0.46, height * 0.44, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 22-Yard Pitch Strip
    const pitchWidth = 100;
    const pitchLeft = (width - pitchWidth) / 2;
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(pitchLeft, 70, pitchWidth, 300);

    // Crease Lines
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    // Bowler crease
    ctx.beginPath();
    ctx.moveTo(pitchLeft, 110);
    ctx.lineTo(pitchLeft + pitchWidth, 110);
    ctx.stroke();
    // Batsman crease
    ctx.beginPath();
    ctx.moveTo(pitchLeft, 340);
    ctx.lineTo(pitchLeft + pitchWidth, 340);
    ctx.stroke();

    // Stumps (Bowler End)
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(width / 2 - 8, 95, 16, 12);

    // Stumps (Batsman End)
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(width / 2 - 10, 355, 20, 16);

    // Render Batsman
    ctx.save();
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#0ea5e9';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(this.batsman.x - 15, this.batsman.y, 14, 0, Math.PI * 2);
    ctx.fill();

    // Cricket Bat
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 5;
    ctx.beginPath();
    if (this.batsman.isSwinging) {
      ctx.moveTo(this.batsman.x - 15, this.batsman.y);
      ctx.lineTo(this.batsman.x + 25, this.batsman.y - 15);
    } else {
      ctx.moveTo(this.batsman.x - 15, this.batsman.y);
      ctx.lineTo(this.batsman.x - 5, this.batsman.y + 20);
    }
    ctx.stroke();
    ctx.restore();

    // Render Ball Delivery
    if (this.ball.inDelivery) {
      ctx.save();
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#f87171';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Commentary & Shot Result
    if (this.ball.hitResult) {
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 18px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.ball.hitResult, width / 2, height / 2);
    }

    // Match Scoreboard HUD
    if (this.state === 'playing') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(16, 16, 260, 68);
      ctx.strokeStyle = '#38bdf8';
      ctx.strokeRect(16, 16, 260, 68);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`SCORE: ${this.score}/${this.wickets}`, 28, 38);

      const overs = `${Math.floor(this.ballsBowled / 6)}.${this.ballsBowled % 6}`;
      ctx.fillText(`OVERS: ${overs} / 2.0`, 28, 62);
    }

    // Menu Overlay
    if (this.state === 'menu') {
      ctx.fillStyle = 'rgba(7, 12, 24, 0.85)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 32px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏏 SUPER OVER CRICKET CLASH', width / 2, height / 2 - 50);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px sans-serif';
      ctx.fillText('Time your shots perfectly as the bowler delivers fast & spin deliveries', width / 2, height / 2);
      ctx.fillText('Hit massive Sixes & Cover Drives to chase down the target in 2 Overs!', width / 2, height / 2 + 25);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.fillText('👉 TAP TO TAKE STRIKE 👈', width / 2, height / 2 + 75);
    }

    // Game Over
    if (this.state === 'gameover') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, width, height);

      const won = this.score >= this.targetScore;
      ctx.fillStyle = won ? '#22c55e' : '#ef4444';
      ctx.font = 'bold 34px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(won ? 'VICTORY! TARGET CHASED!' : 'MATCH CONCLUDED!', width / 2, height / 2 - 50);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '16px Orbitron, sans-serif';
      ctx.fillText(`TOTAL RUNS: ${this.score}/${this.wickets}`, width / 2, height / 2 - 10);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.fillText('TAP TO PLAY NEXT MATCH', width / 2, height / 2 + 55);
    }
  }
}
