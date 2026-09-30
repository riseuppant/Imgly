import type { ContainerState, ImageState } from './types';

export function getObjectFitGeometry(container: ContainerState, image: ImageState) {
  const { naturalWidth: natW, naturalHeight: natH, objectFit, positionX, positionY } = image;
  const { width: W, height: H } = container;
  
  // Prevent division by zero
  if (!natW || !natH) return { w: W, h: H, x: 0, y: 0 };

  let scale = 1;
  if (objectFit === 'cover') {
    scale = Math.max(W / natW, H / natH);
  } else if (objectFit === 'contain') {
    scale = Math.min(W / natW, H / natH);
  } else if (objectFit === 'fill') {
    return { w: W, h: H, x: 0, y: 0 };
  } else if (objectFit === 'none') {
    scale = 1;
  } else if (objectFit === 'scale-down') {
    scale = Math.min(1, Math.min(W / natW, H / natH));
  }
  
  const rW = natW * scale;
  const rH = natH * scale;
  
  // CSS object-position formula: (containerSize - imageSize) * percentage
  const x = (W - rW) * (positionX / 100);
  const y = (H - rH) * (positionY / 100);
  
  return { w: rW, h: rH, x, y };
}

/**
 * Calculates new object-position percentages from a drag delta (dx, dy in canvas px).
 * Guarantees that for 'cover', the image always covers the container completely without exposing empty space.
 * For other modes ('contain', 'none', 'scale-down'), respects their geometry and bounds.
 */
export function calculateObjectPositionFromDrag(
  container: ContainerState,
  image: ImageState,
  dx: number,
  dy: number,
  startPct: { x: number; y: number }
): { x: number; y: number } {
  const geo = getObjectFitGeometry(container, image);
  const maxDx = container.width - geo.w;
  const maxDy = container.height - geo.h;

  let newX = startPct.x;
  let newY = startPct.y;

  // Horizontal calculation
  if (Math.abs(maxDx) > 0.001) {
    const currentOffsetX = maxDx * (startPct.x / 100);
    const newOffsetX = currentOffsetX + dx;

    if (image.objectFit === 'cover') {
      // In cover, rW >= W (maxDx <= 0). Valid offset range is [maxDx, 0].
      const clampedX = Math.min(0, Math.max(maxDx, newOffsetX));
      newX = (clampedX / maxDx) * 100;
    } else if (image.objectFit === 'contain' || image.objectFit === 'scale-down') {
      // In contain, rW <= W (maxDx >= 0). Valid offset range is [0, maxDx].
      const clampedX = Math.max(0, Math.min(maxDx, newOffsetX));
      newX = (clampedX / maxDx) * 100;
    } else if (image.objectFit === 'none') {
      if (maxDx < 0) {
        const clampedX = Math.min(0, Math.max(maxDx, newOffsetX));
        newX = (clampedX / maxDx) * 100;
      } else {
        const clampedX = Math.max(0, Math.min(maxDx, newOffsetX));
        newX = (clampedX / maxDx) * 100;
      }
    }
  }

  // Vertical calculation
  if (Math.abs(maxDy) > 0.001) {
    const currentOffsetY = maxDy * (startPct.y / 100);
    const newOffsetY = currentOffsetY + dy;

    if (image.objectFit === 'cover') {
      // In cover, rH >= H (maxDy <= 0). Valid offset range is [maxDy, 0].
      const clampedY = Math.min(0, Math.max(maxDy, newOffsetY));
      newY = (clampedY / maxDy) * 100;
    } else if (image.objectFit === 'contain' || image.objectFit === 'scale-down') {
      const clampedY = Math.max(0, Math.min(maxDy, newOffsetY));
      newY = (clampedY / maxDy) * 100;
    } else if (image.objectFit === 'none') {
      if (maxDy < 0) {
        const clampedY = Math.min(0, Math.max(maxDy, newOffsetY));
        newY = (clampedY / maxDy) * 100;
      } else {
        const clampedY = Math.max(0, Math.min(maxDy, newOffsetY));
        newY = (clampedY / maxDy) * 100;
      }
    }
  }

  return {
    x: Math.max(0, Math.min(100, Math.round(newX * 10) / 10)),
    y: Math.max(0, Math.min(100, Math.round(newY * 10) / 10)),
  };
}
