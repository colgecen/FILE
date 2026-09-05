import { perfModel, usePerfState } from '../core/perfModel';
import { focusManager } from '../core/focus';

export function PerfSettings(): React.JSX.Element {
  const perf = usePerfState();
  return (
    <div className="perf-panel" role="region" aria-label="Performans ayarları">
      <div className="perf-panel__header">PERFORMANS</div>
      <label className="perf-panel__row">
        <input
          type="checkbox"
          checked={perf.telemetry}
          onChange={(event) => perfModel.set({ telemetry: event.target.checked })}
        />
        <span>Telemetri (CPU/RAM)</span>
      </label>
      <label className="perf-panel__row">
        <input
          type="checkbox"
          checked={perf.explorerVirtual}
          onChange={(event) => perfModel.set({ explorerVirtual: event.target.checked })}
        />
        <span>Gezgin sanal liste</span>
      </label>
      <label className="perf-panel__row">
        <span>Model limiti</span>
        <select
          value={perf.modelLimit}
          onChange={(event) => perfModel.set({ modelLimit: Number(event.target.value) })}
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </label>
      <label className="perf-panel__row">
        <input
          type="checkbox"
          checked={perf.aiLazy}
          onChange={(event) => perfModel.set({ aiLazy: event.target.checked })}
        />
        <span>AI lazy load</span>
      </label>
      <label className="perf-panel__row">
        <input
          type="checkbox"
          checked={perf.reducedMotion}
          onChange={(event) => perfModel.set({ reducedMotion: event.target.checked })}
        />
        <span>Animasyon azalt</span>
      </label>
      <button type="button" className="perf-panel__close" onClick={() => focusManager.set('editor')}>
        Kapat
      </button>
    </div>
  );
}
