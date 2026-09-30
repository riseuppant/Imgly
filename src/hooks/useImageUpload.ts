'use client';

import { useCallback, useRef } from 'react';
import { useEditorStore } from '@/store/editorStore';
import type { ImageState } from '@/lib/types';

/**
 * Handles local image upload via file input or drag-and-drop.
 * Creates an object URL and reads natural image dimensions.
 * Revokes the previous URL to prevent memory leaks.
 */
export function useImageUpload() {
  const { setImage, image } = useEditorStore();
  const prevUrlRef = useRef<string | null>(null);

  const loadFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return;

      // Revoke old object URL
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current);
      }

      const url = URL.createObjectURL(file);
      prevUrlRef.current = url;

      const img = new window.Image();
      img.onload = () => {
        const newImage: ImageState = {
          src: url,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          objectFit: 'cover',
          positionX: 50,
          positionY: 50,
        };
        setImage(newImage);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        prevUrlRef.current = null;
        console.error('Failed to load image');
      };
      img.src = url;
    },
    [setImage]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) loadFile(file);
      // Reset input so the same file can be re-selected
      e.target.value = '';
    },
    [loadFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) loadFile(file);
    },
    [loadFile]
  );

  return { handleFileInput, handleDrop, hasImage: !!image };
}
