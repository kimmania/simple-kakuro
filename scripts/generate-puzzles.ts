import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  findRuns,
  MASKS,
  type Difficulty,
  type Mask,
  type RunDef,
} from './kakuro-masks';

interface KakuroPuzzle {
  id: string;
  difficulty: Difficulty;
  rows: number;
  cols: number;
  cells: string[][];
  solution: Record<string, number>;
}

const TARGET = 200;
const VARIANTS_PER_SOLUTION = 8;

const GIVEN_RANGES: Record<Difficulty, { min: number; max: number }> = {
  easy: { min: 0.4, max: 0.55 },
  medium: { min: 0.25, max: 0.38 },
  hard: { min: 0.1, max: 0.22 },
};

function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function getPlayCells(mask: Mask): { row: number; col: number }[] {
  const cells: { row: number; col: number }[] = [];
  for (let row = 0; row < mask.length; row++) {
    for (let col = 0; col < mask[row].length; col++) {
      if (mask[row][col]) cells.push({ row, col });
    }
  }
  return cells;
}

function buildCellRunMap(runs: RunDef[]): Map<string, RunDef[]> {
  const map = new Map<string, RunDef[]>();
  for (const run of runs) {
    for (const { row, col } of run.cells) {
      const key = `${row},${col}`;
      const existing = map.get(key) ?? [];
      existing.push(run);
      map.set(key, existing);
    }
  }
  return map;
}

/**
 * Solves a mask by filling every playable cell with digits 1–9 such that no
 * digit repeats within a single run. Clue sums are derived from the completed
 * grid afterward (in buildClueMap), so the solver does not need to enforce a
 * target sum during backtracking — any complete non-repeating assignment
 * produces a valid Kakuro puzzle.
 */
function solveMask(mask: Mask, runs: RunDef[]): Record<string, number> | null {
  const playCells = getPlayCells(mask);
  const cellRuns = buildCellRunMap(runs);
  const values: Record<string, number> = {};

  function isValid(row: number, col: number, digit: number): boolean {
    const key = `${row},${col}`;
    const attached = cellRuns.get(key) ?? [];

    for (const run of attached) {
      const used = new Set<number>();
      for (const { row: r, col: c } of run.cells) {
        const runKey = `${r},${c}`;
        if (runKey === key) {
          if (used.has(digit)) return false;
          used.add(digit);
          continue;
        }
        const existing = values[runKey];
        if (existing !== undefined) {
          if (existing === digit) return false;
          used.add(existing);
        }
      }
    }

    return true;
  }

  function backtrack(index: number): boolean {
    if (index === playCells.length) return true;

    const { row, col } = playCells[index];
    const key = `${row},${col}`;
    const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

    for (const digit of digits) {
      if (!isValid(row, col, digit)) continue;
      values[key] = digit;
      if (backtrack(index + 1)) return true;
      delete values[key];
    }

    return false;
  }

  return backtrack(0) ? values : null;
}

function solutionKey(values: Record<string, number>): string {
  return Object.keys(values)
    .sort()
    .map((key) => `${key}:${values[key]}`)
    .join('|');
}

function buildClueMap(runs: RunDef[], solution: Record<string, number>): Map<string, { down?: number; right?: number }> {
  const clues = new Map<string, { down?: number; right?: number }>();

  for (const run of runs) {
    const sum = run.cells.reduce((total, { row, col }) => total + solution[`${row},${col}`], 0);
    const key = `${run.clueRow},${run.clueCol}`;
    const clue = clues.get(key) ?? {};
    if (run.direction === 'across') clue.right = sum;
    else clue.down = sum;
    clues.set(key, clue);
  }

  return clues;
}

function encodeClue(clue: { down?: number; right?: number }): string {
  const parts: string[] = [];
  if (clue.down !== undefined) parts.push(`d${clue.down}`);
  if (clue.right !== undefined) parts.push(`r${clue.right}`);
  return parts.join('');
}

