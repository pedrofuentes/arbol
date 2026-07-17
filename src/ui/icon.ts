const SVG_NS = 'http://www.w3.org/2000/svg';

const ICON_PATHS = {
  add: ['M12 5v14', 'M5 12h14'],
  analytics: ['M4 19V9', 'M10 19V5', 'M16 19v-7', 'M22 19V3'],
  backup: ['M4 4h13l3 3v13H4z', 'M8 4v6h8V4', 'M8 20v-6h8v6'],
  badge: ['M8 3h8l2 4-2 4H8L6 7z', 'M9 11v10l3-2 3 2V11'],
  cards: ['M5 4h14v16H5z', 'M8 8h8', 'M8 12h6'],
  chart: ['M4 19V9', 'M10 19V5', 'M16 19v-7', 'M3 19h18'],
  check: ['M5 12l4 4L19 6'],
  'chevron-down': ['M6 9l6 6 6-6'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  compare: ['M8 3L4 7l4 4', 'M4 7h12a4 4 0 0 1 4 4', 'M16 21l4-4-4-4', 'M20 17H8a4 4 0 0 1-4-4'],
  copy: ['M8 8h12v12H8z', 'M4 16V4h12'],
  edit: ['M4 20l4-1 11-11-3-3L5 16z', 'M14 7l3 3'],
  export: ['M12 3v12', 'M7 8l5-5 5 5', 'M5 14v6h14v-6'],
  eye: ['M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6'],
  file: ['M6 2h8l4 4v16H6z', 'M14 2v5h5'],
  fit: ['M8 3H3v5', 'M16 3h5v5', 'M8 21H3v-5', 'M16 21h5v-5'],
  focus: [
    'M8 3H3v5',
    'M16 3h5v5',
    'M8 21H3v-5',
    'M16 21h5v-5',
    'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  ],
  'folder-open': ['M3 6h7l2 2h9l-3 11H4z', 'M3 6v13'],
  help: ['M9 9a3 3 0 1 1 4 3c-1 1-1 2-1 3', 'M12 19h.01'],
  hierarchy: ['M12 4v5', 'M5 14v6', 'M19 14v6', 'M5 14h14', 'M12 9h0', 'M9 3h6v4H9z'],
  import: ['M12 3v12', 'M7 10l5 5 5-5', 'M5 4v4', 'M19 4v4', 'M5 20h14'],
  info: ['M12 11v6', 'M12 7h.01', 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20'],
  layout: ['M3 3h18v18H3z', 'M3 9h18', 'M9 9v12'],
  link: [
    'M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1',
    'M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1',
  ],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  merge: ['M7 3v5a4 4 0 0 0 4 4h6', 'M7 21v-5a4 4 0 0 1 4-4', 'M14 9l3 3-3 3'],
  moon: ['M20 15a8 8 0 0 1-11-11 8 8 0 1 0 11 11'],
  move: ['M12 2v20', 'M2 12h20', 'M8 6l4-4 4 4', 'M8 18l4 4 4-4', 'M6 8l-4 4 4 4', 'M18 8l4 4-4 4'],
  palette: [
    'M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 0-4h-1a2 2 0 0 1 0-4h5a3 3 0 0 0 3-3 9 9 0 0 0-9-8',
    'M7 10h.01',
    'M10 7h.01',
    'M15 7h.01',
  ],
  paperclip: ['M8 12l6-6a4 4 0 0 1 6 6l-8 8a6 6 0 0 1-8-8l8-8'],
  person: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8', 'M5 21a7 7 0 0 1 14 0'],
  pin: ['M9 3h6l1 6 3 3H5l3-3z', 'M12 12v9'],
  redo: ['M17 7l4 4-4 4', 'M3 17v-2a4 4 0 0 1 4-4h14'],
  remove: ['M4 7h16', 'M9 7V4h6v3', 'M7 7l1 14h8l1-14', 'M10 11v6', 'M14 11v6'],
  replace: ['M20 7h-7a4 4 0 0 0-4 4', 'M16 3l4 4-4 4', 'M4 17h7a4 4 0 0 0 4-4', 'M8 13l-4 4 4 4'],
  reset: ['M4 4v6h6', 'M5 10a8 8 0 1 1 2 8'],
  restore: ['M4 4v6h6', 'M5 10a8 8 0 1 1 2 8', 'M12 8v5l3 2'],
  ruler: ['M4 16L16 4l4 4L8 20z', 'M12 8l2 2', 'M9 11l2 2', 'M6 14l2 2'],
  save: ['M4 3h14l2 2v16H4z', 'M8 3v6h8V3', 'M8 21v-7h8v7'],
  search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16', 'M17 17l4 4'],
  settings: [
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
    'M19 13l2 1-2 4-2-1-2 2v2h-6v-2l-2-2-2 1-2-4 2-1v-2L3 10l2-4 2 1 2-2V3h6v2l2 2 2-1 2 4-2 1z',
  ],
  star: ['M12 3l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z'],
  sun: [
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
    'M12 2v2',
    'M12 20v2',
    'M4.9 4.9l1.4 1.4',
    'M17.7 17.7l1.4 1.4',
    'M2 12h2',
    'M20 12h2',
    'M4.9 19.1l1.4-1.4',
    'M17.7 6.3l1.4-1.4',
  ],
  tag: ['M3 3h7l11 11-7 7L3 10z', 'M7 7h.01'],
  tree: ['M12 3v18', 'M12 8H6v5', 'M12 13h6v5', 'M4 13h4v4H4z', 'M16 18h4v4h-4z', 'M10 3h4v4h-4z'],
  type: ['M5 5V3h14v2', 'M9 21h6', 'M12 3v18'],
  undo: ['M7 7l-4 4 4 4', 'M21 17v-2a4 4 0 0 0-4-4H3'],
  upload: ['M12 21V9', 'M7 14l5-5 5 5', 'M5 3h14'],
  users: [
    'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
    'M2 21a7 7 0 0 1 14 0',
    'M17 11a3 3 0 1 0 0-6',
    'M18 21a5 5 0 0 0-3-5',
  ],
} as const;

export type IconName = keyof typeof ICON_PATHS;

export function isIconName(value: string): value is IconName {
  return value in ICON_PATHS;
}

function appendPaths(svg: SVGSVGElement, name: IconName): void {
  for (const pathData of ICON_PATHS[name]) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', pathData);
    svg.appendChild(path);
  }
}

export function createIcon(name: IconName, className?: string): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.classList.add('ui-icon');
  if (className) svg.classList.add(className);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  setIcon(svg, name);
  return svg;
}

export function setIcon(svg: SVGSVGElement, name: IconName): void {
  svg.dataset.icon = name;
  svg.replaceChildren();
  appendPaths(svg, name);
}

export function appendIconLabel(parent: HTMLElement, name: IconName, label: string): void {
  parent.appendChild(createIcon(name));
  parent.appendChild(document.createTextNode(label));
}
