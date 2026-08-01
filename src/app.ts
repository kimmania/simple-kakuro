import type { GameState } from './kakuro/types';
import { isPlayCell } from './kakuro/types';
import { autoFillNotes, clearNotesOnEmptyCells } from './kakuro/candidates';
import { commitValue, eraseCell, getCandidates, toggleNote } from './kakuro/candidates';
import { pruneAllNotes } from './kakuro/candidates';
import { applySnapshot, captureSnapshot, type HistorySnapshot } from './kakuro/history';
import { resetGameState, startNewGame } from './kakuro/puzzle';
import { getRunsForCell, summarizeRun, type RunSummary } from './kakuro/runs';
import { clearSavedGame, loadSavedGame, saveGame } from './kakuro/storage';
import { isSolved } from './kakuro/validate';
import {
  bindBoardClick,
  createBoard,
  findNextPlayCell,
  focusSelectedCell,
  getSelectedRunInfo,
  renderBoard,
} from './ui/board';
import {
  bindCheatsheetHandlers,
  closeCheatsheet,
  openCheatsheet,
  setupLengthFilter,
} from './ui/cheatsheet';
import { bindHelpHandlers, closeHelp } from './ui/help';
import {
  bindControlHandlers,
  bindNumpadHandlers,
  getSelectedDifficulty,
  setActiveDigit,
  setDifficulty,
  setNoteMode,
  setNumpadCandidates,
  setUndoEnabled,
  showWinBanner,
  updateMistakes,
  updatePuzzleId,
  updateRunInfo,
} from './ui/controls';

export class KakuroApp {
  private state: GameState | null = null;
  private board = createBoard(document.getElementById('board')!);
  private activeDigit: number | null = null;
  private loading = false;
  private lastSnapshot: HistorySnapshot | null = null;
  private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  async init(): Promise<void> {
    bindBoardClick(this.board, (row, col) => this.selectCell(row, col));
    bindControlHandlers({
      onNewGame: () => void this.newGame(),
      onReset: () => this.handleReset(),
      onNoteMode: () => this.toggleNoteMode(),
      onAutoNotes: () => this.handleAutoNotes(),
      onClearNotes: () => this.handleClearNotes(),
      onUndo: () => this.handleUndo(),
      onCheatsheet: () => this.handleCheatsheet(),
      onDifficultyChange: () => void this.newGame(),
    });

    document.getElementById('play-again')?.addEventListener('click', () => void this.newGame());
    bindNumpadHandlers({
      onDigit: (digit) => this.handleDigit(digit),
      onErase: () => this.handleErase(),
    });
    bindCheatsheetHandlers();
    setupLengthFilter();
    bindHelpHandlers();

    document.addEventListener('keydown', (event) => this.handleKeydown(event));

    const saved = loadSavedGame();
    if (saved && saved.status === 'playing') {
      this.state = saved;
      setDifficulty(saved.puzzle.difficulty);
      this.clearUndo();
      this.refresh();
      return;
    }

    await this.newGame();
  }

  private async newGame(): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    clearSavedGame();
    this.clearUndo();

