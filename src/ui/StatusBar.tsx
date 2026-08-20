import { useAIStatus } from '../core/aiStatus';
import { useCursorState } from '../core/cursor';
import { errorStore, useErrorStore } from '../core/errorStore';
import { dirOf, useGitBranch } from '../core/gitInfo';
import { useTabsState } from '../core/tabs';
import { useTelemetry } from '../core/telemetry';
import type { AIStatus } from '../core/types';

const AI_LABELS: Record<AIStatus, string> = {
  idle: 'IDLE',
  computing: 'COMPUTING',
  error: 'HATA',
};

export function StatusBar(): React.JSX.Element {
  const cursor = useCursorState();
  const { tabs, activeId } = useTabsState();
  const activeFile = tabs.find((tab) => tab.id === activeId)?.file ?? null;
  const gitBranch = useGitBranch(window.api, activeFile === null ? null : dirOf(activeFile.path));
  const telemetry = useTelemetry();
  const aiStatus = useAIStatus();
  const errors = useErrorStore();

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
        {telemetry !== null && (
          <span className="status-bar__cell status-bar__metrics" data-testid="status-metrics">
            CPU %{telemetry.cpuPercent.toFixed(0)} ·{' '}
            {(telemetry.memUsedMb / 1024).toFixed(1)}GB/{(telemetry.memTotalMb / 1024).toFixed(1)}GB
          </span>
        )}
        <span
          className={`status-bar__cell status-bar__ai status-bar__ai--${aiStatus}`}
          data-testid="status-ai"
        >
          {AI_LABELS[aiStatus]}
        </span>
        <span className="status-bar__cell status-bar__position" data-testid="status-position">
          {cursor.path === null ? '1:1' : `${cursor.line}:${cursor.column}`}
        </span>
        {errors.length > 0 && (
          <button
            type="button"
            className="status-bar__cell status-bar__badge status-bar__badge--error"
            data-testid="status-errors"
            onClick={() => errorStore.clear()}
          >
            {errors.length} hata
          </button>
        )}
      </div>
    </footer>
  );
}