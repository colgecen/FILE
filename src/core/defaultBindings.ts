import type { Keymap } from './keymap';
import type { FocusZone } from './types';

type BindingSeed = {
  readonly commandId: string;
  readonly keys: readonly string[];
  readonly label: string;
  readonly zone?: FocusZone;
};

const SEEDS: readonly BindingSeed[] = [
  // Menü çubuğu
  { commandId: 'menubar.toggle', keys: ['F1'], label: 'Menü çubuğunu aç/kapat' },
  { commandId: 'menubar.left', keys: ['ArrowLeft'], label: 'Üst buton: sol', zone: 'menubar' },
  { commandId: 'menubar.right', keys: ['ArrowRight'], label: 'Üst buton: sağ', zone: 'menubar' },
  { commandId: 'menubar.up', keys: ['ArrowUp'], label: 'Alt menü: yukarı', zone: 'menubar' },
  { commandId: 'menubar.down', keys: ['ArrowDown'], label: 'Alt menü: aşağı', zone: 'menubar' },
  { commandId: 'menubar.next', keys: ['Tab'], label: 'Alt menü: sonraki', zone: 'menubar' },
  { commandId: 'menubar.activate', keys: ['Enter'], label: 'Öğeyi çalıştır', zone: 'menubar' },
  { commandId: 'menubar.close', keys: ['Escape'], label: 'Menüyü kapat', zone: 'menubar' },

  // Komut paleti
  { commandId: 'palette.toggle', keys: ['Control+i'], label: 'Komut paletini aç/kapat' },
  { commandId: 'palette.confirm', keys: ['Enter'], label: 'Seçimi çalıştır', zone: 'palette' },
  { commandId: 'palette.up', keys: ['ArrowUp'], label: 'Sonuç: yukarı', zone: 'palette' },
  { commandId: 'palette.down', keys: ['ArrowDown'], label: 'Sonuç: aşağı', zone: 'palette' },
  { commandId: 'palette.close', keys: ['Escape'], label: 'Paleti kapat', zone: 'palette' },

  // Gezgin
  { commandId: 'explorer.folder.next', keys: ['F3'], label: 'Klasör: sonraki', zone: 'explorer' },
  { commandId: 'explorer.folder.prev', keys: ['Shift+F3'], label: 'Klasör: önceki', zone: 'explorer' },
  { commandId: 'explorer.up', keys: ['ArrowUp'], label: 'Klasör/dosya: yukarı', zone: 'explorer' },
  { commandId: 'explorer.down', keys: ['ArrowDown'], label: 'Klasör/dosya: aşağı', zone: 'explorer' },
  { commandId: 'explorer.file.next', keys: ['Tab'], label: 'Dosya: sonraki', zone: 'explorer' },
  { commandId: 'explorer.file.prev', keys: ['Shift+Tab'], label: 'Dosya: önceki', zone: 'explorer' },
  { commandId: 'explorer.activate', keys: ['Enter'], label: 'Dosya aç / klasör aç-kapat', zone: 'explorer' },
  { commandId: 'explorer.close', keys: ['Escape'], label: 'Gezginden çık', zone: 'explorer' },

  // Sekmeler
  { commandId: 'tab.close', keys: ['Control+w'], label: 'Aktif sekmeyi kapat' },
  { commandId: 'tab.next', keys: ['Control+Tab'], label: 'Sonraki sekme' },
  { commandId: 'tab.prev', keys: ['Control+Shift+Tab'], label: 'Önceki sekme' },

  // Çoklu imleç
  { commandId: 'cursor.up', keys: ['Control+Alt+ArrowUp'], label: 'İmleci yukarı ekle', zone: 'editor' },
  { commandId: 'cursor.down', keys: ['Control+Alt+ArrowDown'], label: 'İmleci aşağı ekle', zone: 'editor' },
  { commandId: 'cursor.all', keys: ['Control+Shift+l'], label: 'Eşleşmelere imleç ekle', zone: 'editor' },
];

export function registerDefaultBindings(keymap: Keymap): void {
  let index = 0;
  for (const seed of SEEDS) {
    keymap.bind(
      {
        id: `binding-${seed.commandId}-${index}`,
        commandId: seed.commandId,
        keys: [...seed.keys],
        label: seed.label,
      },
      seed.zone,
    );
    index++;
  }
}