    try {
      const difficulty = getSelectedDifficulty();
      this.state = await startNewGame(difficulty);
      this.activeDigit = null;
      this.refresh();
    } catch (error) {
      console.error(error);
      alert('Could not load a puzzle. Please try again.');
    } finally {
      this.loading = false;
    }
  }

  private handleReset(): void {
    if (!this.state) return;
    resetGameState(this.state);
    this.activeDigit = null;
    this.clearUndo();
    this.refresh();
  }

  private clearUndo(): void {
    this.lastSnapshot = null;
    setUndoEnabled(false);
  }

  private debouncedSave(state: GameState): void {
    if (this.saveDebounceTimer) clearTimeout(this.saveDebounceTimer);
    this.saveDebounceTimer = setTimeout(() => saveGame(state), 250);
  }

  private recordUndoPoint(): void {
    if (!this.state || this.state.status === 'won') return;
    this.lastSnapshot = captureSnapshot(this.state);
  }

  private selectCell(row: number, col: number, moveFocus = false): void {
    if (!this.state || this.state.status === 'won') return;
    if (!isPlayCell(this.state.layout[row][col])) return;

    this.state.selected = { row, col };
    const value = this.state.layout[row][col].value;
    this.activeDigit = value !== 0 ? value : this.activeDigit;
    this.refresh();
    if (moveFocus) focusSelectedCell(this.board, row, col);
  }

  private toggleNoteMode(): void {
    if (!this.state || this.state.status === 'won') return;
    this.state.noteMode = !this.state.noteMode;
    setNoteMode(this.state.noteMode);
    saveGame(this.state);
  }

  private handleClearNotes(): void {
    if (!this.state || this.state.status === 'won') return;
    this.recordUndoPoint();
    clearNotesOnEmptyCells(this.state.layout);
    this.refresh();
  }

  private handleAutoNotes(): void {
    if (!this.state || this.state.status === 'won') return;
    this.recordUndoPoint();
    autoFillNotes(this.state.layout, this.state.runs);
    this.refresh();
  }

  private handleCheatsheet(): void {
    if (!this.state) return;
    closeHelp();
    const highlight = getSelectedRunInfo(this.state) ?? undefined;
    openCheatsheet(highlight);
  }

  private handleUndo(): void {
    if (!this.state || this.lastSnapshot === null) return;
    const snapshot = this.lastSnapshot;
    this.lastSnapshot = null;
    applySnapshot(this.state, snapshot);
    this.refresh();
  }

  private handleDigit(digit: number): void {
    if (!this.state || this.state.status === 'won') return;

    this.activeDigit = digit;
    const selected = this.state.selected;
    if (!selected) {
      this.refresh();
      return;
    }

    const { row, col } = selected;
    const cell = this.state.layout[row][col];
    if (!isPlayCell(cell) || cell.given) return;

    this.recordUndoPoint();

    if (this.state.noteMode) {
      toggleNote(this.state.layout, row, col, digit);
    } else {
      const mistakeDelta = commitValue(
        this.state.layout,
        this.state.runs,
        row,
        col,
        digit,
        this.state.puzzle.solution,
      );
      // Mistakes are cumulative — overwriting a wrong value later does not decrement the counter.
      this.state.mistakes += mistakeDelta;
      if (isSolved(this.state.layout, this.state.puzzle.solution)) {
        this.state.status = 'won';
      }
    }

    this.refresh();
  }

  private handleErase(): void {
    if (!this.state || this.state.status === 'won') return;
    const selected = this.state.selected;
    if (!selected) return;

    const { row, col } = selected;
    const cell = this.state.layout[row][col];
    if (!isPlayCell(cell) || cell.given) return;

    this.recordUndoPoint();

    if (this.state.noteMode && cell.value === 0 && this.activeDigit !== null) {
      cell.notes.delete(this.activeDigit);
    } else {
      eraseCell(this.state.layout, row, col);
      pruneAllNotes(this.state.layout, this.state.runs);
    }

    this.refresh();
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      closeCheatsheet();
      closeHelp();
      return;
    }

    if (!this.state || this.state.status === 'won') return;

    const target = event.target as HTMLElement;
    if (
      target.tagName === 'SELECT' ||
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key === 'z') {
      event.preventDefault();
      this.handleUndo();
      return;
    }

    if (event.key >= '1' && event.key <= '9') {
      event.preventDefault();
      this.handleDigit(parseInt(event.key, 10));
      return;
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      this.handleErase();
      return;
    }

    if (event.key === 'n' || event.key === 'N') {
      this.toggleNoteMode();
      return;
    }

    const selected = this.state.selected;
    if (!selected) return;

    let next: { row: number; col: number } | null = null;
    switch (event.key) {
      case 'ArrowUp':
        next = findNextPlayCell(this.state, selected.row, selected.col, -1, 0);
        break;
      case 'ArrowDown':
        next = findNextPlayCell(this.state, selected.row, selected.col, 1, 0);
        break;
      case 'ArrowLeft':
        next = findNextPlayCell(this.state, selected.row, selected.col, 0, -1);
        break;
      case 'ArrowRight':
        next = findNextPlayCell(this.state, selected.row, selected.col, 0, 1);
        break;
      default:
        return;
    }

    if (!next) return;
    event.preventDefault();
    this.selectCell(next.row, next.col, true);
  }

  private getSelectedRunSummaries(): RunSummary[] {
    if (!this.state?.selected) return [];
    const { row, col } = this.state.selected;
    return getRunsForCell(this.state.runs, row, col).map((run) =>
      summarizeRun(this.state!.layout, run),
    );
  }

  /** Candidates for the selected cell, or null when dimming doesn't apply. */
  private getSelectedCandidates(): Set<number> | null {
    if (!this.state?.selected || this.state.status === 'won') return null;
    const { row, col } = this.state.selected;
    const cell = this.state.layout[row][col];
    if (!isPlayCell(cell) || cell.given || cell.value !== 0) return null;
    return getCandidates(this.state.layout, this.state.runs, row, col);
  }

  private refresh(): void {
    if (!this.state) return;

    renderBoard(this.board, this.state, this.activeDigit);
    updateMistakes(this.state.mistakes);
    updatePuzzleId(this.state.puzzle.id);
    updateRunInfo(this.getSelectedRunSummaries());
    setNumpadCandidates(this.getSelectedCandidates());
    setNoteMode(this.state.noteMode);
    setActiveDigit(this.activeDigit);
    setUndoEnabled(this.lastSnapshot !== null);
    showWinBanner(this.state.status === 'won');

    if (this.state.status === 'playing') {
      this.debouncedSave(this.state);
    } else {
      clearSavedGame();
    }
  }
}

export async function bootstrap(): Promise<void> {
  const app = new KakuroApp();
  await app.init();
}
