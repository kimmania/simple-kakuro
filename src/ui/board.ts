import type { GameState, LayoutCell } from '../kakuro/types';
import { isPlayCell } from '../kakuro/types';
import {
  getConflictCells,
  getDigitHighlightCells,
  getWrongCells,
} from '../kakuro/validate';
import { getRelatedCells, getRunsForCell } from '../kakuro/runs';

type BoardElements = {
  container: HTMLElement;
  cells: (HTMLElement | null)[][];
  noteSpans: (HTMLElement[] | null)[][];
  valueEls: (HTMLElement | null)[][];
  clueEls: (HTMLElement | null)[][];
  downEls: (HTMLElement | null)[][];
  rightEls: (HTMLElement | null)[][];
};

export function createBoard(container: HTMLElement): BoardElements {
  container.innerHTML = '';
  return { container, cells: [], noteSpans: [], valueEls: [], clueEls: [], downEls: [], rightEls: [] };
}

function ensureBoardSize(board: BoardElements, state: GameState): void {
  const { rows, cols } = state;
  board.container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  board.container.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  board.container.setAttribute('aria-rowcount', String(rows));
  board.container.setAttribute('aria-colcount', String(cols));

  if (board.cells.length === rows && board.cells[0]?.length === cols) return;

  board.container.innerHTML = '';
  board.cells = [];
  board.noteSpans = [];
  board.valueEls = [];
  board.clueEls = [];
  board.downEls = [];
  board.rightEls = [];

  for (let row = 0; row < rows; row++) {
    board.cells[row] = [];
    board.noteSpans[row] = [];
    board.valueEls[row] = [];
    board.clueEls[row] = [];
    board.downEls[row] = [];
    board.rightEls[row] = [];
    for (let col = 0; col < cols; col++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.setAttribute('role', 'gridcell');
      cell.id = `cell-${row}-${col}`;
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      cell.tabIndex = -1;

      const clueEl = document.createElement('div');
      clueEl.className = 'cell-clue';
      const downEl = document.createElement('span');
      downEl.className = 'clue-down';
      const rightEl = document.createElement('span');
      rightEl.className = 'clue-right';
      clueEl.append(downEl, rightEl);
      cell.appendChild(clueEl);

      const valueEl = document.createElement('span');
      valueEl.className = 'cell-value';
      cell.appendChild(valueEl);

      const notesEl = document.createElement('div');
      notesEl.className = 'cell-notes';
      const spans: HTMLElement[] = [];
      for (let digit = 1; digit <= 9; digit++) {
        const span = document.createElement('span');
        span.className = 'note';
        span.dataset.digit = String(digit);
        span.textContent = String(digit);
        notesEl.appendChild(span);
        spans.push(span);
      }
      cell.appendChild(notesEl);

      board.container.appendChild(cell);
      board.cells[row][col] = cell;
      board.noteSpans[row][col] = spans;
      board.valueEls[row][col] = valueEl;
      board.clueEls[row][col] = clueEl;
      board.downEls[row][col] = downEl;
      board.rightEls[row][col] = rightEl;
    }
  }
}

function cellAriaLabel(layoutCell: LayoutCell, row: number, col: number): string {
  const pos = `Row ${row + 1}, column ${col + 1}`;
  if (layoutCell.kind === 'blocked') return `${pos}, block`;
  if (layoutCell.kind === 'clue') {
    const parts: string[] = [];
    if (layoutCell.down !== undefined) parts.push(`down sum ${layoutCell.down}`);
    if (layoutCell.right !== undefined) parts.push(`across sum ${layoutCell.right}`);
    return `${pos}, clue, ${parts.join(', ')}`;
  }
  if (layoutCell.value !== 0) {
    return `${pos}, ${layoutCell.given ? 'given' : 'value'} ${layoutCell.value}`;
  }
  const notes = [...layoutCell.notes].sort((a, b) => a - b);
  return notes.length > 0 ? `${pos}, empty, notes ${notes.join(' ')}` : `${pos}, empty`;
}

