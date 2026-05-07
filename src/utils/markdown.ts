/**
 * Renders a safe subset of Markdown to a DocumentFragment using DOM APIs.
 *
 * Supported syntax: # headings, **bold**, *italic*, `code`, [link](url),
 * - unordered lists, 1. ordered lists, ``` fenced code blocks.
 *
 * XSS is structurally impossible — never uses innerHTML. All text is set via
 * textContent, and links are restricted to http(s) protocols.
 */

const ALLOWED_PROTOCOLS = /^https?:\/\//i;

export function renderMarkdown(md: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const lines = md.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      if (lang) code.className = `language-${lang}`;
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i++]);
      }
      code.textContent = codeLines.join('\n');
      pre.appendChild(code);
      fragment.appendChild(pre);
      i++;
      continue;
    }

    // ATX headings: # ## ###
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3;
      const el = document.createElement(`h${level}`);
      appendInline(el, headingMatch[2]);
      fragment.appendChild(el);
      i++;
      continue;
    }

    // Unordered list
    if (/^[-*+]\s+/.test(line)) {
      const ul = document.createElement('ul');
      while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
        const li = document.createElement('li');
        appendInline(li, lines[i].replace(/^[-*+]\s+/, ''));
        ul.appendChild(li);
        i++;
      }
      fragment.appendChild(ul);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const ol = document.createElement('ol');
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        const li = document.createElement('li');
        appendInline(li, lines[i].replace(/^\d+\.\s+/, ''));
        ol.appendChild(li);
        i++;
      }
      fragment.appendChild(ol);
      continue;
    }

    // Paragraph (non-empty line)
    if (line.trim()) {
      const p = document.createElement('p');
      appendInline(p, line);
      fragment.appendChild(p);
    }

    i++;
  }

  return fragment;
}

/** Handles inline: **bold**, *italic*, `code`, [text](url) */
function appendInline(parent: HTMLElement, text: string): void {
  const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) {
      parent.appendChild(document.createTextNode(text.slice(last, m.index)));
    }
    if (m[2]) {
      const el = document.createElement('strong');
      el.textContent = m[2];
      parent.appendChild(el);
    } else if (m[3]) {
      const el = document.createElement('em');
      el.textContent = m[3];
      parent.appendChild(el);
    } else if (m[4]) {
      const el = document.createElement('code');
      el.textContent = m[4];
      parent.appendChild(el);
    } else if (m[5] && m[6]) {
      if (ALLOWED_PROTOCOLS.test(m[6])) {
        const a = document.createElement('a');
        a.textContent = m[5];
        a.href = m[6];
        a.rel = 'noopener noreferrer';
        parent.appendChild(a);
      } else {
        parent.appendChild(document.createTextNode(m[5]));
      }
    }
    last = m.index + m[0].length;
  }

  if (last < text.length) {
    parent.appendChild(document.createTextNode(text.slice(last)));
  }
}
