import { useEffect, useRef } from 'react';
import { useDirtyPaths } from '../core/dirty';
import { closeOpenedTab } from '../core/tabCommands';
import { tabsModel, useTabsState } from '../core/tabs';

function iconForFile(name: string): { label: string; variant: string } {
  const dot = name.lastIndexOf('.');
  const ext = dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
  if (ext === 'ts' || ext === 'tsx') return { label: 'TS', variant: 'tab-bar__icon--accent' };
  if (ext === 'js' || ext === 'jsx' || ext === 'mjs' || ext === 'cjs')
    return { label: 'JS', variant: 'tab-bar__icon--soft' };
  if (ext === 'json') return { label: 'JSON', variant: 'tab-bar__icon--soft' };
  if (ext === 'css') return { label: 'CSS', variant: 'tab-bar__icon--soft' };
  if (ext === 'html') return { label: 'HTML', variant: 'tab-bar__icon--soft' };
  if (ext === 'md' || ext === 'markdown') return { label: 'MD', variant: '' };
  if (ext.length <= 4 && ext.length > 0) return { label: ext.toUpperCase(), variant: '' };
  return { label: 'TXT', variant: '' };
}

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

  return (
    <div ref={barRef} className="tab-bar" role="tablist" aria-label="Açık sekmeler">
      {tabs.map((tab) => {
        const isDirty = dirty.has(tab.file.path);
        const tooltip = isDirty ? `${tab.file.path} • Kaydedilmedi` : tab.file.path;
        const icon = iconForFile(tab.file.name);
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
            <span className={`tab-bar__icon ${icon.variant}`.trim()} aria-hidden="true">
              {icon.label}
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
    </div>
  );
}
