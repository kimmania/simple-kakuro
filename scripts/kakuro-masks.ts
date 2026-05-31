/** Crossword-style Kakuro layout masks. '.' = play, '#' = black (clue or empty). */

export type Difficulty = 'easy' | 'medium' | 'hard';

export type Mask = boolean[][];

function parseMask(rows: string[]): Mask {
  return rows.map((row) => [...row].map((ch) => ch === '.'));
}

export interface RunDef {
  direction: 'across' | 'down';
  cells: { row: number; col: number }[];
  clueRow: number;
  clueCol: number;
}

export function findRuns(mask: Mask): RunDef[] {
  const rows = mask.length;
  const cols = mask[0]?.length ?? 0;
  const runs: RunDef[] = [];

  for (let row = 0; row < rows; row++) {
    let col = 0;
    while (col < cols) {
      while (col < cols && !mask[row][col]) col++;
      const start = col;
      while (col < cols && mask[row][col]) col++;
      const length = col - start;
      if (length >= 2) {
        const cells = Array.from({ length }, (_, i) => ({ row, col: start + i }));
        runs.push({ direction: 'across', cells, clueRow: row, clueCol: start - 1 });
      }
    }
  }

  for (let col = 0; col < cols; col++) {
    let row = 0;
    while (row < rows) {
      while (row < rows && !mask[row][col]) row++;
      const start = row;
      while (row < rows && mask[row][col]) row++;
      const length = row - start;
      if (length >= 2) {
        const cells = Array.from({ length }, (_, i) => ({ row: start + i, col }));
        runs.push({ direction: 'down', cells, clueRow: start - 1, clueCol: col });
      }
    }
  }

  return runs;
}

export function validateMask(mask: Mask, label: string): void {
  const rows = mask.length;
  const cols = mask[0]?.length ?? 0;

  if (rows < 5 || cols < 5) {
    throw new Error(`${label}: mask too small`);
  }

  let playCount = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (mask[row][col]) playCount++;
    }
  }

  if (playCount < 8) {
    throw new Error(`${label}: too few play cells (${playCount})`);
  }

  const runs = findRuns(mask);
  if (runs.length < 4) {
    throw new Error(`${label}: too few runs (${runs.length})`);
  }

  const playInRun = new Set<string>();
  for (const run of runs) {
    if (run.clueRow < 0 || run.clueCol < 0 || run.clueRow >= rows || run.clueCol >= cols) {
      throw new Error(`${label}: run clue out of bounds`);
    }
    if (mask[run.clueRow][run.clueCol]) {
      throw new Error(`${label}: clue cell ${run.clueRow},${run.clueCol} is playable`);
    }
    for (const { row, col } of run.cells) {
      if (!mask[row][col]) {
        throw new Error(`${label}: run cell ${row},${col} is not playable`);
      }
      playInRun.add(`${row},${col}`);
    }
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (!mask[row][col]) continue;
      if (!playInRun.has(`${row},${col}`)) {
        throw new Error(`${label}: isolated play cell at ${row},${col}`);
      }
    }
  }

  // Reject dense "spreadsheet" layouts (only border clues).
  let internalBlack = 0;
  for (let row = 1; row < rows - 1; row++) {
    for (let col = 1; col < cols - 1; col++) {
      if (!mask[row][col]) internalBlack++;
    }
  }
  if (internalBlack === 0) {
    throw new Error(`${label}: no internal black cells (not crossword-style)`);
  }
}

function flipHorizontal(mask: Mask): Mask {
  return mask.map((row) => [...row].reverse());
}

function rotate180(mask: Mask): Mask {
  return [...mask].reverse().map((row) => [...row].reverse());
}

function expandMasks(base: Mask[], transforms = true): Mask[] {
  const out: Mask[] = [];
  const seen = new Set<string>();

  for (const mask of base) {
    const variants = transforms
      ? [mask, flipHorizontal(mask), rotate180(mask), rotate180(flipHorizontal(mask))]
      : [mask];

    for (const variant of variants) {
      const key = variant.map((row) => row.map((v) => (v ? '.' : '#')).join('')).join('|');
      if (seen.has(key)) continue;
      try {
        validateMask(variant, key);
      } catch {
        continue;
      }
      seen.add(key);
      out.push(variant);
    }
  }

  return out;
}

