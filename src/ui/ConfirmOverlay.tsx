import { useEffect } from 'react';

export function ConfirmOverlay({
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}): React.JSX.Element {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        onConfirm();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [onConfirm, onCancel]);

  return (
    <div className="confirm-overlay" role="alertdialog" aria-label={message}>
      <div className="confirm-overlay__panel">
        <p className="confirm-overlay__message">{message}</p>
        <p className="confirm-overlay__hint">
          Enter: {confirmLabel} · Esc: İptal
        </p>
      </div>
    </div>
  );
}