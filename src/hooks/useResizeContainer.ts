'use client';

import { useCallback, useRef } from 'react';
import { useEditorStore } from '@/store/editorStore';

export type ResizeHandle =
  | 'n' | 's' | 'e' | 'w'
  | 'nw' | 'ne' | 'sw' | 'se';

/**
 * Handles container resizing from 8 handles.
 * Commits state to history on mouse-up (single undo entry per resize).
 */
export function useResizeContainer() {
  const { container, zoom, setContainer, commitContainer } = useEditorStore();
  const startRef = useRef({ mouseX: 0, mouseY: 0, ...container });

  const onResizeStart = useCallback(
    (e: React.MouseEvent, handle: ResizeHandle) => {
      e.preventDefault();
      e.stopPropagation();

      startRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        ...container,
      };

      const onMouseMove = (ev: MouseEvent) => {
        const dx = (ev.clientX - startRef.current.mouseX) / zoom;
        const dy = (ev.clientY - startRef.current.mouseY) / zoom;
        const s = startRef.current;

        let newW = s.width + (handle.includes('e') ? dx : handle.includes('w') ? -dx : 0);
        let newH = s.height + (handle.includes('s') ? dy : handle.includes('n') ? -dy : 0);

        const aspectRatio = s.width / s.height;

        if (ev.shiftKey) {
          if (handle === 'n' || handle === 's') {
            newW = newH * aspectRatio;
          } else if (handle === 'e' || handle === 'w') {
            newH = newW / aspectRatio;
          } else {
            if (Math.abs(newW - s.width) / aspectRatio > Math.abs(newH - s.height)) {
              newH = newW / aspectRatio;
            } else {
              newW = newH * aspectRatio;
            }
          }
        }

        // Clamp to minimum size (maintaining aspect ratio if shift is pressed)
        if (newW < 80) {
          newW = 80;
          if (ev.shiftKey) newH = newW / aspectRatio;
        }
        if (newH < 60) {
          newH = 60;
          if (ev.shiftKey) {
            newW = newH * aspectRatio;
            // Need to double check if newW goes below 80, but 80/60 = 1.33, so it's usually fine
          }
        }

        // Resolve coordinates based on which handle was pulled
        let newX = s.x;
        let newY = s.y;

        if (handle.includes('w')) {
          newX = s.x + s.width - newW;
        } else if (handle === 'n' || handle === 's') {
          if (ev.shiftKey) newX = s.x + (s.width - newW) / 2;
        }

        if (handle.includes('n')) {
          newY = s.y + s.height - newH;
        } else if (handle === 'e' || handle === 'w') {
          if (ev.shiftKey) newY = s.y + (s.height - newH) / 2;
        }

        setContainer({ x: newX, y: newY, width: newW, height: newH });
      };

      const onMouseUp = () => {
        commitContainer();
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [container, zoom, setContainer, commitContainer]
  );

  return { onResizeStart };
}

/**
 * Handles dragging the entire container in the workspace.
 */
export function useDragContainer() {
  const { container, zoom, setContainer, commitContainer } = useEditorStore();
  const startRef = useRef({ mouseX: 0, mouseY: 0, x: 0, y: 0 });

  const onDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        x: container.x,
        y: container.y,
      };

      const onMouseMove = (ev: MouseEvent) => {
        const dx = (ev.clientX - startRef.current.mouseX) / zoom;
        const dy = (ev.clientY - startRef.current.mouseY) / zoom;
        setContainer({ x: startRef.current.x + dx, y: startRef.current.y + dy });
      };

      const onMouseUp = () => {
        commitContainer();
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [container, zoom, setContainer, commitContainer]
  );

  return { onDragStart };
}
