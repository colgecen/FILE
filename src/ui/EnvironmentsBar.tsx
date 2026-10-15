import { removeEnvironment, switchToEnvironment } from '../core/envCommands';
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
          <span
            key={env.id}
            className={
              env.id === activeId ? 'env-bar__chip env-bar__chip--active' : 'env-bar__chip'
            }
          >
            <button
              type="button"
              title={env.rootPath}
              aria-label={`Ortam: ${env.name}`}
              aria-pressed={env.id === activeId}
              className="env-bar__name"
              onClick={() => void switchToEnvironment(env.id)}
            >
              {env.name}
            </button>
            <button
              type="button"
              title="Ortamı Kapat"
              aria-label={`Ortamı kapat: ${env.name}`}
              className="env-bar__close"
              onClick={() => void removeEnvironment(env.id)}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
