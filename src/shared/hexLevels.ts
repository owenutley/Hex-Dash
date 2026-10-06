import type { HexPuzzle } from './hexTypes.ts';
import { createHexCoord } from './hex.ts';

export const HEX_LEVELS: readonly HexPuzzle[] = [
  {
    id: 'hex-lvl-1',
    name: 'First Slide',
    difficulty: 'tutorial',
    radius: 2,
    walls: [],
    blocks: [
      { id: 'b1', color: '#3b82f6', coord: createHexCoord(0, 0) },
    ],
    targets: [
      { id: 't1', color: '#3b82f6', coord: createHexCoord(2, 0) },
    ],
    par: 1,
  },
  {
    id: 'hex-lvl-2',
    name: 'Block Deflection',
    difficulty: 'easy',
    radius: 2,
    walls: [
      createHexCoord(1, 1),
      createHexCoord(-1, -1),
    ],
    blocks: [
      { id: 'b1', color: '#3b82f6', coord: createHexCoord(-2, 1) },
      { id: 'b2', color: '#ef4444', coord: createHexCoord(0, -1) },
    ],
    targets: [
      { id: 't1', color: '#3b82f6', coord: createHexCoord(0, 2) },
      { id: 't2', color: '#ef4444', coord: createHexCoord(2, -2) },
    ],
    par: 3,
  },
  {
    id: 'hex-lvl-3',
    name: 'Hexagonal Ricochet',
    difficulty: 'medium',
    radius: 2,
    walls: [
      createHexCoord(0, 0),
      createHexCoord(1, -1),
    ],
    blocks: [
      { id: 'b1', color: '#10b981', coord: createHexCoord(-2, 0) },
      { id: 'b2', color: '#f59e0b', coord: createHexCoord(0, 2) },
    ],
    targets: [
      { id: 't1', color: '#10b981', coord: createHexCoord(0, -1) },
      { id: 't2', color: '#f59e0b', coord: createHexCoord(-1, 1) },
    ],
    par: 4,
  },
  {
    id: 'hex-lvl-4',
    name: 'Triple Prism',
    difficulty: 'hard',
    radius: 3,
    walls: [
      createHexCoord(1, -2),
      createHexCoord(-1, 2),
      createHexCoord(0, 0),
    ],
    blocks: [
      { id: 'b1', color: '#3b82f6', coord: createHexCoord(-3, 0) },
      { id: 'b2', color: '#ef4444', coord: createHexCoord(0, -3) },
      { id: 'b3', color: '#a855f7', coord: createHexCoord(3, -3) },
    ],
    targets: [
      { id: 't1', color: '#3b82f6', coord: createHexCoord(0, 3) },
      { id: 't2', color: '#ef4444', coord: createHexCoord(3, 0) },
      { id: 't3', color: '#a855f7', coord: createHexCoord(-3, 3) },
    ],
    par: 6,
  },
];
