import { useAIEngine } from '../ai/engine';
import { statusLabel } from '../ai/format';
import { modelName } from '../ai/models';
import { useGitPanelState } from '../core/gitModel';
import { useTelemetry } from '../core/telemetry';
import { useTerminalOpen } from '../core/terminalModel';

export function ModulesPanel(): React.JSX.Element {
  const ai = useAIEngine();
  const telemetry = useTelemetry();
  const terminalOpen = useTerminalOpen();
  const git = useGitPanelState();

  const rows: ReadonlyArray<{ readonly label: string; readonly value: string; readonly live: boolean }> = [
    {
      label: 'YZ Motoru',
      value: ai.modelId === null ? 'Yok' : `${modelName(ai.modelId)} ${statusLabel(ai.status)}`,
      live: ai.status === 'computing' || ai.status === 'loading',
    },
    {
      label: 'Sistem',
      value:
        telemetry === null
          ? '—'
          : `CPU %${telemetry.cpuPercent.toFixed(0)} · ${(telemetry.memUsedMb / 1024).toFixed(1)}GB`,
      live: false,
    },
    { label: 'Terminal', value: terminalOpen ? 'Açık' : 'Kapalı', live: terminalOpen },
    {
      label: 'Git',
      value: git.branch === null ? '—' : `${git.dirty ? '* ' : ''}${git.branch}`,
      live: git.dirty,
    },
  ];

  return (
    <section className="modules-panel" aria-label="Modüller">
      <header className="modules-panel__header">Modüller</header>
      <ul className="modules-panel__list">
        {rows.map((row) => (
          <li key={row.label} className="modules-panel__row">
            <span className="modules-panel__label">{row.label}</span>
            <span
              className={
                row.live ? 'modules-panel__value modules-panel__value--live' : 'modules-panel__value'
              }
            >
              [{row.value}]
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
