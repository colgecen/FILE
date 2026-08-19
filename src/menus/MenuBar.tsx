import { useCore } from '../layout/AppShell';
import { useFocusZone } from '../core/focus';
import { MenuPanel } from './MenuPanel';
import { menuModel, useMenuModelState } from './menuModel';

export function MenuBar(): React.JSX.Element {
  const state = useMenuModelState();
  const zone = useFocusZone();
  const { registry } = useCore();
  const menubarActive = zone === 'menubar';

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
    <nav className="menubar" role="menubar" aria-label="Menü çubuğu">
      {items}
    </nav>
  );
}