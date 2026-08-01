import { getCombinations, minSum, maxSum } from './combinations';
import type { LayoutCell, Run } from './types';
import { isPlayCell } from './types';
import { findRunIndex } from './runs';

export function getPlayValue(layout: LayoutCell[][], row: number, col: number): number {
  const cell = layout[row][col];
  return isPlayCell(cell) ? cell.value : 0;
}

function canAchieveSum(sum: number, length: number, used: Set<number>): boolean {
  if (length === 0) return sum === 0;
  if (sum < minSum(length) || sum > maxSum(length)) return false;

  const combos = getCombinations(sum, length);
  return combos.some((combo) => combo.every((d) => !used.has(d)));
}

/** Digits that can appear at (row,col) within a single run given current fills. */
export function getRunCandidates(
  layout: LayoutCell[][],
  run: Run,
  row: number,
  col: number,
): Set<number> {
  const targetIdx = findRunIndex(run, row, col);
  if (targetIdx < 0) return new Set();

  const candidates = new Set<number>();
  const assignment: (number | null)[] = run.cells.map(({ row: r, col: c }) => {
    const value = getPlayValue(layout, r, c);
    return value === 0 ? null : value;
  });

  // Sum of filled values strictly after each position — pruning must subtract
  // these so feasibility checks only measure what the empty cells must reach.
  const fixedSumAfter: number[] = new Array(run.cells.length).fill(0);
  for (let i = run.cells.length - 2; i >= 0; i--) {
    fixedSumAfter[i] = fixedSumAfter[i + 1] + (assignment[i + 1] ?? 0);
  }

  function dfs(pos: number, remainingSum: number, used: Set<number>): void {
    if (pos === run.cells.length) {
      if (remainingSum === 0) {
        const digit = assignment[targetIdx];
        if (digit !== null) candidates.add(digit);
      }
      return;
    }

    let emptyCount = 0;
    for (let i = pos; i < run.cells.length; i++) {
      if (assignment[i] === null) emptyCount++;
    }

    if (assignment[pos] !== null) {
      const digit = assignment[pos]!;
      if (used.has(digit)) return;
      const nextSum = remainingSum - digit;
      // emptyCount counts only cells after pos (this one is filled).
      const needed = nextSum - fixedSumAfter[pos];
      if (needed < minSum(emptyCount) || needed > maxSum(emptyCount)) return;
      used.add(digit);
      dfs(pos + 1, nextSum, used);
      used.delete(digit);
      return;
    }

    for (let digit = 1; digit <= 9; digit++) {
      if (used.has(digit)) continue;
      const nextSum = remainingSum - digit;
      const nextEmpty = emptyCount - 1;
      const needed = nextSum - fixedSumAfter[pos];
      if (nextEmpty > 0 && !canAchieveSum(needed, nextEmpty, new Set([...used, digit]))) continue;
      if (nextEmpty === 0 && needed !== 0) continue;

      assignment[pos] = digit;
      used.add(digit);
      dfs(pos + 1, nextSum, used);
      used.delete(digit);
      assignment[pos] = null;
    }
  }

  const initialUsed = new Set<number>();

  dfs(0, run.sum, initialUsed);
  return candidates;
}

export function getCandidates(
  layout: LayoutCell[][],
  runs: Run[],
  row: number,
  col: number,
): Set<number> {
  const cell = layout[row][col];
  if (!isPlayCell(cell) || cell.value !== 0) return new Set();

  const cellRuns = runs.filter((run) =>
    run.cells.some((c) => c.row === row && c.col === col),
  );

  if (cellRuns.length === 0) {
    return new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  }

  let result: Set<number> | null = null;
  for (const run of cellRuns) {
    const runCandidates = getRunCandidates(layout, run, row, col);
    if (result === null) {
      result = runCandidates;
    } else {
      const intersection = new Set<number>();
      for (const digit of result) {
        if (runCandidates.has(digit)) intersection.add(digit);
      }
      result = intersection;
    }
  }

  return result ?? new Set();
}

export function toggleNote(
  layout: LayoutCell[][],
  row: number,
  col: number,
  digit: number,
): void {
  const cell = layout[row][col];
  if (!isPlayCell(cell) || cell.value !== 0 || cell.given) return;

  if (cell.notes.has(digit)) {
    cell.notes.delete(digit);
  } else {
    cell.notes.add(digit);
  }
}

export function stripDigitFromRun(
  layout: LayoutCell[][],
  run: Run,
  digit: number,
  skipRow?: number,
  skipCol?: number,
): void {
  for (const { row, col } of run.cells) {
    if (row === skipRow && col === skipCol) continue;
    const cell = layout[row][col];
    if (isPlayCell(cell)) cell.notes.delete(digit);
  }
}

export function pruneNotesInRun(layout: LayoutCell[][], run: Run): void {
  for (const { row, col } of run.cells) {
    const cell = layout[row][col];
    if (!isPlayCell(cell) || cell.value !== 0) continue;

    const allowed = getRunCandidates(layout, run, row, col);
    for (const note of [...cell.notes]) {
      if (!allowed.has(note)) cell.notes.delete(note);
    }
  }
}

export function pruneNotesForCell(
  layout: LayoutCell[][],
  runs: Run[],
  row: number,
  col: number,
): void {
  const cell = layout[row][col];
  if (!isPlayCell(cell) || cell.value !== 0) return;

  const allowed = getCandidates(layout, runs, row, col);
  for (const note of [...cell.notes]) {
    if (!allowed.has(note)) cell.notes.delete(note);
  }
}

export function pruneAllNotes(layout: LayoutCell[][], runs: Run[]): void {
  for (let row = 0; row < layout.length; row++) {
    for (let col = 0; col < layout[row].length; col++) {
      pruneNotesForCell(layout, runs, row, col);
    }
  }
}

export function commitValue(
  layout: LayoutCell[][],
  runs: Run[],
  row: number,
  col: number,
  digit: number,
  solution: Record<string, number>,
): number {
  const cell = layout[row][col];
  if (!isPlayCell(cell) || cell.given) return 0;

  cell.value = digit;
  cell.notes.clear();

  const cellRuns = runs.filter((run) =>
    run.cells.some((c) => c.row === row && c.col === col),
  );

  for (const run of cellRuns) {
    stripDigitFromRun(layout, run, digit, row, col);
    pruneNotesInRun(layout, run);
  }

  for (const run of cellRuns) {
    for (const { row: r, col: c } of run.cells) {
      if (r === row && c === col) continue;
      pruneNotesForCell(layout, runs, r, c);
    }
  }

  const key = `${row},${col}`;
  return digit === solution[key] ? 0 : 1;
}

export function eraseCell(layout: LayoutCell[][], row: number, col: number): void {
  const cell = layout[row][col];
  if (!isPlayCell(cell) || cell.given) return;
  cell.value = 0;
}

export function clearNotesOnEmptyCells(layout: LayoutCell[][]): void {
  for (const row of layout) {
    for (const cell of row) {
      if (isPlayCell(cell) && cell.value === 0) {
        cell.notes.clear();
      }
    }
  }
}
