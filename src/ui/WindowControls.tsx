import { exitController } from '../core/exit';

export function WindowControls(): React.JSX.Element | null {
  if (window.api.platform === 'darwin') return null;
  return (
    <div className="traffic-lights" data-testid="traffic-lights">
      <button
        type="button"
        className="traffic traffic--min"
        aria-label="Küçült"
        onClick={() => void window.api.winMinimize()}
      >
        <span className="traffic__badge" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="traffic traffic--max"
        aria-label="Ekranı Doldur"
        onClick={() => void window.api.winToggleMaximize()}
      >
        <span className="traffic__badge" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="traffic traffic--close"
        aria-label="Pencereyi Kapat"
        onClick={() => exitController.request()}
      >
        <span className="traffic__badge" aria-hidden="true" />
      </button>
    </div>
  );
}
