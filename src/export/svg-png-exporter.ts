export interface SvgExportOptions {
  svgElement: SVGSVGElement;
  fileName: string;
}

export interface PngExportOptions {
  svgElement: SVGSVGElement;
  fileName: string;
  scale?: number;
}

const EXPORT_PADDING = 20;

const ARIA_ATTRIBUTES = [
  'role',
  'aria-label',
  'aria-level',
  'aria-expanded',
  'aria-hidden',
  'aria-modal',
  'aria-controls',
  'aria-keyshortcuts',
  'aria-disabled',
  'aria-live',
  'tabindex',
  'data-tooltip',
  'data-id',
];

function getContentBBox(
  svgElement: SVGSVGElement,
): { x: number; y: number; width: number; height: number } {
  const g = svgElement.querySelector('g');
  if (!g) {
    return { x: 0, y: 0, width: 800, height: 600 };
  }
  try {
    const bbox = g.getBBox();
    if (bbox.width === 0 && bbox.height === 0) {
      return { x: 0, y: 0, width: 800, height: 600 };
    }
    return { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
  } catch {
    return { x: 0, y: 0, width: 800, height: 600 };
  }
}

function stripAriaAttributes(root: SVGSVGElement): void {
  const allElements = root.querySelectorAll('*');
  const targets = [root as Element, ...Array.from(allElements)];
  for (const el of targets) {
    for (const attr of ARIA_ATTRIBUTES) {
      el.removeAttribute(attr);
    }
  }
  const titles = root.querySelectorAll('title');
  for (const title of Array.from(titles)) {
    title.remove();
  }
}

function prepareSvgClone(
  svgElement: SVGSVGElement,
): { clone: SVGSVGElement; width: number; height: number } {
  const bbox = getContentBBox(svgElement);
  const pad = EXPORT_PADDING;

  const clone = svgElement.cloneNode(true) as SVGSVGElement;

  const cloneG = clone.querySelector('g');
  if (cloneG) {
    cloneG.removeAttribute('transform');
  }

  const vbX = bbox.x - pad;
  const vbY = bbox.y - pad;
  const vbW = bbox.width + 2 * pad;
  const vbH = bbox.height + 2 * pad;

  clone.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
  clone.setAttribute('width', String(vbW));
  clone.setAttribute('height', String(vbH));
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  stripAriaAttributes(clone);

  return { clone, width: vbW, height: vbH };
}

function serializeSvg(clone: SVGSVGElement): string {
  return new XMLSerializer().serializeToString(clone);
}

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportSvg(options: SvgExportOptions): void {
  const { svgElement, fileName } = options;
  const { clone } = prepareSvgClone(svgElement);
  const svgString = serializeSvg(clone);
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  triggerDownload(blob, fileName);
}

export function exportPng(options: PngExportOptions): Promise<void> {
  const { svgElement, fileName, scale = 2 } = options;
  const { clone, width, height } = prepareSvgClone(svgElement);
  const svgString = serializeSvg(clone);

  return new Promise<void>((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(width * scale);
      canvas.height = Math.ceil(height * scale);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas 2D context'));
        return;
      }

      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create PNG blob'));
            return;
          }
          triggerDownload(blob, fileName);
          resolve();
        },
        'image/png',
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load SVG image for PNG conversion'));
    };

    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
  });
}
