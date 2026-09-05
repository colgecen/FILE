import { useDirtyPaths } from '../core/dirty';
import { closeOpenedTab } from '../core/tabCommands';
import { tabsModel, useTabsState } from '../core/tabs';

export function TabBar(): React.JSX.Element {
  const { tabs, activeId } = useTabsState();
  const dirty = useDirtyPaths();

  return (
    <div className="tab-bar" role="tablist" aria-label="Açık sekmeler">
      {tabs.map((tab) => {
        const isDirty = dirty.has(tab.file.path);
        const tooltip = isDirty ? `${tab.file.path} • Kaydedilmedi` : tab.file.path;
        return (
          <div
            key={tab.id}
            className={
              tab.id === activeId ? 'tab-bar__item tab-bar__item--active' : 'tab-bar__item'
            }
            role="tab"
            title={tooltip}
            aria-label={tooltip}
          >
            <button
              className="tab-bar__select"
              type="button"
              title={tooltip}
              onClick={() => tabsModel.activate(tab.id)}
            >
              {tab.file.name}
            </button>
            {isDirty && (
              <span className="tab-bar__dirty" title="Kaydedilmedi">
                ●
              </span>
            )}
            <button
              className="tab-bar__close"
              type="button"
              aria-label={`Sekmeyi kapat: ${tab.file.name}`}
              onClick={() => closeOpenedTab(tab.id)}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
