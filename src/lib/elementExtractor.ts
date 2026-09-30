import type { ContainerState, ImageState, ObjectFit, OriginalElementContext } from './types';

/**
 * The payload that the Chrome extension serialises and passes via URL params.
 * Kept deliberately flat and JSON-safe.
 */
export interface ExtractedElement {
  /** Resolved absolute image src (or empty string if no image found) */
  imageSrc: string;
  /** Natural width of the image (0 if unknown) */
  naturalWidth: number;
  /** Natural height of the image (0 if unknown) */
  naturalHeight: number;
  /** Computed width of the element in px */
  width: number;
  /** Computed height of the element in px */
  height: number;
  /** Parsed border-radius (average of corners) in px */
  borderRadius: number;
  /** Computed background-color (hex or rgba) */
  backgroundColor: string;
  /** CSS object-fit value */
  objectFit: ObjectFit;
  /** CSS object-position parsed as X% Y% (defaults to 50 50) */
  positionX: number;
  positionY: number;
  /** The page origin the element was extracted from */
  sourceOrigin: string;
  /** Optional: element tag and class for display */
  elementLabel: string;
  /** Rich context for Preview on Website */
  originalContext?: OriginalElementContext;
}

// ─── Converters ───────────────────────────────────────────────────────────────

/**
 * Converts an ExtractedElement into the ContainerState + ImageState
 * shapes used by the existing Zustand store.
 *
 * Called inside the Next.js app when it receives data from the extension.
 */
export function extractedToEditorState(data: ExtractedElement): {
  container: Partial<ContainerState>;
  image: ImageState | null;
  originalContext: OriginalElementContext | null;
  importedPosition: { positionX: number; positionY: number; objectFit: ObjectFit } | null;
} {
  const container: Partial<ContainerState> = {
    width: Math.max(80, Math.round(data.width)),
    height: Math.max(60, Math.round(data.height)),
    borderRadius: Math.round(data.borderRadius),
    backgroundColor: data.backgroundColor || 'transparent',
  };

  const originalContext: OriginalElementContext | null = data.originalContext || (data.sourceOrigin ? {
    sourceOrigin: data.sourceOrigin,
    elementLabel: data.elementLabel || 'element',
    imageSrc: data.imageSrc,
    originalStyles: {
      objectFit: data.objectFit,
      objectPosition: `${data.positionX}% ${data.positionY}%`,
    },
    initialPositionX: data.positionX,
    initialPositionY: data.positionY,
    initialObjectFit: data.objectFit,
  } : null);

  const importedPosition = {
    positionX: data.positionX,
    positionY: data.positionY,
    objectFit: data.objectFit,
  };

  if (!data.imageSrc) {
    return { container, image: null, originalContext, importedPosition: null };
  }

  const image: ImageState = {
    src: data.imageSrc,
    naturalWidth: data.naturalWidth || data.width,
    naturalHeight: data.naturalHeight || data.height,
    objectFit: data.objectFit,
    positionX: data.positionX,
    positionY: data.positionY,
  };

  return { container, image, originalContext, importedPosition };
}

/**
 * Encodes an ExtractedElement as a URL-safe base64 string.
 */
export function encodeExtractedElement(data: ExtractedElement): string {
  return btoa(encodeURIComponent(JSON.stringify(data)));
}

/**
 * Decodes a URL-safe base64 string back into an ExtractedElement.
 * Returns null on any parse error.
 */
export function decodeExtractedElement(encoded: string): ExtractedElement | null {
  try {
    return JSON.parse(decodeURIComponent(atob(encoded))) as ExtractedElement;
  } catch {
    return null;
  }
}

// ─── Object-position parser ───────────────────────────────────────────────────

/**
 * Parses a CSS `object-position` string like "62% 35%" or "left top"
 * into numeric 0–100 percentages.
 */
export function parseObjectPosition(raw: string): { x: number; y: number } {
  if (!raw || raw === 'initial') return { x: 50, y: 50 };

  const keywords: Record<string, number> = {
    left: 0,
    right: 100,
    top: 0,
    bottom: 100,
    center: 50,
  };

  const parts = raw.trim().split(/\s+/);
  const resolve = (part: string): number => {
    if (part in keywords) return keywords[part];
    if (part.endsWith('%')) return parseFloat(part);
    // px values are hard to normalise without knowing container size; default 50
    return 50;
  };

  const x = resolve(parts[0] ?? 'center');
  const y = resolve(parts[1] ?? parts[0] ?? 'center');
  return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
}

/**
 * Parses a CSS border-radius shorthand into a single representative px value.
 * Takes the first value (top-left corner) as a proxy for the whole.
 */
export function parseBorderRadius(raw: string): number {
  if (!raw || raw === '0px') return 0;
  const first = raw.split(/[\s/]/)[0];
  return Math.round(parseFloat(first) || 0);
}

/**
 * Normalises a computed background-color.
 * Converts `rgba(0, 0, 0, 0)` / transparent to the string 'transparent'.
 */
export function normalizeBackgroundColor(raw: string): string {
  if (!raw || raw === 'transparent') return 'transparent';
  // rgba with alpha 0 = fully transparent
  const match = raw.match(/rgba\([\d,\s]+,\s*([\d.]+)\)/);
  if (match && parseFloat(match[1]) === 0) return 'transparent';
  return raw;
}

/**
 * Validates that a string is a valid ObjectFit value.
 */
export function parseObjectFit(raw: string): ObjectFit {
  const valid: ObjectFit[] = ['cover', 'contain', 'fill', 'none', 'scale-down'];
  return valid.includes(raw as ObjectFit) ? (raw as ObjectFit) : 'cover';
}
