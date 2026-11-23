import { exitController } from '../core/exit';

export function WindowControls(): React.JSX.Element | null {
  if (window.api.platform === 'darwin') return null;
  return (
    <div className="traffic-lights" data-testid="traffic-lights">
      <button
        type="button"
        className="traffic traffic--min"
        title="Küçült"
        aria-label="Küçült"
        onClick={() => void window.api.winMinimize()}
      />
      <button
        type="button"
        className="traffic traffic--max"
        title="Ekranı Doldur"
        aria-label="Ekranı Doldur"
        onClick={() => void window.api.winToggleMaximize()}
      />
      <button
        type="button"
        className="traffic traffic--close"
        title="Pencereyi Kapat"
        aria-label="Pencereyi Kapat"
        onClick={() => exitController.request()}
      />
    </div>
  );
}
