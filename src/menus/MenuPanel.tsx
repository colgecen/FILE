import { menuModel, selectableIndexOfItems, useMenuModelState } from './menuModel';

export function MenuPanel({ level = 0 }: { level?: number }): React.JSX.Element {
  const state = useMenuModelState();
  if (state.openTop === null) return <></>;
  const items = menuModel.currentItems();
  const openSubLevel = state.path[level];

  const children = items.map((item, realIndex) => {
    if (item.kind === 'separator') {
      return <div key={item.id} className="menu-panel__separator" role="separator" />;
    }
    const selectable = selectableIndexOfItems(items, realIndex);
    const active = state.activeItem === selectable;
    const className = ['menu-panel__item', active ? 'menu-panel__item--active' : '']
      .filter(Boolean)
      .join(' ');
    const rowClassName =
      item.kind === 'submenu' && openSubLevel === realIndex
        ? 'menu-panel__row menu-panel__row--open'
        : item.kind === 'submenu'
          ? 'menu-panel__row'
          : undefined;

    const row = (
      <div
        key={item.id}
        role="menuitem"
        className={className}
        data-active={active}
        onMouseEnter={() => {
          menuModel.setActiveItem(selectable);
          if (item.kind === 'submenu') {
            menuModel.moveRight();
          }
        }}
      >
        <span className="menu-panel__label">{item.label}</span>
        {item.kind === 'submenu' && (
          <span className="menu-panel__arrow" aria-hidden="true">›</span>
        )}
      </div>
    );

    if (rowClassName === undefined) return row;
    return (
      <div key={item.id} className={rowClassName}>
        {row}
        {openSubLevel === realIndex && <MenuPanel level={level + 1} />}
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