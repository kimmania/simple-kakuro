export type Difficulty = 'easy' | 'medium' | 'hard';

export type CellKind = 'blocked' | 'clue' | 'play';

export interface ClueCell {
  kind: 'clue';
  down?: number;
  right?: number;
}

export interface PlayCell {
  kind: 'play';
  value: number;
  given: boolean;
  notes: Set<number>;
}

export interface BlockedCell {
  kind: 'blocked';
}

export type LayoutCell = BlockedCell | ClueCell | PlayCell;

export interface Run {
  id: string;
  direction: 'across' | 'down';
  sum: number;
  cells: { row: number; col: number }[];
}

export interface KakuroPuzzle {
  id: string;
  difficulty: Difficulty;
  rows: number;
  cols: number;
  /** Compact cell encoding — see layout.ts */
  cells: string[][];
  solution: Record<string, number>;
}

export type GameStatus = 'playing' | 'won';

export interface GameState {
  puzzle: KakuroPuzzle;
  layout: LayoutCell[][];
  runs: Run[];
  rows: number;
  cols: number;
  selected: { row: number; col: number } | null;
  noteMode: boolean;
  mistakes: number;
  status: GameStatus;
}

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

export const RECENT_PUZZLE_COUNT = 20;

export const STORAGE_KEY = 'simple-kakuro-save';

export function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function isPlayCell(cell: LayoutCell): cell is PlayCell {
  return cell.kind === 'play';
}

export function isClueCell(cell: LayoutCell): cell is ClueCell {
  return cell.kind === 'clue';
}
