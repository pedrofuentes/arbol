const HELP_SECTIONS = [
  {
    title: 'Getting Started',
    items: [
      ['The chart displays your organization hierarchy. Pan by dragging the canvas, zoom with scroll wheel.'],
      ['Right-click any card for edit, add, move, or remove options.'],
      ['Use the sidebar tabs to manage your data.'],
    ],
  },
  {
    title: 'Sidebar Tabs',
    items: [
      [{ tag: 'strong', text: 'Add' }, ' — Add new people under a selected parent.'],
      [{ tag: 'strong', text: 'Load' }, ' — Import an org chart from a JSON or CSV file, or paste data directly.'],
      [{ tag: 'strong', text: 'Edit' }, ' — View and edit the raw JSON tree. Click Apply to update the chart.'],
      [{ tag: 'strong', text: 'Settings' }, ' — Adjust card sizes, spacing, colors, and typography. Choose a preset theme or fine-tune individual values.'],
    ],
  },
  {
    title: 'Importing Data',
    items: [
      [{ tag: 'strong', text: 'JSON' }, ' — Nested tree with ', { tag: 'code', text: 'id' }, ', ', { tag: 'code', text: 'name' }, ', ', { tag: 'code', text: 'title' }, ', and optional ', { tag: 'code', text: 'children' }, ' array.'],
      [{ tag: 'strong', text: 'CSV with IDs' }, ' — Columns: ', { tag: 'code', text: 'id, name, title, parent_id' }, ' (root has empty parent).'],
      [{ tag: 'strong', text: 'CSV by name' }, ' — Columns: ', { tag: 'code', text: 'name, title, manager_name' }, ' (matched by name).'],
      ['Drop a file on the drop zone, or paste text and click Parse & Preview.'],
    ],
  },
  {
    title: 'Chart Interactions',
    items: [
      [{ tag: 'strong', text: 'Click' }, ' — Select and highlight a card.'],
      [{ tag: 'strong', text: 'Right-click' }, ' — Context menu with Edit, Add, Move, and Remove options.'],
      [{ tag: 'strong', text: 'Shift+click' }, ' — Multi-select cards, then right-click for bulk Move or Remove.'],
      [{ tag: 'strong', text: 'Escape' }, ' — Clear selection.'],
      [{ tag: 'strong', text: 'Inline editing' }, ' — Right-click a card and choose Edit to edit directly on the card.'],
      [{ tag: 'strong', text: 'Collapse/Expand' }, ' — Click the ▾/▸ indicator below a manager to toggle their subtree.'],
      [{ tag: 'strong', text: 'Search' }, ' — Type in the search bar to highlight matching people. Non-matches are dimmed.'],
    ],
  },
  {
    title: 'Settings & Persistence',
    items: [
      ['All visual settings auto-save to your browser and restore on next visit.'],
      ['Use ', { tag: 'strong', text: 'Export Settings' }, ' to download your configuration as a file.'],
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
      [{ tag: 'kbd', text: 'Escape' }, ' — Clear search or deselect'],
    ],
  },
  {
    title: 'Exporting',
    items: [
      [{ tag: 'strong', text: 'Export PPTX' }, ' — Downloads the chart as an editable PowerPoint file with native shapes and text.'],
      ['The export auto-scales to fit a widescreen slide.'],
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
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:0;
    background:rgba(0,0,0,0.6);z-index:1000;
    display:flex;align-items:center;justify-content:center;
    backdrop-filter:blur(3px);
    animation:fadeIn 150ms ease;
  `;

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

  // Close handlers
  const close = () => {
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
