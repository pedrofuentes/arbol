const HELP_SECTIONS = [
  {
    title: 'Getting Started',
    items: [
      'The chart displays your organization hierarchy. Pan by dragging the canvas, zoom with scroll wheel.',
      'Click any card on the chart to select and edit that person.',
      'Use the sidebar tabs to manage your data.',
    ],
  },
  {
    title: 'Sidebar Tabs',
    items: [
      '<strong>Form</strong> — Add new people under a parent, or edit/delete the selected person.',
      '<strong>Load Data</strong> — Import an org chart from a JSON or CSV file, or paste data directly.',
      '<strong>Edit Tree</strong> — View and edit the raw JSON tree. Click Apply to update the chart.',
      '<strong>Settings</strong> — Adjust card sizes, spacing, colors, and typography. Choose a preset theme or fine-tune individual values.',
    ],
  },
  {
    title: 'Importing Data',
    items: [
      '<strong>JSON</strong> — Nested tree with <code>id</code>, <code>name</code>, <code>title</code>, and optional <code>children</code> array.',
      '<strong>CSV with IDs</strong> — Columns: <code>id, name, title, parent_id</code> (root has empty parent).',
      '<strong>CSV by name</strong> — Columns: <code>name, title, manager_name</code> (matched by name).',
      'Drop a file on the drop zone, or paste text and click Parse & Preview.',
    ],
  },
  {
    title: 'Chart Interactions',
    items: [
      '<strong>Click</strong> a card to select it for editing.',
      '<strong>Drag</strong> a manager card to move them (and their reports) under a new parent.',
      '<strong>Collapse/Expand</strong> — Click the ▾/▸ indicator below a manager to toggle their subtree.',
      '<strong>Search</strong> — Type in the search bar to highlight matching people. Non-matches are dimmed.',
    ],
  },
  {
    title: 'Settings & Persistence',
    items: [
      'All visual settings auto-save to your browser and restore on next visit.',
      'Use <strong>Export Settings</strong> to download your configuration as a file.',
      'Use <strong>Import Settings</strong> to load a saved configuration.',
      'Theme presets apply a full color scheme in one click.',
    ],
  },
  {
    title: 'Keyboard Shortcuts',
    items: [
      '<kbd>Ctrl+Z</kbd> — Undo',
      '<kbd>Ctrl+Shift+Z</kbd> or <kbd>Ctrl+Y</kbd> — Redo',
      '<kbd>Ctrl+F</kbd> — Focus search bar',
      '<kbd>Ctrl+E</kbd> — Export to PowerPoint',
      '<kbd>Escape</kbd> — Clear search or deselect',
    ],
  },
  {
    title: 'Exporting',
    items: [
      '<strong>Export PPTX</strong> — Downloads the chart as an editable PowerPoint file with native shapes and text.',
      'The export auto-scales to fit a widescreen slide.',
    ],
  },
];

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
      li.innerHTML = item;
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
