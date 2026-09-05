import { reportError } from './appErrors';
import { registerBookmarkCommands } from './bookmarkCommands';
import { CommandRegistry } from './commands';
import { registerDefaultBindings } from './defaultBindings';
import { registerExitCommands } from './exit';
import { registerFileCommands } from './fileCommands';
import { registerFocusCommands } from './focus';
import { registerGoCommands } from './goCommands';
import { registerHelpCommands } from './helpCommands';
import { registerHistoryCommands } from './historyCommands';
import { registerAICommands } from '../ai/aiCommands';
import { registerClipboardCommands } from './clipboardCommands';
import { registerDebugCommands } from './debugCommands';
import { registerGitCommands } from './gitCommands';
import { registerTerminalCommands } from './terminalCommands';
import { registerViewCommands } from './viewCommands';
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
  registerBookmarkCommands(registry.register.bind(registry));
  registerHistoryCommands(registry.register.bind(registry));
  registerGoCommands(registry.register.bind(registry));
  registerViewCommands(registry.register.bind(registry));
  registerHelpCommands(registry.register.bind(registry));
  registerAICommands(registry.register.bind(registry));
  registerClipboardCommands(registry.register.bind(registry));
  registerDebugCommands(registry.register.bind(registry));
  registerGitCommands(registry.register.bind(registry));
  registerDefaultBindings(keymap);
  coreInstance = { registry, keymap, controller: new KeyboardController(keymap, registry) };
  return coreInstance;
}