'use client';

import React from 'react';
import { Check, Crop, Move } from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';
import { useDragImage } from '@/hooks/useDragImage';
import { useDragContainer, useResizeContainer } from '@/hooks/useResizeContainer';
import type { ResizeHandle } from '@/hooks/useResizeContainer';
import { getObjectFitGeometry } from '@/lib/geometry';

// ─── Resize handle definitions ────────────────────────────────────────────────

const HANDLES: { id: ResizeHandle; className: string; cursor: string }[] = [
  { id: 'nw', className: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2', cursor: 'nwse-resize' },
  { id: 'ne', className: 'top-0 right-0 translate-x-1/2 -translate-y-1/2', cursor: 'nesw-resize' },
  { id: 'sw', className: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2', cursor: 'nesw-resize' },
  { id: 'se', className: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2', cursor: 'nwse-resize' },
  { id: 'n', className: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2', cursor: 'ns-resize' },
  { id: 's', className: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2', cursor: 'ns-resize' },
  { id: 'w', className: 'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2', cursor: 'ew-resize' },
  { id: 'e', className: 'top-1/2 right-0 translate-x-1/2 -translate-y-1/2', cursor: 'ew-resize' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function ImageContainer() {
  const {
    container,
    image,
    zoom,
    editMode,
    setEditMode,
    selectedObject,
    setSelectedObject,
  } = useEditorStore();

  const { onMouseDown: onImageDrag } = useDragImage();
  const { onDragStart } = useDragContainer();
  const { onResizeStart } = useResizeContainer();

  const { x, y, width, height, borderRadius, backgroundColor } = container;

  if (!image) return null;

  const posX = Math.round(image.positionX);
  const posY = Math.round(image.positionY);

  const isCropMode = editMode === 'crop';
  const geo = getObjectFitGeometry(container, image);

  // Compute bounding box for drag overlay in crop mode so user can drag from faded area
  const dragMinX = Math.min(0, geo.x);
  const dragMinY = Math.min(0, geo.y);
  const dragMaxX = Math.max(width, geo.x + geo.w);
  const dragMaxY = Math.max(height, geo.y + geo.h);
  const dragWidth = dragMaxX - dragMinX;
  const dragHeight = dragMaxY - dragMinY;

  return (
    <div
      className="absolute select-none"
      style={{ left: x, top: y, width, height }}
    >
      {/* ── Layer 1: Full Image Layer (Faded Outside Area) ── */}
      {isCropMode && (
        <>
          {/* Full source image rendered at 25% opacity */}
          <img
            src={image.src}
            alt=""
            className="absolute pointer-events-none opacity-25 transition-opacity duration-150"
            style={{
              left: geo.x,
              top: geo.y,
              width: geo.w,
              height: geo.h,
            }}
            draggable={false}
          />
          {/* Subtle outline indicating full source image boundary */}
          <div
            className="absolute pointer-events-none border border-dashed border-blue-400/30"
            style={{
              left: geo.x,
              top: geo.y,
              width: geo.w,
              height: geo.h,
            }}
          />
        </>
      )}

      {/* ── Layer 2: Clipped Frame + Image at 100% Opacity ── */}
      <div
        className="relative w-full h-full overflow-hidden group/container shadow-xl"
        style={{
          borderRadius,
          backgroundColor: backgroundColor === 'transparent' ? undefined : backgroundColor,
        }}
        aria-label="Image container frame"
      >
        {/* Actual image rendered with CSS object-fit & object-position */}
        <img
          src={image.src}
          alt="Positioned image"
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            objectFit: image.objectFit,
            objectPosition: `${posX}% ${posY}%`,
          }}
          draggable={false}
        />

        {/* ── Normal Mode Frame Drag / Selection Overlay ── */}
        {!isCropMode && (
          <div
            className={`absolute inset-0 z-10 ${
              selectedObject === 'image' ? 'pointer-events-none' : 'cursor-move pointer-events-auto'
            }`}
            onMouseDown={(e) => {
              setSelectedObject('frame');
              onDragStart(e);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditMode('crop');
            }}
            title="Drag to move container (Double click to enter Crop Mode)"
          />
        )}

        {/* ── Normal Mode Image Drag Overlay ── */}
        {!isCropMode && selectedObject === 'image' && (
          <div
            className="absolute inset-0 z-20 cursor-grab active:cursor-grabbing pointer-events-auto"
            onMouseDown={(e) => {
              e.stopPropagation();
              onImageDrag(e);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditMode('crop');
            }}
            title="Drag to reposition image"
          />
        )}

        {/* ── Crop Mode Rule-of-Thirds Grid ── */}
        {isCropMode && (
          <div className="absolute inset-0 z-15 pointer-events-none">
            {/* Horizontal grid lines */}
            <div className="absolute left-0 right-0 top-1/3 h-px bg-white/20 border-b border-black/20" />
            <div className="absolute left-0 right-0 top-2/3 h-px bg-white/20 border-b border-black/20" />
            {/* Vertical grid lines */}
            <div className="absolute top-0 bottom-0 left-1/3 w-px bg-white/20 border-r border-black/20" />
            <div className="absolute top-0 bottom-0 left-2/3 w-px bg-white/20 border-r border-black/20" />
          </div>
        )}

        {/* Selection borders in Normal Mode */}
        {!isCropMode && selectedObject === 'frame' && (
          <div className="absolute inset-0 z-30 border-2 border-blue-500 pointer-events-none rounded-[inherit]" />
        )}
        {!isCropMode && selectedObject === 'image' && (
          <div className="absolute inset-0 z-30 border-2 border-blue-400 border-dashed pointer-events-none rounded-[inherit]" />
        )}

        {/* Crop Mode Frame Boundary */}
        {isCropMode && (
          <div className="absolute inset-0 z-30 border-2 border-blue-500 pointer-events-none rounded-[inherit] shadow-[0_0_0_1px_rgba(0,0,0,0.5)]">
            {/* Crop Corner Markers */}
            <div className="absolute -top-0.5 -left-0.5 w-3.5 h-3.5 border-t-2 border-l-2 border-white pointer-events-none" />
            <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 border-t-2 border-r-2 border-white pointer-events-none" />
            <div className="absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 border-b-2 border-l-2 border-white pointer-events-none" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-b-2 border-r-2 border-white pointer-events-none" />
          </div>
        )}
      </div>

      {/* ── Crop Mode Unified Drag Surface (covers frame + full image area) ── */}
      {isCropMode && (
        <div
          className="absolute z-25 cursor-grab active:cursor-grabbing pointer-events-auto"
          style={{
            left: dragMinX,
            top: dragMinY,
            width: dragWidth,
            height: dragHeight,
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            onImageDrag(e);
          }}
          title="Drag image to adjust visible crop"
        />
      )}

      {/* ── Resize handles in Frame Select Mode ── */}
      {!isCropMode && selectedObject === 'frame' && HANDLES.map((h) => (
        <div
          key={h.id}
          className={`absolute z-40 w-2.5 h-2.5 rounded-sm bg-white border border-blue-500 shadow-sm ${h.className}`}
          style={{ 
            cursor: h.cursor,
            transform: `scale(${1 / zoom}) ${h.className.includes('translate-x-1/2') ? 'translateX(50%)' : h.className.includes('-translate-x-1/2') ? 'translateX(-50%)' : ''} ${h.className.includes('translate-y-1/2') ? 'translateY(50%)' : h.className.includes('-translate-y-1/2') ? 'translateY(-50%)' : ''}`,
            transformOrigin: 'center'
          }}
          onMouseDown={(e) => onResizeStart(e, h.id)}
          aria-label={`Resize ${h.id}`}
        />
      ))}

      {/* ── Frame Dimension Badge in Select Mode ── */}
      {!isCropMode && selectedObject === 'frame' && (
        <div 
          className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-white bg-blue-500 px-1.5 py-0.5 rounded font-mono whitespace-nowrap pointer-events-none shadow"
          style={{ transform: `translateX(-50%) scale(${1 / zoom})`, transformOrigin: 'bottom center' }}
        >
          {Math.round(width)} × {Math.round(height)}px
        </div>
      )}

      {/* ── Position Label in Normal Image Mode ── */}
      {!isCropMode && selectedObject === 'image' && (
        <div 
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-white bg-blue-500 px-1.5 py-0.5 rounded font-mono whitespace-nowrap pointer-events-none shadow"
          style={{ transform: `translateX(-50%) scale(${1 / zoom})`, transformOrigin: 'top center' }}
        >
          Position: {posX}% {posY}%
        </div>
      )}

      {/* ── Floating Crop Control Bar in Crop Mode ── */}
      {isCropMode && (
        <div
          className="absolute -bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-[#0d0d0d]/95 text-white px-3 py-1.5 rounded-full border border-blue-500/40 shadow-2xl backdrop-blur-md whitespace-nowrap"
          style={{ transform: `translateX(-50%) scale(${Math.max(0.7, 1 / zoom)})`, transformOrigin: 'top center' }}
        >
          <div className="flex items-center gap-1.5 text-xs text-blue-400 font-medium">
            <Crop className="w-3.5 h-3.5" />
            <span>Crop Mode</span>
          </div>
          <span className="text-[#444]">•</span>
          <span className="text-[11px] font-mono text-[#aaa]">
            {posX}% {posY}%
          </span>
          <span className="text-[#444]">•</span>
          <button
            onClick={() => setEditMode('select')}
            className="flex items-center gap-1 text-[11px] font-medium bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded-full transition-colors cursor-pointer"
            title="Done cropping"
          >
            <Check className="w-3 h-3" />
            Done
          </button>
        </div>
      )}
    </div>
  );
}
