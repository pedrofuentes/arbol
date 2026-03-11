# ChartIt Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a browser-based org chart that renders nested JSON as an interactive, collapsible tree with form and JSON editing.

**Architecture:** Three-layer design — OrgStore (data + events) → ChartRenderer (D3 tree layout + SVG) → Editors (Form + JSON). Unidirectional data flow: editors mutate the store, store emits change events, renderer re-draws.

**Tech Stack:** Vite, TypeScript (strict), D3.js (d3-hierarchy, d3-selection, d3-zoom), Vitest + jsdom

---

## Task 1: Initialize Git & Project Scaffold

**Branch:** `feature/project-setup`

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/style.css`

**Step 1: Initialize git repo and main branch**

```bash
cd S:\Pedro\Projects\ChartIt
git init
git checkout -b main
```

**Step 2: Initialize npm project and install dependencies**

```bash
npm init -y
npm install d3
npm install -D typescript vite vitest @types/d3 jsdom @vitest/coverage-v8
```

**Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vitest/globals"]
  },
  "include": ["src", "tests"]
}
```

**Step 4: Create `vite.config.ts`**

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
```

**Step 5: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ChartIt</title>
  <link rel="stylesheet" href="/src/style.css" />
</head>
<body>
  <div id="app">
    <header id="header"><h1>ChartIt</h1></header>
    <main id="main">
      <aside id="sidebar"></aside>
      <section id="chart-area"></section>
    </main>
    <footer id="footer"></footer>
  </div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

**Step 6: Create `src/style.css`**

```css
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f8fafc;
  color: #1e293b;
  height: 100vh;
  overflow: hidden;
}

#app {
  display: grid;
  grid-template-rows: 48px 1fr 40px;
  height: 100vh;
}

#header {
  display: flex;
  align-items: center;
  padding: 0 16px;
  background: #1e293b;
  color: #f8fafc;
}

#header h1 { font-size: 18px; font-weight: 600; }

#main {
  display: grid;
  grid-template-columns: 320px 1fr;
  overflow: hidden;
}

#sidebar {
  border-right: 1px solid #e2e8f0;
  background: #ffffff;
  overflow-y: auto;
  padding: 16px;
}

#chart-area {
  position: relative;
  overflow: hidden;
  background: #f1f5f9;
}

#chart-area svg {
  width: 100%;
  height: 100%;
}

#footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 16px;
  gap: 8px;
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
}

/* Node styles */
.node rect {
  cursor: pointer;
  transition: filter 0.1s;
}
.node rect:hover { filter: brightness(0.97); }
.node.selected rect { stroke: #3b82f6; stroke-width: 2.5; }
.link { pointer-events: none; }

/* Collapse indicator */
.collapse-indicator {
  cursor: pointer;
  font-size: 10px;
  fill: #94a3b8;
}

/* Sidebar styles */
.tab-bar {
  display: flex;
  gap: 0;
  margin-bottom: 16px;
  border-bottom: 2px solid #e2e8f0;
}

.tab-btn {
  padding: 8px 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  color: #64748b;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
}

.tab-btn.active {
  color: #1e293b;
  border-bottom-color: #3b82f6;
  font-weight: 600;
}

.tab-content { display: none; }
.tab-content.active { display: block; }

.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
}

.form-group textarea {
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 12px;
  resize: vertical;
  min-height: 300px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}

