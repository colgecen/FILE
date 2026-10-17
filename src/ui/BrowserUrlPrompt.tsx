import { useEffect, useRef, useState } from 'react';
import { browserUrlPromptModel, useBrowserUrlPrompt } from '../core/browserUrlPrompt';

export function BrowserUrlPrompt(): React.JSX.Element | null {
  const request = useBrowserUrlPrompt();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('https://');

  useEffect(() => {
    if (request !== null) {
      setValue(request.value);
      window.setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [request]);

  if (request === null) return null;
  const submit = (): void => {
    if (value.trim().length === 0) return;
    request.onSubmit(value);
  };
  return (
    <div className="confirm-overlay" role="dialog" aria-label={request.label}>
      <div className="confirm-overlay__panel holo-panel">
        <p className="confirm-overlay__message">{request.label} — adres gir (https://… veya site alanı)</p>
        <input
          ref={inputRef}
          className="url-prompt__input"
          value={value}
          spellCheck={false}
          autoFocus
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === 'Enter') submit();
            else if (event.key === 'Escape') browserUrlPromptModel.close();
          }}
        />
        <p className="confirm-overlay__hint">Enter: Aç · Esc: İptal · adres ortamda hatırlanır</p>
      </div>
    </div>
  );
}
