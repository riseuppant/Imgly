'use client';

import { useEffect, useCallback } from 'react';
import { Toolbar } from '@/components/editor/Toolbar';
import { Workspace } from '@/components/editor/Workspace';
import { PropertiesPanel } from '@/components/panels/PropertiesPanel';
import { useEditorStore } from '@/store/editorStore';
import { useExtensionBridge } from '@/hooks/useExtensionBridge';

export default function EditorPage() {
  const { undo, redo, zoom, setZoom } = useEditorStore();
  useExtensionBridge();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't intercept if typing in an input
      if (document.activeElement?.tagName === 'INPUT') return;

      const mod = e.ctrlKey || e.metaKey;
      const s = useEditorStore.getState();

      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
      
      // Zoom
      if (mod && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        setZoom(zoom * 1.2);
      }
      if (mod && e.key === '-') {
        e.preventDefault();
        setZoom(zoom / 1.2);
      }
      if (mod && e.key === '0') {
        e.preventDefault();
        setZoom(1);
        s.setPan({ x: 0, y: 0 });
      }

      // Escape key to exit Crop Mode or deselect
      if (e.key === 'Escape') {
        e.preventDefault();
        if (s.editMode === 'crop') {
          s.setEditMode('select');
        } else {
          s.setSelectedObject(null);
        }
      }

      // Deletion
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (s.selectedObject === 'image' || s.selectedObject === 'frame') {
          e.preventDefault();
          s.clearImage();
          s.setSelectedObject(null);
        }
      }

      // Nudge (Arrow Keys)
      if (e.key.startsWith('Arrow')) {
        const amount = e.shiftKey ? 10 : 1;
        
        if (s.selectedObject === 'frame') {
          e.preventDefault();
          let { x, y } = s.container;
          if (e.key === 'ArrowUp') y -= amount;
          if (e.key === 'ArrowDown') y += amount;
          if (e.key === 'ArrowLeft') x -= amount;
          if (e.key === 'ArrowRight') x += amount;
          s.setContainer({ x, y });
          s.commitContainer();
        } else if (s.selectedObject === 'image' && s.image) {
          e.preventDefault();
          let { positionX: px, positionY: py } = s.image;
          // Image position is in percentages. 1 unit might be too much, but we'll use it
          if (e.key === 'ArrowUp') py -= amount;
          if (e.key === 'ArrowDown') py += amount;
          if (e.key === 'ArrowLeft') px -= amount;
          if (e.key === 'ArrowRight') px += amount;
          s.setImageProps({ 
            positionX: Math.max(0, Math.min(100, px)), 
            positionY: Math.max(0, Math.min(100, py)) 
          });
          s.commitImageProps();
        }
      }
    },
    [undo, redo, zoom, setZoom]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <main className="flex flex-col h-screen w-screen overflow-hidden">
      <Toolbar />
      <div className="flex flex-1 min-h-0">
        <Workspace />
        <PropertiesPanel />
      </div>
    </main>
  );
}
