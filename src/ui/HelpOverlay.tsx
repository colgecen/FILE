import { useFocusZone } from '../core/focus';
import { helpModel, useHelpScreen } from '../core/helpModel';
import { useCore } from '../layout/AppShell';

const WELCOME_LINES = [
  'Merhaba! Bu kod editörünün kısa bir turu:',
  '',
  '• F1 — menü çubuğunu aç/kapat',
  '• Ctrl+I — komut paleti',
  '• tree — sol dosya gezginini açar',
  '• F3 — gezgin klasörleri arasında dolaşır',
  '• Tab / yön tuşları — gezgin dosyaları ve menüler',
];

const ABOUT_LINES = ['Sürüm:', '  • Arayüz — v0.1.0', '  • Çekirdek — TypeScript + React + Monaco', '  • Kabuk — Electron'];

const GETTING_STARTED_LINES = [
  'Başlangıç — hızlı adımlar:',
  '',
  '1. Dosya → Yeni Dosya veya Dosya Aç ile başla',
  '2. Ctrl+I ile komut paletini aç, tree yazarak gezgini aç',
  '3. Sekmeler otomatik oluşur; Ctrl+Tab ile gez',
  '4. Kaydet: Ctrl+S (file.save), Tümünü Kaydet: Ctrl+Shift+S',
];

const DOCUMENTATION_LINES = [
  'Dokümantasyon:',
  '',
  '• AGENTS.md — çalışma kuralları',
  '• ARCHITECTURE.md — mimari ve IPC',
  '• DECISIONS.md — ADR kayıtları',
  '• PLAN_YAKINDA_VE_SEKME.md — güncel plan',
];

const VERSION_LINES = ['Sürüm 0.1.0', 'Electron + React + Monaco + Vite', 'Paket: file@0.1.0'];

const SYSTEM_LINES = ['Sistem Bilgisi — telemetri paneline bakın (StatusBar)', 'CPU/RAM gerçek zamanlı 1Hz örneklenir'];

const UPDATE_LINES = ['Paketleri Güncelle:', 'npm run build → üretim paketi', 'npm install → bağımlılıklar', 'git pull → kaynak güncelleme'];

function ShortcutList(): React.JSX.Element {
  const { keymap } = useCore();
  const bindings = [
    ...keymap.listAll(),
    ...keymap.listByZone('menubar'),
    ...keymap.listByZone('palette'),
    ...keymap.listByZone('explorer'),
    ...keymap.listByZone('editor'),
    ...keymap.listByZone('help'),
  ].filter(
    (binding, index, all) => all.findIndex((entry) => entry.commandId === binding.commandId) === index,
  );
  return (
    <div className="help-overlay__keys">
      {bindings.map((binding) => (
        <div key={binding.id} className="help-overlay__key-row">
          <span className="help-overlay__key-label">{binding.label}</span>
          <span className="help-overlay__key-chord">{binding.keys.join(' ')}</span>
        </div>
      ))}
    </div>
  );
}

export function HelpOverlay(): React.JSX.Element | null {
  const zone = useFocusZone();
  const screen = useHelpScreen();

  if (zone !== 'help' || screen === null) return null;

  const lines =
    screen === 'welcome'
      ? WELCOME_LINES
      : screen === 'about'
        ? ABOUT_LINES
        : screen === 'getting-started'
          ? GETTING_STARTED_LINES
          : screen === 'documentation'
            ? DOCUMENTATION_LINES
            : screen === 'version'
              ? VERSION_LINES
              : screen === 'system'
                ? SYSTEM_LINES
                : screen === 'update'
                  ? UPDATE_LINES
                  : null;

  return (
    <div className="help-overlay" role="dialog" aria-label="Yardım">
      <div className="help-overlay__panel">
        <div className="help-overlay__title">
          {screen === 'welcome' && 'Karşılama'}
          {screen === 'shortcuts' && 'Klavye Kısayolları'}
          {screen === 'about' && 'Hakkında'}
          {screen === 'getting-started' && 'Başlangıç'}
          {screen === 'documentation' && 'Dokümantasyon'}
          {screen === 'version' && 'Sürüm'}
          {screen === 'system' && 'Sistem Bilgisi'}
          {screen === 'update' && 'Paketleri Güncelle'}
        </div>
        {lines !== null ? (
          <div className="help-overlay__lines">
            {lines.map((line, index) => (
              <div key={index}>{line}</div>
            ))}
          </div>
        ) : (
          <ShortcutList />
        )}
        <div className="help-overlay__footer">
          <button type="button" className="help-overlay__close" onClick={() => helpModel.close()}>
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}