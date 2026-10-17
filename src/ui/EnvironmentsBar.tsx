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
        {environments.map((env) => {
          const browserEnv = env.id.startsWith('browser:');
          return (
            <span
              key={env.id}
              className={
                env.id === activeId ? 'env-bar__chip env-bar__chip--active' : 'env-bar__chip'
              }
            >
              <button
                type="button"
                title={browserEnv ? `${env.name} tarayıcısı (uygulama içi)` : env.rootPath}
                aria-label={browserEnv ? `Tarayıcı ortamı: ${env.name}` : `Ortam: ${env.name}`}
                aria-pressed={env.id === activeId}
                className="env-bar__name"
                onClick={() => void switchToEnvironment(env.id)}
              >
                {browserEnv && (
                  <span className="env-bar__globe" aria-hidden="true">
                    ⌾{' '}
                  </span>
                )}
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
          );
        })}
      </div>
    </div>
  );
}
