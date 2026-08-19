import type { DirEntry, FileNode } from './types';

export function buildTree(rootPath: string, entries: readonly DirEntry[]): FileNode {
  const rootName = rootPath.split(/[\\/]/).filter(Boolean).pop() ?? rootPath;
  return {
    path: rootPath,
    name: rootName,
    kind: 'directory',
    isOpen: true,
    children: entries.map((entry) => ({
      path: entry.path,
      name: entry.name,
      kind: entry.kind,
      isOpen: entry.kind === 'directory',
      children: [],
    })),
  };
}

export function replaceChildren(
  nodes: readonly FileNode[],
  path: string,
  entries: readonly DirEntry[],
): readonly FileNode[] {
  return nodes.map((node) => {
    if (node.path === path) {
      return {
        ...node,
        isOpen: true,
        children: entries.map((entry) => ({
          path: entry.path,
          name: entry.name,
          kind: entry.kind,
          isOpen: entry.kind === 'directory',
          children: [],
        })),
      };
    }
    if (node.kind === 'directory' && node.children.length > 0) {
      return { ...node, children: replaceChildren(node.children, path, entries) };
    }
    return node;
  });
}