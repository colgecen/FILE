import { useExplorerState, explorerModel } from '../core/explorer';

export function ExplorerView(): React.JSX.Element | null {
  const state = useExplorerState();

  if (!state.isOpen) return null;

  return (
    <aside className="explorer-view" role="region" aria-label="Dosya gezgini">
      <header className="explorer-view__header">GEZGİN</header>
      <div className="explorer-view__body" role="listbox" aria-label="Dosya listesi">
        {state.loading && (
          <div className="explorer-view__loading" role="status">
            YÜKLENİYOR…
          </div>
        )}
        {explorerModel.rows().map((row) => {
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