import { GameEngineCallbacks, GameEngineInstance } from './types';
import { soundManager } from '../utils/audio';

interface Card {
  id: number;
  pairId: number;
  icon: string;
  isFlipped: boolean;
  isMatched: boolean;
  flipProgress: number; // 0 to 1
}

export class MemoryCardEngine implements GameEngineInstance {
  private callbacks: GameEngineCallbacks;
  private canvasWidth = 800;
  private canvasHeight = 450;

  private state: 'menu' | 'playing' | 'paused' | 'gameover' = 'menu';
  private score = 0;
  private highScore = 0;
  private level = 1;
  private flipsCount = 0;
  private timeLeft = 60;
  private streak = 0;

  private rows = 4;
  private cols = 4;
  private cardWidth = 75;
  private cardHeight = 85;
  private cardSpacing = 14;

  private cards: Card[] = [];
  private selectedCards: Card[] = [];
  private isProcessing = false;

  private icons = ['⚡', '💎', '🛡️', '🚀', '🔮', '🧬', '🔥', '👑'];

  constructor(callbacks: GameEngineCallbacks) {
    this.callbacks = callbacks;
    try {
      const saved = localStorage.getItem('gamescrafter_highscore_memory-card');
      if (saved) this.highScore = Number(saved) || 0;
    } catch {}
  }

  public getCustomControls() {
    return {
      type: 'puzzle' as const,
      buttons: [
        { id: 'restart', label: '🔄 NEW MATRIX', color: '#38bdf8' }
      ]
    };
  }

