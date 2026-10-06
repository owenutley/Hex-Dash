import type { HexCoord, HexDirection } from './hexTypes.ts';

export const HEX_DIRECTIONS: readonly HexDirection[] = [
  'UP',
  'UP_RIGHT',
  'DOWN_RIGHT',
  'DOWN',
  'DOWN_LEFT',
  'UP_LEFT',
] as const;

export const HEX_DIRECTION_ARROWS: Record<HexDirection, string> = {
  UP: '↑',
  UP_RIGHT: '↗',
  DOWN_RIGHT: '↘',
  DOWN: '↓',
  DOWN_LEFT: '↙',
  UP_LEFT: '↖',
};

export const HEX_DIRECTION_VECTORS: Record<HexDirection, HexCoord> = {
  UP: { q: 0, r: -1, s: 1 },
  UP_RIGHT: { q: 1, r: -1, s: 0 },
  DOWN_RIGHT: { q: 1, r: 0, s: -1 },
  DOWN: { q: 0, r: 1, s: -1 },
  DOWN_LEFT: { q: -1, r: 1, s: 0 },
  UP_LEFT: { q: -1, r: 0, s: 1 },
};

const normalizeZero = (val: number): number => (val === 0 ? 0 : val);

export const createHexCoord = (q: number, r: number, s?: number): HexCoord => {
  const calculatedS = s !== undefined ? s : -q - r;
  return {
    q: normalizeZero(q),
    r: normalizeZero(r),
    s: normalizeZero(calculatedS),
  };
};

export const hexKey = (coord: HexCoord): string => `${coord.q},${coord.r},${coord.s}`;

export const parseHexKey = (key: string): HexCoord => {
  const parts = key.split(',').map((p) => Number.parseInt(p, 10));
  const q = parts[0] ?? 0;
  const r = parts[1] ?? 0;
  const s = parts[2] ?? -q - r;
  return createHexCoord(q, r, s);
};

export const hexEqual = (a: HexCoord, b: HexCoord): boolean =>
  a.q === b.q && a.r === b.r && a.s === b.s;

export const hexAdd = (a: HexCoord, b: HexCoord): HexCoord =>
  createHexCoord(a.q + b.q, a.r + b.r, a.s + b.s);

export const hexSubtract = (a: HexCoord, b: HexCoord): HexCoord =>
  createHexCoord(a.q - b.q, a.r - b.r, a.s - b.s);

export const hexScale = (coord: HexCoord, factor: number): HexCoord =>
  createHexCoord(coord.q * factor, coord.r * factor, coord.s * factor);

export const hexDistance = (a: HexCoord, b: HexCoord): number => {
  const dq = Math.abs(a.q - b.q);
  const dr = Math.abs(a.r - b.r);
  const ds = Math.abs(a.s - b.s);
  return Math.max(dq, dr, ds);
};

export const getHexDirectionVector = (dir: HexDirection): HexCoord =>
  HEX_DIRECTION_VECTORS[dir];

export const hexNeighbor = (coord: HexCoord, dir: HexDirection): HexCoord =>
  hexAdd(coord, getHexDirectionVector(dir));

export const hexNeighbors = (coord: HexCoord): readonly HexCoord[] =>
  HEX_DIRECTIONS.map((dir) => hexNeighbor(coord, dir));

export const isWithinRadius = (coord: HexCoord, radius: number): boolean => {
  return hexDistance(coord, { q: 0, r: 0, s: 0 }) <= radius;
};

export const getAllHexesInRadius = (radius: number): readonly HexCoord[] => {
  const hexes: HexCoord[] = [];
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) {
      hexes.push(createHexCoord(q, r));
    }
  }
  return hexes;
};

export const cubeRound = (fracQ: number, fracR: number, fracS: number): HexCoord => {
  let q = Math.round(fracQ);
  let r = Math.round(fracR);
  let s = Math.round(fracS);

  const qDiff = Math.abs(q - fracQ);
  const rDiff = Math.abs(r - fracR);
  const sDiff = Math.abs(s - fracS);

  if (qDiff > rDiff && qDiff > sDiff) {
    q = -r - s;
  } else if (rDiff > sDiff) {
    r = -q - s;
  } else {
    s = -q - r;
  }

  return createHexCoord(q, r, s);
};

/**
 * Flat-topped hex coordinate to pixel (origin at center)
 */
export const hexToPixel = (coord: HexCoord, hexSize: number): { x: number; y: number } => {
  const x = hexSize * ((3 / 2) * coord.q);
  const y = hexSize * ((Math.sqrt(3) / 2) * coord.q + Math.sqrt(3) * coord.r);
  return { x, y };
};

/**
 * Pixel (relative to board center) to flat-topped hex coordinate
 */
export const pixelToHex = (x: number, y: number, hexSize: number): HexCoord => {
  const fracQ = ((2 / 3) * x) / hexSize;
  const fracR = ((-1 / 3) * x + (Math.sqrt(3) / 3) * y) / hexSize;
  const fracS = -fracQ - fracR;
  return cubeRound(fracQ, fracR, fracS);
};

/**
 * Converts a drag/swipe vector angle (in radians, atan2(dy, dx)) into one of the 6 HexDirections:
 * UP (↑), UP_RIGHT (↗), DOWN_RIGHT (↘), DOWN (↓), DOWN_LEFT (↙), UP_LEFT (↖)
 */
export const vectorToHexDirection = (dx: number, dy: number): HexDirection => {
  const angle = Math.atan2(dy, dx); // [-PI, PI]
  const deg = (angle * 180) / Math.PI; // [-180, 180]
  const normalized = (deg + 360) % 360; // [0, 360)

  // 6 Sectors:
  // DOWN_RIGHT (↘): [0, 60)
  // DOWN (↓): [60, 120)
  // DOWN_LEFT (↙): [120, 180)
  // UP_LEFT (↖): [180, 240)
  // UP (↑): [240, 300)
  // UP_RIGHT (↗): [300, 360)
  if (normalized >= 0 && normalized < 60) return 'DOWN_RIGHT';
  if (normalized >= 60 && normalized < 120) return 'DOWN';
  if (normalized >= 120 && normalized < 180) return 'DOWN_LEFT';
  if (normalized >= 180 && normalized < 240) return 'UP_LEFT';
  if (normalized >= 240 && normalized < 300) return 'UP';
  return 'UP_RIGHT';
};

export const getOppositeDirection = (dir: HexDirection): HexDirection => {
  switch (dir) {
    case 'UP':
      return 'DOWN';
    case 'DOWN':
      return 'UP';
    case 'UP_RIGHT':
      return 'DOWN_LEFT';
    case 'DOWN_LEFT':
      return 'UP_RIGHT';
    case 'DOWN_RIGHT':
      return 'UP_LEFT';
    case 'UP_LEFT':
      return 'DOWN_RIGHT';
  }
};
