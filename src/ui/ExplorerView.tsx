import { useEffect, useMemo } from 'react';
import { perfModel } from '../core/perfModel';
import { useExplorerState, explorerModel } from '../core/explorer';
import { gitModel, useGitPanelState } from '../core/gitModel';

function badgeClass(status: string): string {
  if (status === 'M') return 'explorer-row__badge explorer-row__badge--modified';
  if (status === 'A') return 'explorer-row__badge explorer-row__badge--added';
  if (status === 'U' || status === '!') return 'explorer-row__badge explorer-row__badge--conflict';
  return 'explorer-row__badge';
}

export function ExplorerView(): React.JSX.Element | null {
  const state = useExplorerState();
  const git = useGitPanelState();

  useEffect(() => {
    if (state.rootPath === null) return;
    const api = window.api as unknown as Record<string, unknown>;
    if (typeof api.gitStatus !== 'function') return;
    void gitModel.loadStatus(window.api, state.rootPath);
  }, [state.rootPath]);

  const badges = useMemo(() => {
    const map = new Map<string, string>();
    if (state.rootPath === null) return map;
    const root = state.rootPath.replace(/\/+$/, '');
    for (const file of git.files) {
      map.set(`${root}/${file.path}`, file.status);
    }
    return map;
  }, [state.rootPath, git.files]);

  if (!state.isOpen) return null;

  const allRows = explorerModel.rows();
  const rows = perfModel.getState().explorerVirtual ? allRows.slice(0, 80) : allRows;

  return (
    <aside className="explorer-view" role="region" aria-label="Dosya gezgini">
      <header className="explorer-view__header">Sekmeler & Projeler</header>
      <div className="explorer-view__body" role="listbox" aria-label="Dosya listesi">
        {state.loading && (
          <div className="explorer-view__loading" role="status">
            YÜKLENİYOR…
          </div>
        )}
        {rows.map((row) => {
          const active = row.path === state.selectedPath;
          const className = ['explorer-row', `explorer-row--depth-${row.depth}`]
            .concat(active ? ['explorer-row--active'] : [])
            .join(' ');
          return (
            <div
              key={row.path}
              role="option"
              aria-selected={active}
              className={className}
            >
              <span className="explorer-row__state" aria-hidden="true">
                {row.kind === 'directory' ? (row.expanded ? '▾' : '▸') : ''}
              </span>
              <span
                className={[
                  'explorer-row__icon',
                  row.kind === 'directory' ? 'explorer-row__icon--dir' : 'explorer-row__icon--file',
                ].join(' ')}
              >
                {row.kind === 'directory' ? '▣' : '◦'}
              </span>
              <span className="explorer-row__name">{row.name}</span>
              {badges.get(row.path) !== undefined && (
                <span className={badgeClass(badges.get(row.path) as string)} aria-label={`Git durumu ${badges.get(row.path)}`}>
                  {badges.get(row.path)}
                </span>
              )}
            </div>
          );
        })}
        {state.error !== null && (
          <div className="explorer-view__error" role="alert">
            {state.error}
          </div>
        )}
      </div>
    </aside>
  );
}