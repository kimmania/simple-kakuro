import type { LayoutCell, Run } from './types';
import { cellKey, isPlayCell } from './types';
import { getPlayValue } from './layout';
export function getRunConflicts(layout: LayoutCell[][], run: Run): Set<string> {
  const conflicts = new Set<string>();
  const seen = new Map<number, string>();

  for (const { row, col } of run.cells) {
    const value = getPlayValue(layout, row, col);
    if (value === 0) continue;

    const existing = seen.get(value);
    if (existing) {
      conflicts.add(existing);
      conflicts.add(cellKey(row, col));
    } else {
      seen.set(value, cellKey(row, col));
    }
  }

  return conflicts;
}

export function getRunSumMismatch(layout: LayoutCell[][], run: Run): Set<string> {
  const mismatch = new Set<string>();
  let filled = 0;
  let sum = 0;
  let allFilled = true;

  for (const { row, col } of run.cells) {
    const value = getPlayValue(layout, row, col);
    if (value === 0) {
      allFilled = false;
      continue;
    }
    filled++;
    sum += value;
  }

  if (filled === 0) return mismatch;

  if (allFilled && sum !== run.sum) {
    for (const { row, col } of run.cells) {
      mismatch.add(cellKey(row, col));
    }
  } else if (sum > run.sum) {
    for (const { row, col } of run.cells) {
      const value = getPlayValue(layout, row, col);
      if (value !== 0) mismatch.add(cellKey(row, col));
    }
  }

  return mismatch;
}

export function getConflictCells(layout: LayoutCell[][], runs: Run[]): Set<string> {
  const conflicts = new Set<string>();
  for (const run of runs) {
    for (const key of getRunConflicts(layout, run)) conflicts.add(key);
    for (const key of getRunSumMismatch(layout, run)) conflicts.add(key);
  }
  return conflicts;
}

export function isWrongValue(
  layout: LayoutCell[][],
  row: number,
  col: number,
  solution: Record<string, number>,
): boolean {
  const cell = layout[row][col];
  if (!isPlayCell(cell) || cell.given || cell.value === 0) return false;
  return cell.value !== solution[cellKey(row, col)];
}

export function getWrongCells(
  layout: LayoutCell[][],
  solution: Record<string, number>,
): Set<string> {
  const wrong = new Set<string>();
  for (let row = 0; row < layout.length; row++) {
    for (let col = 0; col < layout[row].length; col++) {
      if (isWrongValue(layout, row, col, solution)) {
        wrong.add(cellKey(row, col));
      }
    }
  }
  return wrong;
}

export function isComplete(layout: LayoutCell[][]): boolean {
  for (const row of layout) {
    for (const cell of row) {
      if (isPlayCell(cell) && cell.value === 0) return false;
    }
  }
  return true;
}

export function isSolved(
  layout: LayoutCell[][],
  solution: Record<string, number>,
): boolean {
  for (const [key, digit] of Object.entries(solution)) {
    const [row, col] = key.split(',').map(Number);
    if (getPlayValue(layout, row, col) !== digit) return false;
  }
  return true;
}

export function getDigitHighlightCells(
  layout: LayoutCell[][],
  digit: number,
): Set<string> {
  const cells = new Set<string>();
  if (digit === 0) return cells;

  for (let row = 0; row < layout.length; row++) {
    for (let col = 0; col < layout[row].length; col++) {
      const cell = layout[row][col];
      if (isPlayCell(cell) && (cell.value === digit || cell.notes.has(digit))) {
        cells.add(cellKey(row, col));
      }
    }
  }
  return cells;
}

export function validateRun(layout: LayoutCell[][], run: Run): boolean {
  const digits: number[] = [];
  for (const { row, col } of run.cells) {
    const value = getPlayValue(layout, row, col);
    if (value === 0) return false;
    digits.push(value);
  }
  if (new Set(digits).size !== digits.length) return false;
  return digits.reduce((a, b) => a + b, 0) === run.sum;
}
