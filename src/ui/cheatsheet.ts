import {
  buildCheatsheet,
  formatCombo,
  getCombinations,
  type CheatsheetEntry,
} from '../kakuro/combinations';

let entries: CheatsheetEntry[] | null = null;

function getEntries(): CheatsheetEntry[] {
  if (!entries) entries = buildCheatsheet();
  return entries;
}

function getOverlay(): HTMLElement {
  return document.getElementById('cheatsheet-overlay')!;
}

function getPanel(): HTMLElement {
  return document.getElementById('cheatsheet-panel')!;
}

function renderList(highlight?: { sum: number; length: number }): void {
  const list = document.getElementById('cheatsheet-list')!;
  list.innerHTML = '';

  const filtered = highlight
    ? getEntries().filter((e) => e.sum === highlight.sum && e.length === highlight.length)
    : getEntries();

  if (highlight && filtered.length === 0) {
    const combos = getCombinations(highlight.sum, highlight.length);
    if (combos.length > 0) {
      filtered.push({ sum: highlight.sum, length: highlight.length, combos });
    }
  }

  for (const entry of filtered) {
    const item = document.createElement('details');
    item.className = 'cheatsheet-item';
    if (highlight && entry.sum === highlight.sum && entry.length === highlight.length) {
      item.open = true;
      item.classList.add('highlight');
    }

    const summary = document.createElement('summary');
    summary.textContent = `Sum ${entry.sum}, ${entry.length} cells (${entry.combos.length})`;
    item.appendChild(summary);

    const combosEl = document.createElement('div');
    combosEl.className = 'cheatsheet-combos';
    combosEl.textContent = entry.combos.map(formatCombo).join(' · ');
    item.appendChild(combosEl);

    list.appendChild(item);
  }

  if (filtered.length === 0) {
    list.textContent = 'No combinations for the current selection.';
  }
}

export function openCheatsheet(highlight?: { sum: number; length: number }): void {
  const overlay = getOverlay();
  const panel = getPanel();
  overlay.classList.remove('hidden');
  panel.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');

  const subtitle = document.getElementById('cheatsheet-subtitle');
  if (subtitle) {
    subtitle.textContent = highlight
      ? `Showing sum ${highlight.sum} with ${highlight.length} cells`
      : 'All valid combinations for runs of 2–9 cells';
  }

  renderList(highlight);
}

export function closeCheatsheet(): void {
  const overlay = getOverlay();
  const panel = getPanel();
  overlay.classList.add('hidden');
  panel.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
}

export function bindCheatsheetHandlers(): void {
  document.getElementById('cheatsheet-close')?.addEventListener('click', closeCheatsheet);
  getOverlay().addEventListener('click', (event) => {
    if (event.target === getOverlay()) closeCheatsheet();
  });
}

export function setupLengthFilter(): void {
  const filter = document.getElementById('cheatsheet-length') as HTMLSelectElement | null;
  if (!filter) return;

  filter.addEventListener('change', () => {
    const length = parseInt(filter.value, 10);
    const list = document.getElementById('cheatsheet-list')!;
    list.innerHTML = '';

    const filtered =
      Number.isNaN(length) || filter.value === 'all'
        ? getEntries()
        : getEntries().filter((e) => e.length === length);

    for (const entry of filtered) {
      const item = document.createElement('details');
      item.className = 'cheatsheet-item';

      const summary = document.createElement('summary');
      summary.textContent = `Sum ${entry.sum}, ${entry.length} cells (${entry.combos.length})`;
      item.appendChild(summary);

      const combosEl = document.createElement('div');
      combosEl.className = 'cheatsheet-combos';
      combosEl.textContent = entry.combos.map(formatCombo).join(' · ');
      item.appendChild(combosEl);

      list.appendChild(item);
    }
  });
}
