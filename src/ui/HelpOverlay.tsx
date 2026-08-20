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
    screen === 'welcome' ? WELCOME_LINES : screen === 'about' ? ABOUT_LINES : null;

  return (
    <div className="help-overlay" role="dialog" aria-label="Yardım">
      <div className="help-overlay__panel">
        <div className="help-overlay__title">
          {screen === 'welcome' && 'Karşılama'}
          {screen === 'shortcuts' && 'Klavye Kısayolları'}
          {screen === 'about' && 'Hakkında'}
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