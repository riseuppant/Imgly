'use client';

import { useCallback, useRef } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { calculateObjectPositionFromDrag } from '@/lib/geometry';

/**
 * Handles dragging the image inside or underneath the frame to update object-position.
 *
 * The container stays fixed. As the user drags the image, we convert the
 * pixel delta (accounting for canvas zoom) into an exact object-position update.
 *
 * For object-fit: cover, boundary checks prevent exposing any empty space.
 * Only one history entry is committed on mouse-up.
 */
export function useDragImage() {
  const { image, container, zoom, setImageProps, commitImageProps } = useEditorStore();

  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startPct = useRef({ x: 50, y: 50 });

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!image) return;
      e.preventDefault();
      e.stopPropagation();

      isDragging.current = true;
      startPos.current = { x: e.clientX, y: e.clientY };
      startPct.current = { x: image.positionX, y: image.positionY };

      const prevCursor = document.body.style.cursor;
      document.body.style.cursor = 'grabbing';

      const onMouseMove = (ev: MouseEvent) => {
        if (!isDragging.current) return;

        // Convert screen movement to canvas coordinates using current zoom
        const dx = (ev.clientX - startPos.current.x) / zoom;
        const dy = (ev.clientY - startPos.current.y) / zoom;

        const newPos = calculateObjectPositionFromDrag(
          container,
          image,
          dx,
          dy,
          startPct.current
        );

        setImageProps({
          positionX: newPos.x,
          positionY: newPos.y,
        });
      };

      const onMouseUp = () => {
        if (isDragging.current) {
          isDragging.current = false;
          commitImageProps();
        }
        document.body.style.cursor = prevCursor;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [image, container, zoom, setImageProps, commitImageProps]
  );

  return { onMouseDown, isDragging };
}
