import type { ClueCell, LayoutCell, PlayCell } from './types';

/** Parse compact puzzle cell strings into layout cells. */
export function parseCellString(raw: string): LayoutCell {
  if (raw === '#') return { kind: 'blocked' };

  if (/^[1-9]$/.test(raw)) {
    return { kind: 'play', value: parseInt(raw, 10), given: true, notes: new Set() };
  }

  if (raw === '.') {
    return { kind: 'play', value: 0, given: false, notes: new Set() };
  }

  const clue: ClueCell = { kind: 'clue' };
  const downMatch = raw.match(/d(\d+)/);
  const rightMatch = raw.match(/r(\d+)/);
  if (downMatch) clue.down = parseInt(downMatch[1], 10);
  if (rightMatch) clue.right = parseInt(rightMatch[1], 10);
  if (!clue.down && !clue.right) {
    return { kind: 'blocked' };
  }
  return clue;
}

export function parseLayout(cells: string[][]): LayoutCell[][] {
  return cells.map((row) => row.map(parseCellString));
}

export function encodePlayCell(cell: PlayCell): string {
  if (cell.given && cell.value !== 0) return String(cell.value);
  return '.';
}

export function encodeClueCell(cell: ClueCell): string {
  const parts: string[] = [];
  if (cell.down !== undefined) parts.push(`d${cell.down}`);
  if (cell.right !== undefined) parts.push(`r${cell.right}`);
  return parts.join('') || '#';
}

export function encodeLayout(layout: LayoutCell[][]): string[][] {
  return layout.map((row) =>
    row.map((cell) => {
      if (cell.kind === 'blocked') return '#';
      if (cell.kind === 'clue') return encodeClueCell(cell);
      return encodePlayCell(cell);
    }),
  );
}

export function cloneLayout(layout: LayoutCell[][]): LayoutCell[][] {
  return layout.map((row) =>
    row.map((cell) => {
      if (cell.kind !== 'play') return { ...cell };
      return {
        kind: 'play',
        value: cell.value,
        given: cell.given,
        notes: new Set(cell.notes),
      };
    }),
  );
}
