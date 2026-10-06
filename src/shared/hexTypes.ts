export type HexCoord = {
  readonly q: number;
  readonly r: number;
  readonly s: number;
};

export type HexDirection =
  | 'UP'
  | 'UP_RIGHT'
  | 'DOWN_RIGHT'
  | 'DOWN'
  | 'DOWN_LEFT'
  | 'UP_LEFT';

export type HexBlock = {
  readonly id: string;
  readonly color: string;
  readonly coord: HexCoord;
};

export type HexTarget = {
  readonly id: string;
  readonly color: string;
  readonly coord: HexCoord;
};

export type HexPortal = {
  readonly id: string;
  readonly color: string;
  readonly coord: HexCoord;
  readonly dir: HexDirection;
};

export type PuzzleDifficulty = 'tutorial' | 'daily' | 'easy' | 'medium' | 'hard' | 'custom';

export type HexPuzzle = {
  readonly id: string;
  readonly name: string;
  readonly difficulty: PuzzleDifficulty;
  readonly radius: number;
  readonly walls: readonly HexCoord[];
  readonly blocks: readonly HexBlock[];
  readonly targets: readonly HexTarget[];
  readonly portals?: readonly HexPortal[];
  readonly par?: number;
  readonly author?: string;
  readonly createdAt?: number;
};

export type HexTrajectoryStep = {
  readonly from: HexCoord;
  readonly to: HexCoord;
  readonly entryPortal?: HexPortal;
  readonly exitPortal?: HexPortal;
};

export type HexSlideResult = {
  readonly blockId: string;
  readonly startCoord: HexCoord;
  readonly finalCoord: HexCoord;
  readonly steps: readonly HexTrajectoryStep[];
  readonly moved: boolean;
};

export type HexMoveRecord = {
  readonly blockId: string;
  readonly from: HexCoord;
  readonly to: HexCoord;
  readonly steps: readonly HexTrajectoryStep[];
};

export type HexGameState = {
  readonly puzzle: HexPuzzle;
  readonly blocks: readonly HexBlock[];
  readonly moveHistory: readonly HexMoveRecord[];
  readonly moveCount: number;
  readonly isSolved: boolean;
};
