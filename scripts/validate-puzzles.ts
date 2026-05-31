import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLayout } from '../src/kakuro/layout';
import { extractRuns } from '../src/kakuro/runs';
import type { Difficulty, KakuroPuzzle } from '../src/kakuro/types';
import { isPlayCell } from '../src/kakuro/types';

function isPlayToken(token: string): boolean {
  return token === '.' || /^[1-9]$/.test(token);
}

function countInternalBlack(cells: string[][]): number {
  const rows = cells.length;
  const cols = cells[0]?.length ?? 0;
  let count = 0;
  for (let row = 1; row < rows - 1; row++) {
    for (let col = 1; col < cols - 1; col++) {
      if (!isPlayToken(cells[row][col])) count++;
    }
  }
  return count;
}
function validatePuzzle(puzzle: KakuroPuzzle): string[] {
  const errors: string[] = [];
  const layout = parseLayout(puzzle.cells);
  const runs = extractRuns(layout);

  if (layout.length !== puzzle.rows) {
    errors.push(`${puzzle.id}: row count mismatch`);
  }
  if (layout[0]?.length !== puzzle.cols) {
    errors.push(`${puzzle.id}: col count mismatch`);
  }

  for (const [key, digit] of Object.entries(puzzle.solution)) {
    const [row, col] = key.split(',').map(Number);
    const cell = layout[row]?.[col];
    if (!cell || !isPlayCell(cell)) {
      errors.push(`${puzzle.id}: solution key ${key} is not a play cell`);
      continue;
    }
    if (cell.given && cell.value !== digit) {
      errors.push(`${puzzle.id}: given at ${key} does not match solution`);
    }
  }

  for (const run of runs) {
    const digits: number[] = [];
    for (const { row, col } of run.cells) {
      const value = puzzle.solution[`${row},${col}`];
      if (value === undefined) {
        errors.push(`${puzzle.id}: run ${run.id} missing solution digit at ${row},${col}`);
        continue;
      }
      digits.push(value);
    }
    if (new Set(digits).size !== digits.length) {
      errors.push(`${puzzle.id}: run ${run.id} has duplicate digits in solution`);
    }
    const sum = digits.reduce((a, b) => a + b, 0);
    if (sum !== run.sum) {
      errors.push(`${puzzle.id}: run ${run.id} sum mismatch (${sum} vs ${run.sum})`);
    }
  }

  if (countInternalBlack(puzzle.cells) === 0) {
    errors.push(`${puzzle.id}: not crossword-style (no internal black/clue cells)`);
  }

  return errors;
}

let totalErrors = 0;

for (const difficulty of ['easy', 'medium', 'hard'] as Difficulty[]) {
  const path = join(process.cwd(), 'public', 'puzzles', `${difficulty}.json`);
  const puzzles = JSON.parse(readFileSync(path, 'utf8')) as KakuroPuzzle[];
  console.log(`Validating ${difficulty} (${puzzles.length} puzzles)...`);

  if (puzzles.length !== 200) {
    console.warn(`  Expected 200 puzzles, found ${puzzles.length}`);
    totalErrors++;
  }

  for (const puzzle of puzzles) {
    const errors = validatePuzzle(puzzle);
    for (const error of errors) {
      console.error(`  ${error}`);
      totalErrors++;
    }
  }
}

if (totalErrors > 0) {
  console.error(`Validation failed with ${totalErrors} issue(s).`);
  process.exit(1);
}

console.log('All puzzles valid.');
