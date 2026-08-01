import { describe, expect, it } from 'vitest';
import { getCombinations, minSum, maxSum, isValidSum } from '../src/kakuro/combinations';
import { getRunCandidates, commitValue, autoFillNotes } from '../src/kakuro/candidates';
import { parseLayout } from '../src/kakuro/layout';
import { extractRuns, summarizeRun } from '../src/kakuro/runs';
import { createGameState, pickRandomPuzzle, resetGameState } from '../src/kakuro/puzzle';
import type { Difficulty, KakuroPuzzle } from '../src/kakuro/types';
import { RECENT_PUZZLE_COUNT } from '../src/kakuro/types';

/** Crossword-style 7×9 puzzle (internal black cells break runs). */
const SAMPLE_PUZZLE: KakuroPuzzle = {
  id: 'test-001',
  difficulty: 'easy',
  rows: 7,
  cols: 9,
  cells: [
    ['#', 'd35', 'd25', '#', '#', '#', 'd28', 'd21', '#'],
    ['r37', '9', '.', '4', '.', '.', '8', '.', '#'],
    ['r11', '5', '6', '#', '#', 'r14', '5', '.', '#'],
    ['r30', '7', '.', '1', '8', '.', '.', '.', '#'],
    ['r14', '6', '.', '#', '#', 'r7', '6', '1', '#'],
    ['r35', '.', '.', '.', '.', '1', '.', '.', '#'],
    ['#', '#', '#', '#', '#', '#', '#', '#', '#'],
  ],
  solution: {
    '1,1': 9,
    '1,2': 2,
    '1,3': 4,
    '1,4': 5,
    '1,5': 3,
    '1,6': 8,
    '1,7': 6,
    '2,1': 5,
    '2,2': 6,
    '2,6': 5,
    '2,7': 9,
    '3,1': 7,
    '3,2': 4,
    '3,3': 1,
    '3,4': 8,
    '3,5': 5,
    '3,6': 2,
    '3,7': 3,
    '4,1': 6,
    '4,2': 8,
    '4,6': 6,
    '4,7': 1,
    '5,1': 8,
    '5,2': 5,
    '5,3': 3,
    '5,4': 9,
    '5,5': 1,
    '5,6': 7,
    '5,7': 2,
  },
};

describe('combinations', () => {
  it('returns known combos for sum 16 length 2', () => {
    const combos = getCombinations(16, 2);
    expect(combos).toEqual([[7, 9]]);
  });

  it('validates sum ranges', () => {
    expect(isValidSum(3, 2)).toBe(true);
    expect(isValidSum(2, 2)).toBe(false);
    expect(minSum(3)).toBe(6);
    expect(maxSum(3)).toBe(24);
  });
});

describe('runs and candidates', () => {
  it('extracts runs from a crossword-style grid', () => {
    const layout = parseLayout(SAMPLE_PUZZLE.cells);
    const runs = extractRuns(layout);
    expect(runs.length).toBeGreaterThan(6);
    const shortRun = runs.find((r) => r.cells.length === 2);
    const longRun = runs.find((r) => r.cells.length >= 4);
    expect(shortRun).toBeDefined();
    expect(longRun).toBeDefined();
  });

  it('prunes impossible notes after a value is placed', () => {
    const state = createGameState(SAMPLE_PUZZLE);
    const { row, col } = { row: 3, col: 2 };
    const cell = state.layout[row][col];
    if (cell.kind !== 'play') throw new Error('expected play cell');
    cell.notes = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);

    commitValue(state.layout, state.runs, row, col, 4, state.puzzle.solution);

    const neighbor = state.layout[3][3];
    expect(neighbor.kind).toBe('play');
    if (neighbor.kind === 'play') {
      expect(neighbor.notes.has(4)).toBe(false);
    }
  });

  it('computes run candidates from partial fills', () => {
    const state = createGameState(SAMPLE_PUZZLE);
    const run = state.runs.find((r) => r.direction === 'across' && r.sum === 14 && r.cells.length === 2);
    expect(run).toBeDefined();
    if (!run) return;

    const empty = run.cells.find(({ row, col }) => {
      const cell = state.layout[row][col];
      return cell.kind === 'play' && cell.value === 0;
    });
    expect(empty).toBeDefined();
    if (!empty) return;

    const candidates = getRunCandidates(state.layout, run, empty.row, empty.col);
    expect(candidates.size).toBeGreaterThan(0);
  });

  it('computes run candidates with givens in a 3+ cell run', () => {
    // Regression: the DFS used to inflate the remaining-empty count when it
    // skipped over filled cells, so runs with givens returned zero candidates
    // and auto-prune wiped every note in the run's empty cells.
    const layout = parseLayout([['r20', '.', '.', '9']]);
    const [run] = extractRuns(layout);
    expect(run).toBeDefined();

    // 20 − 9 = 11 across two distinct empty cells: valid pairs (3,8)…(8,3)
    // — 2 is excluded (its partner 9 repeats the given) and 9 is taken.
    const expected = new Set([3, 4, 5, 6, 7, 8]);
    expect(getRunCandidates(layout, run, 0, 1)).toEqual(expected);
    expect(getRunCandidates(layout, run, 0, 2)).toEqual(expected);
  });
});

