import { createOverlay, trapFocus } from './dialog-utils';
import { showConfirmDialog } from './confirm-dialog';

const ARBOL_STORAGE_KEYS = [
  'arbol-org-data',
  'arbol-settings',
  'arbol-categories',
  'arbol-csv-mappings',
  'arbol-accordion-state',
  'arbol-custom-presets',
  'arbol-theme',
];

const HELP_SECTIONS = [
  {
    title: 'Getting Started',
    items: [
      [
        'The chart displays your organization hierarchy. Pan by dragging the canvas, zoom with scroll wheel.',
      ],
      ['Right-click any card for edit, add, move, or remove options.'],
      ['Use the sidebar tabs to manage your data.'],
    ],
  },
  {
    title: 'Sidebar Tabs',
    items: [
      [
        { tag: 'strong', text: 'People' },
        ' — Add new people under a selected parent, or edit the selected person.',
      ],
      [
        { tag: 'strong', text: 'Import' },
        ' — Import an org chart from JSON, CSV, or XLSX files. Paste data, normalize text, or edit the raw JSON tree.',
      ],
      [
        { tag: 'strong', text: 'Settings' },
        ' — Adjust card sizes, spacing, colors, and typography. Choose a preset theme or fine-tune individual values. Use the filter to find specific settings.',
      ],
      [
        { tag: 'strong', text: 'Charts' },
        ' \u2014 Manage multiple org charts and version snapshots. Create, switch, rename, or delete charts. Save and restore named versions.',
      ],
    ],
  },
  {
    title: 'Charts & Versions',
    items: [
      [
        'Arbol supports ',
        { tag: 'strong', text: 'multiple org charts' },
        '. Create, rename, and switch between charts using the ',
        { tag: 'strong', text: 'Charts' },
        ' sidebar tab.',
      ],
      [
        'The active chart name appears in the header next to the logo. Click it to rename.',
      ],
      [
        { tag: 'strong', text: 'Save a version' },
        ' \u2014 Take a named snapshot of the current chart. Use the \ud83d\udcbe button in the header or the Charts tab.',
      ],
      [
        { tag: 'strong', text: 'View a version' },
        ' \u2014 Opens a read-only preview. Click Restore to make it the working chart, or Close to return.',
      ],
      [
        'If you have unsaved changes when switching charts or restoring a version, you\u2019ll be warned first.',
      ],
    ],
  },
  {
    title: 'Importing Data',
    items: [
      [
        { tag: 'strong', text: 'JSON' },
        ' — Nested tree with ',
        { tag: 'code', text: 'id' },
        ', ',
        { tag: 'code', text: 'name' },
        ', ',
        { tag: 'code', text: 'title' },
        ', and optional ',
        { tag: 'code', text: 'children' },
        ' array.',
      ],
      [
        { tag: 'strong', text: 'CSV with IDs' },
        ' — Columns: ',
        { tag: 'code', text: 'id, name, title, parent_id' },
        ' (root has empty parent).',
      ],
      [
        { tag: 'strong', text: 'CSV by name' },
        ' — Columns: ',
        { tag: 'code', text: 'name, title, manager_name' },
        ' (matched by name).',
      ],
      ['Drop a file on the drop zone, or paste text and click Parse & Preview.'],
    ],
  },
  {
    title: 'Chart Interactions',
    items: [
      [{ tag: 'strong', text: 'Click' }, ' — Select and highlight a card.'],
      [
        { tag: 'strong', text: 'Right-click' },
        ' — Context menu with Edit, Add, Move, and Remove options.',
      ],
      [
        { tag: 'strong', text: 'Shift+click' },
        ' — Multi-select cards, then right-click for bulk Move or Remove.',
      ],
      [{ tag: 'strong', text: 'Escape' }, ' — Clear selection.'],
      [
        { tag: 'strong', text: 'Inline editing' },
        ' — Right-click a card and choose Edit to edit directly on the card.',
      ],
      [
        { tag: 'strong', text: 'Collapse/Expand' },
        ' — Click the ▾/▸ indicator below a manager to toggle their subtree.',
      ],
      [
        { tag: 'strong', text: 'Search' },
        ' — Type in the search bar to highlight matching people. Non-matches are dimmed.',
      ],
    ],
  },
  {
    title: 'Your Data',
    items: [
      [
        'Arbol runs entirely in your browser. Your org charts, versions, and preferences are stored in your browser\u2019s storage (IndexedDB and localStorage) and ',
        { tag: 'strong', text: 'never leave your device' },
        '.',
      ],
      ['There is no server, no database, no tracking, and no account required. Your data stays on your machine\u200A\u2014\u200Anobody else can see it.'],
    ],
  },
  {
    title: 'Settings & Persistence',
    items: [
      ['All visual settings auto-save to your browser and restore on next visit.'],
      [
        'Use ',
        { tag: 'strong', text: 'Export Settings' },
        ' to download your configuration as a file.',
      ],
      ['Use ', { tag: 'strong', text: 'Import Settings' }, ' to load a saved configuration.'],
      ['Theme presets apply a full color scheme in one click.'],
    ],
  },
  {
    title: 'Keyboard Shortcuts',
    items: [
      [{ tag: 'kbd', text: 'Ctrl+Z' }, ' — Undo'],
      [{ tag: 'kbd', text: 'Ctrl+Shift+Z' }, ' or ', { tag: 'kbd', text: 'Ctrl+Y' }, ' — Redo'],
      [{ tag: 'kbd', text: 'Ctrl+F' }, ' — Focus search bar'],
      [{ tag: 'kbd', text: 'Ctrl+E' }, ' — Export to PowerPoint'],
      [{ tag: 'kbd', text: 'Escape' }, ' — Dismiss version viewer, clear search, exit focus mode, or deselect'],
    ],
  },
  {
    title: 'Exporting',
    items: [
      [
        { tag: 'strong', text: 'Export PPTX' },
        ' — Downloads the chart as an editable PowerPoint file with native shapes and text.',
      ],
      ['The export auto-scales to fit a widescreen slide.'],
    ],
  },
  {
    title: 'Links',
    items: [
      ['✦ Built with Arbol — https://github.com/pedrofuentes/arbol'],
      ['Report bugs & request features — https://github.com/pedrofuentes/arbol/issues'],
    ],
  },
];

