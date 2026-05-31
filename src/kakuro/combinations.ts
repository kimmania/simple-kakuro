/** All valid digit combinations for Kakuro runs (distinct digits 1–9). */

export type Combo = number[];

const comboCache = new Map<string, Combo[]>();

function cacheKey(sum: number, length: number): string {
  return `${sum}:${length}`;
}

function buildCombos(sum: number, length: number, start: number, used: Combo, out: Combo[]): void {
  if (length === 0) {
    if (sum === 0) out.push([...used]);
    return;
  }

  if (sum <= 0) return;

  const minRemaining = Array.from({ length: length - 1 }, (_, i) => start + i + 1).reduce(
    (a, b) => a + b,
    0,
  );
  const maxRemaining = Array.from({ length: length - 1 }, (_, i) => 9 - i).reduce(
    (a, b) => a + b,
    0,
  );

  for (let digit = start; digit <= 9; digit++) {
    const nextMin = minRemaining;
    const nextMax = maxRemaining;
    if (sum - digit < nextMin || sum - digit > nextMax) continue;

    used.push(digit);
    buildCombos(sum - digit, length - 1, digit + 1, used, out);
    used.pop();
  }
}

export function getCombinations(sum: number, length: number): Combo[] {
  if (length < 1 || length > 9 || sum < 1) return [];

  const key = cacheKey(sum, length);
  const cached = comboCache.get(key);
  if (cached) return cached;

  const combos: Combo[] = [];
  buildCombos(sum, length, 1, [], combos);
  comboCache.set(key, combos);
  return combos;
}

export function minSum(length: number): number {
  return (length * (length + 1)) / 2;
}

export function maxSum(length: number): number {
  return Array.from({ length }, (_, i) => 9 - i).reduce((a, b) => a + b, 0);
}

export function isValidSum(sum: number, length: number): boolean {
  return length >= 1 && length <= 9 && sum >= minSum(length) && sum <= maxSum(length);
}

/** Cheatsheet rows grouped by run length for UI display. */
export interface CheatsheetEntry {
  sum: number;
  length: number;
  combos: Combo[];
}

export function buildCheatsheet(): CheatsheetEntry[] {
  const entries: CheatsheetEntry[] = [];
  for (let length = 2; length <= 9; length++) {
    for (let sum = minSum(length); sum <= maxSum(length); sum++) {
      const combos = getCombinations(sum, length);
      if (combos.length > 0) {
        entries.push({ sum, length, combos });
      }
    }
  }
  return entries;
}

export function formatCombo(combo: Combo): string {
  return combo.join(' + ');
}
