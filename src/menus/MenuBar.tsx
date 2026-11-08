import { useEffect } from 'react';
import { exitController } from '../core/exit';
import { useCore } from '../layout/AppShell';
import { focusManager, useFocusZone } from '../core/focus';
import { MenuPanel } from './MenuPanel';
import { menuModel, useMenuModelState } from './menuModel';
import { Clock } from '../ui/Clock';

export function WindowControls(): React.JSX.Element | null {
  if (window.api.platform === 'darwin') return null;
  return (
    <div className="traffic-lights" data-testid="traffic-lights">
      <button
        type="button"
        className="traffic traffic--min"
        title="Küçült"
        aria-label="Küçült"
        onClick={() => void window.api.winMinimize()}
      />
      <button
        type="button"
        className="traffic traffic--max"
        title="Ekranı Doldur"
        aria-label="Ekranı Doldur"
        onClick={() => void window.api.winToggleMaximize()}
      />
      <button
        type="button"
        className="traffic traffic--close"
        title="Pencereyi Kapat"
        aria-label="Pencereyi Kapat"
        onClick={() => exitController.request()}
      />
    </div>
  );
}

export function MenuBar(): React.JSX.Element {
  const state = useMenuModelState();
  const zone = useFocusZone();
  const { registry } = useCore();
  const menubarActive = zone === 'menubar';

  // Menü açıkken: menü çubuğu/panel dışına her tıklama ve pencere odağını
  // kaybettiğinde menü otomatik kapanır (odak bölgesinden bağımsız).
  useEffect(() => {
    if (state.openTop === null) return;
    const onDown = (event: MouseEvent): void => {
      const target = event.target as HTMLElement | null;
      if (target !== null && (target.closest('.menubar') !== null || target.closest('.menu-panel') !== null)) return;
      menuModel.close();
      focusManager.returnToPrevious();
    };
    const onBlur = (): void => {
      menuModel.close();
    };
    document.addEventListener('mousedown', onDown, true);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      window.removeEventListener('blur', onBlur);
    };
  }, [state.openTop]);

  const items = [];
  for (let i = 0; i < menuModel.topCount(); i++) {
    const label = menuModel.topLabel(i);
    const active = menubarActive && state.activeTop === i;
    const className = ['menubar__item', active ? 'menubar__item--active' : '']
      .filter(Boolean)
      .join(' ');
    items.push(
      <div key={label} className="menubar__cell">
        <button
          type="button"
          className={className}
          data-menutop={i}
          onMouseEnter={() => {
            if (menubarActive) menuModel.openAt(i);
          }}
          onClick={() => {
            menuModel.openAt(i);
            void registry.run('focus.menubar');
          }}
        >
          {label}
        </button>
        {state.openTop === i && <MenuPanel />}
      </div>,
    );
  }

  return (
    <nav
      className="menubar"
      role="menubar"
      aria-label="Menü çubuğu"
      onDoubleClick={() => {
        if (window.api.platform !== 'darwin') void window.api.winToggleMaximize();
      }}
    >
      <img className="menubar__logo" src="./FILE-app.png" alt="" draggable={false} />
      {items}
      <div className="menubar__trailing">
        <Clock />
        <WindowControls />
      </div>
    </nav>
  );
}