import type { OrgNode, TextNormalization } from '../types';

export function normalizeText(text: string, mode: TextNormalization): string {
  switch (mode) {
    case 'none':
      return text;
    case 'uppercase':
      return text.toUpperCase();
    case 'lowercase':
      return text.toLowerCase();
    case 'titleCase':
      return toTitleCase(text);
  }
}

function toTitleCase(text: string): string {
  return text.replace(/([^\s\-']*)([\s\-']*)/g, (_, word: string, sep: string) => {
    if (word.length === 0) return sep;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() + sep;
  });
}

export function normalizeTreeText(
  tree: OrgNode,
  nameMode: TextNormalization,
  titleMode: TextNormalization,
): OrgNode {
  const result: OrgNode = {
    id: tree.id,
    name: normalizeText(tree.name, nameMode),
    title: normalizeText(tree.title, titleMode),
  };
  if (tree.categoryId !== undefined) {
    result.categoryId = tree.categoryId;
  }
  if (tree.children) {
    result.children = tree.children.map((child) => normalizeTreeText(child, nameMode, titleMode));
  }
  return result;
}
