import { useAIEngine } from '../ai/engine';
import { statusLabel } from '../ai/format';
import { modelName } from '../ai/models';
import { useCursorState } from '../core/cursor';
import { errorStore, useErrorStore } from '../core/errorStore';
import { dirOf, useGitBranch } from '../core/gitInfo';
import { useTabsState } from '../core/tabs';
import { useTelemetry } from '../core/telemetry';

export function StatusBar(): React.JSX.Element {
  const cursor = useCursorState();
  const { tabs, activeId } = useTabsState();
  const activeFile = tabs.find((tab) => tab.id === activeId)?.file ?? null;
  const gitBranch = useGitBranch(window.api, activeFile === null ? null : dirOf(activeFile.path));
  const telemetry = useTelemetry();
  const ai = useAIEngine();
  const errors = useErrorStore();

  const aiText =
    ai.modelId === null
      ? 'YZ: —'
      : `YZ: ${modelName(ai.modelId)} · ${statusLabel(ai.status)}${
          ai.progress !== null ? ` %${ai.progress.percent}` : ''
        }`;

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
          className={`status-bar__cell status-bar__ai status-bar__ai--${ai.status}`}
          data-testid="status-ai"
          data-status={ai.status}
        >
          {aiText}
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