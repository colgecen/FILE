import { type CommandRegistry } from './commands';
import type { CommandCategory } from './types';

const PLACEHOLDER = (id: string) => (): { ok: boolean; error: string } => ({
  ok: false,
  error: `Yakında: ${id}`,
});

type CommandSeed = {
  readonly id: string;
  readonly title: string;
  readonly category: CommandCategory;
  readonly run?: () => { ok: boolean; error?: string };
  readonly aliases?: readonly string[];
};

const SEEDS: readonly CommandSeed[] = [
  // File
  { id: 'file.new.file', title: 'Yeni Dosya', category: 'file' },
  { id: 'file.new.window', title: 'Yeni Pencere', category: 'file' },
  { id: 'file.new.terminal', title: 'Yeni Terminal', category: 'file' },
  { id: 'file.open.file', title: 'Dosya Aç', category: 'file', aliases: ['o'] },
  { id: 'file.open.folder', title: 'Klasör Aç', category: 'file', aliases: ['ff'] },
  { id: 'file.open.recent', title: 'Son Kullanılanlar', category: 'file' },
  { id: 'file.open.recent.none', title: 'Kayıt Yok', category: 'file' },
  { id: 'file.save', title: 'Kaydet', category: 'file', aliases: ['w'] },
  { id: 'file.save.as', title: 'Farklı Kaydet', category: 'file', aliases: ['sa'] },
  { id: 'file.save.all', title: 'Tümünü Kaydet', category: 'file', aliases: ['wa'] },
  { id: 'file.exit', title: 'Çıkış', category: 'file' },

  // Edit
  { id: 'edit.undo', title: 'Geri Al', category: 'edit' },
  { id: 'edit.redo', title: 'Yinele', category: 'edit' },
  { id: 'edit.undo.tree', title: 'Geri Alma Ağacı', category: 'edit' },
  { id: 'edit.undo.tree.view', title: 'Ağacı Görüntüle', category: 'edit' },
  { id: 'edit.undo.tree.clean', title: 'Dalları Temizle', category: 'edit' },
  { id: 'edit.cut', title: 'Kes', category: 'edit' },
  { id: 'edit.copy', title: 'Kopyala', category: 'edit' },
  { id: 'edit.paste', title: 'Yapıştır', category: 'edit' },
  { id: 'edit.paste.history', title: 'Yapıştırma Geçmişi', category: 'edit' },
  { id: 'edit.paste.history.open', title: 'Geçmişi Göster', category: 'edit' },
  { id: 'edit.find', title: 'Ara', category: 'edit' },
  { id: 'edit.replace', title: 'Değiştir', category: 'edit' },
  { id: 'edit.replace.regexp', title: 'Değiştir (Regexp)', category: 'edit' },
  { id: 'edit.comment.toggle', title: 'Yorum Aç/Kapat', category: 'edit' },
  { id: 'edit.comment.toggle.block', title: 'Blok Yorum Aç/Kapat', category: 'edit' },

  // Selection
  { id: 'selection.select.all', title: 'Tümünü Seç', category: 'selection' },
  { id: 'selection.expand', title: 'Seçimi Genişlet', category: 'selection' },
  { id: 'selection.shrink', title: 'Seçimi Daralt', category: 'selection' },
  { id: 'cursor.up', title: 'İmleç Yukarı', category: 'selection' },
  { id: 'cursor.down', title: 'İmleç Aşağı', category: 'selection' },
  { id: 'cursor.all', title: 'Her Yerde İmleç', category: 'selection' },
  { id: 'selection.column', title: 'Sütun Modu', category: 'selection' },
  { id: 'selection.rectangular', title: 'Dikdörtgen Seçim', category: 'selection' },

  // View
  { id: 'view.command.palette', title: 'Komut Paleti', category: 'view' },
  { id: 'view.sidebar.explorer', title: 'Gezgin', category: 'view' },
  { id: 'view.sidebar.search', title: 'Arama Paneli', category: 'view' },
  { id: 'view.sidebar.source', title: 'Kaynak Kontrolü', category: 'view' },
  { id: 'view.sidebar.run', title: 'Çalıştır Paneli', category: 'view' },
  { id: 'view.fullscreen', title: 'Tam Ekran', category: 'view' },
  { id: 'view.zen', title: 'Zen Modu', category: 'view' },
  { id: 'view.wordwrap', title: 'Kelime Sarmalama', category: 'view' },
  { id: 'view.layout.single', title: 'Tek Pencere', category: 'view' },
  { id: 'view.split.vertical', title: 'Dikey Böl', category: 'view' },
  { id: 'view.split.horizontal', title: 'Yatay Böl', category: 'view' },

  // Go
  { id: 'go.to.file', title: 'Dosyaya Git', category: 'go' },
  { id: 'go.to.symbol', title: 'Sembole Git', category: 'go' },
  { id: 'go.to.definition', title: 'Tanıma Git', category: 'go' },
  { id: 'go.to.references', title: 'Referanslar', category: 'go' },
  { id: 'go.to.line', title: 'Satıra Git', category: 'go' },
  { id: 'go.back', title: 'Geri', category: 'go' },
  { id: 'go.forward', title: 'İleri', category: 'go' },
  { id: 'bookmark.toggle', title: 'Yer İmi Aç/Kapat', category: 'go' },
  { id: 'bookmark.jump', title: 'Yer İmine Atla', category: 'go' },
  { id: 'bookmark.list', title: 'Yer İmi Listesi', category: 'go' },

  // Run
  { id: 'debug.start', title: 'Hata Ayıklamayı Başlat', category: 'run' },
  { id: 'debug.breakpoint.toggle', title: 'Kesme Noktası Aç/Kapat', category: 'run' },
  { id: 'debug.continue', title: 'Devam', category: 'run' },
  { id: 'debug.step.over', title: 'Üstüne Adım', category: 'run' },
  { id: 'debug.step.into', title: 'İçine Adım', category: 'run' },
  { id: 'debug.step.out', title: 'Üstünden Çık', category: 'run' },
  { id: 'run.without.debug', title: 'Hata Ayıklamadan Çalıştır', category: 'run' },
  { id: 'run.last', title: 'Son Çalıştırmayı Tekrarla', category: 'run' },

  // Terminal
  { id: 'terminal.new', title: 'Yeni Terminal', category: 'terminal' },
  { id: 'terminal.split', title: 'Terminali Böl', category: 'terminal' },
  { id: 'terminal.kill', title: 'Terminali Kapat', category: 'terminal' },
  { id: 'terminal.task.run', title: 'Görev Çalıştır', category: 'terminal' },
  { id: 'terminal.task.last', title: 'Son Görevi Tekrarla', category: 'terminal' },

  // Help
  { id: 'help.welcome', title: 'Karşılama', category: 'help' },
  { id: 'help.getting.started', title: 'Başlangıç', category: 'help' },
  { id: 'help.documentation', title: 'Dokümantasyon', category: 'help' },
  { id: 'help.shortcuts', title: 'Klavye Kısayolları', category: 'help' },
  { id: 'help.describe', title: 'Fonksiyonu/Değişkeni Tanımla', category: 'help' },
  { id: 'help.about', title: 'Hakkında', category: 'help' },
  { id: 'help.version', title: 'Sürüm', category: 'help' },
  { id: 'help.update', title: 'Paketleri Güncelle', category: 'help' },
  { id: 'help.system.info', title: 'Sistem Bilgisi', category: 'help' },

  // Local AI (yer tutucu)
  { id: 'ai.chat', title: 'Yapay Zekâ ile Sohbet', category: 'ai' },
  { id: 'ai.inline.complete', title: 'Satır İçi Tamamlama', category: 'ai' },
  { id: 'ai.explain', title: 'Kodu Açıkla', category: 'ai' },
  { id: 'ai.model.select', title: 'Model Seç', category: 'ai' },
  { id: 'ai.model.status', title: 'Model Durumu', category: 'ai' },
  { id: 'ai.prefs', title: 'Yapay Zekâ Tercihleri', category: 'ai' },
  { id: 'ai.models.download', title: 'Model İndir', category: 'ai' },

  // Gezgin
  { id: 'explorer.tree', title: 'tree — Dosya Gezgini', category: 'view', aliases: ['tree'] },
  { id: 'explorer.toggle', title: 'Gezgini Aç/Kapat', category: 'view' },
  { id: 'explorer.refresh', title: 'Gezgini Yenile', category: 'view' },

  // Panel
  { id: 'pane.close', title: 'Panel Kapat', category: 'view' },
  { id: 'pane.next', title: 'Sonraki Panel', category: 'view' },
];

export function registerMenuCommands(registry: CommandRegistry): void {
  for (const seed of SEEDS) {
    registry.register({
      id: seed.id,
      title: seed.title,
      category: seed.category,
      run: seed.run ?? PLACEHOLDER(seed.id),
      ...(seed.aliases === undefined ? {} : { aliases: seed.aliases }),
      placeholder: seed.run === undefined,
    });
  }
}