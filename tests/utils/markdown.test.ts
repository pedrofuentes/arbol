import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '../../src/utils/markdown';

/** Helper: render markdown and return the container's innerHTML for assertions. */
function render(md: string): HTMLDivElement {
  const div = document.createElement('div');
  div.appendChild(renderMarkdown(md));
  return div;
}

describe('renderMarkdown', () => {
  describe('headings', () => {
    it('renders h1 from # syntax', () => {
      const el = render('# Hello');
      const h1 = el.querySelector('h1');
      expect(h1).not.toBeNull();
      expect(h1!.textContent).toBe('Hello');
    });

    it('renders h2 from ## syntax', () => {
      const el = render('## Sub heading');
      const h2 = el.querySelector('h2');
      expect(h2).not.toBeNull();
      expect(h2!.textContent).toBe('Sub heading');
    });

    it('renders h3 from ### syntax', () => {
      const el = render('### Third level');
      const h3 = el.querySelector('h3');
      expect(h3).not.toBeNull();
      expect(h3!.textContent).toBe('Third level');
    });
  });

  describe('inline formatting', () => {
    it('renders **bold** as <strong>', () => {
      const el = render('This is **bold** text');
      const strong = el.querySelector('strong');
      expect(strong).not.toBeNull();
      expect(strong!.textContent).toBe('bold');
    });

    it('renders *italic* as <em>', () => {
      const el = render('This is *italic* text');
      const em = el.querySelector('em');
      expect(em).not.toBeNull();
      expect(em!.textContent).toBe('italic');
    });

    it('renders `code` as <code>', () => {
      const el = render('Use `manager_name` column');
      const code = el.querySelector('code');
      expect(code).not.toBeNull();
      expect(code!.textContent).toBe('manager_name');
    });

    it('renders [link](url) as <a>', () => {
      const el = render('See [our guide](https://example.com)');
      const a = el.querySelector('a');
      expect(a).not.toBeNull();
      expect(a!.textContent).toBe('our guide');
      expect(a!.href).toContain('https://example.com');
    });

    it('renders multiple inline elements in one line', () => {
      const el = render('Use **bold** and *italic* and `code`');
      expect(el.querySelector('strong')!.textContent).toBe('bold');
      expect(el.querySelector('em')!.textContent).toBe('italic');
      expect(el.querySelector('code')!.textContent).toBe('code');
    });
  });

  describe('lists', () => {
    it('renders unordered list from - syntax', () => {
      const el = render('- Item one\n- Item two\n- Item three');
      const ul = el.querySelector('ul');
      expect(ul).not.toBeNull();
      const items = ul!.querySelectorAll('li');
      expect(items.length).toBe(3);
      expect(items[0].textContent).toBe('Item one');
      expect(items[2].textContent).toBe('Item three');
    });

    it('renders ordered list from 1. syntax', () => {
      const el = render('1. First step\n2. Second step\n3. Third step');
      const ol = el.querySelector('ol');
      expect(ol).not.toBeNull();
      const items = ol!.querySelectorAll('li');
      expect(items.length).toBe(3);
      expect(items[0].textContent).toBe('First step');
    });

    it('renders inline formatting inside list items', () => {
      const el = render('- Use **bold** here\n- And *italic* here');
      const items = el.querySelectorAll('li');
      expect(items[0].querySelector('strong')!.textContent).toBe('bold');
      expect(items[1].querySelector('em')!.textContent).toBe('italic');
    });
  });

  describe('code blocks', () => {
    it('renders fenced code blocks as <pre><code>', () => {
      const el = render('```\nname,title,manager_name\nJane,CEO,\n```');
      const pre = el.querySelector('pre');
      const code = pre?.querySelector('code');
      expect(pre).not.toBeNull();
      expect(code).not.toBeNull();
      expect(code!.textContent).toBe('name,title,manager_name\nJane,CEO,');
    });

    it('applies language class on fenced code blocks', () => {
      const el = render('```csv\nname,title\n```');
      const code = el.querySelector('code');
      expect(code!.className).toBe('language-csv');
    });
  });

  describe('paragraphs', () => {
    it('renders plain text as <p>', () => {
      const el = render('Hello world');
      const p = el.querySelector('p');
      expect(p).not.toBeNull();
      expect(p!.textContent).toBe('Hello world');
    });

    it('renders empty input as empty fragment', () => {
      const el = render('');
      expect(el.children.length).toBe(0);
    });

    it('skips blank lines', () => {
      const el = render('Line one\n\nLine two');
      const paragraphs = el.querySelectorAll('p');
      expect(paragraphs.length).toBe(2);
    });
  });

  describe('security', () => {
    it('blocks javascript: protocol in links', () => {
      const el = render('[click](javascript:alert(1))');
      const a = el.querySelector('a');
      expect(a).toBeNull();
      // The link text should still render as plain text
      expect(el.textContent).toContain('click');
    });

    it('blocks data: protocol in links', () => {
      const el = render('[click](data:text/html,<script>alert(1)</script>)');
      const a = el.querySelector('a');
      expect(a).toBeNull();
    });

    it('allows https: links', () => {
      const el = render('[safe](https://example.com)');
      const a = el.querySelector('a');
      expect(a).not.toBeNull();
      expect(a!.href).toContain('https://example.com');
    });

    it('allows http: links', () => {
      const el = render('[safe](http://example.com)');
      const a = el.querySelector('a');
      expect(a).not.toBeNull();
    });

    it('renders script tags as plain text via textContent', () => {
      const el = render('<script>alert("xss")</script>');
      expect(el.querySelector('script')).toBeNull();
      expect(el.textContent).toContain('<script>');
    });

    it('renders HTML tags as plain text in headings', () => {
      const el = render('# <img src=x onerror=alert(1)>');
      expect(el.querySelector('img')).toBeNull();
      const h1 = el.querySelector('h1');
      expect(h1!.textContent).toContain('<img');
    });
  });

  describe('mixed content', () => {
    it('renders a realistic import instruction', () => {
      const md = [
        '## How to export your org data',
        '',
        '1. Open **Workday** → Reports → People',
        '2. Select the *Arbol Org Export* saved report',
        '3. Click Export → CSV',
        '4. Upload the downloaded file here',
        '',
        'For more details, see [our guide](https://intranet.com/help)',
      ].join('\n');

      const el = render(md);
      expect(el.querySelector('h2')!.textContent).toBe('How to export your org data');
      expect(el.querySelectorAll('li').length).toBe(4);
      expect(el.querySelector('a')!.textContent).toBe('our guide');
      expect(el.querySelector('strong')!.textContent).toBe('Workday');
    });
  });
});
