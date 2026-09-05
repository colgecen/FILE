import { beforeEach, describe, expect, it } from 'vitest';
import { CommandRegistry } from './commands';
import { registerDebugCommands } from './debugCommands';

function createRegistry(): CommandRegistry {
  const registry = new CommandRegistry();
  registerDebugCommands(registry.register.bind(registry));
  return registry;
}

beforeEach(() => {});

describe('debug ve calistirma komutlari', () => {
  it('debug.* ve run.* komutlari kayitlidir ve rozetsizdir', async () => {
    const registry = createRegistry();
    for (const id of [
      'debug.start',
      'debug.breakpoint.toggle',
      'debug.continue',
      'debug.step.over',
      'debug.step.into',
      'debug.step.out',
      'run.without.debug',
      'run.last',
    ]) {
      const def = registry.get(id);
      expect(def, `${id} kayitli olmali`).toBeDefined();
      expect(def?.placeholder).toBeUndefined();
    }
    const start = await registry.run('debug.start');
    expect(start.ok).toBe(true);
    const step = await registry.run('debug.step.over');
    expect(step.ok).toBe(false);
    expect(step.error).toContain('motoru');
  });
});
