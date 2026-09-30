import type { HistoryEntry, ContainerState, ImageState } from './types';

const MAX_HISTORY = 50;

export interface HistoryStack {
  past: HistoryEntry[];
  future: HistoryEntry[];
}

export function createHistory(): HistoryStack {
  return { past: [], future: [] };
}

export function pushHistory(
  stack: HistoryStack,
  entry: HistoryEntry
): HistoryStack {
  const past = [...stack.past, entry].slice(-MAX_HISTORY);
  return { past, future: [] };
}

export function undo(
  stack: HistoryStack,
  current: HistoryEntry
): { stack: HistoryStack; entry: HistoryEntry } | null {
  if (stack.past.length === 0) return null;
  const past = [...stack.past];
  const entry = past.pop()!;
  const future = [current, ...stack.future];
  return { stack: { past, future }, entry };
}

export function redo(
  stack: HistoryStack,
  current: HistoryEntry
): { stack: HistoryStack; entry: HistoryEntry } | null {
  if (stack.future.length === 0) return null;
  const future = [...stack.future];
  const entry = future.shift()!;
  const past = [...stack.past, current];
  return { stack: { past, future }, entry };
}

export function snapshotFrom(
  container: ContainerState,
  image: ImageState | null
): HistoryEntry {
  return {
    container: { ...container },
    image: image ? { ...image } : null,
  };
}
