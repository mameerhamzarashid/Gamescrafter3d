export interface GameEngineCallbacks {
  onScoreUpdate: (score: number) => void;
  onHighScoreUpdate: (highScore: number) => void;
  onGameOver: (finalScore: number) => void;
  onP1ScoreUpdate?: (score: number) => void;
  onP2ScoreUpdate?: (score: number) => void;
  onWaveUpdate?: (wave: number) => void;
  onHealthUpdate?: (health: number, maxHealth: number) => void;
  onCustomStateUpdate?: (data: Record<string, any>) => void;
}

export interface GameInputState {
  keys: { [key: string]: boolean };
  touch: {
    x: number;
    y: number;
    isDown: boolean;
    startX: number;
    startY: number;
    dx: number;
    dy: number;
    tap: boolean;
  };
  virtualControls?: { [action: string]: boolean };
}

export interface GameEngineInstance {
  update: (dt: number) => void;
  render?: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  init3D?: (canvas: HTMLCanvasElement) => void;
  handlePointerDown?: (x: number, y: number, event?: PointerEvent | MouseEvent | TouchEvent) => void;
  handlePointerMove?: (x: number, y: number, event?: PointerEvent | MouseEvent | TouchEvent) => void;
  handlePointerUp?: (x: number, y: number, event?: PointerEvent | MouseEvent | TouchEvent) => void;
  handleKeyDown?: (code: string) => void;
  handleKeyUp?: (code: string) => void;
  handleVirtualActionDown?: (action: string) => void;
  handleVirtualActionUp?: (action: string) => void;
  restart: () => void;
  pause: () => void;
  resume: () => void;
  destroy: () => void;
  getCustomControls?: () => {
    type: string;
    buttons?: Array<{ id: string; label: string; icon?: string; color?: string }>;
  };
}
