'use client';

import { create } from 'zustand';
import type { ContainerState, ImageState, EditorState, EditMode, ObjectFit } from '@/lib/types';
import {
  createHistory,
  pushHistory,
  undo,
  redo,
  snapshotFrom,
  type HistoryStack,
} from '@/lib/history';

// ─── Default values ───────────────────────────────────────────────────────────

export const DEFAULT_CONTAINER: ContainerState = {
  x: 0,
  y: 0,
  width: 600,
  height: 400,
  borderRadius: 0,
  backgroundColor: 'transparent',
};

const DEFAULT_STATE: EditorState = {
  container: { ...DEFAULT_CONTAINER },
  image: null,
  editMode: 'select',
  zoom: 1,
  pan: { x: 0, y: 0 },
  selectedObject: null,
  previewMode: false,
  importedPosition: null,
  originalContext: null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

interface EditorStore extends EditorState {
  history: HistoryStack;

  // Mode
  setEditMode: (mode: EditMode) => void;

  // Image
  setImage: (image: ImageState) => void;
  clearImage: () => void;

  // Container
  setContainer: (patch: Partial<ContainerState>) => void;
  /** Called at the END of a drag/resize to commit to history */
  commitContainer: () => void;

  // Image positioning
  setImageProps: (patch: Partial<ImageState>) => void;
  /** Called at the END of an image drag to commit to history */
  commitImageProps: () => void;

  // Zoom & Pan
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;

  // Selection
  setSelectedObject: (id: 'frame' | 'image' | null) => void;

  // Preview
  togglePreview: () => void;

  // Website context & imported state
  setOriginalContext: (ctx: EditorState['originalContext']) => void;
  setImportedPosition: (pos: EditorState['importedPosition']) => void;

  // History & Resets
  undo: () => void;
  redo: () => void;
  reset: () => void;
  /** Resets image positioning back to imported state (or 50% 50% default) */
  resetPosition: () => void;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  ...DEFAULT_STATE,
  history: createHistory(),

  // ── Mode ─────────────────────────────────────────────────────────────────
  setEditMode: (mode) => {
    set({
      editMode: mode,
      selectedObject: mode === 'crop' ? 'image' : 'frame',
    });
  },

  // ── Image ────────────────────────────────────────────────────────────────
  setImage: (image) => {
    set((s) => {
      const snapshot = snapshotFrom(s.container, s.image);
      const importedPosition = s.importedPosition ?? {
        positionX: image.positionX,
        positionY: image.positionY,
        objectFit: image.objectFit,
      };
      return {
        image,
        importedPosition,
        history: pushHistory(s.history, snapshot),
      };
    });
  },

  clearImage: () => {
    set((s) => {
      const snapshot = snapshotFrom(s.container, s.image);
      return {
        image: null,
        importedPosition: null,
        editMode: 'select',
        history: pushHistory(s.history, snapshot),
      };
    });
  },

  // ── Container ────────────────────────────────────────────────────────────
  /** Live updates during drag/resize — no history push */
  setContainer: (patch) => {
    set((s) => ({
      container: { ...s.container, ...patch },
    }));
  },

  /** Call once drag/resize ends */
  commitContainer: () => {
    set((s) => ({
      history: pushHistory(s.history, snapshotFrom(s.container, s.image)),
    }));
  },

  // ── Image positioning ────────────────────────────────────────────────────
  /** Live updates during image drag — no history push */
  setImageProps: (patch) => {
    set((s) =>
      s.image ? { image: { ...s.image, ...patch } } : {}
    );
  },

  /** Call once image drag ends */
  commitImageProps: () => {
    set((s) => ({
      history: pushHistory(s.history, snapshotFrom(s.container, s.image)),
    }));
  },

  // ── Zoom & Pan ───────────────────────────────────────────────────────────
  setZoom: (zoom) => set({ zoom: Math.min(3, Math.max(0.1, zoom)) }),
  setPan: (panUpdater) => set((s) => ({
    pan: typeof panUpdater === 'function' ? panUpdater(s.pan) : panUpdater
  })),

  // ── Selection ────────────────────────────────────────────────────────────
  setSelectedObject: (id) => set({ selectedObject: id }),

  // ── Preview ──────────────────────────────────────────────────────────────
  togglePreview: () => set((s) => ({ previewMode: !s.previewMode })),

  // ── Website context & imported state ─────────────────────────────────────
  setOriginalContext: (ctx) => set({ originalContext: ctx }),
  setImportedPosition: (pos) => set({ importedPosition: pos }),

  // ── History & Resets ─────────────────────────────────────────────────────
  undo: () => {
    const s = get();
    const result = undo(s.history, snapshotFrom(s.container, s.image));
    if (!result) return;
    set({
      container: result.entry.container,
      image: result.entry.image,
      history: result.stack,
    });
  },

  redo: () => {
    const s = get();
    const result = redo(s.history, snapshotFrom(s.container, s.image));
    if (!result) return;
    set({
      container: result.entry.container,
      image: result.entry.image,
      history: result.stack,
    });
  },

  resetPosition: () => {
    set((s) => {
      if (!s.image) return {};
      const snapshot = snapshotFrom(s.container, s.image);
      const targetPos = s.importedPosition ?? {
        positionX: 50,
        positionY: 50,
        objectFit: 'cover' as ObjectFit,
      };
      return {
        image: {
          ...s.image,
          positionX: targetPos.positionX,
          positionY: targetPos.positionY,
          objectFit: targetPos.objectFit,
        },
        history: pushHistory(s.history, snapshot),
      };
    });
  },

  reset: () => {
    set((s) => {
      const snapshot = snapshotFrom(s.container, s.image);
      const targetPos = s.importedPosition ?? {
        positionX: 50,
        positionY: 50,
        objectFit: 'cover' as ObjectFit,
      };
      return {
        container: { ...DEFAULT_CONTAINER },
        image: s.image
          ? {
              ...s.image,
              objectFit: targetPos.objectFit,
              positionX: targetPos.positionX,
              positionY: targetPos.positionY,
            }
          : null,
        history: pushHistory(s.history, snapshot),
      };
    });
  },
}));