const EASY_BASE = [
  parseMask([
    '#########',
    '#.......#',
    '#..###..#',
    '#.......#',
    '#..###..#',
    '#.......#',
    '#########',
  ]),
  parseMask([
    '###########',
    '#....#....#',
    '#....#....#',
    '#....#....#',
    '####.#.####',
    '#....#....#',
    '#....#....#',
    '#....#....#',
    '###########',
  ]),
  parseMask([
    '##########',
    '###....###',
    '##......##',
    '#........#',
    '##......##',
    '###....###',
    '##########',
  ]),
  parseMask([
    '#########',
    '#..#..#..#',
    '#..#..#..#',
    '#........#',
    '#..#..#..#',
    '#..#..#..#',
    '#########',
  ]),
  parseMask([
    '##########',
    '#........#',
    '#.##..##.#',
    '#........#',
    '#.##..##.#',
    '#........#',
    '##########',
  ]),
  parseMask([
    '#########',
    '#.#.#.#.#',
    '#.......#',
    '#.#.#.#.#',
    '#.......#',
    '#.#.#.#.#',
    '#########',
  ]),
  parseMask([
    '###########',
    '#...###...#',
    '#...###...#',
    '#####.#####',
    '#...###...#',
    '#...###...#',
    '###########',
  ]),
];

const MEDIUM_BASE = [
  parseMask([
    '###########',
    '#.....#...#',
    '#.....#...#',
    '####..#..##',
    '#.....#...#',
    '#.....#...#',
    '##..#..####',
    '#...#.....#',
    '#...#.....#',
    '###########',
  ]),
  parseMask([
    '############',
    '#......#...#',
    '#.####.#.###',
    '#.#..#.#...#',
    '#.#..#.#.###',
    '#.####.#...#',
    '#......#...#',
    '############',
  ]),
  parseMask([
    '###########',
    '###.....###',
    '##.#...#.##',
    '#..#...#..#',
    '#..#...#..#',
    '##.#...#.##',
    '###.....###',
    '###########',
  ]),
  parseMask([
    '############',
    '#....##....#',
    '#....##....#',
    '#####..#####',
    '#....##....#',
    '#....##....#',
    '#####..#####',
    '#....##....#',
    '############',
  ]),
  parseMask([
    '#############',
    '#.....#.....#',
    '#.###.#.###.#',
    '#.#...#...#.#',
    '#.#.#####.#.#',
    '#...#...#...#',
    '#####.#.#####',
    '#.....#.....#',
    '#############',
  ]),
];

const HARD_BASE = [
  parseMask([
    '#############',
    '#.....#.....#',
    '#.###.#.###.#',
    '#.#.#.#.#.#.#',
    '#.#.#.#.#.#.#',
    '#.###.#.###.#',
    '#.....#.....#',
    '##.#######.##',
    '#.....#.....#',
    '#############',
  ]),
  parseMask([
    '##############',
    '#......#.....#',
    '#.####.#.###.#',
    '#.#..#.#.#..#',
    '#.#..#.#.#..#',
    '#.####.#.###.#',
    '#......#.....#',
    '####..#..#####',
    '#.....#......#',
    '##############',
  ]),
  parseMask([
    '#############',
    '####.....####',
    '###.#...#.###',
    '##..#...#..##',
    '#...#...#...#',
    '##..#...#..##',
    '###.#...#.###',
    '####.....####',
    '#############',
  ]),
  parseMask([
    '##############',
    '#....##....##',
    '#....##....##',
    '#####..#####.#',
    '#....##....#.#',
    '#....##....#.#',
    '#####..#####.#',
    '##....##....#',
    '##....##....#',
    '##############',
  ]),
  parseMask([
    '###############',
    '#.....#.....#.#',
    '#.###.#.###.#.#',
    '#.#...#...#.#.#',
    '#.#.#####.#.#.#',
    '#...#...#...#.#',
    '#####.#.#####.#',
    '#.....#.....#.#',
    '###############',
  ]),
];

export const MASKS: Record<Difficulty, Mask[]> = {
  easy: expandMasks(EASY_BASE),
  medium: expandMasks(MEDIUM_BASE),
  hard: expandMasks(HARD_BASE),
};

if (MASKS.easy.length === 0 || MASKS.medium.length === 0 || MASKS.hard.length === 0) {
  throw new Error('No valid masks after validation');
}
