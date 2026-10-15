import { addEnvironmentViaDialog, switchToEnvironment } from '../core/envCommands';
import { useEnvironmentsState } from '../core/environments';

export function EnvironmentsBar(): React.JSX.Element {
  const { environments, activeId } = useEnvironmentsState();

  return (
    <div className="env-bar" role="toolbar" aria-label="Proje ortamları">
      <div className="env-bar__list" aria-label="Ortam listesi">
        {environments.length === 0 && (
          <span className="env-bar__hint">Ortam yok</span>
        )}
        {environments.map((env) => (
          <button
            key={env.id}
            type="button"
            title={env.rootPath}
            aria-label={`Ortam: ${env.name}`}
            aria-pressed={env.id === activeId}
            className={
              env.id === activeId ? 'env-bar__chip env-bar__chip--active' : 'env-bar__chip'
            }
            onClick={() => void switchToEnvironment(env.id)}
          >
            {env.name}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="env-bar__add"
        title="Ortam Ekle"
        aria-label="Ortam Ekle"
        onClick={() => void addEnvironmentViaDialog()}
      >
        +
      </button>
    </div>
  );
}
