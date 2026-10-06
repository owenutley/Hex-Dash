import type {
  HexBlock,
  HexCoord,
  HexDirection,
  HexGameState,
  HexPortal,
  HexPuzzle,
  HexSlideResult,
  HexTrajectoryStep,
} from './hexTypes.ts';
import {
  getHexDirectionVector,
  getOppositeDirection,
  hexAdd,
  hexEqual,
  hexKey,
  isWithinRadius,
} from './hex.ts';

export const checkHexWinCondition = (
  puzzle: HexPuzzle,
  blocks: readonly HexBlock[]
): boolean => {
  if (puzzle.targets.length === 0) return false;

  for (const target of puzzle.targets) {
    const matchingBlock = blocks.find(
      (b) => hexEqual(b.coord, target.coord) && b.color.toLowerCase() === target.color.toLowerCase()
    );
    if (!matchingBlock) {
      return false;
    }
  }

  return true;
};

export const calculateHexSlide = (
  blockId: string,
  startCoord: HexCoord,
  dir: HexDirection,
  radius: number,
  wallKeys: ReadonlySet<string>,
  otherBlocks: readonly HexBlock[],
  portals: readonly HexPortal[] = []
): HexSlideResult => {
  let currentCoord = startCoord;
  let currentDir = dir;
  let segmentStart = startCoord;

  const steps: HexTrajectoryStep[] = [];
  const visitedPortals = new Set<string>();

  const otherBlockKeys = new Set(otherBlocks.map((b) => hexKey(b.coord)));

  while (true) {
    const dirVec = getHexDirectionVector(currentDir);
    const nextCoord = hexAdd(currentCoord, dirVec);
    const nextKey = hexKey(nextCoord);

    // Check if next step is blocked (out of board, wall, or another block)
    const isOutOfBounds = !isWithinRadius(nextCoord, radius);
    const isWall = wallKeys.has(nextKey);
    const isOccupiedByBlock = otherBlockKeys.has(nextKey);

    const isBlocked = isOutOfBounds || isWall || isOccupiedByBlock;

    // Check if current coordinate has a portal that faces the incoming direction
    const entryPortal = portals.find(
      (p) => hexEqual(p.coord, currentCoord) && p.dir === getOppositeDirection(currentDir)
    );

    if (isBlocked) {
      // If we hit an obstruction on a portal cell facing the wall, try teleporting
      if (entryPortal && !visitedPortals.has(entryPortal.id)) {
        const exitPortal = portals.find(
          (p) =>
            p.id !== entryPortal.id &&
            p.color.toLowerCase() === entryPortal.color.toLowerCase()
        );

        if (exitPortal) {
          const exitCoord = exitPortal.coord;
          const exitKey = hexKey(exitCoord);
          const isExitBlocked =
            wallKeys.has(exitKey) ||
            otherBlockKeys.has(exitKey) ||
            !isWithinRadius(exitCoord, radius);

          if (!isExitBlocked) {
            steps.push({
              from: segmentStart,
              to: entryPortal.coord,
              entryPortal,
              exitPortal,
            });

            visitedPortals.add(entryPortal.id);
            visitedPortals.add(exitPortal.id);

            currentCoord = exitCoord;
            segmentStart = exitCoord;
            currentDir = exitPortal.dir;
            continue;
          }
        }
      }

      // No portal or portal path is blocked; slide stops at currentCoord
      break;
    }

    currentCoord = nextCoord;
  }

  if (
    !hexEqual(segmentStart, currentCoord) ||
    steps.length === 0
  ) {
    steps.push({
      from: segmentStart,
      to: currentCoord,
    });
  }

  const moved = !hexEqual(startCoord, currentCoord);

  return {
    blockId,
    startCoord,
    finalCoord: currentCoord,
    steps,
    moved,
  };
};

export const initHexGameState = (puzzle: HexPuzzle): HexGameState => {
  const blocks = [...puzzle.blocks];
  const isSolved = checkHexWinCondition(puzzle, blocks);

  return {
    puzzle,
    blocks,
    moveHistory: [],
    moveCount: 0,
    isSolved,
  };
};

export const applyHexMove = (
  state: HexGameState,
  blockId: string,
  dir: HexDirection
): { nextState: HexGameState; slideResult: HexSlideResult } => {
  const blockIndex = state.blocks.findIndex((b) => b.id === blockId);
  if (blockIndex === -1) {
    const startCoord = { q: 0, r: 0, s: 0 };
    return {
      nextState: state,
      slideResult: {
        blockId,
        startCoord,
        finalCoord: startCoord,
        steps: [],
        moved: false,
      },
    };
  }

  const blockToMove = state.blocks[blockIndex];
  if (!blockToMove) {
    const startCoord = { q: 0, r: 0, s: 0 };
    return {
      nextState: state,
      slideResult: {
        blockId,
        startCoord,
        finalCoord: startCoord,
        steps: [],
        moved: false,
      },
    };
  }

  const wallKeys = new Set(state.puzzle.walls.map(hexKey));
  const otherBlocks = state.blocks.filter((b) => b.id !== blockId);
  const portals = state.puzzle.portals ?? [];

  const slideResult = calculateHexSlide(
    blockId,
    blockToMove.coord,
    dir,
    state.puzzle.radius,
    wallKeys,
    otherBlocks,
    portals
  );

  if (!slideResult.moved) {
    return { nextState: state, slideResult };
  }

  const updatedBlock: HexBlock = {
    ...blockToMove,
    coord: slideResult.finalCoord,
  };

  const nextBlocks = [
    ...state.blocks.slice(0, blockIndex),
    updatedBlock,
    ...state.blocks.slice(blockIndex + 1),
  ];

  const moveRecord = {
    blockId,
    from: slideResult.startCoord,
    to: slideResult.finalCoord,
    steps: slideResult.steps,
  };

  const nextState: HexGameState = {
    puzzle: state.puzzle,
    blocks: nextBlocks,
    moveHistory: [...state.moveHistory, moveRecord],
    moveCount: state.moveCount + 1,
    isSolved: checkHexWinCondition(state.puzzle, nextBlocks),
  };

  return { nextState, slideResult };
};

export const undoHexMove = (state: HexGameState): HexGameState => {
  if (state.moveHistory.length === 0) return state;

  const lastMove = state.moveHistory[state.moveHistory.length - 1];
  if (!lastMove) return state;

  const blockIndex = state.blocks.findIndex((b) => b.id === lastMove.blockId);
  if (blockIndex === -1) return state;

  const currentBlock = state.blocks[blockIndex];
  if (!currentBlock) return state;

  const restoredBlock: HexBlock = {
    ...currentBlock,
    coord: lastMove.from,
  };

  const nextBlocks = [
    ...state.blocks.slice(0, blockIndex),
    restoredBlock,
    ...state.blocks.slice(blockIndex + 1),
  ];

  const nextHistory = state.moveHistory.slice(0, -1);

  return {
    puzzle: state.puzzle,
    blocks: nextBlocks,
    moveHistory: nextHistory,
    moveCount: Math.max(0, state.moveCount - 1),
    isSolved: checkHexWinCondition(state.puzzle, nextBlocks),
  };
};
