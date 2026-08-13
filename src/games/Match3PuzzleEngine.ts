import { GameEngineCallbacks, GameEngineInstance } from './types';
import { soundManager } from '../utils/audio';

interface Gem {
  type: number; // 0 to 5
  special?: 'laser' | 'bomb' | 'rainbow';
  isMatched?: boolean;
  yOffset?: number;
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

export class Match3PuzzleEngine implements GameEngineInstance {
  private callbacks: GameEngineCallbacks;
  private canvasWidth = 800;
  private canvasHeight = 450;

  private state: 'menu' | 'playing' | 'paused' | 'gameover' = 'menu';
  private score = 0;
  private targetScore = 2500;
  private movesLeft = 25;
  private highScore = 0;

  private gridRows = 8;
  private gridCols = 8;
  private tileSize = 42;
  private gridOffsetX = 240;
  private gridOffsetY = 50;

  private grid: (Gem | null)[][] = [];
  private selectedTile: { r: number; c: number } | null = null;
  private isSwapping = false;
  private particles: Particle[] = [];

  private gemColors = ['#ef4444', '#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#06b6d4'];
  private gemNames = ['Ruby', 'Sapphire', 'Emerald', 'Amethyst', 'Topaz', 'Diamond'];

  constructor(callbacks: GameEngineCallbacks) {
    this.callbacks = callbacks;
    try {
      const saved = localStorage.getItem('gamescrafter_highscore_match-3-puzzle');
      if (saved) this.highScore = Number(saved) || 0;
    } catch {}
  }

  public getCustomControls() {
    return {
      type: 'match3' as const,
      buttons: [
        { id: 'restart', label: '🔄 NEW GAME', color: '#38bdf8' }
      ]
    };
  }

  public handlePointerDown(x: number, y: number) {
    if (this.state === 'menu' || this.state === 'gameover') {
      this.restart();
      return;
    }

    const c = Math.floor((x - this.gridOffsetX) / this.tileSize);
    const r = Math.floor((y - this.gridOffsetY) / this.tileSize);

    if (r >= 0 && r < this.gridRows && c >= 0 && c < this.gridCols) {
      if (!this.selectedTile) {
        this.selectedTile = { r, c };
        soundManager.playClick();
      } else {
        // Check if adjacent
        const dr = Math.abs(this.selectedTile.r - r);
        const dc = Math.abs(this.selectedTile.c - c);
        if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
          this.swapGems(this.selectedTile.r, this.selectedTile.c, r, c);
        }
        this.selectedTile = null;
      }
    }
  }

  private swapGems(r1: number, c1: number, r2: number, c2: number) {
    const temp = this.grid[r1][c1];
    this.grid[r1][c1] = this.grid[r2][c2];
    this.grid[r2][c2] = temp;
    soundManager.playSwoosh();

    // Check matches
    const matches = this.findMatches();
    if (matches.length > 0) {
      this.movesLeft--;
      this.processMatches(matches);
    } else {
      // Revert swap
      const revert = this.grid[r1][c1];
      this.grid[r1][c1] = this.grid[r2][c2];
      this.grid[r2][c2] = revert;
      soundManager.playBounce();
    }
  }

  private findMatches(): Array<{ r: number; c: number }> {
    const matched = new Set<string>();

    // Horizontal check
    for (let r = 0; r < this.gridRows; r++) {
      let matchCount = 1;
      for (let c = 1; c < this.gridCols; c++) {
        if (this.grid[r][c]?.type === this.grid[r][c - 1]?.type && this.grid[r][c] !== null) {
          matchCount++;
        } else {
          if (matchCount >= 3) {
            for (let i = 0; i < matchCount; i++) matched.add(`${r},${c - 1 - i}`);
          }
          matchCount = 1;
        }
      }
      if (matchCount >= 3) {
        for (let i = 0; i < matchCount; i++) matched.add(`${r},${this.gridCols - 1 - i}`);
      }
    }

    // Vertical check
    for (let c = 0; c < this.gridCols; c++) {
      let matchCount = 1;
      for (let r = 1; r < this.gridRows; r++) {
        if (this.grid[r][c]?.type === this.grid[r - 1][c]?.type && this.grid[r][c] !== null) {
          matchCount++;
        } else {
          if (matchCount >= 3) {
            for (let i = 0; i < matchCount; i++) matched.add(`${r - 1 - i},${c}`);
          }
          matchCount = 1;
        }
      }
      if (matchCount >= 3) {
        for (let i = 0; i < matchCount; i++) matched.add(`${this.gridRows - 1 - i},${c}`);
      }
    }

    return Array.from(matched).map((str) => {
      const [r, c] = str.split(',').map(Number);
      return { r, c };
    });
  }

  private processMatches(matches: Array<{ r: number; c: number }>) {
    soundManager.playMatch();
    const points = matches.length * 30;
    this.score += points;
    this.callbacks.onScoreUpdate(this.score);

    for (const m of matches) {
      const gem = this.grid[m.r][m.c];
      if (gem) {
        const color = this.gemColors[gem.type];
        // Spawn sparkles
        for (let i = 0; i < 6; i++) {
          this.particles.push({
            x: this.gridOffsetX + m.c * this.tileSize + this.tileSize / 2,
            y: this.gridOffsetY + m.r * this.tileSize + this.tileSize / 2,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 0.4,
            color,
            size: 4
          });
        }
      }
      this.grid[m.r][m.c] = null;
    }

    // Cascade down
    this.dropGems();

    // Check game over
    if (this.score >= this.targetScore) {
      soundManager.playLevelUp();
      this.targetScore += 2000;
      this.movesLeft += 10;
    } else if (this.movesLeft <= 0) {
      this.gameOver();
    }
  }

