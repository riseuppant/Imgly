'use client';

import React, { useRef } from 'react';
import {
  ImageIcon,
  Undo2,
  Redo2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  Copy,
  Crop,
  MousePointer,
  Check,
  Globe,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useEditorStore } from '@/store/editorStore';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useExtensionBridge } from '@/hooks/useExtensionBridge';
import { generateCSS } from '@/lib/cssGenerator';
import { clsx } from 'clsx';

export function Toolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    image,
    container,
    editMode,
    setEditMode,
    zoom,
    setZoom,
    previewMode,
    togglePreview,
    history,
    undo,
    redo,
    reset,
    resetPosition,
    importedPosition,
    originalContext,
  } = useEditorStore();

  const { handleFileInput } = useImageUpload();
  const { previewOnWebsite, previewStatus, errorMessage, hasOriginalContext } = useExtensionBridge();

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const handleCopyCSS = () => {
    const { vanilla } = generateCSS(container, image);
    navigator.clipboard.writeText(vanilla).catch(() => {});
  };

  const zoomPercent = Math.round(zoom * 100);

  return (
    <>
      <header className="h-11 flex items-center px-3 gap-2 bg-[#0d0d0d] border-b border-[#1f1f1f] shrink-0 z-20">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-2 pr-3 border-r border-[#1f1f1f]">
          <div className="w-6 h-6 rounded bg-linear-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-sm">
            <ImageIcon className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-[#e0e0e0] tracking-tight">
            Img<span className="text-blue-400">Ly</span>
          </span>
        </div>

        {/* Import */}
        <Button
          variant="primary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          Import Image
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          className="hidden"
          onChange={handleFileInput}
          aria-label="Import image file"
        />

        <div className="h-5 w-px bg-[#1f1f1f] mx-1" />

        {/* ── Mode Switcher: [ Select ] [ Crop ] ── */}
        {image && (
          <div className="flex items-center bg-[#161616] border border-[#2a2a2a] rounded-md p-0.5 gap-0.5">
            <button
              onClick={() => setEditMode('select')}
              className={clsx(
                'flex items-center gap-1.5 h-6 px-2.5 text-xs font-medium rounded transition-all cursor-pointer select-none',
                editMode === 'select'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-[#888] hover:text-[#e0e0e0] hover:bg-[#202020]'
              )}
              title="Select Mode: Resize and reposition the container frame"
            >
              <MousePointer className="w-3 h-3" />
              <span>Select</span>
            </button>
            <button
              onClick={() => setEditMode('crop')}
              className={clsx(
                'flex items-center gap-1.5 h-6 px-2.5 text-xs font-medium rounded transition-all cursor-pointer select-none',
                editMode === 'crop'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-[#888] hover:text-[#e0e0e0] hover:bg-[#202020]'
              )}
              title="Crop Mode: Drag image underneath frame to visually decide visible crop"
            >
              <Crop className="w-3 h-3" />
              <span>Crop</span>
            </button>
          </div>
        )}

        {/* Done Button when in Crop Mode */}
        {editMode === 'crop' && (
          <Button
            variant="default"
            size="sm"
            onClick={() => setEditMode('select')}
            className="border-emerald-600/50 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60"
            title="Done cropping"
          >
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            Done
          </Button>
        )}

        <div className="h-5 w-px bg-[#1f1f1f] mx-1" />

        {/* Undo / Redo / Reset Position */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </Button>
          {image && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetPosition}
              title={
                importedPosition
                  ? 'Reset position to imported website values'
                  : 'Reset position to center (50% 50%)'
              }
              aria-label="Reset Position"
              className="text-xs text-[#999] hover:text-white"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Position
            </Button>
          )}
        </div>

        <div className="h-5 w-px bg-[#1f1f1f] mx-1" />

        {/* Zoom */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setZoom(zoom - 0.1)}
            disabled={zoom <= 0.25}
            aria-label="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <span className="text-xs text-[#888] tabular-nums w-9 text-center select-none">
            {zoomPercent}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setZoom(zoom + 0.1)}
            disabled={zoom >= 3}
            aria-label="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="h-5 w-px bg-[#1f1f1f] mx-1" />

        {/* Preview Overlay Toggle */}
        <Button
          variant={previewMode ? 'default' : 'ghost'}
          size="sm"
          onClick={togglePreview}
          title="Toggle preview overlay"
        >
          {previewMode ? (
            <EyeOff className="w-3.5 h-3.5" />
          ) : (
            <Eye className="w-3.5 h-3.5" />
          )}
          Preview
        </Button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* ── Feature 2: Preview on Website ── */}
        <Button
          variant={hasOriginalContext ? 'primary' : 'default'}
          size="sm"
          onClick={previewOnWebsite}
          disabled={!hasOriginalContext || previewStatus === 'sending'}
          className={clsx(
            hasOriginalContext
              ? 'bg-linear-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-medium shadow-md'
              : 'opacity-40 cursor-not-allowed text-[#666]'
          )}
          title={
            hasOriginalContext
              ? `Preview changes on original webpage (${originalContext?.sourceOrigin || 'Live Site'})`
              : 'Preview on Website is only available when an image was imported from a webpage'
          }
        >
          {previewStatus === 'sending' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : previewStatus === 'success' ? (
            <Check className="w-3.5 h-3.5 text-emerald-300" />
          ) : (
            <Globe className="w-3.5 h-3.5" />
          )}
          <span>Preview on Website</span>
        </Button>

        <div className="h-5 w-px bg-[#1f1f1f] mx-1" />

        {/* Copy CSS */}
        <Button
          variant="default"
          size="sm"
          onClick={handleCopyCSS}
          disabled={!image}
          title="Copy CSS to clipboard"
        >
          <Copy className="w-3.5 h-3.5" />
          Copy CSS
        </Button>
      </header>

      {/* Error notification banner if preview fails */}
      {errorMessage && (
        <div className="bg-amber-950/80 border-b border-amber-800/60 px-4 py-1.5 flex items-center justify-between text-xs text-amber-200 z-20">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        </div>
      )}
    </>
  );
}
