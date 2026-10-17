import { openBrowserEnvironment, openBrowserEnvironmentWithUrl, removeEnvironment, switchToEnvironment } from '../core/envCommands';
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
                title={browserEnv ? 'Tıkla: aç · sağ tık: adrese aç' : env.rootPath}
                aria-label={browserEnv ? `Tarayıcı ortamı: ${env.name}` : `Ortam: ${env.name}`}
                aria-pressed={env.id === activeId}
                className="env-bar__name"
                onClick={() =>
                  browserEnv
                    ? void openBrowserEnvironment(env.id.slice('browser:'.length) as never)
                    : void switchToEnvironment(env.id)
                }
                onContextMenu={(event) => {
                  if (!browserEnv) return;
                  event.preventDefault();
                  void openBrowserEnvironmentWithUrl(env.id.slice('browser:'.length) as never);
                }}
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