describe('pickRandomPuzzle', () => {
  it('excludes recently played puzzle ids', () => {
    const difficulty: Difficulty = 'easy';
    const key = `simple-kakuro-recent-${difficulty}`;
    sessionStorage.setItem(key, JSON.stringify(['easy-001']));

    const puzzles: KakuroPuzzle[] = [
      { ...SAMPLE_PUZZLE, id: 'easy-001' },
      { ...SAMPLE_PUZZLE, id: 'easy-002' },
    ];

    const picked = pickRandomPuzzle(puzzles, difficulty);
    expect(picked.id).toBe('easy-002');

    sessionStorage.removeItem(key);
  });
});

describe('resetGameState', () => {
  it('restores the initial puzzle and clears progress', () => {
    const state = createGameState(SAMPLE_PUZZLE);
    const playCell = state.layout[3][2];
    if (playCell.kind === 'play') {
      playCell.value = 9;
      playCell.notes.add(5);
    }
    state.mistakes = 2;
    state.status = 'won';

    resetGameState(state);

    const restored = state.layout[3][2];
    expect(restored.kind).toBe('play');
    if (restored.kind === 'play') {
      expect(restored.value).toBe(0);
      expect(restored.notes.size).toBe(0);
    }
    expect(state.mistakes).toBe(0);
    expect(state.status).toBe('playing');
  });
});

describe('constants', () => {
  it('tracks recent puzzle window', () => {
    expect(RECENT_PUZZLE_COUNT).toBe(20);
  });
});

describe('summarizeRun', () => {
  it('reports placed and remaining sums for the selection readout', () => {
    const state = createGameState(SAMPLE_PUZZLE);
    const run = state.runs.find((r) => r.direction === 'across' && r.sum === 30);
    expect(run).toBeDefined();
    if (!run) return;

    // Givens 7, 1, 8 in the run; cells (3,2) and (3,5)–(3,7) empty.
    const summary = summarizeRun(state.layout, run);
    expect(summary.direction).toBe('across');
    expect(summary.sum).toBe(30);
    expect(summary.placed).toBe(16);
    expect(summary.remaining).toBe(14);
    expect(summary.emptyCells).toBe(run.cells.length - 3);

    // Place a value and the remaining sum drops.
    const empty = run.cells.find(({ row, col }) => {
      const cell = state.layout[row][col];
      return cell.kind === 'play' && cell.value === 0;
    });
    if (!empty) return;
    const cell = state.layout[empty.row][empty.col];
    if (cell.kind === 'play') cell.value = 4;

    const after = summarizeRun(state.layout, run);
    expect(after.placed).toBe(20);
    expect(after.remaining).toBe(10);
    expect(after.emptyCells).toBe(summary.emptyCells - 1);
  });
});

describe('autoFillNotes', () => {
  it('fills empty cells with candidates and leaves filled cells alone', () => {
    const layout = parseLayout([
      ['#', 'd4', '#'],
      ['r6', '.', '.'],
      ['#', '.', '#'],
    ]);
    const runs = extractRuns(layout);

    autoFillNotes(layout, runs);

    // Across run sums 6 in 2 cells: {1,5},{2,4}.
    // Down run sums 4 in 2 cells: {1,3}.
    // Cell (1,1): across ∩ down = {1}.
    const c11 = layout[1][1];
    if (c11.kind === 'play') {
      expect([...c11.notes].sort()).toEqual([1]);
    }
    // Cell (1,2): across only → {1,2,4,5}.
    const c12 = layout[1][2];
    if (c12.kind === 'play') {
      expect([...c12.notes].sort()).toEqual([1, 2, 4, 5]);
    }
    // Cell (2,1): down only → {1,3}.
    const c21 = layout[2][1];
    if (c21.kind === 'play') {
      expect([...c21.notes].sort()).toEqual([1, 3]);
    }

    // Filled cells keep value and gain no notes.
    if (c11.kind === 'play') {
      c11.value = 1;
      c11.notes.clear(); // what commitValue does on a real placement
    }
    autoFillNotes(layout, runs);
    if (c11.kind === 'play') {
      expect(c11.value).toBe(1);
      expect(c11.notes.size).toBe(0);
    }
  });
});
