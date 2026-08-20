import { helpModel, type HelpScreen } from './helpModel';
import { focusManager } from './focus';
import type { CommandDef } from './types';

function screenFor(id: string): HelpScreen | null {
  if (id.startsWith('help.welcome')) return 'welcome';
  if (id.startsWith('help.shortcuts')) return 'shortcuts';
  if (id.startsWith('help.about')) return 'about';
  return null;
}

export function registerHelpCommands(register: (command: CommandDef) => void): void {
  for (const id of ['help.welcome', 'help.shortcuts', 'help.about']) {
    const screen = screenFor(id);
    if (screen === null) continue;
    const titles: Record<HelpScreen, string> = {
      welcome: 'Karşılama',
      shortcuts: 'Klavye Kısayolları',
      about: 'Hakkında',
    };
    register({
      id,
      category: 'help',
      title: titles[screen],
      run: () => {
        helpModel.open(screen);
        focusManager.set('help');
        return { ok: true };
      },
    });
  }

  register({
    id: 'help.close',
    category: 'help',
    title: 'Yardım ekranını kapat',
    run: () => {
      helpModel.close();
      focusManager.returnToPrevious();
      return { ok: true };
    },
  });
}