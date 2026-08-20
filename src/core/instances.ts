import { reportError } from './appErrors';
import { CommandRegistry } from './commands';
import { registerDefaultBindings } from './defaultBindings';
import { registerExitCommands } from './exit';
import { registerFileCommands } from './fileCommands';
import { registerFocusCommands } from './focus';
import { registerTerminalCommands } from './terminalCommands';
import { KeyboardController } from './input';
import { Keymap } from './keymap';
import { registerMenuCommands } from './menuCommands';
import { registerNavCommands } from './navCommands';
import { registerTabCommands } from './tabCommands';
import { registerEditCommands } from '../editor/editorCommands';
import { registerPaneCommands } from './paneCommands';

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
  registerNavCommands(registry);
  registerFocusCommands(registry);
  registerExitCommands(registry);
  registerTabCommands(registry);
  registerEditCommands(registry.register.bind(registry));
  registerPaneCommands(registry.register.bind(registry));
  registerFileCommands(registry.register.bind(registry));
  registerTerminalCommands(registry.register.bind(registry));
  registerDefaultBindings(keymap);
  coreInstance = { registry, keymap, controller: new KeyboardController(keymap, registry) };
  return coreInstance;
}