function buildGrid(
  mask: Mask,
  solution: Record<string, number>,
  runs: RunDef[],
  givens: Set<string>,
): string[][] {
  const clues = buildClueMap(runs, solution);
  const rows = mask.length;
  const cols = mask[0].length;
  const grid: string[][] = [];

  for (let row = 0; row < rows; row++) {
    grid[row] = [];
    for (let col = 0; col < cols; col++) {
      if (mask[row][col]) {
        const key = `${row},${col}`;
        grid[row][col] = givens.has(key) ? String(solution[key]) : '.';
        continue;
      }

      const clue = clues.get(`${row},${col}`);
      grid[row][col] = clue ? encodeClue(clue) : '#';
    }
  }

  return grid;
}

function makeVariants(
  mask: Mask,
  runs: RunDef[],
  solution: Record<string, number>,
  difficulty: Difficulty,
): KakuroPuzzle[] {
  const keys = Object.keys(solution);
  const range = GIVEN_RANGES[difficulty];
  const puzzles: KakuroPuzzle[] = [];
  const seen = new Set<string>();
  let attempts = 0;

  while (puzzles.length < VARIANTS_PER_SOLUTION && attempts < VARIANTS_PER_SOLUTION * 30) {
    attempts++;
    const pct = range.min + Math.random() * (range.max - range.min);
    const givenCount = Math.max(0, Math.round(keys.length * pct));
    const givens = new Set(shuffle([...keys]).slice(0, givenCount));
    const cells = buildGrid(mask, solution, runs, givens);
    const signature = cells.flat().join('|');
    if (seen.has(signature)) continue;
    seen.add(signature);

    puzzles.push({
      id: 'pending',
      difficulty,
      rows: mask.length,
      cols: mask[0].length,
      cells,
      solution: { ...solution },
    });
  }

  return puzzles;
}

function generateForDifficulty(difficulty: Difficulty): KakuroPuzzle[] {
  const puzzles: KakuroPuzzle[] = [];
  const seenSolutions = new Set<string>();
  const masks = MASKS[difficulty];
  const idWidth = String(TARGET).length;
  let maskIndex = 0;
  let attempts = 0;
  const maxAttempts = TARGET * 50;

  while (puzzles.length < TARGET && attempts < maxAttempts) {
    attempts++;
    const mask = masks[maskIndex % masks.length];
    maskIndex++;
    const runs = findRuns(mask);
    const solution = solveMask(mask, runs);
    if (!solution) continue;

    const key = solutionKey(solution);
    if (seenSolutions.has(key)) continue;
    seenSolutions.add(key);

    const variants = makeVariants(mask, runs, solution, difficulty);
    for (const variant of variants) {
      if (puzzles.length >= TARGET) break;
      puzzles.push({
        ...variant,
        id: `${difficulty}-${String(puzzles.length + 1).padStart(idWidth, '0')}`,
      });
    }

    if (puzzles.length % 50 === 0) {
      console.log(`  ${difficulty}: ${puzzles.length}/${TARGET}`);
    }
  }

  if (puzzles.length < TARGET) {
    console.warn(`  ${difficulty}: only generated ${puzzles.length}/${TARGET}`);
  }

  return puzzles.slice(0, TARGET);
}

const outDir = join(process.cwd(), 'public', 'puzzles');
mkdirSync(outDir, { recursive: true });

for (const difficulty of ['easy', 'medium', 'hard'] as Difficulty[]) {
  console.log(`Generating ${difficulty} (${MASKS[difficulty].length} mask variants)...`);
  const started = Date.now();
  const puzzles = generateForDifficulty(difficulty);
  const path = join(outDir, `${difficulty}.json`);
  writeFileSync(path, JSON.stringify(puzzles));
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`Wrote ${path} (${puzzles.length} puzzles, ${seconds}s)`);
}

console.log('Done.');
