'use client';

import React from 'react';
import { ImageIcon, Upload } from 'lucide-react';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useRef } from 'react';

interface EmptyStateProps {
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

export function EmptyState({ onDragOver, onDrop }: EmptyStateProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { handleFileInput } = useImageUpload();

  return (
    <div
      className="flex items-center justify-center w-full h-full"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div
        className="flex flex-col items-center gap-5 p-12 rounded-2xl border-2 border-dashed border-[#2a2a2a] hover:border-[#3a3a3a] transition-colors duration-200 max-w-sm text-center cursor-pointer group"
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Click to import an image"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
        }}
      >
        {/* Icon */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-[#141414] border border-[#222] flex items-center justify-center group-hover:border-[#2a2a2a] transition-colors">
            <ImageIcon className="w-7 h-7 text-[#444]" />
          </div>
          <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
            <Upload className="w-3 h-3 text-white" />
          </div>
        </div>

        {/* Text */}
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium text-[#c0c0c0]">
            Drop an image here
          </p>
          <p className="text-xs text-[#555]">
            or click to browse your files
          </p>
          <p className="text-[10px] text-[#3a3a3a] mt-1">
            PNG · JPG · WebP · GIF · SVG
          </p>
        </div>

        {/* Description */}
        <p className="text-[11px] text-[#444] leading-relaxed">
          Position your image inside a container, adjust{' '}
          <span className="text-[#666] font-mono">object-fit</span> &amp;{' '}
          <span className="text-[#666] font-mono">object-position</span>,
          then copy the generated CSS.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={handleFileInput}
        aria-label="Import image file"
      />
    </div>
  );
}
