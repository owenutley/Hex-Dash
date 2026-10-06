import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createHexCoord,
  getAllHexesInRadius,
  getOppositeDirection,
  HEX_DIRECTION_ARROWS,
  hexDistance,
  hexKey,
  hexNeighbor,
  hexToPixel,
  pixelToHex,
  vectorToHexDirection,
} from './hex.ts';
import {
  applyHexMove,
  calculateHexSlide,
  checkHexWinCondition,
  initHexGameState,
  undoHexMove,
} from './hexEngine.ts';
import type { HexPuzzle } from './hexTypes.ts';

describe('Hex Math & Coordinate Tests', () => {
  it('should create valid hex coordinates with q + r + s = 0', () => {
    const coord = createHexCoord(1, -2);
    assert.equal(coord.q, 1);
    assert.equal(coord.r, -2);
    assert.equal(coord.s, 1);
    assert.equal(coord.q + coord.r + coord.s, 0);
  });

  it('should calculate accurate hex distances', () => {
    const origin = createHexCoord(0, 0);
    const target = createHexCoord(2, -1);
    assert.equal(hexDistance(origin, target), 2);

    const a = createHexCoord(-2, 1);
    const b = createHexCoord(1, -2);
    assert.equal(hexDistance(a, b), 3);
  });

  it('should identify neighbors across UP, DOWN and 4 diagonals', () => {
    const center = createHexCoord(0, 0);
    assert.deepEqual(hexNeighbor(center, 'UP'), { q: 0, r: -1, s: 1 });
    assert.deepEqual(hexNeighbor(center, 'DOWN'), { q: 0, r: 1, s: -1 });
    assert.deepEqual(hexNeighbor(center, 'UP_RIGHT'), { q: 1, r: -1, s: 0 });
    assert.deepEqual(hexNeighbor(center, 'DOWN_RIGHT'), { q: 1, r: 0, s: -1 });
    assert.deepEqual(hexNeighbor(center, 'DOWN_LEFT'), { q: -1, r: 1, s: 0 });
    assert.deepEqual(hexNeighbor(center, 'UP_LEFT'), { q: -1, r: 0, s: 1 });
  });

  it('should have correct opposite directions', () => {
    assert.equal(getOppositeDirection('UP'), 'DOWN');
    assert.equal(getOppositeDirection('DOWN'), 'UP');
    assert.equal(getOppositeDirection('UP_RIGHT'), 'DOWN_LEFT');
    assert.equal(getOppositeDirection('DOWN_LEFT'), 'UP_RIGHT');
    assert.equal(getOppositeDirection('DOWN_RIGHT'), 'UP_LEFT');
    assert.equal(getOppositeDirection('UP_LEFT'), 'DOWN_RIGHT');
  });

  it('should have correct arrow symbols', () => {
    assert.equal(HEX_DIRECTION_ARROWS.UP, '↑');
    assert.equal(HEX_DIRECTION_ARROWS.DOWN, '↓');
    assert.equal(HEX_DIRECTION_ARROWS.UP_RIGHT, '↗');
    assert.equal(HEX_DIRECTION_ARROWS.DOWN_RIGHT, '↘');
    assert.equal(HEX_DIRECTION_ARROWS.DOWN_LEFT, '↙');
    assert.equal(HEX_DIRECTION_ARROWS.UP_LEFT, '↖');
  });

  it('should map drag vectors to correct hex directions', () => {
    assert.equal(vectorToHexDirection(0, -10), 'UP');
    assert.equal(vectorToHexDirection(0, 10), 'DOWN');
    assert.equal(vectorToHexDirection(10, -5), 'UP_RIGHT');
    assert.equal(vectorToHexDirection(10, 5), 'DOWN_RIGHT');
    assert.equal(vectorToHexDirection(-10, 5), 'DOWN_LEFT');
    assert.equal(vectorToHexDirection(-10, -5), 'UP_LEFT');
  });

  it('should round-trip pixelToHex and hexToPixel', () => {
    const hexSize = 30;
    const original = createHexCoord(2, -1);
    const pixel = hexToPixel(original, hexSize);
    const converted = pixelToHex(pixel.x, pixel.y, hexSize);
    assert.deepEqual(converted, original);
  });

  it('should generate correct count of hexes in radius', () => {
    assert.equal(getAllHexesInRadius(0).length, 1);
    assert.equal(getAllHexesInRadius(1).length, 7);
    assert.equal(getAllHexesInRadius(2).length, 19);
    assert.equal(getAllHexesInRadius(3).length, 37);
  });
});