type HelpFragment = string | { tag: string; text: string };

function buildHelpItem(fragments: HelpFragment[]): DocumentFragment {
  const frag = document.createDocumentFragment();
  for (const part of fragments) {
    if (typeof part === 'string') {
      frag.appendChild(document.createTextNode(part));
    } else {
      const el = document.createElement(part.tag);
      el.textContent = part.text;
      frag.appendChild(el);
    }
  }
  return frag;
}

export function showHelpDialog(): void {
  const overlay = createOverlay();
  overlay.style.background = 'rgba(0,0,0,0.6)';
  overlay.style.backdropFilter = 'blur(3px)';

  const dialog = document.createElement('div');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', 'Keyboard shortcuts and help');
  dialog.style.cssText = `
    background:var(--bg-surface);
    border:1px solid var(--border-default);
    border-radius:var(--radius-xl);
    padding:0;
    width:520px;
    max-width:90vw;
    max-height:80vh;
    display:flex;
    flex-direction:column;
    box-shadow:var(--shadow-lg);
    animation:slideUp 200ms cubic-bezier(0.22,1,0.36,1);
    overflow:hidden;
  `;

  // Header
  const header = document.createElement('div');
  header.style.cssText = `
    display:flex;align-items:center;justify-content:space-between;
    padding:16px 20px;border-bottom:1px solid var(--border-subtle);
    flex-shrink:0;
  `;
  const title = document.createElement('h2');
  title.textContent = 'Help & Reference';
  title.style.cssText = `
    font-size:16px;font-weight:700;color:var(--text-primary);
    font-family:var(--font-sans);margin:0;
  `;
  header.appendChild(title);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'icon-btn';
  closeBtn.setAttribute('aria-label', 'Close help dialog');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText += 'font-size:14px;width:28px;height:28px;';
  header.appendChild(closeBtn);
  dialog.appendChild(header);

  // Content
  const content = document.createElement('div');
  content.style.cssText = `
    overflow-y:auto;padding:16px 20px;flex:1;
  `;
  // Scrollbar styling
  content.style.scrollbarWidth = 'thin';

  for (const section of HELP_SECTIONS) {
    const sectionEl = document.createElement('div');
    sectionEl.style.cssText = 'margin-bottom:16px;';

    const heading = document.createElement('h3');
    heading.textContent = section.title;
    heading.style.cssText = `
      font-size:12px;font-weight:700;text-transform:uppercase;
      letter-spacing:0.08em;color:var(--accent);
      font-family:var(--font-sans);margin:0 0 8px;
    `;
    sectionEl.appendChild(heading);

    const list = document.createElement('ul');
    list.style.cssText = `
      list-style:none;padding:0;margin:0;
      display:flex;flex-direction:column;gap:5px;
    `;

    for (const item of section.items) {
      const li = document.createElement('li');
      li.appendChild(buildHelpItem(item));
      li.style.cssText = `
        font-size:13px;line-height:1.5;color:var(--text-secondary);
        font-family:var(--font-sans);padding-left:12px;position:relative;
      `;
      // Bullet
      const bullet = document.createElement('span');
      bullet.style.cssText = `
        position:absolute;left:0;top:7px;width:4px;height:4px;
        border-radius:50%;background:var(--border-strong);
      `;
      li.prepend(bullet);
      list.appendChild(li);
    }

    sectionEl.appendChild(list);

    // Add "Clear All Data" button after the "Your Data" section
    if (section.title === 'Your Data') {
      const clearBtn = document.createElement('button');
      clearBtn.textContent = '🗑 Clear All Data';
      clearBtn.setAttribute('aria-label', 'Clear all local data');
      clearBtn.style.cssText = `
        margin-top:10px;margin-left:12px;padding:5px 14px;font-size:12px;
        font-family:var(--font-sans);cursor:pointer;
        background:transparent;color:var(--text-tertiary);
        border:1px solid var(--border-default);border-radius:var(--radius-md);
        transition:background var(--transition-fast),color var(--transition-fast),border-color var(--transition-fast);
      `;
      clearBtn.addEventListener('mouseenter', () => {
        clearBtn.style.background = 'var(--bg-danger, #fef2f2)';
        clearBtn.style.color = 'var(--text-danger, #dc2626)';
        clearBtn.style.borderColor = 'var(--text-danger, #dc2626)';
      });
      clearBtn.addEventListener('mouseleave', () => {
        clearBtn.style.background = 'transparent';
        clearBtn.style.color = 'var(--text-tertiary)';
        clearBtn.style.borderColor = 'var(--border-default)';
      });
      clearBtn.addEventListener('click', async () => {
        const confirmed = await showConfirmDialog({
          title: 'Clear All Data',
          message:
            'This will permanently delete all your org charts, versions, settings, themes, and preferences. ' +
            'This cannot be undone.\n\nAre you sure?',
          confirmLabel: 'Delete everything',
          danger: true,
        });
        if (confirmed) {
          for (const key of ARBOL_STORAGE_KEYS) {
            localStorage.removeItem(key);
          }
          indexedDB.deleteDatabase('arbol-db');
          window.location.reload();
        }
      });
      sectionEl.appendChild(clearBtn);
    }

    content.appendChild(sectionEl);
  }

  dialog.appendChild(content);
  overlay.appendChild(dialog);

  // Style kbd elements
  const styleTag = document.createElement('style');
  styleTag.textContent = `
    .help-dialog kbd {
      display:inline-block;padding:1px 5px;font-size:11px;
      font-family:var(--font-mono);background:var(--bg-base);
      border:1px solid var(--border-default);border-radius:3px;
      color:var(--text-primary);line-height:1.4;
    }
    .help-dialog code {
      font-family:var(--font-mono);font-size:11px;
      background:var(--bg-base);padding:1px 4px;border-radius:3px;
      color:var(--accent);
    }
  `;
  dialog.classList.add('help-dialog');
  dialog.prepend(styleTag);

  const removeTrap = trapFocus(dialog);

  // Close handlers
  const close = () => {
    removeTrap();
    if (document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }
    document.removeEventListener('keydown', escHandler);
  };

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', escHandler);

  document.body.appendChild(overlay);
}
