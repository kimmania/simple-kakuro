import type { Difficulty } from '../kakuro/types';

export function getDifficultySelect(): HTMLSelectElement {
  return document.getElementById('difficulty') as HTMLSelectElement;
}

export function getSelectedDifficulty(): Difficulty {
  return getDifficultySelect().value as Difficulty;
}

export function setDifficulty(difficulty: Difficulty): void {
  getDifficultySelect().value = difficulty;
}

export function updateMistakes(count: number): void {
  const el = document.getElementById('mistakes');
  if (el) el.textContent = `Mistakes: ${count}`;
}

export function updatePuzzleId(id: string): void {
  const label = id ? `#${id}` : '';
  document.getElementById('puzzle-id')?.replaceChildren(document.createTextNode(label));
  document.getElementById('puzzle-id-footer')?.replaceChildren(document.createTextNode(label));
}

export function setNoteMode(active: boolean): void {
  const btn = document.getElementById('note-mode');
  if (!btn) return;
  btn.classList.toggle('active', active);
  btn.setAttribute('aria-pressed', String(active));
}

export function setUndoEnabled(enabled: boolean): void {
  const btn = document.getElementById('undo') as HTMLButtonElement | null;
  if (!btn) return;
  btn.disabled = !enabled;
}

export function showWinBanner(show: boolean): void {
  const banner = document.getElementById('win-banner');
  if (!banner) return;
  banner.classList.toggle('hidden', !show);
  // Text is injected on show (and removed on hide) so the polite live region
  // announces the completion instead of relying on a visibility toggle.
  const text = document.getElementById('win-text');
  if (text) text.textContent = show ? 'Puzzle complete!' : '';
}

export function bindControlHandlers(handlers: {
  onNewGame: () => void;
  onReset: () => void;
  onNoteMode: () => void;
  onClearNotes: () => void;
  onUndo: () => void;
  onCheatsheet: () => void;
  onDifficultyChange: () => void;
}): void {
  document.getElementById('new-game')?.addEventListener('click', handlers.onNewGame);
  document.getElementById('reset')?.addEventListener('click', handlers.onReset);
  document.getElementById('note-mode')?.addEventListener('click', handlers.onNoteMode);
  document.getElementById('clear-notes')?.addEventListener('click', handlers.onClearNotes);
  document.getElementById('undo')?.addEventListener('click', handlers.onUndo);
  document.getElementById('cheatsheet')?.addEventListener('click', handlers.onCheatsheet);
  getDifficultySelect().addEventListener('change', handlers.onDifficultyChange);
}

export function bindNumpadHandlers(handlers: {
  onDigit: (digit: number) => void;
  onErase: () => void;
}): void {
  const numpad = document.getElementById('numpad');
  numpad?.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target.id === 'erase') {
      handlers.onErase();
      return;
    }
    const digit = parseInt(target.dataset.digit ?? '', 10);
    if (!Number.isNaN(digit)) handlers.onDigit(digit);
  });
}

export function setActiveDigit(digit: number | null): void {
  document.querySelectorAll('.numpad-btn[data-digit]').forEach((btn) => {
    const el = btn as HTMLElement;
    const value = parseInt(el.dataset.digit ?? '', 10);
    el.classList.toggle('active', digit !== null && value === digit);
  });
}
