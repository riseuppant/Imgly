import type { ContainerState, ImageState, GeneratedCSS } from './types';

/**
 * Generates vanilla CSS and Tailwind-oriented output
 * from the current container + image state.
 *
 * The generated CSS is derived from the model state —
 * never from pixel positions in the workspace.
 */
export function generateCSS(
  container: ContainerState,
  image: ImageState | null
): GeneratedCSS {
  if (!image) {
    return {
      vanilla: '/* Import an image to generate CSS */',
      tailwind: '/* Import an image to generate CSS */',
    };
  }

  const { width, height, borderRadius, backgroundColor } = container;
  const { objectFit, positionX, positionY } = image;

  // ── Vanilla CSS ──────────────────────────────────────────────────────────
  const containerLines: string[] = [
    `width: ${width}px;`,
    `height: ${height}px;`,
    `overflow: hidden;`,
  ];
  if (borderRadius > 0) containerLines.push(`border-radius: ${borderRadius}px;`);
  if (backgroundColor !== 'transparent' && backgroundColor !== '#000000') {
    containerLines.push(`background-color: ${backgroundColor};`);
  }

  const imgLines: string[] = [
    `width: 100%;`,
    `height: 100%;`,
    `object-fit: ${objectFit};`,
  ];

  // Only emit object-position if it's not the default (50% 50%)
  const posX = Math.round(positionX);
  const posY = Math.round(positionY);
  if (posX !== 50 || posY !== 50) {
    imgLines.push(`object-position: ${posX}% ${posY}%;`);
  }

  const vanilla =
    `.image-container {\n` +
    containerLines.map((l) => `  ${l}`).join('\n') +
    `\n}\n\n` +
    `.image-container img {\n` +
    imgLines.map((l) => `  ${l}`).join('\n') +
    `\n}`;

  // ── Tailwind ─────────────────────────────────────────────────────────────
  const twClasses: string[] = [
    `w-[${width}px]`,
    `h-[${height}px]`,
    `overflow-hidden`,
  ];
  if (borderRadius > 0) twClasses.push(borderRadiusToTailwind(borderRadius));
  if (backgroundColor !== 'transparent' && backgroundColor !== '#000000') {
    twClasses.push(`bg-[${backgroundColor}]`);
  }

  const imgTwClasses: string[] = [`w-full`, `h-full`, objectFitToTailwind(objectFit)];
  if (posX !== 50 || posY !== 50) {
    imgTwClasses.push(`object-[${posX}%_${posY}%]`);
  }

  const tailwind =
    `<div className="${twClasses.join(' ')}">\n` +
    `  <img\n` +
    `    src="your-image.jpg"\n` +
    `    alt=""\n` +
    `    className="${imgTwClasses.join(' ')}"\n` +
    `  />\n` +
    `</div>`;

  return { vanilla, tailwind };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function objectFitToTailwind(fit: string): string {
  const map: Record<string, string> = {
    cover: 'object-cover',
    contain: 'object-contain',
    fill: 'object-fill',
    none: 'object-none',
    'scale-down': 'object-scale-down',
  };
  return map[fit] ?? `object-[${fit}]`;
}

function borderRadiusToTailwind(radius: number): string {
  const map: Record<number, string> = {
    4: 'rounded',
    6: 'rounded-md',
    8: 'rounded-lg',
    12: 'rounded-xl',
    16: 'rounded-2xl',
    24: 'rounded-3xl',
    9999: 'rounded-full',
  };
  return map[radius] ?? `rounded-[${radius}px]`;
}
