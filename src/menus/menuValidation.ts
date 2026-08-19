import type { CommandRegistry } from '../core/commands';
import { menuTree } from './menuTree';

export function collectMenuCommandIds(): readonly string[] {
  const ids: string[] = [];
  const walk = (items: readonly { readonly commandId?: string; readonly children?: readonly unknown[] }[]): void => {
    for (const item of items) {
      if (item.commandId !== undefined) ids.push(item.commandId);
      if (item.children !== undefined) {
        walk(item.children as readonly { readonly commandId?: string; readonly children?: readonly unknown[] }[]);
      }
    }
  };
  walk(menuTree);
  return ids;
}

export function menuCommandsMatch(registry: CommandRegistry): boolean {
  for (const id of collectMenuCommandIds()) {
    if (!registry.has(id)) return false;
  }
  return true;
}