import { useTabsState } from '../core/tabs';

function segmentsOf(path: string): readonly string[] {
  const parts = path.split('/').filter((part) => part.length > 0);
  return parts.slice(-3);
}

export function Breadcrumb(): React.JSX.Element | null {
  const { tabs, activeId } = useTabsState();
  const activeFile = tabs.find((tab) => tab.id === activeId)?.file ?? null;
  if (activeFile === null) return null;
  const crumbs = segmentsOf(activeFile.path);

  return (
    <nav className="breadcrumb" aria-label="Dosya yolu">
      {crumbs.map((crumb, index) => (
        <span key={`${crumb}-${index}`} className="breadcrumb__crumb">
          {index > 0 && (
            <span className="breadcrumb__sep" aria-hidden="true">
              ›
            </span>
          )}
          <span
            className={
              index === crumbs.length - 1 ? 'breadcrumb__item breadcrumb__item--active' : 'breadcrumb__item'
            }
          >
            {crumb}
          </span>
        </span>
      ))}
    </nav>
  );
}