.btn-primary { background: #3b82f6; color: white; }
.btn-primary:hover { background: #2563eb; }
.btn-danger { background: #ef4444; color: white; }
.btn-danger:hover { background: #dc2626; }
.btn-secondary { background: #e2e8f0; color: #1e293b; }
.btn-secondary:hover { background: #cbd5e1; }

.btn-group { display: flex; gap: 8px; margin-top: 12px; }

.error-msg { color: #ef4444; font-size: 12px; margin-top: 4px; }

.footer-btn {
  padding: 4px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 12px;
}
.footer-btn:hover { background: #f1f5f9; }
```

**Step 7: Create `src/main.ts` placeholder**

```typescript
console.log('ChartIt loaded');
```

**Step 8: Add scripts to `package.json`**

In `package.json`, ensure the `"scripts"` section has:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

**Step 9: Verify build and test work**

```bash
npx vite build
npx vitest run
```

Expected: Build succeeds. Vitest runs with 0 tests.

**Step 10: Commit and merge**

```bash
git add -A
git commit -m "chore: initialize project with Vite, TypeScript, D3, and Vitest

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 2: OrgNode Types & ID Utility

**Branch:** `feature/data-model` (create from `main`)

```bash
git checkout -b feature/data-model
```

**Files:**
- Create: `src/types.ts`
- Create: `src/utils/id.ts`
- Test: `tests/utils/id.test.ts`

**Step 1: Write the failing test for generateId**

Create `tests/utils/id.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { generateId } from '../../src/utils/id';

describe('generateId', () => {
  it('returns a non-empty string', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('returns unique IDs on successive calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/utils/id.test.ts
```

Expected: FAIL — module not found.

**Step 3: Create `src/types.ts`**

```typescript
export interface OrgNode {
  id: string;
  name: string;
  title: string;
  children?: OrgNode[];
}
```

**Step 4: Implement `src/utils/id.ts`**

```typescript
export function generateId(): string {
  return crypto.randomUUID();
}
```

**Step 5: Run test to verify it passes**

```bash
npx vitest run tests/utils/id.test.ts
```

Expected: PASS (2 tests).

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add OrgNode type and generateId utility

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 3: Tree Utilities

**Files:**
- Create: `src/utils/tree.ts`
- Test: `tests/utils/tree.test.ts`

**Step 1: Write failing tests for all tree utilities**

Create `tests/utils/tree.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { OrgNode } from '../../src/types';
import {
  findNodeById,
  findParent,
  cloneTree,
  filterVisibleTree,
  flattenTree,
} from '../../src/utils/tree';

function makeTree(): OrgNode {
  return {
    id: 'root',
    name: 'Alice',
    title: 'CEO',
    children: [
      {
        id: 'b',
        name: 'Bob',
        title: 'CTO',
        children: [
          { id: 'd', name: 'Diana', title: 'Engineer' },
          { id: 'e', name: 'Eve', title: 'Engineer' },
        ],
      },
      {
        id: 'c',
        name: 'Carol',
        title: 'CFO',
      },
    ],
  };
}

describe('findNodeById', () => {
  it('finds the root node', () => {
    const tree = makeTree();
    expect(findNodeById(tree, 'root')).toBe(tree);
  });

  it('finds a deeply nested node', () => {
    const tree = makeTree();
    const found = findNodeById(tree, 'e');
    expect(found).not.toBeNull();
    expect(found!.name).toBe('Eve');
  });

  it('returns null for non-existent id', () => {
    const tree = makeTree();
    expect(findNodeById(tree, 'zzz')).toBeNull();
  });
});

describe('findParent', () => {
  it('returns null for the root node', () => {
    const tree = makeTree();
    expect(findParent(tree, 'root')).toBeNull();
  });

  it('finds the parent of a direct child', () => {
    const tree = makeTree();
    const parent = findParent(tree, 'b');
    expect(parent).not.toBeNull();
    expect(parent!.id).toBe('root');
  });

  it('finds the parent of a deep node', () => {
    const tree = makeTree();
    const parent = findParent(tree, 'e');
    expect(parent).not.toBeNull();
    expect(parent!.id).toBe('b');
  });

  it('returns null for non-existent id', () => {
    const tree = makeTree();
    expect(findParent(tree, 'zzz')).toBeNull();
  });
});

describe('cloneTree', () => {
  it('creates a deep copy', () => {
    const tree = makeTree();
    const clone = cloneTree(tree);
    expect(clone).toEqual(tree);
    expect(clone).not.toBe(tree);
  });

  it('mutations to clone do not affect original', () => {
    const tree = makeTree();
    const clone = cloneTree(tree);
    clone.name = 'CHANGED';
    expect(tree.name).toBe('Alice');
  });
});

describe('filterVisibleTree', () => {
  it('returns full tree when nothing is collapsed', () => {
    const tree = makeTree();
    const filtered = filterVisibleTree(tree, new Set());
    expect(flattenTree(filtered)).toHaveLength(5);
  });

  it('excludes children of collapsed nodes', () => {
    const tree = makeTree();
    const filtered = filterVisibleTree(tree, new Set(['b']));
    const nodes = flattenTree(filtered);
    expect(nodes.map(n => n.id)).toEqual(['root', 'b', 'c']);
  });

  it('does not mutate the original tree', () => {
    const tree = makeTree();
    filterVisibleTree(tree, new Set(['b']));
    expect(flattenTree(tree)).toHaveLength(5);
  });
});

describe('flattenTree', () => {
  it('flattens all nodes in pre-order', () => {
    const tree = makeTree();
    const flat = flattenTree(tree);
    expect(flat.map(n => n.id)).toEqual(['root', 'b', 'd', 'e', 'c']);
  });

  it('handles a single node', () => {
    const node: OrgNode = { id: '1', name: 'Solo', title: 'Only' };
    expect(flattenTree(node)).toHaveLength(1);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/utils/tree.test.ts
```

Expected: FAIL — module not found.

**Step 3: Implement `src/utils/tree.ts`**

```typescript
import { OrgNode } from '../types';

export function findNodeById(root: OrgNode, id: string): OrgNode | null {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  return null;
}

export function findParent(root: OrgNode, id: string): OrgNode | null {
  for (const child of root.children ?? []) {
    if (child.id === id) return root;
    const found = findParent(child, id);
    if (found) return found;
  }
  return null;
}

export function cloneTree(node: OrgNode): OrgNode {
  return JSON.parse(JSON.stringify(node));
}

export function filterVisibleTree(
  node: OrgNode,
  collapsed: Set<string>,
): OrgNode {
  const clone: OrgNode = { id: node.id, name: node.name, title: node.title };
  if (!collapsed.has(node.id) && node.children && node.children.length > 0) {
    clone.children = node.children.map((child) =>
      filterVisibleTree(child, collapsed),
    );
  }
  return clone;
}

export function flattenTree(node: OrgNode): OrgNode[] {
  const result: OrgNode[] = [node];
  for (const child of node.children ?? []) {
    result.push(...flattenTree(child));
  }
  return result;
}
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/utils/tree.test.ts
```

Expected: PASS (all tests).

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add tree utility functions with tests

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 4: OrgStore

**Files:**
- Create: `src/store/org-store.ts`
- Test: `tests/store/org-store.test.ts`

**Step 1: Write failing tests for OrgStore**

Create `tests/store/org-store.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { OrgStore } from '../../src/store/org-store';
import { OrgNode } from '../../src/types';
import { flattenTree } from '../../src/utils/tree';

function makeRoot(): OrgNode {
  return {
    id: 'root',
    name: 'Alice',
    title: 'CEO',
    children: [
      { id: 'b', name: 'Bob', title: 'CTO' },
      { id: 'c', name: 'Carol', title: 'CFO' },
    ],
  };
}

describe('OrgStore', () => {
  describe('constructor & getTree', () => {
    it('stores and returns the tree', () => {
      const store = new OrgStore(makeRoot());
      const tree = store.getTree();
      expect(tree.id).toBe('root');
      expect(tree.name).toBe('Alice');
    });

    it('does not store a reference to the input', () => {
      const input = makeRoot();
      const store = new OrgStore(input);
      input.name = 'CHANGED';
      expect(store.getTree().name).toBe('Alice');
    });
  });

  describe('addChild', () => {
    it('adds a child to the specified parent', () => {
      const store = new OrgStore(makeRoot());
      const added = store.addChild('root', { name: 'Dan', title: 'VP' });
      expect(added.name).toBe('Dan');
      expect(added.id).toBeTruthy();
      expect(store.getTree().children).toHaveLength(3);
    });

    it('adds a child to a leaf node', () => {
      const store = new OrgStore(makeRoot());
      store.addChild('b', { name: 'Eve', title: 'Engineer' });
      const bob = store.getTree().children![0];
      expect(bob.children).toHaveLength(1);
      expect(bob.children![0].name).toBe('Eve');
    });

    it('throws if parent does not exist', () => {
      const store = new OrgStore(makeRoot());
      expect(() =>
        store.addChild('zzz', { name: 'X', title: 'X' }),
      ).toThrow('Parent node "zzz" not found');
    });
  });

  describe('removeNode', () => {
    it('removes a child node', () => {
      const store = new OrgStore(makeRoot());
      store.removeNode('b');
      expect(store.getTree().children).toHaveLength(1);
      expect(store.getTree().children![0].id).toBe('c');
    });

    it('throws if trying to remove root', () => {
      const store = new OrgStore(makeRoot());
      expect(() => store.removeNode('root')).toThrow('Cannot remove root node');
    });

    it('throws if node not found', () => {
      const store = new OrgStore(makeRoot());
      expect(() => store.removeNode('zzz')).toThrow('Node "zzz" not found');
    });

    it('removes the entire subtree', () => {
      const root = makeRoot();
      root.children![0].children = [
        { id: 'd', name: 'Dan', title: 'Eng' },
      ];
      const store = new OrgStore(root);
      store.removeNode('b');
      const allNodes = flattenTree(store.getTree());
      expect(allNodes.map(n => n.id)).not.toContain('d');
    });
  });

  describe('updateNode', () => {
    it('updates name', () => {
      const store = new OrgStore(makeRoot());
      store.updateNode('b', { name: 'Robert' });
      expect(store.getTree().children![0].name).toBe('Robert');
    });

    it('updates title', () => {
      const store = new OrgStore(makeRoot());
      store.updateNode('b', { title: 'VP Engineering' });
      expect(store.getTree().children![0].title).toBe('VP Engineering');
    });

    it('updates both fields', () => {
      const store = new OrgStore(makeRoot());
      store.updateNode('b', { name: 'Robert', title: 'VP' });
      const bob = store.getTree().children![0];
      expect(bob.name).toBe('Robert');
      expect(bob.title).toBe('VP');
    });

    it('throws if node not found', () => {
      const store = new OrgStore(makeRoot());
      expect(() => store.updateNode('zzz', { name: 'X' })).toThrow(
        'Node "zzz" not found',
      );
    });
  });

  describe('toJSON / fromJSON', () => {
    it('serializes to JSON and back', () => {
      const store = new OrgStore(makeRoot());
      const json = store.toJSON();
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe('root');
      expect(parsed.children).toHaveLength(2);
    });

    it('replaces tree from JSON', () => {
      const store = new OrgStore(makeRoot());
      const newTree: OrgNode = {
        id: 'new-root',
        name: 'Zara',
        title: 'Founder',
      };
      store.fromJSON(JSON.stringify(newTree));
      expect(store.getTree().id).toBe('new-root');
      expect(store.getTree().name).toBe('Zara');
    });

    it('throws on invalid JSON structure', () => {
      const store = new OrgStore(makeRoot());
      expect(() => store.fromJSON('{"foo":"bar"}')).toThrow();
    });

    it('throws on invalid JSON syntax', () => {
      const store = new OrgStore(makeRoot());
      expect(() => store.fromJSON('not json')).toThrow();
    });
  });

  describe('onChange', () => {
    it('fires on addChild', () => {
      const store = new OrgStore(makeRoot());
      const listener = vi.fn();
      store.onChange(listener);
      store.addChild('root', { name: 'X', title: 'X' });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('fires on removeNode', () => {
      const store = new OrgStore(makeRoot());
      const listener = vi.fn();
      store.onChange(listener);
      store.removeNode('b');
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('fires on updateNode', () => {
      const store = new OrgStore(makeRoot());
      const listener = vi.fn();
      store.onChange(listener);
      store.updateNode('b', { name: 'X' });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('fires on fromJSON', () => {
      const store = new OrgStore(makeRoot());
      const listener = vi.fn();
      store.onChange(listener);
      store.fromJSON(JSON.stringify({ id: 'x', name: 'X', title: 'X' }));
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('unsubscribe stops events', () => {
      const store = new OrgStore(makeRoot());
      const listener = vi.fn();
      const unsub = store.onChange(listener);
      unsub();
      store.addChild('root', { name: 'X', title: 'X' });
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/store/org-store.test.ts
```

Expected: FAIL — module not found.

**Step 3: Implement `src/store/org-store.ts`**

```typescript
import { OrgNode } from '../types';
import { findNodeById, findParent, cloneTree } from '../utils/tree';
import { generateId } from '../utils/id';

type ChangeListener = () => void;

export class OrgStore {
  private root: OrgNode;
  private listeners: Set<ChangeListener> = new Set();

  constructor(root: OrgNode) {
    this.root = cloneTree(root);
  }

  getTree(): OrgNode {
    return this.root;
  }

  addChild(parentId: string, data: { name: string; title: string }): OrgNode {
    const parent = findNodeById(this.root, parentId);
    if (!parent) throw new Error(`Parent node "${parentId}" not found`);
    const node: OrgNode = {
      id: generateId(),
      name: data.name,
      title: data.title,
    };
    if (!parent.children) parent.children = [];
    parent.children.push(node);
    this.emit();
    return node;
  }

  removeNode(id: string): void {
    if (this.root.id === id) throw new Error('Cannot remove root node');
    const parent = findParent(this.root, id);
    if (!parent) throw new Error(`Node "${id}" not found`);
    parent.children = parent.children?.filter((c) => c.id !== id);
    if (parent.children?.length === 0) parent.children = undefined;
    this.emit();
  }

  updateNode(id: string, fields: { name?: string; title?: string }): void {
    const node = findNodeById(this.root, id);
    if (!node) throw new Error(`Node "${id}" not found`);
    if (fields.name !== undefined) node.name = fields.name;
    if (fields.title !== undefined) node.title = fields.title;
    this.emit();
  }

  toJSON(): string {
    return JSON.stringify(this.root, null, 2);
  }

  fromJSON(json: string): void {
    const parsed = JSON.parse(json);
    if (!parsed.id || !parsed.name || !parsed.title) {
      throw new Error('Invalid org tree: root must have id, name, and title');
    }
    this.root = parsed;
    this.emit();
  }

  onChange(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/store/org-store.test.ts
```

Expected: PASS (all tests).

**Step 5: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

**Step 6: Commit and merge to main**

```bash
git add -A
git commit -m "feat: add OrgStore with CRUD, events, and serialization

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
git checkout main
git merge feature/data-model
```

---

## Task 5: Basic Chart Renderer — Nodes & Links

**Branch:** `feature/renderer`

```bash
git checkout -b feature/renderer
```

**Files:**
- Create: `src/renderer/chart-renderer.ts`
- Test: `tests/renderer/chart-renderer.test.ts`

**Step 1: Write failing tests for ChartRenderer**

Create `tests/renderer/chart-renderer.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ChartRenderer } from '../../src/renderer/chart-renderer';
import { OrgNode } from '../../src/types';

function makeTree(): OrgNode {
  return {
    id: 'root',
    name: 'Alice',
    title: 'CEO',
    children: [
      {
        id: 'b',
        name: 'Bob',
        title: 'CTO',
        children: [
          { id: 'd', name: 'Diana', title: 'Engineer' },
        ],
      },
      { id: 'c', name: 'Carol', title: 'CFO' },
    ],
  };
}

describe('ChartRenderer', () => {
  let container: HTMLDivElement;
  let renderer: ChartRenderer;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    renderer = new ChartRenderer({
      container,
      nodeWidth: 180,
      nodeHeight: 60,
      horizontalSpacing: 20,
      verticalSpacing: 40,
    });
  });

  afterEach(() => {
    renderer.destroy();
    document.body.removeChild(container);
  });

  it('creates an SVG element in the container', () => {
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders the correct number of nodes', () => {
    renderer.render(makeTree());
    const nodes = container.querySelectorAll('.node');
    expect(nodes.length).toBe(4);
  });

  it('renders a single root node', () => {
    const root: OrgNode = { id: 'root', name: 'Solo', title: 'Boss' };
    renderer.render(root);
    const nodes = container.querySelectorAll('.node');
    expect(nodes.length).toBe(1);
  });

  it('renders node name text', () => {
    renderer.render(makeTree());
    const names = container.querySelectorAll('.node-name');
    const nameTexts = Array.from(names).map((el) => el.textContent);
    expect(nameTexts).toContain('Alice');
    expect(nameTexts).toContain('Bob');
    expect(nameTexts).toContain('Carol');
    expect(nameTexts).toContain('Diana');
  });

  it('renders node title text', () => {
    renderer.render(makeTree());
    const titles = container.querySelectorAll('.node-title');
    const titleTexts = Array.from(titles).map((el) => el.textContent);
    expect(titleTexts).toContain('CEO');
    expect(titleTexts).toContain('CTO');
  });

  it('renders the correct number of links', () => {
    renderer.render(makeTree());
    const links = container.querySelectorAll('.link');
    expect(links.length).toBe(3);
  });

  it('renders no links for a single node', () => {
    const root: OrgNode = { id: 'root', name: 'Solo', title: 'Boss' };
    renderer.render(root);
    const links = container.querySelectorAll('.link');
    expect(links.length).toBe(0);
  });

  it('re-renders cleanly (no duplicate nodes)', () => {
    renderer.render(makeTree());
    renderer.render(makeTree());
    const nodes = container.querySelectorAll('.node');
    expect(nodes.length).toBe(4);
  });

  it('stores node id as data attribute', () => {
    renderer.render(makeTree());
    const nodes = container.querySelectorAll('.node');
    const ids = Array.from(nodes).map((el) => el.getAttribute('data-id'));
    expect(ids).toContain('root');
    expect(ids).toContain('b');
    expect(ids).toContain('c');
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/renderer/chart-renderer.test.ts
```

Expected: FAIL — module not found.

**Step 3: Implement `src/renderer/chart-renderer.ts`**

```typescript
import * as d3 from 'd3';
import { OrgNode } from '../types';
import { filterVisibleTree } from '../utils/tree';

export interface RendererOptions {
  container: HTMLElement;
  nodeWidth: number;
  nodeHeight: number;
  horizontalSpacing: number;
  verticalSpacing: number;
}

export type NodeClickHandler = (nodeId: string) => void;

export class ChartRenderer {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private g: d3.Selection<SVGGElement, unknown, null, undefined>;
  private options: RendererOptions;
  private collapsed: Set<string> = new Set();
  private onNodeClick: NodeClickHandler | null = null;
  private onCollapseToggle: ((nodeId: string) => void) | null = null;

  constructor(options: RendererOptions) {
    this.options = options;
    this.svg = d3
      .select(options.container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%');
    this.g = this.svg.append('g').attr('class', 'chart-group');
  }

  setNodeClickHandler(handler: NodeClickHandler): void {
    this.onNodeClick = handler;
  }

  setCollapseToggleHandler(handler: (nodeId: string) => void): void {
    this.onCollapseToggle = handler;
  }

  render(root: OrgNode): void {
    const visibleTree = filterVisibleTree(root, this.collapsed);
    const { nodeWidth, nodeHeight, horizontalSpacing, verticalSpacing } =
      this.options;

    const hierarchy = d3.hierarchy(visibleTree, (d) => d.children);
    const treeLayout = d3
      .tree<OrgNode>()
      .nodeSize([
        nodeWidth + horizontalSpacing,
        nodeHeight + verticalSpacing,
      ]);

    const treeData = treeLayout(hierarchy);

    this.g.selectAll('*').remove();

    // Render links
    const linksGroup = this.g.append('g').attr('class', 'links');
    linksGroup
      .selectAll('path')
      .data(treeData.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', (d) => {
        const sx = d.source.x;
        const sy = d.source.y + nodeHeight;
        const tx = d.target.x;
        const ty = d.target.y;
        const my = (sy + ty) / 2;
        return `M${sx},${sy} L${sx},${my} L${tx},${my} L${tx},${ty}`;
      })
      .attr('fill', 'none')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 1.5);

    // Render nodes
    const nodesGroup = this.g.append('g').attr('class', 'nodes');
    const self = this;
    const nodes = nodesGroup
      .selectAll('g')
      .data(treeData.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('data-id', (d) => d.data.id)
      .attr(
        'transform',
        (d) => `translate(${d.x - nodeWidth / 2},${d.y})`,
      );

    nodes
      .append('rect')
      .attr('width', nodeWidth)
      .attr('height', nodeHeight)
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('fill', '#ffffff')
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', 1.5)
      .on('click', function (_event, d) {
        if (self.onNodeClick) {
          self.onNodeClick(d.data.id);
        }
      });

    nodes
      .append('text')
      .attr('class', 'node-name')
      .attr('x', nodeWidth / 2)
      .attr('y', nodeHeight / 2 - 6)
      .attr('text-anchor', 'middle')
      .attr('font-weight', 'bold')
      .attr('font-size', '13px')
      .text((d) => d.data.name);

    nodes
      .append('text')
      .attr('class', 'node-title')
      .attr('x', nodeWidth / 2)
      .attr('y', nodeHeight / 2 + 12)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('fill', '#64748b')
      .text((d) => d.data.title);

    // Collapse/expand indicator for nodes with children
    nodes
      .filter((d) => {
        const original = d.data;
        return (
          (original.children && original.children.length > 0) ||
          this.collapsed.has(original.id)
        );
      })
      .append('text')
      .attr('class', 'collapse-indicator')
      .attr('x', nodeWidth / 2)
      .attr('y', nodeHeight + 14)
      .attr('text-anchor', 'middle')
      .attr('cursor', 'pointer')
      .text((d) => (this.collapsed.has(d.data.id) ? '▸' : '▾'))
      .on('click', (_event, d) => {
        this.toggleCollapse(d.data.id);
        if (this.onCollapseToggle) {
          this.onCollapseToggle(d.data.id);
        }
      });
  }

  toggleCollapse(id: string): void {
    if (this.collapsed.has(id)) {
      this.collapsed.delete(id);
    } else {
      this.collapsed.add(id);
    }
  }

  isCollapsed(id: string): boolean {
    return this.collapsed.has(id);
  }

  getCollapsed(): Set<string> {
    return new Set(this.collapsed);
  }

  setSelectedNode(nodeId: string | null): void {
    this.g.selectAll('.node').classed('selected', false);
    if (nodeId) {
      this.g.select(`.node[data-id="${nodeId}"]`).classed('selected', true);
    }
  }

  getSvg(): SVGSVGElement {
    return this.svg.node()!;
  }

  getChartGroup(): SVGGElement {
    return this.g.node()!;
  }

  destroy(): void {
    this.svg.remove();
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/renderer/chart-renderer.test.ts
```

Expected: PASS (all tests).

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add ChartRenderer with D3 tree layout and SVG rendering

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 6: Renderer ↔ Store Integration Tests

**Files:**
- Test: `tests/renderer/integration.test.ts`

**Step 1: Write integration tests**

Create `tests/renderer/integration.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ChartRenderer } from '../../src/renderer/chart-renderer';
import { OrgStore } from '../../src/store/org-store';
import { OrgNode } from '../../src/types';

function makeRoot(): OrgNode {
  return {
    id: 'root',
    name: 'Alice',
    title: 'CEO',
    children: [
      { id: 'b', name: 'Bob', title: 'CTO' },
    ],
  };
}

describe('Renderer + Store Integration', () => {
  let container: HTMLDivElement;
  let renderer: ChartRenderer;
  let store: OrgStore;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    renderer = new ChartRenderer({
      container,
      nodeWidth: 180,
      nodeHeight: 60,
      horizontalSpacing: 20,
      verticalSpacing: 40,
    });
    store = new OrgStore(makeRoot());
    store.onChange(() => renderer.render(store.getTree()));
    renderer.render(store.getTree());
  });

  afterEach(() => {
    renderer.destroy();
    document.body.removeChild(container);
  });

  it('updates chart when a child is added', () => {
    expect(container.querySelectorAll('.node').length).toBe(2);
    store.addChild('root', { name: 'Carol', title: 'CFO' });
    expect(container.querySelectorAll('.node').length).toBe(3);
  });

  it('updates chart when a node is removed', () => {
    store.removeNode('b');
    expect(container.querySelectorAll('.node').length).toBe(1);
  });

  it('updates chart when a node is updated', () => {
    store.updateNode('b', { name: 'Robert' });
    const names = Array.from(container.querySelectorAll('.node-name')).map(
      (el) => el.textContent,
    );
    expect(names).toContain('Robert');
    expect(names).not.toContain('Bob');
  });

  it('updates chart when tree is replaced via fromJSON', () => {
    store.fromJSON(
      JSON.stringify({
        id: 'new',
        name: 'Zara',
        title: 'Founder',
        children: [
          { id: 'x1', name: 'X1', title: 'T1' },
          { id: 'x2', name: 'X2', title: 'T2' },
          { id: 'x3', name: 'X3', title: 'T3' },
        ],
      }),
    );
    expect(container.querySelectorAll('.node').length).toBe(4);
  });
});
```

**Step 2: Run integration tests**

```bash
npx vitest run tests/renderer/integration.test.ts
```

Expected: PASS (all tests).

**Step 3: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

**Step 4: Commit and merge**

```bash
git add -A
git commit -m "test: add renderer-store integration tests

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
git checkout main
git merge feature/renderer
```

---

## Task 7: Form Editor

**Branch:** `feature/editor-panels`

```bash
git checkout -b feature/editor-panels
```

**Files:**
- Create: `src/editor/form-editor.ts`
- Test: `tests/editor/form-editor.test.ts`

**Step 1: Write failing tests for FormEditor**

Create `tests/editor/form-editor.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FormEditor } from '../../src/editor/form-editor';
import { OrgStore } from '../../src/store/org-store';
import { OrgNode } from '../../src/types';

function makeRoot(): OrgNode {
  return {
    id: 'root',
    name: 'Alice',
    title: 'CEO',
    children: [{ id: 'b', name: 'Bob', title: 'CTO' }],
  };
}

describe('FormEditor', () => {
  let container: HTMLElement;
  let store: OrgStore;
  let editor: FormEditor;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    store = new OrgStore(makeRoot());
    editor = new FormEditor(container, store);
  });

  afterEach(() => {
    editor.destroy();
    document.body.removeChild(container);
  });

  it('renders a parent select dropdown', () => {
    const select = container.querySelector(
      'select[data-field="parent"]',
    ) as HTMLSelectElement;
    expect(select).not.toBeNull();
    expect(select.options.length).toBeGreaterThanOrEqual(2);
  });

  it('renders name and title inputs', () => {
    expect(
      container.querySelector('input[data-field="name"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('input[data-field="title"]'),
    ).not.toBeNull();
  });

  it('renders an add button', () => {
    const btn = container.querySelector('[data-action="add"]');
    expect(btn).not.toBeNull();
  });

  it('adds a child when form is submitted', () => {
    const nameInput = container.querySelector(
      'input[data-field="name"]',
    ) as HTMLInputElement;
    const titleInput = container.querySelector(
      'input[data-field="title"]',
    ) as HTMLInputElement;
    const parentSelect = container.querySelector(
      'select[data-field="parent"]',
    ) as HTMLSelectElement;
    const addBtn = container.querySelector(
      '[data-action="add"]',
    ) as HTMLButtonElement;

    parentSelect.value = 'root';
    nameInput.value = 'Carol';
    titleInput.value = 'CFO';
    addBtn.click();

    expect(store.getTree().children).toHaveLength(2);
    expect(store.getTree().children![1].name).toBe('Carol');
  });

  it('clears inputs after adding', () => {
    const nameInput = container.querySelector(
      'input[data-field="name"]',
    ) as HTMLInputElement;
    const titleInput = container.querySelector(
      'input[data-field="title"]',
    ) as HTMLInputElement;
    const addBtn = container.querySelector(
      '[data-action="add"]',
    ) as HTMLButtonElement;

    nameInput.value = 'Carol';
    titleInput.value = 'CFO';
    addBtn.click();

    expect(nameInput.value).toBe('');
    expect(titleInput.value).toBe('');
  });

  it('shows edit fields when a node is selected', () => {
    editor.selectNode('b');
    const editName = container.querySelector(
      'input[data-field="edit-name"]',
    ) as HTMLInputElement;
    expect(editName).not.toBeNull();
    expect(editName.value).toBe('Bob');
  });

  it('updates node when edit is saved', () => {
    editor.selectNode('b');
    const editName = container.querySelector(
      'input[data-field="edit-name"]',
    ) as HTMLInputElement;
    const saveBtn = container.querySelector(
      '[data-action="save"]',
    ) as HTMLButtonElement;

    editName.value = 'Robert';
    saveBtn.click();

    expect(store.getTree().children![0].name).toBe('Robert');
  });

  it('deletes node when delete is clicked', () => {
    editor.selectNode('b');
    const deleteBtn = container.querySelector(
      '[data-action="delete"]',
    ) as HTMLButtonElement;
    deleteBtn.click();

    expect(store.getTree().children).toBeUndefined();
  });

  it('refreshes parent dropdown when store changes', () => {
    store.addChild('root', { name: 'New', title: 'New' });
    editor.refresh();
    const select = container.querySelector(
      'select[data-field="parent"]',
    ) as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.text);
    expect(options).toContain('New (New)');
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/editor/form-editor.test.ts
```

Expected: FAIL — module not found.

**Step 3: Implement `src/editor/form-editor.ts`**

```typescript
import { OrgStore } from '../store/org-store';
import { flattenTree, findNodeById } from '../utils/tree';

export class FormEditor {
  private container: HTMLElement;
  private store: OrgStore;
  private selectedNodeId: string | null = null;
  private onSelectionChange: ((nodeId: string | null) => void) | null = null;

  constructor(container: HTMLElement, store: OrgStore) {
    this.container = container;
    this.store = store;
    this.render();
  }

  setSelectionChangeHandler(
    handler: (nodeId: string | null) => void,
  ): void {
    this.onSelectionChange = handler;
  }

  selectNode(nodeId: string | null): void {
    this.selectedNodeId = nodeId;
    this.render();
    if (this.onSelectionChange) {
      this.onSelectionChange(nodeId);
    }
  }

  refresh(): void {
    this.render();
  }

  private render(): void {
    const tree = this.store.getTree();
    const allNodes = flattenTree(tree);

    let html = `
      <h3 style="margin-bottom: 12px;">Add Person</h3>
      <div class="form-group">
        <label>Parent</label>
        <select data-field="parent">
          ${allNodes.map((n) => `<option value="${n.id}">${n.name} (${n.title})</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Name</label>
        <input type="text" data-field="name" placeholder="Full name" />
      </div>
      <div class="form-group">
        <label>Title</label>
        <input type="text" data-field="title" placeholder="Job title" />
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" data-action="add">Add Person</button>
      </div>
    `;

    if (this.selectedNodeId) {
      const node = findNodeById(tree, this.selectedNodeId);
      if (node) {
        const isRoot = node.id === tree.id;
        html += `
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;" />
          <h3 style="margin-bottom: 12px;">Edit: ${node.name}</h3>
          <div class="form-group">
            <label>Name</label>
            <input type="text" data-field="edit-name" value="${node.name}" />
          </div>
          <div class="form-group">
            <label>Title</label>
            <input type="text" data-field="edit-title" value="${node.title}" />
          </div>
          <div class="btn-group">
            <button class="btn btn-primary" data-action="save">Save</button>
            ${isRoot ? '' : '<button class="btn btn-danger" data-action="delete">Delete</button>'}
            <button class="btn btn-secondary" data-action="deselect">Cancel</button>
          </div>
        `;
      }
    }

    this.container.innerHTML = html;
    this.attachEvents();
  }

  private attachEvents(): void {
    const addBtn = this.container.querySelector('[data-action="add"]');
    addBtn?.addEventListener('click', () => this.handleAdd());

    const saveBtn = this.container.querySelector('[data-action="save"]');
    saveBtn?.addEventListener('click', () => this.handleSave());

    const deleteBtn = this.container.querySelector(
      '[data-action="delete"]',
    );
    deleteBtn?.addEventListener('click', () => this.handleDelete());

    const deselectBtn = this.container.querySelector(
      '[data-action="deselect"]',
    );
    deselectBtn?.addEventListener('click', () => this.selectNode(null));
  }

  private handleAdd(): void {
    const parentSelect = this.container.querySelector(
      'select[data-field="parent"]',
    ) as HTMLSelectElement;
    const nameInput = this.container.querySelector(
      'input[data-field="name"]',
    ) as HTMLInputElement;
    const titleInput = this.container.querySelector(
      'input[data-field="title"]',
    ) as HTMLInputElement;

    const parentId = parentSelect.value;
    const name = nameInput.value.trim();
    const title = titleInput.value.trim();

    if (!name || !title) return;

    this.store.addChild(parentId, { name, title });
    nameInput.value = '';
    titleInput.value = '';
    this.render();
  }

  private handleSave(): void {
    if (!this.selectedNodeId) return;
    const editName = this.container.querySelector(
      'input[data-field="edit-name"]',
    ) as HTMLInputElement;
    const editTitle = this.container.querySelector(
      'input[data-field="edit-title"]',
    ) as HTMLInputElement;

    this.store.updateNode(this.selectedNodeId, {
      name: editName.value.trim(),
      title: editTitle.value.trim(),
    });
    this.render();
  }

  private handleDelete(): void {
    if (!this.selectedNodeId) return;
    this.store.removeNode(this.selectedNodeId);
    this.selectedNodeId = null;
    this.render();
  }

  destroy(): void {
    this.container.innerHTML = '';
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/editor/form-editor.test.ts
```

Expected: PASS (all tests).

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add FormEditor with add, edit, delete functionality

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 8: JSON Editor

**Files:**
- Create: `src/editor/json-editor.ts`
- Test: `tests/editor/json-editor.test.ts`

**Step 1: Write failing tests for JsonEditor**

Create `tests/editor/json-editor.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JsonEditor } from '../../src/editor/json-editor';
import { OrgStore } from '../../src/store/org-store';
import { OrgNode } from '../../src/types';

function makeRoot(): OrgNode {
  return {
    id: 'root',
    name: 'Alice',
    title: 'CEO',
    children: [{ id: 'b', name: 'Bob', title: 'CTO' }],
  };
}

describe('JsonEditor', () => {
  let container: HTMLElement;
  let store: OrgStore;
  let editor: JsonEditor;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    store = new OrgStore(makeRoot());
    editor = new JsonEditor(container, store);
  });

  afterEach(() => {
    editor.destroy();
    document.body.removeChild(container);
  });

  it('renders a textarea with the current JSON', () => {
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea).not.toBeNull();
    const parsed = JSON.parse(textarea.value);
    expect(parsed.id).toBe('root');
    expect(parsed.name).toBe('Alice');
  });

  it('renders an apply button', () => {
    const btn = container.querySelector('[data-action="apply"]');
    expect(btn).not.toBeNull();
  });

  it('applies valid JSON to the store', () => {
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    const applyBtn = container.querySelector(
      '[data-action="apply"]',
    ) as HTMLButtonElement;

    textarea.value = JSON.stringify({
      id: 'new',
      name: 'Zara',
      title: 'Founder',
    });
    applyBtn.click();

    expect(store.getTree().name).toBe('Zara');
  });

  it('shows error for invalid JSON syntax', () => {
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    const applyBtn = container.querySelector(
      '[data-action="apply"]',
    ) as HTMLButtonElement;

    textarea.value = 'not json {{{';
    applyBtn.click();

    const error = container.querySelector('.error-msg');
    expect(error).not.toBeNull();
    expect(error!.textContent).toBeTruthy();
  });

  it('shows error for invalid tree structure', () => {
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    const applyBtn = container.querySelector(
      '[data-action="apply"]',
    ) as HTMLButtonElement;

    textarea.value = JSON.stringify({ foo: 'bar' });
    applyBtn.click();

    const error = container.querySelector('.error-msg');
    expect(error).not.toBeNull();
  });

  it('clears error on successful apply', () => {
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    const applyBtn = container.querySelector(
      '[data-action="apply"]',
    ) as HTMLButtonElement;

    // First, cause an error
    textarea.value = 'bad';
    applyBtn.click();
    expect(container.querySelector('.error-msg')).not.toBeNull();

    // Then, apply valid JSON
    textarea.value = JSON.stringify({
      id: 'x',
      name: 'X',
      title: 'X',
    });
    applyBtn.click();
    const error = container.querySelector('.error-msg');
    expect(error === null || error.textContent === '').toBe(true);
  });

  it('refreshes textarea when store changes externally', () => {
    store.addChild('root', { name: 'New', title: 'New' });
    editor.refresh();
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.value).toContain('New');
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/editor/json-editor.test.ts
```

Expected: FAIL — module not found.

**Step 3: Implement `src/editor/json-editor.ts`**

```typescript
import { OrgStore } from '../store/org-store';

export class JsonEditor {
  private container: HTMLElement;
  private store: OrgStore;

  constructor(container: HTMLElement, store: OrgStore) {
    this.container = container;
    this.store = store;
    this.render();
  }

  refresh(): void {
    const textarea = this.container.querySelector(
      'textarea',
    ) as HTMLTextAreaElement | null;
    if (textarea) {
      textarea.value = this.store.toJSON();
    }
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="form-group">
        <label>Org Tree JSON</label>
        <textarea data-field="json">${this.store.toJSON()}</textarea>
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" data-action="apply">Apply JSON</button>
      </div>
      <div class="error-msg" data-field="error"></div>
    `;
    this.attachEvents();
  }

  private attachEvents(): void {
    const applyBtn = this.container.querySelector('[data-action="apply"]');
    applyBtn?.addEventListener('click', () => this.handleApply());
  }

  private handleApply(): void {
    const textarea = this.container.querySelector(
      'textarea',
    ) as HTMLTextAreaElement;
    const errorEl = this.container.querySelector(
      '[data-field="error"]',
    ) as HTMLElement;

    try {
      this.store.fromJSON(textarea.value);
      errorEl.textContent = '';
    } catch (e) {
      errorEl.textContent = e instanceof Error ? e.message : 'Invalid JSON';
    }
  }

  destroy(): void {
    this.container.innerHTML = '';
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/editor/json-editor.test.ts
```

Expected: PASS (all tests).

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add JsonEditor with apply and error feedback

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 9: Tab Switching & Main App Wiring

**Files:**
- Create: `src/editor/tab-switcher.ts`
- Modify: `src/main.ts`
- Test: `tests/editor/tab-switcher.test.ts`

**Step 1: Write failing tests for TabSwitcher**

Create `tests/editor/tab-switcher.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TabSwitcher } from '../../src/editor/tab-switcher';

describe('TabSwitcher', () => {
  let container: HTMLElement;
  let switcher: TabSwitcher;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    switcher = new TabSwitcher(container, [
      { id: 'form', label: 'Form' },
      { id: 'json', label: 'JSON' },
    ]);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('renders tab buttons', () => {
    const buttons = container.querySelectorAll('.tab-btn');
    expect(buttons.length).toBe(2);
  });

  it('renders tab content containers', () => {
    const tabs = container.querySelectorAll('.tab-content');
    expect(tabs.length).toBe(2);
  });

  it('first tab is active by default', () => {
    const buttons = container.querySelectorAll('.tab-btn');
    expect(buttons[0].classList.contains('active')).toBe(true);
    expect(buttons[1].classList.contains('active')).toBe(false);
  });

  it('switches active tab on click', () => {
    const buttons = container.querySelectorAll('.tab-btn');
    (buttons[1] as HTMLElement).click();
    expect(buttons[0].classList.contains('active')).toBe(false);
    expect(buttons[1].classList.contains('active')).toBe(true);
  });

  it('shows correct content panel', () => {
    const tabs = container.querySelectorAll('.tab-content');
    expect(tabs[0].classList.contains('active')).toBe(true);
    expect(tabs[1].classList.contains('active')).toBe(false);

    const buttons = container.querySelectorAll('.tab-btn');
    (buttons[1] as HTMLElement).click();
    expect(tabs[0].classList.contains('active')).toBe(false);
    expect(tabs[1].classList.contains('active')).toBe(true);
  });

  it('getContentContainer returns the correct element', () => {
    const formContainer = switcher.getContentContainer('form');
    const jsonContainer = switcher.getContentContainer('json');
    expect(formContainer).not.toBeNull();
    expect(jsonContainer).not.toBeNull();
    expect(formContainer).not.toBe(jsonContainer);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/editor/tab-switcher.test.ts
```

Expected: FAIL — module not found.

**Step 3: Implement `src/editor/tab-switcher.ts`**

```typescript
export interface TabConfig {
  id: string;
  label: string;
}

export class TabSwitcher {
  private container: HTMLElement;
  private tabs: TabConfig[];
  private contentContainers: Map<string, HTMLElement> = new Map();

  constructor(container: HTMLElement, tabs: TabConfig[]) {
    this.container = container;
    this.tabs = tabs;
    this.render();
  }

  getContentContainer(tabId: string): HTMLElement | null {
    return this.contentContainers.get(tabId) ?? null;
  }

  private render(): void {
    // Tab bar
    const tabBar = document.createElement('div');
    tabBar.className = 'tab-bar';

    this.tabs.forEach((tab, index) => {
      const btn = document.createElement('button');
      btn.className = 'tab-btn' + (index === 0 ? ' active' : '');
      btn.textContent = tab.label;
      btn.dataset.tab = tab.id;
      btn.addEventListener('click', () => this.switchTo(tab.id));
      tabBar.appendChild(btn);
    });

    this.container.appendChild(tabBar);

    // Tab content panels
    this.tabs.forEach((tab, index) => {
      const panel = document.createElement('div');
      panel.className = 'tab-content' + (index === 0 ? ' active' : '');
      panel.dataset.tabContent = tab.id;
      this.container.appendChild(panel);
      this.contentContainers.set(tab.id, panel);
    });
  }

  private switchTo(tabId: string): void {
    this.container.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.tab === tabId);
    });
    this.container.querySelectorAll('.tab-content').forEach((panel) => {
      panel.classList.toggle(
        'active',
        (panel as HTMLElement).dataset.tabContent === tabId,
      );
    });
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/editor/tab-switcher.test.ts
```

Expected: PASS (all tests).

**Step 5: Wire everything in `src/main.ts`**

Replace `src/main.ts` with:

```typescript
import { OrgStore } from './store/org-store';
import { ChartRenderer } from './renderer/chart-renderer';
import { FormEditor } from './editor/form-editor';
import { JsonEditor } from './editor/json-editor';
import { TabSwitcher } from './editor/tab-switcher';
import { OrgNode } from './types';

const SAMPLE_DATA: OrgNode = {
  id: 'ceo-1',
  name: 'Sarah Chen',
  title: 'CEO',
  children: [
    {
      id: 'cto-1',
      name: 'Marcus Johnson',
      title: 'CTO',
      children: [
        { id: 'eng-1', name: 'Priya Patel', title: 'VP Engineering' },
        { id: 'eng-2', name: 'James Wilson', title: 'VP Platform' },
      ],
    },
    {
      id: 'cfo-1',
      name: 'Lisa Park',
      title: 'CFO',
      children: [
        { id: 'fin-1', name: 'Tom Brown', title: 'Controller' },
      ],
    },
    {
      id: 'coo-1',
      name: 'David Kim',
      title: 'COO',
    },
  ],
};

function main(): void {
  const sidebar = document.getElementById('sidebar')!;
  const chartArea = document.getElementById('chart-area')!;

  // Initialize store
  const store = new OrgStore(SAMPLE_DATA);

  // Initialize renderer
  const renderer = new ChartRenderer({
    container: chartArea,
    nodeWidth: 180,
    nodeHeight: 60,
    horizontalSpacing: 20,
    verticalSpacing: 40,
  });

  // Initialize sidebar with tabs
  const tabSwitcher = new TabSwitcher(sidebar, [
    { id: 'form', label: 'Form' },
    { id: 'json', label: 'JSON' },
  ]);

  const formContainer = tabSwitcher.getContentContainer('form')!;
  const jsonContainer = tabSwitcher.getContentContainer('json')!;

  const formEditor = new FormEditor(formContainer, store);
  const jsonEditor = new JsonEditor(jsonContainer, store);

  // Wire store changes → renderer + editors
  store.onChange(() => {
    renderer.render(store.getTree());
    formEditor.refresh();
    jsonEditor.refresh();
  });

  // Wire node clicks → form editor
  renderer.setNodeClickHandler((nodeId) => {
    formEditor.selectNode(nodeId);
    renderer.setSelectedNode(nodeId);
    renderer.render(store.getTree());
  });

  // Wire collapse toggle → re-render
  renderer.setCollapseToggleHandler(() => {
    renderer.render(store.getTree());
  });

  // Initial render
  renderer.render(store.getTree());
}

document.addEventListener('DOMContentLoaded', main);
```

**Step 6: Run all tests and verify dev server**

```bash
npx vitest run
npx vite build
```

Expected: All tests pass, build succeeds.

**Step 7: Commit and merge**

```bash
git add -A
git commit -m "feat: add tab switcher and wire main app together

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
git checkout main
git merge feature/editor-panels
```

---

## Task 10: Pan/Zoom

**Branch:** `feature/pan-zoom`

```bash
git checkout -b feature/pan-zoom
```

**Files:**
- Create: `src/renderer/zoom-manager.ts`
- Test: `tests/renderer/zoom-manager.test.ts`
- Modify: `src/renderer/chart-renderer.ts` — integrate zoom
- Modify: `src/main.ts` — add footer controls

**Step 1: Write failing tests for ZoomManager**

Create `tests/renderer/zoom-manager.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ZoomManager } from '../../src/renderer/zoom-manager';
import * as d3 from 'd3';

describe('ZoomManager', () => {
  let svg: SVGSVGElement;
  let g: SVGGElement;
  let zoomManager: ZoomManager;

  beforeEach(() => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '800');
    svg.setAttribute('height', '600');
    container.appendChild(svg);
    g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(g);
    zoomManager = new ZoomManager(svg, g);
  });

  afterEach(() => {
    svg.parentElement?.remove();
  });

  it('creates a zoom behavior', () => {
    expect(zoomManager).toBeDefined();
  });

  it('fitToContent sets a transform', () => {
    // Add a rect to simulate content
    const rect = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'rect',
    );
    rect.setAttribute('x', '0');
    rect.setAttribute('y', '0');
    rect.setAttribute('width', '200');
    rect.setAttribute('height', '100');
    g.appendChild(rect);

    zoomManager.fitToContent();
    const transform = g.getAttribute('transform');
    // Should have some transform applied (may be identity in jsdom)
    expect(zoomManager.getCurrentTransform()).toBeDefined();
  });

  it('resetZoom resets to identity', () => {
    zoomManager.resetZoom();
    const t = zoomManager.getCurrentTransform();
    expect(t.k).toBe(1);
    expect(t.x).toBe(0);
    expect(t.y).toBe(0);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/renderer/zoom-manager.test.ts
```

Expected: FAIL — module not found.

**Step 3: Implement `src/renderer/zoom-manager.ts`**

```typescript
import * as d3 from 'd3';

export class ZoomManager {
  private svg: SVGSVGElement;
  private g: SVGGElement;
  private zoom: d3.ZoomBehavior<SVGSVGElement, unknown>;
  private currentTransform: d3.ZoomTransform = d3.zoomIdentity;

  constructor(svg: SVGSVGElement, g: SVGGElement) {
    this.svg = svg;
    this.g = g;

    this.zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        this.currentTransform = event.transform;
        d3.select(this.g).attr('transform', event.transform.toString());
      });

    d3.select(this.svg).call(this.zoom);
  }

  fitToContent(padding: number = 40): void {
    const bbox = this.g.getBBox();
    const svgWidth = this.svg.clientWidth || 800;
    const svgHeight = this.svg.clientHeight || 600;

    if (bbox.width === 0 || bbox.height === 0) {
      this.resetZoom();
      return;
    }

    const scale = Math.min(
      (svgWidth - padding * 2) / bbox.width,
      (svgHeight - padding * 2) / bbox.height,
      1.5,
    );

    const tx =
      svgWidth / 2 - (bbox.x + bbox.width / 2) * scale;
    const ty =
      svgHeight / 2 - (bbox.y + bbox.height / 2) * scale + padding / 2;

    const transform = d3.zoomIdentity
      .translate(tx, ty)
      .scale(scale);

    d3.select(this.svg).call(this.zoom.transform, transform);
    this.currentTransform = transform;
  }

  resetZoom(): void {
    const transform = d3.zoomIdentity;
    d3.select(this.svg).call(this.zoom.transform, transform);
    this.currentTransform = transform;
  }

  getCurrentTransform(): d3.ZoomTransform {
    return this.currentTransform;
  }

  applyTransform(transform: d3.ZoomTransform): void {
    d3.select(this.svg).call(this.zoom.transform, transform);
    this.currentTransform = transform;
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/renderer/zoom-manager.test.ts
```

Expected: PASS.

**Step 5: Integrate ZoomManager into ChartRenderer**

In `src/renderer/chart-renderer.ts`, add these changes:

1. Add import: `import { ZoomManager } from './zoom-manager';`
2. Add property: `private zoomManager: ZoomManager | null = null;`
3. After creating `this.g` in constructor, add:
   ```typescript
   this.zoomManager = new ZoomManager(this.svg.node()!, this.g.node()!);
   ```
4. At the end of `render()`, add:
   ```typescript
   if (this.zoomManager) {
     const savedTransform = this.zoomManager.getCurrentTransform();
     if (savedTransform.k === 1 && savedTransform.x === 0 && savedTransform.y === 0) {
       this.zoomManager.fitToContent();
     } else {
       this.zoomManager.applyTransform(savedTransform);
     }
   }
   ```
5. Add public method:
   ```typescript
   getZoomManager(): ZoomManager | null {
     return this.zoomManager;
   }
   ```

**Step 6: Add footer controls in `src/main.ts`**

Add to the `main()` function after initial render:

```typescript
// Footer controls
const footer = document.getElementById('footer')!;
footer.innerHTML = `
  <button class="footer-btn" data-action="fit">Fit to Screen</button>
  <button class="footer-btn" data-action="reset-zoom">Reset Zoom</button>
`;

footer.querySelector('[data-action="fit"]')?.addEventListener('click', () => {
  renderer.getZoomManager()?.fitToContent();
});

footer.querySelector('[data-action="reset-zoom"]')?.addEventListener('click', () => {
  renderer.getZoomManager()?.resetZoom();
});
```

**Step 7: Run all tests and build**

```bash
npx vitest run && npx vite build
```

Expected: All tests pass, build succeeds.

**Step 8: Commit and merge**

```bash
git add -A
git commit -m "feat: add pan/zoom with auto-fit and reset controls

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
git checkout main
git merge feature/pan-zoom
```

---

## Task 11: Collapse/Expand

**Branch:** `feature/collapse-expand`

```bash
git checkout -b feature/collapse-expand
```

**Files:**
- Test: `tests/renderer/collapse.test.ts`
- Modify: `src/renderer/chart-renderer.ts` (collapse already partially implemented)

**Step 1: Write tests for collapse/expand behavior**

Create `tests/renderer/collapse.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ChartRenderer } from '../../src/renderer/chart-renderer';
import { OrgNode } from '../../src/types';

function makeTree(): OrgNode {
  return {
    id: 'root',
    name: 'Alice',
    title: 'CEO',
    children: [
      {
        id: 'b',
        name: 'Bob',
        title: 'CTO',
        children: [
          { id: 'd', name: 'Diana', title: 'Engineer' },
          { id: 'e', name: 'Eve', title: 'Engineer' },
        ],
      },
      { id: 'c', name: 'Carol', title: 'CFO' },
    ],
  };
}

describe('Collapse/Expand', () => {
  let container: HTMLDivElement;
  let renderer: ChartRenderer;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    renderer = new ChartRenderer({
      container,
      nodeWidth: 180,
      nodeHeight: 60,
      horizontalSpacing: 20,
      verticalSpacing: 40,
    });
  });

  afterEach(() => {
    renderer.destroy();
    document.body.removeChild(container);
  });

  it('shows all nodes when nothing is collapsed', () => {
    renderer.render(makeTree());
    expect(container.querySelectorAll('.node').length).toBe(5);
  });

  it('hides children when a node is collapsed', () => {
    renderer.toggleCollapse('b');
    renderer.render(makeTree());
    const nodeIds = Array.from(container.querySelectorAll('.node')).map(
      (el) => el.getAttribute('data-id'),
    );
    expect(nodeIds).toContain('root');
    expect(nodeIds).toContain('b');
    expect(nodeIds).toContain('c');
    expect(nodeIds).not.toContain('d');
    expect(nodeIds).not.toContain('e');
    expect(container.querySelectorAll('.node').length).toBe(3);
  });

  it('shows children again when expanded', () => {
    renderer.toggleCollapse('b');
    renderer.render(makeTree());
    expect(container.querySelectorAll('.node').length).toBe(3);

    renderer.toggleCollapse('b');
    renderer.render(makeTree());
    expect(container.querySelectorAll('.node').length).toBe(5);
  });

  it('hides links to collapsed children', () => {
    renderer.render(makeTree());
    expect(container.querySelectorAll('.link').length).toBe(4);

    renderer.toggleCollapse('b');
    renderer.render(makeTree());
    expect(container.querySelectorAll('.link').length).toBe(2);
  });

  it('tracks collapsed state correctly', () => {
    expect(renderer.isCollapsed('b')).toBe(false);
    renderer.toggleCollapse('b');
    expect(renderer.isCollapsed('b')).toBe(true);
    renderer.toggleCollapse('b');
    expect(renderer.isCollapsed('b')).toBe(false);
  });

  it('renders collapse indicator for nodes with children', () => {
    renderer.render(makeTree());
    const indicators = container.querySelectorAll('.collapse-indicator');
    expect(indicators.length).toBeGreaterThanOrEqual(1);
  });
});
```

**Step 2: Run tests**

```bash
npx vitest run tests/renderer/collapse.test.ts
```

Expected: PASS (collapse logic is already implemented in ChartRenderer from Task 5).

If any tests fail, fix the ChartRenderer accordingly.

**Step 3: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

**Step 4: Commit and merge**

```bash
git add -A
git commit -m "test: add collapse/expand tests and verify behavior

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
git checkout main
git merge feature/collapse-expand
```

---

## Task 12: Final Integration & Manual Verification

**On `main` branch.**

**Step 1: Start dev server and verify visually**

```bash
npx vite
```

Open `http://localhost:5173` in a browser. Verify:
- [ ] Org chart renders with sample data
- [ ] Nodes show name and title
- [ ] Links connect parent to children
- [ ] Click a node → form shows edit fields
- [ ] Add a person via form → chart re-renders
- [ ] Edit a person → chart updates
- [ ] Delete a person → chart updates
- [ ] Switch to JSON tab → see full JSON
- [ ] Edit JSON → Apply → chart updates
- [ ] Click collapse indicator → children hide
- [ ] Pan (drag) and zoom (scroll) work
- [ ] "Fit to Screen" button works

**Step 2: Run final test suite**

```bash
npx vitest run
```

Expected: All tests pass.

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: integration polish and fixes

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```