  private dropGems() {
    for (let c = 0; c < this.gridCols; c++) {
      let emptyRow = this.gridRows - 1;
      for (let r = this.gridRows - 1; r >= 0; r--) {
        if (this.grid[r][c] !== null) {
          if (r !== emptyRow) {
            this.grid[emptyRow][c] = this.grid[r][c];
            this.grid[r][c] = null;
          }
          emptyRow--;
        }
      }

      // Fill top empty with new gems
      while (emptyRow >= 0) {
        this.grid[emptyRow][c] = {
          type: Math.floor(Math.random() * this.gemColors.length)
        };
        emptyRow--;
      }
    }

    // Check for chain cascades
    setTimeout(() => {
      const newMatches = this.findMatches();
      if (newMatches.length > 0) {
        this.processMatches(newMatches);
      }
    }, 200);
  }

  public restart() {
    this.state = 'playing';
    this.score = 0;
    this.movesLeft = 25;
    this.targetScore = 2500;
    this.selectedTile = null;
    this.particles = [];

    // Init Board without initial 3 matches
    this.grid = [];
    for (let r = 0; r < this.gridRows; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.gridCols; c++) {
        let type: number;
        do {
          type = Math.floor(Math.random() * this.gemColors.length);
        } while (
          (r >= 2 && this.grid[r - 1][c]?.type === type && this.grid[r - 2][c]?.type === type) ||
          (c >= 2 && this.grid[r][c - 1]?.type === type && this.grid[r][c - 2]?.type === type)
        );
        this.grid[r][c] = { type };
      }
    }

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
        localStorage.setItem('gamescrafter_highscore_match-3-puzzle', String(this.highScore));
      } catch {}
      this.callbacks.onHighScoreUpdate(this.highScore);
    }
    this.callbacks.onGameOver(this.score);
  }

  public render(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;

    this.gridOffsetX = Math.floor((width - this.gridCols * this.tileSize) / 2);
    this.gridOffsetY = 45;

    // Cyber Jewel Background
    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, width, height);

    // Board Container Box
    ctx.fillStyle = '#111827';
    ctx.fillRect(this.gridOffsetX - 6, this.gridOffsetY - 6, this.gridCols * this.tileSize + 12, this.gridRows * this.tileSize + 12);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.gridOffsetX - 6, this.gridOffsetY - 6, this.gridCols * this.tileSize + 12, this.gridRows * this.tileSize + 12);

    // Render Grid Gems
    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const gem = this.grid[r][c];
        const gx = this.gridOffsetX + c * this.tileSize;
        const gy = this.gridOffsetY + r * this.tileSize;

        // Tile background
        ctx.fillStyle = (r + c) % 2 === 0 ? '#1f2937' : '#111827';
        ctx.fillRect(gx, gy, this.tileSize, this.tileSize);

        if (gem) {
          ctx.save();
          const color = this.gemColors[gem.type];
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 10;

          // Diamond gem shape
          ctx.beginPath();
          ctx.moveTo(gx + this.tileSize / 2, gy + 4);
          ctx.lineTo(gx + this.tileSize - 4, gy + this.tileSize / 2);
          ctx.lineTo(gx + this.tileSize / 2, gy + this.tileSize - 4);
          ctx.lineTo(gx + 4, gy + this.tileSize / 2);
          ctx.closePath();
          ctx.fill();

          // Highlight facet
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.fillRect(gx + this.tileSize / 2 - 4, gy + 8, 8, 4);
          ctx.restore();
        }

        // Highlight selected
        if (this.selectedTile && this.selectedTile.r === r && this.selectedTile.c === c) {
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 3;
          ctx.strokeRect(gx + 2, gy + 2, this.tileSize - 4, this.tileSize - 4);
        }
      }
    }

    // Render Particles
    for (const p of this.particles) {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.restore();
    }

    // HUD Sidebars
    if (this.state === 'playing') {
      // Left Info
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`SCORE:`, 24, 80);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 24px Orbitron, sans-serif';
      ctx.fillText(`${this.score}`, 24, 110);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.fillText(`TARGET:`, 24, 160);
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 20px Orbitron, sans-serif';
      ctx.fillText(`${this.targetScore}`, 24, 185);

      // Right Info (Moves Left)
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`MOVES LEFT:`, width - 24, 80);
      ctx.fillStyle = this.movesLeft < 5 ? '#ef4444' : '#22c55e';
      ctx.font = 'bold 36px Orbitron, sans-serif';
      ctx.fillText(`${this.movesLeft}`, width - 24, 120);
    }

    // Menu Overlay
    if (this.state === 'menu') {
      ctx.fillStyle = 'rgba(7, 12, 24, 0.85)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 32px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💎 CYBER GEM MATCH-3', width / 2, height / 2 - 50);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px sans-serif';
      ctx.fillText('Tap two adjacent gems to swap and match 3 or more of the same color', width / 2, height / 2);
      ctx.fillText('Reach target score before running out of moves!', width / 2, height / 2 + 25);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.fillText('👉 TAP TO PLAY MATCH-3 👈', width / 2, height / 2 + 75);
    }

    // Game Over
    if (this.state === 'gameover') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 34px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('OUT OF MOVES!', width / 2, height / 2 - 50);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '16px Orbitron, sans-serif';
      ctx.fillText(`FINAL SCORE: ${this.score}`, width / 2, height / 2 - 10);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.fillText('TAP TO PLAY AGAIN', width / 2, height / 2 + 55);
    }
  }
}
