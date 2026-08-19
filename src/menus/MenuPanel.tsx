import { useMenuModelState, selectableIndexOfItems } from './menuModel';
import { menuModel } from './menuModel';

export function MenuPanel(): React.JSX.Element {
  const state = useMenuModelState();
  if (state.openTop === null) return <></>;
  const items = menuModel.currentItems();

  const children = items.map((item, realIndex) => {
    if (item.kind === 'separator') {
      return (
        <div key={item.id} className="menu-panel__separator" role="separator" />
      );
    }
    const selectable = selectableIndexOfItems(items, realIndex);
    const active = state.activeItem === selectable;
    const className = ['menu-panel__item', active ? 'menu-panel__item--active' : '']
      .filter(Boolean)
      .join(' ');
    return (
      <div
        key={item.id}
        role="menuitem"
        className={className}
        data-active={active}
        onMouseEnter={() => menuModel.setActiveItem(selectable)}
      >
        <span className="menu-panel__label">{item.label}</span>
        {item.kind === 'submenu' && <span className="menu-panel__arrow" aria-hidden="true">›</span>}
      </div>
    );
  });

  return (
    <div className="menu-panel" role="menu" aria-label="Alt menü">
      {children}
      {state.feedback !== null && (
        <div className="menu-panel__feedback" role="status">
          {state.feedback}
        </div>
      )}
    </div>
  );
}