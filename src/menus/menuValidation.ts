import type { CommandRegistry } from '../core/commands';
import { menuTree, type MenuItem } from './menuTree';

function walk(items: readonly MenuItem[], collect: (item: MenuItem) => void): void {
  for (const item of items) {
    if (item.commandId !== undefined) collect(item);
    if (item.children !== undefined) walk(item.children, collect);
  }
}

export function collectMenuCommandIds(): readonly string[] {
  const ids: string[] = [];
  for (const top of menuTree) {
    walk(top.items, (item) => {
      if (item.commandId !== undefined) ids.push(item.commandId);
    });
  }
  return ids;
}

export function menuCommandsMatch(registry: CommandRegistry): boolean {
  for (const id of collectMenuCommandIds()) {
    if (!registry.has(id)) return false;
  }
  return true;
}