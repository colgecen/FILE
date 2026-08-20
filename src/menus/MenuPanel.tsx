import { useCore } from '../layout/AppShell';
import { recentFiles } from '../core/recentFiles';
import { menuModel, selectableIndexOfItems, useMenuModelState } from './menuModel';

export function MenuPanel({ level = 0 }: { level?: number }): React.JSX.Element {
  const state = useMenuModelState();
  const { registry } = useCore();
  if (state.openTop === null) return <></>;
  let items = menuModel.itemsAt(state.path.slice(0, level));
  if (level === 1 && state.path[0] !== undefined) {
    const topItem = menuModel.itemsAt([])[state.path[0]];
    if (topItem?.kind === 'submenu' && topItem.id === 'file.open.recent') {
      const recent = recentFiles.list().slice(0, 5);
      if (recent.length > 0) {
        items = recent.map((entry, index) => ({
          kind: 'command' as const,
          id: `file.open.recent.item.${index}`,
          commandId: `file.open.recent.${index}`,
          label: entry.name,
        }));
      }
    }
  }
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
        {item.commandId !== undefined && registry.get(item.commandId)?.placeholder === true && (
          <span className="menu-panel__soon">Yakında</span>
        )}
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