import { reportError } from './appErrors';
import { CommandRegistry } from './commands';
import { registerDefaultBindings } from './defaultBindings';
import { KeyboardController } from './input';
import { Keymap } from './keymap';
import { registerMenuCommands } from './menuCommands';

export type Core = {
  readonly registry: CommandRegistry;
  readonly keymap: Keymap;
  readonly controller: KeyboardController;
};

let coreInstance: Core | null = null;

export function createCore(): Core {
  if (coreInstance !== null) return coreInstance;
  const registry = new CommandRegistry();
  const keymap = new Keymap({
    onConflict: (incoming, existing) => {
      reportError(
        `Tuş çakışması: ${incoming.keys.join('+')} → ${incoming.commandId}, ${existing.commandId} zaten bağlı`,
      );
    },
  });
  registerMenuCommands(registry);
  registerDefaultBindings(keymap);
  coreInstance = { registry, keymap, controller: new KeyboardController(keymap, registry) };
  return coreInstance;
}