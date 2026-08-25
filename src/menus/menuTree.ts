export type MenuItemKind = 'command' | 'submenu' | 'separator';

export type MenuItem = {
  readonly id: string;
  readonly kind: MenuItemKind;
  readonly label: string;
  readonly commandId?: string;
  readonly children?: readonly MenuItem[];
};

export type MenuTopLevel = {
  readonly id: string;
  readonly label: string;
  readonly items: readonly MenuItem[];
};

function command(id: string, label: string): MenuItem {
  return { id, kind: 'command', label, commandId: id };
}

function submenu(id: string, label: string, children: readonly MenuItem[]): MenuItem {
  return { id, kind: 'submenu', label, children };
}

function separator(id: string): MenuItem {
  return { id, kind: 'separator', label: '' };
}

export const menuTree: readonly MenuTopLevel[] = [
  {
    id: 'menu-file',
    label: 'Dosya',
    items: [
      command('file.new.file', 'Yeni Dosya'),
      command('file.new.window', 'Yeni Pencere'),
      command('file.new.terminal', 'Yeni Terminal'),
      separator('sep-file-new'),
      command('file.open.file', 'Dosya Aç'),
      command('file.open.folder', 'Klasör Aç'),
      submenu('file.open.recent', 'Son Kullanılanlar', [
        command('file.open.recent.none', 'Kayıt Yok'),
      ]),
      separator('sep-file-save'),
      command('file.save', 'Kaydet'),
      command('file.save.as', 'Farklı Kaydet'),
      command('file.save.all', 'Tümünü Kaydet'),
      separator('sep-file-exit'),
      command('file.exit', 'Çıkış'),
    ],
  },
  {
    id: 'menu-edit',
    label: 'Düzenle',
    items: [
      command('edit.undo', 'Geri Al'),
      command('edit.redo', 'Yinele'),
      submenu('edit.undo.tree', 'Geri Alma Ağacı', [
        command('edit.undo.tree.view', 'Ağacı Görüntüle'),
        command('edit.undo.tree.clean', 'Dalları Temizle'),
      ]),
      separator('sep-edit-history'),
      command('edit.cut', 'Kes'),
      command('edit.copy', 'Kopyala'),
      command('edit.paste', 'Yapıştır'),
      submenu('edit.paste.history', 'Yapıştırma Geçmişi', [
        command('edit.paste.history.open', 'Geçmişi Göster'),
      ]),
      separator('sep-edit-find'),
      command('edit.find', 'Ara'),
      command('edit.replace', 'Değiştir'),
      command('edit.replace.regexp', 'Değiştir (Regexp)'),
      separator('sep-edit-comment'),
      command('edit.comment.toggle', 'Yorum Aç/Kapat'),
      command('edit.comment.toggle.block', 'Blok Yorum Aç/Kapat'),
    ],
  },
  {
    id: 'menu-selection',
    label: 'Seçim',
    items: [
      command('selection.select.all', 'Tümünü Seç'),
      command('selection.expand', 'Seçimi Genişlet'),
      command('selection.shrink', 'Seçimi Daralt'),
      separator('sep-selection-cursor'),
      command('cursor.up', 'İmleç Yukarı'),
      command('cursor.down', 'İmleç Aşağı'),
      command('cursor.all', 'Her Yerde İmleç'),
      separator('sep-selection-mode'),
      command('selection.column', 'Sütun Modu'),
      command('selection.rectangular', 'Dikdörtgen Seçim'),
    ],
  },
  {
    id: 'menu-view',
    label: 'Görünüm',
    items: [
      command('view.command.palette', 'Komut Paleti'),
      separator('sep-view-sidebar'),
      command('view.sidebar.explorer', 'Gezgin'),
      command('view.sidebar.search', 'Arama Paneli'),
      command('view.sidebar.source', 'Kaynak Kontrolü'),
      command('view.sidebar.run', 'Çalıştır Paneli'),
      separator('sep-view-layout'),
      command('view.layout.single', 'Tek Pencere'),
      command('view.split.vertical', 'Dikey Böl'),
      command('view.split.horizontal', 'Yatay Böl'),
      separator('sep-view-panes'),
      command('pane.next', 'Sonraki Panel'),
      command('pane.close', 'Panel Kapat'),
      separator('sep-view-modes'),
      command('view.fullscreen', 'Tam Ekran'),
      command('view.zen', 'Zen Modu'),
      command('view.wordwrap', 'Kelime Sarmalama'),
      command('view.clock.toggle', 'Saat Göster/Gizle'),
    ],
  },
  {
    id: 'menu-go',
    label: 'Git',
    items: [
      command('go.to.file', 'Dosyaya Git'),
      command('go.to.symbol', 'Sembole Git'),
      command('go.to.definition', 'Tanıma Git'),
      command('go.to.references', 'Referanslar'),
      command('go.to.line', 'Satıra Git'),
      separator('sep-go-nav'),
      command('go.back', 'Geri'),
      command('go.forward', 'İleri'),
      separator('sep-go-bookmarks'),
      command('bookmark.toggle', 'Yer İmi Aç/Kapat'),
      command('bookmark.jump', 'Yer İmine Atla'),
      command('bookmark.list', 'Yer İmi Listesi'),
    ],
  },
  {
    id: 'menu-run',
    label: 'Çalıştır',
    items: [
      command('debug.start', 'Hata Ayıklamayı Başlat'),
      command('debug.breakpoint.toggle', 'Kesme Noktası Aç/Kapat'),
      separator('sep-debug-steps'),
      command('debug.continue', 'Devam'),
      command('debug.step.over', 'Üstüne Adım'),
      command('debug.step.into', 'İçine Adım'),
      command('debug.step.out', 'Üstünden Çık'),
      separator('sep-run-actions'),
      command('run.without.debug', 'Hata Ayıklamadan Çalıştır'),
      command('run.last', 'Son Çalıştırmayı Tekrarla'),
    ],
  },
  {
    id: 'menu-terminal',
    label: 'Terminal',
    items: [
      command('terminal.new', 'Yeni Terminal'),
      command('terminal.split', 'Terminali Böl'),
      command('terminal.kill', 'Terminali Kapat'),
      separator('sep-terminal-tasks'),
      command('terminal.task.run', 'Görev Çalıştır'),
      command('terminal.task.last', 'Son Görevi Tekrarla'),
    ],
  },
  {
    id: 'menu-help',
    label: 'Yardım',
    items: [
      command('help.welcome', 'Karşılama'),
      command('help.getting.started', 'Başlangıç'),
      command('help.documentation', 'Dokümantasyon'),
      command('help.shortcuts', 'Klavye Kısayolları'),
      command('help.describe', 'Fonksiyonu/Değişkeni Tanımla'),
      command('help.about', 'Hakkında'),
      command('help.version', 'Sürüm'),
      separator('sep-help-system'),
      command('help.update', 'Paketleri Güncelle'),
      command('help.system.info', 'Sistem Bilgisi'),
    ],
  },
  {
    id: 'menu-ai',
    label: 'Yapay Zekâ',
    items: [
      command('ai.chat', 'Yapay Zekâ ile Sohbet'),
      command('ai.inline.complete', 'Satır İçi Tamamlama'),
      command('ai.explain', 'Kodu Açıkla'),
      separator('sep-ai-models'),
      command('ai.model.select', 'Model Seç'),
      command('ai.model.status', 'Model Durumu'),
      command('ai.models.download', 'Model İndir'),
      command('ai.prefs', 'Yapay Zekâ Tercihleri'),
    ],
  },
];