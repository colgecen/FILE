import { useExplorerState } from '../core/explorer';

export function ExplorerView(): React.JSX.Element | null {
  const state = useExplorerState();

  if (!state.isOpen) return null;

  return (
    <aside className="explorer-view" role="region" aria-label="Dosya gezgini">
      <header className="explorer-view__header">GEZGİN</header>
      <div className="explorer-view__body">{/* Dosya ağacı Faz 5'te gelir */}</div>
    </aside>
  );
}