import type { GameState } from './types';
import { cloneLayout } from './layout';

export interface HistorySnapshot {
  layout: ReturnType<typeof cloneLayout>;
  mistakes: number;
  status: GameState['status'];
}

export function captureSnapshot(state: GameState): HistorySnapshot {
  return {
    layout: cloneLayout(state.layout),
    mistakes: state.mistakes,
    status: state.status,
  };
}

export function applySnapshot(state: GameState, snapshot: HistorySnapshot): void {
  state.layout = cloneLayout(snapshot.layout);
  state.mistakes = snapshot.mistakes;
  state.status = snapshot.status;
}
