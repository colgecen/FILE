import { useEffect, useRef } from 'react';
import { useDirtyPaths } from '../core/dirty';
import { closeOpenedTab } from '../core/tabCommands';
import { tabsModel, useTabsState } from '../core/tabs';
import { runPaneClose, runPaneSplit } from '../core/paneCommands';
import {
  FileLogo,
  SplitHorizontalIcon,
  SplitVerticalIcon,
} from './icons';

export function TabBar(): React.JSX.Element {
  const { tabs, activeId } = useTabsState();
  const dirty = useDirtyPaths();
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (bar === null || activeId === null) return;
    const active = bar.querySelector('.tab-bar__item--active') as HTMLElement | null;
    if (active !== null && typeof active.scrollIntoView === 'function') {
      try {
        active.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
      } catch {
        // jsdom'da scrollIntoView desteklenmeyebilir — sessiz geç
      }
    }
  }, [activeId, tabs.length]);

  if (tabs.length === 0) {
    return (
      <div ref={barRef} className="tab-bar" role="tablist" aria-label="Açık sekmeler">
        <TabBarActions showClose={false} />
      </div>
    );
  }

  return (
    <div ref={barRef} className="tab-bar" role="tablist" aria-label="Açık sekmeler">
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
            onMouseDown={(event) => {
              if (event.button === 1) {
                event.preventDefault();
                closeOpenedTab(tab.id);
              }
            }}
            onDoubleClick={() => closeOpenedTab(tab.id)}
            onContextMenu={(event) => {
              event.preventDefault();
            }}
          >
            <span className="tab-bar__logo" aria-hidden="true">
              <FileLogo name={tab.file.name} />
            </span>
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
      <TabBarActions />
    </div>
  );
}

function TabBarActions({ showClose = true }: { showClose?: boolean }): React.JSX.Element {
  return (
    <div className="tab-bar__actions" role="toolbar" aria-label="Panel işlemleri">
      <button
        type="button"
        className="tab-bar__action"
        title="Dikey Böl"
        aria-label="Dikey Böl"
        onClick={() => runPaneSplit('vertical')}
      >
        <SplitVerticalIcon />
      </button>
      <button
        type="button"
        className="tab-bar__action"
        title="Yatay Böl"
        aria-label="Yatay Böl"
        onClick={() => runPaneSplit('horizontal')}
      >
        <SplitHorizontalIcon />
      </button>
      {showClose && (
        <button
          type="button"
          className="tab-bar__action"
          title="Panel Kapat"
          aria-label="Panel Kapat"
          onClick={() => runPaneClose()}
        >
          ×
        </button>
      )}
    </div>
  );
}
