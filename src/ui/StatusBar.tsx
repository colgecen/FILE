import { useCursorState } from '../core/cursor';
import { dirOf, useGitBranch } from '../core/gitInfo';
import { useTabsState } from '../core/tabs';

export function StatusBar(): React.JSX.Element {
  const cursor = useCursorState();
  const { tabs, activeId } = useTabsState();
  const activeFile = tabs.find((tab) => tab.id === activeId)?.file ?? null;
  const gitBranch = useGitBranch(window.api, activeFile === null ? null : dirOf(activeFile.path));

  return (
    <footer className="status-bar" aria-label="Durum çubuğu">
      <div className="status-bar__group">
        <span className="status-bar__cell status-bar__file" data-testid="status-file">
          {activeFile?.name ?? 'Dosya Yok'}
        </span>
        {gitBranch !== null && (
          <span className="status-bar__cell status-bar__branch" data-testid="status-branch">
            {gitBranch.dirty ? '* ' : ''}
            {gitBranch.name}
          </span>
        )}
      </div>
      <div className="status-bar__group">
        <span className="status-bar__cell status-bar__position" data-testid="status-position">
          {cursor.path === null ? '1:1' : `${cursor.line}:${cursor.column}`}
        </span>
      </div>
    </footer>
  );
}