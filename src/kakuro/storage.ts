import { parseLayout } from './layout';
import { extractRuns } from './runs';
import type { GameState } from './types';
import { STORAGE_KEY } from './types';

interface SavedGame {
  puzzleId: string;
  difficulty: GameState['puzzle']['difficulty'];
  puzzle: GameState['puzzle'];
  values: Record<string, number>;
  notes: Record<string, number[]>;
  selected: { row: number; col: number } | null;
  noteMode: boolean;
  mistakes: number;
  status: GameState['status'];
}

export function saveGame(state: GameState): void {
  const values: Record<string, number> = {};
  const notes: Record<string, number[]> = {};

  for (let row = 0; row < state.layout.length; row++) {
    for (let col = 0; col < state.layout[row].length; col++) {
      const cell = state.layout[row][col];
      if (cell.kind !== 'play') continue;
      const key = `${row},${col}`;
      if (!cell.given) {
        values[key] = cell.value;
        notes[key] = Array.from(cell.notes).sort((a, b) => a - b);
      }
    }
  }

  const saved: SavedGame = {
    puzzleId: state.puzzle.id,
    difficulty: state.puzzle.difficulty,
    puzzle: state.puzzle,
    values,
    notes,
    selected: state.selected,
    noteMode: state.noteMode,
    mistakes: state.mistakes,
    status: state.status,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // Storage full or unavailable — ignore.
  }
}

export function loadSavedGame(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const saved = JSON.parse(raw) as SavedGame;
    const layout = parseLayout(saved.puzzle.cells);

    for (let row = 0; row < layout.length; row++) {
      for (let col = 0; col < layout[row].length; col++) {
        const cell = layout[row][col];
        if (cell.kind !== 'play' || cell.given) continue;
        const key = `${row},${col}`;
        cell.value = saved.values[key] ?? 0;
        cell.notes = new Set(saved.notes[key] ?? []);
      }
    }

    return {
      puzzle: saved.puzzle,
      layout,
      runs: extractRuns(layout),
      rows: saved.puzzle.rows,
      cols: saved.puzzle.cols,
      selected: saved.selected,
      noteMode: saved.noteMode,
      mistakes: saved.mistakes,
      status: saved.status,
    };
  } catch {
    return null;
  }
}

export function clearSavedGame(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
}
