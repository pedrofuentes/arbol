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

  it('renders links only for manager nodes (not ICs)', () => {
    renderer.render(makeTree());
    const links = container.querySelectorAll('.link');
    // root→Bob and root→Carol = 2 links. Bob→Diana is IC (no link).
    expect(links.length).toBe(2);
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
