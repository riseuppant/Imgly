'use client';

import { useEffect, useCallback } from 'react';
import { useEditorStore } from '@/store/editorStore';

export function useWorkspaceInteraction(workspaceRef: React.RefObject<HTMLDivElement | null>) {
  const { zoom, setZoom, pan, setPan, setSelectedObject } = useEditorStore();

  // ── Wheel to zoom/pan ───────────────────────────────────────────────────────
  useEffect(() => {
    const el = workspaceRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); // prevent browser zoom/scroll

      if (e.ctrlKey || e.metaKey) {
        // Zoom
        const zoomDelta = e.deltaY * -0.01;
        const newZoom = Math.min(3, Math.max(0.1, zoom * (1 + zoomDelta)));
        
        if (newZoom !== zoom) {
          // Zoom towards cursor
          const rect = el.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;

          // Calculate where the mouse is in document coordinates
          const docX = (mouseX - pan.x) / zoom;
          const docY = (mouseY - pan.y) / zoom;

          // Set new pan so that the document coordinate is still under the mouse
          setPan({
            x: mouseX - docX * newZoom,
            y: mouseY - docY * newZoom,
          });
          setZoom(newZoom);
        }
      } else {
        // Pan
        setPan((prev) => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoom, pan, setZoom, setPan, workspaceRef]);

  // ── Spacebar Pan ────────────────────────────────────────────────────────────
  useEffect(() => {
    let isPanning = false;
    let isSpaceDown = false;
    let lastX = 0;
    let lastY = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpaceDown && document.activeElement?.tagName !== 'INPUT') {
        isSpaceDown = true;
        document.body.style.cursor = 'grab';
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpaceDown = false;
        isPanning = false;
        document.body.style.cursor = '';
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      // Allow middle mouse button OR space + left click
      if ((isSpaceDown && e.button === 0) || e.button === 1) {
        isPanning = true;
        lastX = e.clientX;
        lastY = e.clientY;
        document.body.style.cursor = 'grabbing';
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isPanning) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    };

    const onMouseUp = () => {
      if (isPanning) {
        isPanning = false;
        document.body.style.cursor = isSpaceDown ? 'grab' : '';
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
    };
  }, [setPan]);

  // ── Click to Deselect ───────────────────────────────────────────────────────
  const onWorkspaceClick = useCallback((e: React.MouseEvent) => {
    // If the click is directly on the workspace wrapper (not a child), deselect
    if (e.target === workspaceRef.current || (e.target as Element).id === 'workspace-bg') {
      setSelectedObject(null);
    }
  }, [setSelectedObject, workspaceRef]);

  return { onWorkspaceClick };
}
