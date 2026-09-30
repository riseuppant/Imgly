'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useWorkspaceInteraction } from '@/hooks/useWorkspaceInteraction';
import { ImageContainer } from './ImageContainer';
import { EmptyState } from './EmptyState';
import { DEFAULT_CONTAINER } from '@/store/editorStore';

/**
 * The main workspace area: 
 * - Infinite scroll feel via a large inner canvas
 * - Dot-grid background
 * - Hosts the image container at the center initially
 * - Handles workspace-level drag-and-drop for image import
 */
export function Workspace() {
  const { image, zoom, pan, setContainer } = useEditorStore();
  const { handleDrop } = useImageUpload();

  const workspaceRef = useRef<HTMLDivElement>(null);
  const { onWorkspaceClick } = useWorkspaceInteraction(workspaceRef);
  const hasInitialized = useRef(false);

  // Center the container in the workspace when an image is first loaded
  useEffect(() => {
    if (image && !hasInitialized.current && workspaceRef.current) {
      hasInitialized.current = true;
      const rect = workspaceRef.current.getBoundingClientRect();
      const cx = rect.width / 2 - DEFAULT_CONTAINER.width / 2;
      const cy = rect.height / 2 - DEFAULT_CONTAINER.height / 2;
      setContainer({ x: cx, y: cy });
    }
    if (!image) hasInitialized.current = false;
  }, [image, setContainer]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  return (
    <div
      ref={workspaceRef}
      className="relative flex-1 overflow-hidden bg-[#0a0a0a]"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseDown={onWorkspaceClick}
      aria-label="Editor workspace"
    >
      {/* Dot grid background */}
      <div
        id="workspace-bg"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle, #1e1e1e 1px, transparent 1px)',
          backgroundSize: `${Math.round(24 * zoom)}px ${Math.round(24 * zoom)}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      />

      {/* Zoom wrapper */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        <div className="absolute inset-0 pointer-events-auto">
        {image ? (
          <ImageContainer />
        ) : (
          <EmptyState onDragOver={handleDragOver} onDrop={handleDrop} />
        )}
        </div>
      </div>
    </div>
  );
}