  public handlePointerDown(x: number, y: number) {
    if (this.state === 'menu' || this.state === 'gameover') {
      this.restart();
      return;
    }

    if (this.isProcessing) return;

    const startX = (this.canvasWidth - (this.cols * (this.cardWidth + this.cardSpacing) - this.cardSpacing)) / 2;
    const startY = 65;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const idx = r * this.cols + c;
        const card = this.cards[idx];
        if (!card || card.isMatched || card.isFlipped) continue;

        const cx = startX + c * (this.cardWidth + this.cardSpacing);
        const cy = startY + r * (this.cardHeight + this.cardSpacing);

        if (x >= cx && x <= cx + this.cardWidth && y >= cy && y <= cy + this.cardHeight) {
          this.flipCard(card);
          return;
        }
      }
    }
  }

  private flipCard(card: Card) {
    card.isFlipped = true;
    this.selectedCards.push(card);
    soundManager.playClick();
    this.flipsCount++;

    if (this.selectedCards.length === 2) {
      this.isProcessing = true;
      const [c1, c2] = this.selectedCards;

      if (c1.pairId === c2.pairId) {
        // Matched!
        setTimeout(() => {
          c1.isMatched = true;
          c2.isMatched = true;
          this.selectedCards = [];
          this.isProcessing = false;
          this.streak++;
          const pts = 100 * this.streak;
          this.score += pts;
          this.timeLeft += 3;
          this.callbacks.onScoreUpdate(this.score);
          soundManager.playMatch();

          // Check if board is cleared
          if (this.cards.every((c) => c.isMatched)) {
            soundManager.playLevelUp();
            this.level++;
            this.callbacks.onWaveUpdate?.(this.level);
            setTimeout(() => this.initLevel(), 600);
          }
        }, 300);
      } else {
        // Mismatch
        setTimeout(() => {
          c1.isFlipped = false;
          c2.isFlipped = false;
          this.selectedCards = [];
          this.isProcessing = false;
          this.streak = 0;
          soundManager.playBounce();
        }, 800);
      }
    }
  }

  public restart() {
    this.state = 'playing';
    this.score = 0;
    this.level = 1;
    this.flipsCount = 0;
    this.timeLeft = 60;
    this.streak = 0;
    this.initLevel();
    this.callbacks.onScoreUpdate(0);
    this.callbacks.onWaveUpdate?.(1);
    soundManager.playScore();
  }

  private initLevel() {
    const pairCount = (this.rows * this.cols) / 2;
    const deck: Card[] = [];

    for (let i = 0; i < pairCount; i++) {
      const icon = this.icons[i % this.icons.length];
      deck.push({ id: i * 2, pairId: i, icon, isFlipped: false, isMatched: false, flipProgress: 0 });
      deck.push({ id: i * 2 + 1, pairId: i, icon, isFlipped: false, isMatched: false, flipProgress: 0 });
    }

    // Shuffle deck
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    this.cards = deck;
    this.selectedCards = [];
    this.isProcessing = false;
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

    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        localStorage.setItem('gamescrafter_highscore_memory-card', String(this.highScore));
      } catch {}
      this.callbacks.onHighScoreUpdate(this.highScore);
    }
  }

  private gameOver() {
    this.state = 'gameover';
    soundManager.playGameOver();
    this.callbacks.onGameOver(this.score);
  }

  public render(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;

    // Cyber Neural Background
    ctx.fillStyle = '#060a14';
    ctx.fillRect(0, 0, width, height);

    const startX = (width - (this.cols * (this.cardWidth + this.cardSpacing) - this.cardSpacing)) / 2;
    const startY = 65;

    // Render Cards
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const idx = r * this.cols + c;
        const card = this.cards[idx];
        if (!card) continue;

        const cx = startX + c * (this.cardWidth + this.cardSpacing);
        const cy = startY + r * (this.cardHeight + this.cardSpacing);

        ctx.save();
        if (card.isMatched) {
          ctx.globalAlpha = 0.35;
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(cx, cy, this.cardWidth, this.cardHeight);
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 2;
          ctx.strokeRect(cx, cy, this.cardWidth, this.cardHeight);
          ctx.font = '28px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(card.icon, cx + this.cardWidth / 2, cy + 54);
        } else if (card.isFlipped) {
          // Front Side Open
          ctx.fillStyle = '#1e1b4b';
          ctx.shadowColor = '#818cf8';
          ctx.shadowBlur = 12;
          ctx.fillRect(cx, cy, this.cardWidth, this.cardHeight);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(cx, cy, this.cardWidth, this.cardHeight);

          ctx.font = '32px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(card.icon, cx + this.cardWidth / 2, cy + 54);
        } else {
          // Card Back Design
          ctx.fillStyle = '#0f172a';
          ctx.shadowColor = '#0284c7';
          ctx.shadowBlur = 4;
          ctx.fillRect(cx, cy, this.cardWidth, this.cardHeight);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.strokeRect(cx, cy, this.cardWidth, this.cardHeight);

          // Tech Pattern on Card Back
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.beginPath();
          ctx.arc(cx + this.cardWidth / 2, cy + this.cardHeight / 2, 16, 0, Math.PI * 2);
          ctx.stroke();
          ctx.font = 'bold 12px Orbitron, sans-serif';
          ctx.fillStyle = '#38bdf8';
          ctx.textAlign = 'center';
          ctx.fillText('GC', cx + this.cardWidth / 2, cy + this.cardHeight / 2 + 4);
        }
        ctx.restore();
      }
    }

    // Top HUD
    if (this.state === 'playing') {
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`SCORE: ${this.score}`, 24, 34);
      ctx.fillText(`LEVEL: ${this.level}`, 24, 56);

      ctx.textAlign = 'right';
      ctx.fillStyle = this.timeLeft <= 10 ? '#ef4444' : '#22c55e';
      ctx.font = 'bold 22px Orbitron, sans-serif';
      ctx.fillText(`⏱️ ${Math.ceil(this.timeLeft)}s`, width - 24, 38);
    }

    // Menu Overlay
    if (this.state === 'menu') {
      ctx.fillStyle = 'rgba(7, 12, 24, 0.85)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 32px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🧠 NEURAL CYBER MEMORY', width / 2, height / 2 - 50);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px sans-serif';
      ctx.fillText('Flip cards to find matching cyber pairs in the neural grid', width / 2, height / 2);
      ctx.fillText('Chain consecutive matches for massive streak multipliers before time expires!', width / 2, height / 2 + 25);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.fillText('👉 TAP TO TEST MEMORY 👈', width / 2, height / 2 + 75);
    }

    // Game Over
    if (this.state === 'gameover') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 34px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TIME OVER!', width / 2, height / 2 - 50);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '16px Orbitron, sans-serif';
      ctx.fillText(`FINAL SCORE: ${this.score}`, width / 2, height / 2 - 10);
      ctx.fillText(`LEVEL REACHED: ${this.level}`, width / 2, height / 2 + 15);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.fillText('TAP TO PLAY AGAIN', width / 2, height / 2 + 65);
    }
  }
}
