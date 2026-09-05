import { getActiveEditor } from '../editor/activeEditor';
import { breakpointModel } from './debugModel';
import { reportError } from './appErrors';
import { paletteModel } from './palette';
import { focusManager } from './focus';
import type { CommandDef } from './types';

export function registerDebugCommands(register: (command: CommandDef) => void): void {
  register({
    id: 'debug.start',
    category: 'run',
    title: 'Hata Ayıklamayı Başlat',
    run: () => {
      paletteModel.showFiles([{ name: 'Hata ayıklama yapılandırması bekleniyor', path: 'debug:start' }]);
      focusManager.set('palette');
      return { ok: true };
    },
  });

  register({
    id: 'debug.breakpoint.toggle',
    category: 'run',
    title: 'Kesme Noktası Aç/Kapat',
    run: () => {
      const editor = getActiveEditor();
      if (editor === null) return { ok: false, error: 'Düzenleyici etkin değil' };
      const pos = editor.getPosition();
      const model = editor.getModel();
      if (pos === null || model === null) return { ok: false, error: 'Konum alınamadı' };
      breakpointModel.toggle(model.uri.path, pos.lineNumber);
      // Monaco glyph dekorasyonu EditorCore'da breakpointModel.subscribe ile yapılabilir — şimdilik iskelet
      return { ok: true };
    },
  });

  for (const id of ['debug.continue', 'debug.step.over', 'debug.step.into', 'debug.step.out'] as const) {
    const titleMap: Record<string, string> = {
      'debug.continue': 'Devam',
      'debug.step.over': 'Üstüne Adım',
      'debug.step.into': 'İçine Adım',
      'debug.step.out': 'Üstünden Çık',
    };
    register({
      id,
      category: 'run',
      title: titleMap[id] ?? id,
      run: () => {
        const msg = 'Hata ayıklama motoru bağlı değil';
        reportError(msg);
        return { ok: false, error: msg };
      },
    });
  }

  register({
    id: 'run.without.debug',
    category: 'run',
    title: 'Hata Ayıklamadan Çalıştır',
    run: () => {
      // Terminal varsa oraya yaz, yoksa palet bilgi
      paletteModel.showFiles([{ name: 'npm run dev (terminalde çalıştır)', path: 'task:dev' }]);
      focusManager.set('palette');
      return { ok: true };
    },
  });

  register({
    id: 'run.last',
    category: 'run',
    title: 'Son Çalıştırmayı Tekrarla',
    run: () => {
      paletteModel.showFiles([{ name: 'Son çalıştırma tekrarı — terminal gerekli', path: 'task:last' }]);
      focusManager.set('palette');
      return { ok: true };
    },
  });
}
