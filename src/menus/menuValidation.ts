import type { CommandRegistry } from '../core/commands';
import { menuTree, type MenuItem, type MenuTopLevel } from './menuTree';

function itemHasCommandId(item: MenuItem): boolean {
  return item.commandId !== undefined;
}

function walk(
  items: readonly MenuItem[] | readonly MenuTopLevel[],
  collect: (item: MenuItem) => void,
): void {
  for (const item of items) {
    if (itemHasCommandId(item)) collect(item);
    if (item.children !== undefined) walk(item.children, collect);
  }
}

export function collectMenuCommandIds(): readonly string[] {
  const ids: string[] = [];
  walk(menuTree, (item) => {
    if (item.commandId !== undefined) ids.push(item.commandId);
  });
  return ids;
}

export function menuCommandsMatch(registry: CommandRegistry): boolean {
  for (const id of collectMenuCommandIds()) {
    if (!registry.has(id)) return false;
  }
  return true;
}

export function menuCommandsMatch(registry: CommandRegistry): boolean {
  for (const id of collectMenuCommandIds()) {
    if (!registry.has(id)) return false;
  }
  return true;
}