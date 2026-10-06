import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { solveHexPuzzle } from './hexSolver.ts';
import { HEX_LEVELS } from './hexLevels.ts';
import { createHexCoord } from './hex.ts';
import type { HexPuzzle } from './hexTypes.ts';

describe('Hex Puzzle Solver Tests', () => {
  it('should immediately solve an already-solved puzzle', () => {
    const solvedPuzzle: HexPuzzle = {
      id: 'already-solved',
      name: 'Solved',
      difficulty: 'tutorial',
      radius: 1,
      walls: [],
      blocks: [{ id: 'b1', color: 'blue', coord: createHexCoord(0, 0) }],
      targets: [{ id: 't1', color: 'blue', coord: createHexCoord(0, 0) }],
    };

    const result = solveHexPuzzle(solvedPuzzle);
    assert.equal(result.solved, true);
    assert.equal(result.minMoves, 0);
  });

  it('should find optimal solution for Level 1 in 1 move', () => {
    const lvl1 = HEX_LEVELS[0];
    assert.ok(lvl1);
    const result = solveHexPuzzle(lvl1);
    assert.equal(result.solved, true);
    assert.equal(result.minMoves, 1);
  });

  it('should find solutions for all starter levels', () => {
    for (const lvl of HEX_LEVELS) {
      const result = solveHexPuzzle(lvl);
      assert.equal(
        result.solved,
        true,
        `Expected level ${lvl.name} (${lvl.id}) to be solvable`
      );
      assert.ok(
        result.minMoves > 0,
        `Expected level ${lvl.name} to require moves`
      );
    }
  });
});