describe('Hex Sliding Engine Tests', () => {
  const samplePuzzle: HexPuzzle = {
    id: 'test-puzzle-1',
    name: 'Test Puzzle',
    difficulty: 'easy',
    radius: 2,
    walls: [createHexCoord(0, 1)],
    blocks: [
      { id: 'b1', color: 'blue', coord: createHexCoord(0, 0) },
      { id: 'b2', color: 'red', coord: createHexCoord(1, -1) },
    ],
    targets: [
      { id: 't1', color: 'blue', coord: createHexCoord(0, -2) },
      { id: 't2', color: 'red', coord: createHexCoord(0, 2) },
    ],
  };

  it('should slide a block until the board boundary', () => {
    const wallKeys = new Set(samplePuzzle.walls.map(hexKey));
    const result = calculateHexSlide(
      'b1',
      createHexCoord(0, 0),
      'UP',
      2,
      wallKeys,
      []
    );

    assert.equal(result.moved, true);
    assert.deepEqual(result.finalCoord, { q: 0, r: -2, s: 2 });
  });

  it('should stop before a wall', () => {
    const wallKeys = new Set(samplePuzzle.walls.map(hexKey));
    // Wall is at (0, 1). Moving DOWN from (0,0) is (0,1). Block should not move.
    const result = calculateHexSlide(
      'b1',
      createHexCoord(0, 0),
      'DOWN',
      2,
      wallKeys,
      []
    );

    assert.equal(result.moved, false);
    assert.deepEqual(result.finalCoord, { q: 0, r: 0, s: 0 });
  });

  it('should stop before another stationary block', () => {
    const wallKeys = new Set(samplePuzzle.walls.map(hexKey));
    const otherBlock = { id: 'b2', color: 'red', coord: createHexCoord(1, 0) };
    const result = calculateHexSlide(
      'b1',
      createHexCoord(-1, 0),
      'DOWN_RIGHT',
      2,
      wallKeys,
      [otherBlock]
    );

    assert.equal(result.moved, true);
    assert.deepEqual(result.finalCoord, { q: 0, r: 0, s: 0 });
  });

  it('should handle game state transitions and undo', () => {
    const state = initHexGameState(samplePuzzle);
    assert.equal(state.moveCount, 0);
    assert.equal(state.isSolved, false);

    const { nextState, slideResult } = applyHexMove(state, 'b1', 'UP');
    assert.equal(slideResult.moved, true);
    assert.equal(nextState.moveCount, 1);
    assert.deepEqual(nextState.blocks.find((b) => b.id === 'b1')?.coord, { q: 0, r: -2, s: 2 });

    const undoneState = undoHexMove(nextState);
    assert.equal(undoneState.moveCount, 0);
    assert.deepEqual(undoneState.blocks.find((b) => b.id === 'b1')?.coord, { q: 0, r: 0, s: 0 });
  });

  it('should detect win condition when all targets are matched', () => {
    const winPuzzle: HexPuzzle = {
      id: 'win-test',
      name: 'Win Test',
      difficulty: 'tutorial',
      radius: 1,
      walls: [],
      blocks: [{ id: 'b1', color: 'blue', coord: createHexCoord(0, 1) }],
      targets: [{ id: 't1', color: 'blue', coord: createHexCoord(0, 1) }],
    };

    assert.equal(checkHexWinCondition(winPuzzle, winPuzzle.blocks), true);
  });
});
