import { getActiveEditor } from '../editor/activeEditor';
import { helpModel, type HelpScreen } from './helpModel';
import { focusManager } from './focus';
import type { CommandDef } from './types';

function screenFor(id: string): HelpScreen | null {
  if (id === 'help.welcome') return 'welcome';
  if (id === 'help.shortcuts') return 'shortcuts';
  if (id === 'help.about') return 'about';
  if (id === 'help.getting.started') return 'getting-started';
  if (id === 'help.documentation') return 'documentation';
  if (id === 'help.version') return 'version';
  if (id === 'help.system.info') return 'system';
  if (id === 'help.update') return 'update';
  return null;
}

export function registerHelpCommands(register: (command: CommandDef) => void): void {
  for (const id of [
    'help.welcome',
    'help.shortcuts',
    'help.about',
    'help.getting.started',
    'help.documentation',
    'help.version',
    'help.system.info',
    'help.update',
  ]) {
    const screen = screenFor(id);
    if (screen === null) continue;
    const titles: Record<HelpScreen, string> = {
      welcome: 'Karşılama',
      shortcuts: 'Klavye Kısayolları',
      about: 'Hakkında',
      'getting-started': 'Başlangıç',
      documentation: 'Dokümantasyon',
      version: 'Sürüm',
      system: 'Sistem Bilgisi',
      update: 'Paketleri Güncelle',
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
    id: 'help.describe',
    category: 'help',
    title: 'Fonksiyonu/Değişkeni Tanımla',
    run: () => {
      const editor = getActiveEditor();
      if (editor === null) return { ok: false, error: 'Düzenleyici etkin değil' };
      editor.focus();
      editor.trigger('keyboard', 'editor.action.showHover', null);
      return { ok: true };
    },
  });

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