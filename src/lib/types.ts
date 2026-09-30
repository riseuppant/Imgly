// ─── Editor Types ────────────────────────────────────────────────────────────

export type ObjectFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';

export interface ContainerState {
  /** Position of the container in the workspace (px) */
  x: number;
  y: number;
  /** Dimensions of the container (px) */
  width: number;
  height: number;
  /** Visual styling */
  borderRadius: number;
  backgroundColor: string;
}

export interface ImageState {
  /** The original src URL (object URL) */
  src: string;
  /** Natural dimensions of the source image */
  naturalWidth: number;
  naturalHeight: number;
  /** CSS object-fit */
  objectFit: ObjectFit;
  /** CSS object-position as percentages (0–100) */
  positionX: number;
  positionY: number;
}

export type EditMode = 'select' | 'crop';

export interface OriginalElementContext {
  tabId?: number;
  url?: string;
  sourceOrigin?: string;
  xpath?: string;
  selector?: string;
  elementLabel?: string;
  tagName?: string;
  id?: string;
  className?: string;
  imageSrc?: string;
  isBackgroundImage?: boolean;
  originalBoundingRect?: {
    width: number;
    height: number;
    top: number;
    left: number;
  };
  originalStyles: Record<string, string>;
  initialPositionX?: number;
  initialPositionY?: number;
  initialObjectFit?: ObjectFit;
}

export interface EditorState {
  container: ContainerState;
  image: ImageState | null;
  /** Current editor interaction mode: 'select' for frame manipulation, 'crop' for image position crop */
  editMode: EditMode;
  /** Workspace zoom level (1 = 100%) */
  zoom: number;
  /** Workspace pan offset (px) */
  pan: { x: number; y: number };
  /** Which object is currently selected */
  selectedObject: 'frame' | 'image' | null;
  /** Whether the preview overlay is shown */
  previewMode: boolean;
  /** Original position and fit when imported, used for Reset Position */
  importedPosition: {
    positionX: number;
    positionY: number;
    objectFit: ObjectFit;
  } | null;
  /** Information about the original element extracted from the Chrome extension */
  originalContext: OriginalElementContext | null;
}

// ─── History ─────────────────────────────────────────────────────────────────

export interface HistoryEntry {
  container: ContainerState;
  image: ImageState | null;
}

// ─── CSS Generation ───────────────────────────────────────────────────────────

export interface GeneratedCSS {
  vanilla: string;
  tailwind: string;
}
