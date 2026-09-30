'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useEditorStore } from '@/store/editorStore';
import {
  decodeExtractedElement,
  extractedToEditorState,
  type ExtractedElement,
} from '@/lib/elementExtractor';
import type { ImageState } from '@/lib/types';
import { generateCSS } from '@/lib/cssGenerator';

/**
 * Handles communication between the Next.js editor and the Chrome extension:
 * 1. Reads `?ext=<base64>` parameter on mount and hydrates store (container, image, originalContext).
 * 2. Provides `previewOnWebsite()` to temporarily apply current CSS to the original element on the live site.
 * 3. Handles notifications, errors, and extension status.
 */
export function useExtensionBridge() {
  const {
    setImage,
    setContainer,
    commitContainer,
    setOriginalContext,
    setImportedPosition,
    container,
    image,
    originalContext,
  } = useEditorStore();

  const [isExtensionConnected, setIsExtensionConnected] = useState(false);
  const [previewStatus, setPreviewStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const appliedRef = useRef(false);

  const applyExtracted = useCallback((data: ExtractedElement) => {
    if (appliedRef.current) return;
    appliedRef.current = true;

    const {
      container: containerPatch,
      image: extractedImage,
      originalContext: extractedCtx,
      importedPosition,
    } = extractedToEditorState(data);

    // Apply container dimensions/styling
    setContainer(containerPatch);
    commitContainer();

    if (extractedCtx) {
      setOriginalContext(extractedCtx);
    }

    if (importedPosition) {
      setImportedPosition(importedPosition);
    }

    if (extractedImage) {
      const tempImg = new window.Image();
      tempImg.crossOrigin = 'anonymous';

      tempImg.onload = () => {
        const finalImage: ImageState = {
          ...extractedImage,
          naturalWidth: tempImg.naturalWidth || extractedImage.naturalWidth,
          naturalHeight: tempImg.naturalHeight || extractedImage.naturalHeight,
        };
        setImage(finalImage);
      };

      tempImg.onerror = () => {
        setImage(extractedImage);
      };

      tempImg.src = extractedImage.src;
    }
  }, [setContainer, commitContainer, setOriginalContext, setImportedPosition, setImage]);

  // ── URL param hydration ────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('ext');

    if (encoded) {
      const data = decodeExtractedElement(encoded);
      if (data) {
        applyExtracted(data);
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      }
    }
  }, [applyExtracted]);

  // ── Bridge Listener for Extension Messages ─────────────────────────────────
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;

      if (event.data.type === 'IMGLY_EXTRACT') {
        const data = event.data.payload as ExtractedElement;
        if (data) applyExtracted(data);
      }

      if (event.data.type === 'IMGLY_EXTENSION_READY' || event.data.type === 'IMGLY_EXTENSION_PONG') {
        setIsExtensionConnected(true);
      }

      if (event.data.type === 'IMGLY_PREVIEW_RESPONSE') {
        const payload = event.data.payload;
        if (payload?.success) {
          setPreviewStatus('success');
          setTimeout(() => setPreviewStatus('idle'), 2500);
        } else {
          setPreviewStatus('error');
          setErrorMessage(payload?.error || 'Failed to preview on website.');
          setTimeout(() => setErrorMessage(null), 5000);
        }
      }
    };

    window.addEventListener('message', handler);
    // Ping extension
    window.postMessage({ type: 'IMGLY_PING_EXTENSION' }, '*');

    return () => window.removeEventListener('message', handler);
  }, [applyExtracted]);

  // ── Trigger Preview on Website ─────────────────────────────────────────────
  const previewOnWebsite = useCallback(() => {
    if (!originalContext) {
      alert('Preview on Website is only available when an image was imported from a webpage element.');
      return;
    }

    setPreviewStatus('sending');
    setErrorMessage(null);

    const css = generateCSS(container, image);
    const payload = {
      originalContext,
      previewState: {
        positionX: image ? Math.round(image.positionX) : 50,
        positionY: image ? Math.round(image.positionY) : 50,
        objectFit: image ? image.objectFit : 'cover',
      },
      css,
    };

    window.postMessage({ type: 'IMGLY_REQUEST_PREVIEW', payload }, '*');

    // Timeout fallback if extension is not installed or unreachable
    const timeout = setTimeout(() => {
      setPreviewStatus((current) => {
        if (current === 'sending') {
          setErrorMessage('Could not communicate with the Chrome extension. Please ensure the ImgLy extension is active and the original tab is still open.');
          return 'error';
        }
        return current;
      });
    }, 2500);

    return () => clearTimeout(timeout);
  }, [originalContext, container, image]);

  return {
    isExtensionConnected,
    previewStatus,
    errorMessage,
    previewOnWebsite,
    hasOriginalContext: Boolean(originalContext),
  };
}

/**
 * Returns true if the page was opened by the ImgLy Chrome extension.
 */
export function wasOpenedByExtension(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).has('ext');
}
