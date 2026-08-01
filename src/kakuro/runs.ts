import type { LayoutCell, Run } from './types';
import { isPlayCell } from './types';
import { getPlayValue } from './layout';

export interface RunSummary {
  direction: 'across' | 'down';
  sum: number;
  placed: number;
  remaining: number;
  emptyCells: number;
}

/** Placed/remaining sums for a run, for the selection readout. */
export function summarizeRun(layout: LayoutCell[][], run: Run): RunSummary {
  let placed = 0;
  let emptyCells = 0;
  for (const { row, col } of run.cells) {
    const value = getPlayValue(layout, row, col);
    if (value === 0) emptyCells++;
    else placed += value;
  }
  return {
    direction: run.direction,
    sum: run.sum,
    placed,
    remaining: run.sum - placed,
    emptyCells,
  };
}

export function extractRuns(layout: LayoutCell[][]): Run[] {
  const rows = layout.length;
  const cols = layout[0]?.length ?? 0;
  const runs: Run[] = [];
  let runId = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = layout[row][col];
      if (cell.kind !== 'clue') continue;

      if (cell.right !== undefined) {
        const cells: { row: number; col: number }[] = [];
        for (let c = col + 1; c < cols; c++) {
          const next = layout[row][c];
          if (!isPlayCell(next)) break;
          cells.push({ row, col: c });
        }
        if (cells.length > 0) {
          runs.push({
            id: `r${runId++}`,
            direction: 'across',
            sum: cell.right,
            cells,
          });
        }
      }

      if (cell.down !== undefined) {
        const cells: { row: number; col: number }[] = [];
        for (let r = row + 1; r < rows; r++) {
          const next = layout[r][col];
          if (!isPlayCell(next)) break;
          cells.push({ row: r, col });
        }
        if (cells.length > 0) {
          runs.push({
            id: `r${runId++}`,
            direction: 'down',
            sum: cell.down,
            cells,
          });
        }
      }
    }
  }

  return runs;
}

export function getRunsForCell(runs: Run[], row: number, col: number): Run[] {
  return runs.filter((run) => run.cells.some((c) => c.row === row && c.col === col));
}

export function getRelatedCells(runs: Run[], row: number, col: number): Set<string> {
  const related = new Set<string>();
  related.add(`${row},${col}`);
  for (const run of getRunsForCell(runs, row, col)) {
    for (const c of run.cells) {
      related.add(`${c.row},${c.col}`);
    }
  }
  return related;
}

export function findRunIndex(run: Run, row: number, col: number): number {
  return run.cells.findIndex((c) => c.row === row && c.col === col);
}
