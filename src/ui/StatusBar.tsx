import { useCursorState } from '../core/cursor';
import { useTabsState } from '../core/tabs';

export function StatusBar(): React.JSX.Element {
  const cursor = useCursorState();
  const { tabs, activeId } = useTabsState();
  const activeFile = tabs.find((tab) => tab.id === activeId)?.file ?? null;

  return (
    <footer className="status-bar" aria-label="Durum çubuğu">
      <div className="status-bar__group">
        <span className="status-bar__cell status-bar__file" data-testid="status-file">
          {activeFile?.name ?? 'Dosya Yok'}
        </span>
      </div>
      <div className="status-bar__group">
        <span className="status-bar__cell status-bar__position" data-testid="status-position">
          {cursor.path === null ? '1:1' : `${cursor.line}:${cursor.column}`}
        </span>
      </div>
    </footer>
  );
}