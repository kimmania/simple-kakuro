import { parseLayout, cloneLayout } from './layout';
import { extractRuns } from './runs';
import type { Difficulty, GameState, KakuroPuzzle } from './types';
import { RECENT_PUZZLE_COUNT } from './types';

const puzzleCache = new Map<Difficulty, KakuroPuzzle[]>();
const recentKey = (difficulty: Difficulty) => `simple-kakuro-recent-${difficulty}`;

export async function loadPuzzles(difficulty: Difficulty): Promise<KakuroPuzzle[]> {
  const cached = puzzleCache.get(difficulty);
  if (cached) return cached;

  const response = await fetch(`${import.meta.env.BASE_URL}puzzles/${difficulty}.json`);
  if (!response.ok) {
    throw new Error(`Failed to load puzzles for ${difficulty}`);
  }

  const puzzles = (await response.json()) as KakuroPuzzle[];
  puzzleCache.set(difficulty, puzzles);
  return puzzles;
}

function getRecentIds(difficulty: Difficulty): string[] {
  try {
    const raw = sessionStorage.getItem(recentKey(difficulty));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function recordRecentId(difficulty: Difficulty, id: string): void {
  const recent = getRecentIds(difficulty).filter((existing) => existing !== id);
  recent.unshift(id);
  sessionStorage.setItem(
    recentKey(difficulty),
    JSON.stringify(recent.slice(0, RECENT_PUZZLE_COUNT)),
  );
}

export function pickRandomPuzzle(puzzles: KakuroPuzzle[], difficulty: Difficulty): KakuroPuzzle {
  if (puzzles.length === 0) {
    throw new Error(`No puzzles available for ${difficulty}`);
  }

  const recent = new Set(getRecentIds(difficulty));
  let pool = puzzles.filter((puzzle) => !recent.has(puzzle.id));
  if (pool.length === 0) {
    pool = puzzles;
  }

  const index = Math.floor(Math.random() * pool.length);
  const puzzle = pool[index];
  recordRecentId(difficulty, puzzle.id);
  return puzzle;
}

export function createGameState(puzzle: KakuroPuzzle): GameState {
  const layout = parseLayout(puzzle.cells);
  return {
    puzzle,
    layout,
    runs: extractRuns(layout),
    rows: puzzle.rows,
    cols: puzzle.cols,
    selected: null,
    noteMode: false,
    mistakes: 0,
    status: 'playing',
  };
}

export function resetGameState(state: GameState): void {
  state.layout = parseLayout(state.puzzle.cells);
  state.mistakes = 0;
  state.status = 'playing';
  state.selected = null;
}

export async function startNewGame(difficulty: Difficulty): Promise<GameState> {
  const puzzles = await loadPuzzles(difficulty);
  const puzzle = pickRandomPuzzle(puzzles, difficulty);
  return createGameState(puzzle);
}

export function cloneGameState(state: GameState): GameState {
  return {
    ...state,
    layout: cloneLayout(state.layout),
    selected: state.selected ? { ...state.selected } : null,
  };
}
