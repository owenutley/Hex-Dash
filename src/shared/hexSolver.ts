import type {
  HexBlock,
  HexDirection,
  HexPuzzle,
} from './hexTypes.ts';
import {
  HEX_DIRECTIONS,
  hexKey,
} from './hex.ts';
import {
  calculateHexSlide,
  checkHexWinCondition,
} from './hexEngine.ts';

export type HexSolverMove = {
  readonly blockId: string;
  readonly dir: HexDirection;
};

export type HexSolverResult = {
  readonly solved: boolean;
  readonly moves: readonly HexSolverMove[];
  readonly minMoves: number;
  readonly nodesExplored: number;
};

const serializeBlockState = (blocks: readonly HexBlock[]): string => {
  return [...blocks]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((b) => `${b.id}:${hexKey(b.coord)}`)
    .join('|');
};

export const solveHexPuzzle = (
  puzzle: HexPuzzle,
  maxDepth = 25,
  maxNodes = 20000
): HexSolverResult => {
  const initialBlocks = puzzle.blocks;

  if (checkHexWinCondition(puzzle, initialBlocks)) {
    return {
      solved: true,
      moves: [],
      minMoves: 0,
      nodesExplored: 1,
    };
  }

  const wallKeys = new Set(puzzle.walls.map(hexKey));
  const portals = puzzle.portals ?? [];
  const radius = puzzle.radius;

  const queue: {
    blocks: readonly HexBlock[];
    moves: readonly HexSolverMove[];
  }[] = [{ blocks: initialBlocks, moves: [] }];

  const visited = new Set<string>();
  visited.add(serializeBlockState(initialBlocks));

  let nodesExplored = 0;

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;

    nodesExplored++;
    if (nodesExplored > maxNodes) break;
    if (current.moves.length >= maxDepth) continue;

    for (let i = 0; i < current.blocks.length; i++) {
      const block = current.blocks[i];
      if (!block) continue;

      const otherBlocks = current.blocks.filter((_, idx) => idx !== i);

      for (const dir of HEX_DIRECTIONS) {
        const slide = calculateHexSlide(
          block.id,
          block.coord,
          dir,
          radius,
          wallKeys,
          otherBlocks,
          portals
        );

        if (!slide.moved) continue;

        const updatedBlock: HexBlock = {
          ...block,
          coord: slide.finalCoord,
        };

        const nextBlocks: readonly HexBlock[] = [
          ...current.blocks.slice(0, i),
          updatedBlock,
          ...current.blocks.slice(i + 1),
        ];

        const nextMoves: readonly HexSolverMove[] = [
          ...current.moves,
          { blockId: block.id, dir },
        ];

        if (checkHexWinCondition(puzzle, nextBlocks)) {
          return {
            solved: true,
            moves: nextMoves,
            minMoves: nextMoves.length,
            nodesExplored,
          };
        }

        const stateKey = serializeBlockState(nextBlocks);
        if (!visited.has(stateKey)) {
          visited.add(stateKey);
          queue.push({
            blocks: nextBlocks,
            moves: nextMoves,
          });
        }
      }
    }
  }

  return {
    solved: false,
    moves: [],
    minMoves: -1,
    nodesExplored,
  };
};