export function renderBoard(
  board: BoardElements,
  state: GameState,
  highlightDigit: number | null,
): void {
  ensureBoardSize(board, state);

  const conflicts = getConflictCells(state.layout, state.runs);
  const wrong = getWrongCells(state.layout, state.puzzle.solution);
  const related = state.selected
    ? getRelatedCells(state.runs, state.selected.row, state.selected.col)
    : new Set<string>();
  const digitCells =
    highlightDigit !== null
      ? getDigitHighlightCells(state.layout, highlightDigit)
      : new Set<string>();

  board.container.setAttribute(
    'aria-activedescendant',
    state.selected ? `cell-${state.selected.row}-${state.selected.col}` : '',
  );

  for (let row = 0; row < state.rows; row++) {
    for (let col = 0; col < state.cols; col++) {
      const key = `${row},${col}`;
      const layoutCell = state.layout[row][col];
      const cellEl = board.cells[row][col]!;
      const valueEl = board.valueEls[row][col]!;
      const clueEl = board.clueEls[row][col]!;
      const downEl = board.downEls[row][col]!;
      const rightEl = board.rightEls[row][col]!;
      const noteSpans = board.noteSpans[row][col]!;

      cellEl.className = 'cell';
      cellEl.setAttribute('aria-label', cellAriaLabel(layoutCell, row, col));
      const isSelected = state.selected?.row === row && state.selected?.col === col;
      cellEl.setAttribute('aria-selected', String(isSelected));
      cellEl.classList.toggle('blocked', layoutCell.kind === 'blocked');
      cellEl.classList.toggle('clue', layoutCell.kind === 'clue');
      cellEl.classList.toggle('play', layoutCell.kind === 'play');
      cellEl.classList.toggle('selected', isSelected);
      cellEl.classList.toggle('related', related.has(key) && !isSelected);
      cellEl.classList.toggle('conflict', conflicts.has(key));
      cellEl.classList.toggle('wrong', wrong.has(key));
      cellEl.classList.toggle('digit-highlight', digitCells.has(key));

      if (layoutCell.kind === 'clue') {
        clueEl.hidden = false;
        const hasDown = layoutCell.down !== undefined;
        const hasRight = layoutCell.right !== undefined;
        clueEl.classList.toggle('has-diagonal', hasDown && hasRight);
        downEl.textContent = hasDown ? String(layoutCell.down) : '';
        downEl.hidden = !hasDown;
        rightEl.textContent = hasRight ? String(layoutCell.right) : '';
        rightEl.hidden = !hasRight;
        valueEl.hidden = true;
        valueEl.textContent = '';
        cellEl.classList.remove('filled', 'given');
        for (let digit = 1; digit <= 9; digit++) {
          noteSpans[digit - 1].hidden = true;
        }
      } else if (layoutCell.kind === 'blocked') {
        clueEl.hidden = true;
        clueEl.classList.remove('has-diagonal');
        downEl.textContent = '';
        rightEl.textContent = '';
        downEl.hidden = true;
        rightEl.hidden = true;
        valueEl.hidden = true;
        valueEl.textContent = '';
        for (let digit = 1; digit <= 9; digit++) {
          noteSpans[digit - 1].hidden = true;
        }
      } else if (isPlayCell(layoutCell)) {
        clueEl.hidden = true;
        cellEl.classList.toggle('given', layoutCell.given);

        if (layoutCell.value !== 0) {
          valueEl.textContent = String(layoutCell.value);
          valueEl.hidden = false;
          cellEl.classList.add('filled');
        } else {
          valueEl.textContent = '';
          valueEl.hidden = true;
          cellEl.classList.remove('filled');
        }

        for (let digit = 1; digit <= 9; digit++) {
          noteSpans[digit - 1].hidden = !layoutCell.notes.has(digit);
        }
      }
    }
  }
}

export function getSelectedRunInfo(state: GameState): { sum: number; length: number } | null {
  if (!state.selected) return null;
  const { row, col } = state.selected;
  const runs = getRunsForCell(state.runs, row, col);
  if (runs.length === 0) return null;
  const run = runs[0];
  return { sum: run.sum, length: run.cells.length };
}

export function bindBoardClick(
  board: BoardElements,
  onSelect: (row: number, col: number) => void,
): void {
  board.container.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement).closest('.cell.play') as HTMLElement | null;
    if (!target) return;
    const row = parseInt(target.dataset.row ?? '', 10);
    const col = parseInt(target.dataset.col ?? '', 10);
    if (Number.isNaN(row) || Number.isNaN(col)) return;
    onSelect(row, col);
  });
}

export function focusSelectedCell(board: BoardElements, row: number, col: number): void {
  board.cells[row]?.[col]?.focus({ preventScroll: true });
}

export function findNextPlayCell(
  state: GameState,
  row: number,
  col: number,
  dRow: number,
  dCol: number,
): { row: number; col: number } | null {
  let r = row + dRow;
  let c = col + dCol;
  while (r >= 0 && r < state.rows && c >= 0 && c < state.cols) {
    if (isPlayCell(state.layout[r][c])) return { row: r, col: c };
    r += dRow;
    c += dCol;
  }
  return null;
}
