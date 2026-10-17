import { useEffect, useRef, useState } from 'react';
import { useEnvironmentsState } from '../core/environments';
import type { EmbeddedState } from '../../electron/preload/index';
import '../styles/browser.css';

function normalizeInput(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return 'about:blank';
  if (trimmed === 'about:blank') return trimmed;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return /^https?:/i.test(trimmed) ? trimmed : 'about:blank';
  }
  if (/\s/.test(trimmed)) return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
  return `https://${trimmed}`;
}

export function BrowserView(): React.JSX.Element {
  const { environments, activeId } = useEnvironmentsState();
  const [states, setStates] = useState<Record<string, EmbeddedState>>({});
  const [motorOk, setMotorOk] = useState(true);
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const browserEnvs = environments.filter((env) => env.id.startsWith('browser:'));
  const activeBrowser =
    activeId !== null && activeId.startsWith('browser:') ? browserEnvs.find((env) => env.id === activeId) ?? null : null;
  const ids = browserEnvs.map((env) => env.id).join(',');

  const knownRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    void window.api
      .browserActivate(null)
      .then(() => setMotorOk(true))
      .catch(() => setMotorOk(false));
  }, []);

  useEffect(() => {
    const current = new Set(ids.length === 0 ? [] : ids.split(','));
    for (const id of knownRef.current) {
      if (!current.has(id)) void window.api.browserRemove(id);
    }
    for (const id of current) {
      if (!knownRef.current.has(id)) void window.api.browserAdd(id);
    }
    knownRef.current = current;
  }, [ids]);

  useEffect(() => {
    void window.api.browserActivate(activeId !== null && activeId.startsWith('browser:') ? activeId : null);
  }, [activeId]);

  useEffect(() => () => void window.api.browserActivate(null), []);

  useEffect(() => {
    return window.api.onBrowserState((state: EmbeddedState) => {
      setStates((current) => ({ ...current, [state.envId]: state }));
    });
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;
    const send = (): void => {
      const rect = host.getBoundingClientRect();
      void window.api.browserLayout({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
    };
    send();
    const observer = new ResizeObserver(send);
    observer.observe(host);
    window.addEventListener('resize', send);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', send);
    };
  }, [activeBrowser?.id]);

  useEffect(() => {
    if (activeBrowser === null) return;
    void window.api.browserState(activeBrowser.id).then((state: EmbeddedState | null) => {
      if (state !== null) setStates((current) => ({ ...current, [state.envId]: state }));
    });
  }, [activeBrowser?.id]);

  const state = activeBrowser !== null ? states[activeBrowser.id] : undefined;
  const shown = activeBrowser !== null ? (editing?.id === activeBrowser.id ? editing.value : state?.url ?? '') : '';

  const submit = (): void => {
    if (activeBrowser === null) return;
    void window.api.browserNavigate(activeBrowser.id, normalizeInput(editing?.value ?? ''));
    setEditing(null);
  };

  return (
    <div className="browser-view">
      <div className="browser-view__bar" role="toolbar" aria-label="Tarayıcı araç çubuğu">
        <button
          type="button"
          className="browser-view__nav"
          title="Geri"
          aria-label="Geri"
          disabled={state !== undefined && !state.canGoBack}
          onClick={() => activeBrowser !== null && void window.api.browserBack(activeBrowser.id)}
        >
          ‹
        </button>
        <button
          type="button"
          className="browser-view__nav"
          title="İleri"
          aria-label="İleri"
          disabled={state !== undefined && !state.canGoForward}
          onClick={() => activeBrowser !== null && void window.api.browserForward(activeBrowser.id)}
        >
          ›
        </button>
        <button
          type="button"
          className="browser-view__nav"
          title="Yenile"
          aria-label="Yenile"
          onClick={() => activeBrowser !== null && void window.api.browserReload(activeBrowser.id)}
        >
          ⟳
        </button>
        <input
          className="browser-view__address"
          value={shown}
          placeholder="Adres veya arama (Enter)"
          spellCheck={false}
          onFocus={() => activeBrowser !== null && setEditing({ id: activeBrowser.id, value: state?.url ?? '' })}
          onBlur={() => setEditing(null)}
          onChange={(event) => activeBrowser !== null && setEditing({ id: activeBrowser.id, value: event.target.value })}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === 'Enter') submit();
            else if (event.key === 'Escape') (event.target as HTMLInputElement).blur();
          }}
        />
        {state !== undefined && state.title.length > 0 && (
          <span className="browser-view__title" title={state.title}>
            {state.title}
          </span>
        )}
        <button
          type="button"
          className="browser-view__nav"
          title="Sistem tarayıcısında aç"
          aria-label="Sistem tarayıcısında aç"
          onClick={() => state !== undefined && void window.api.browserOpenExternal(state.url)}
        >
          ↗
        </button>
      </div>
      {!motorOk && (
        <div className="browser-view__offline" role="status">
          Tarayıcı motoru bağlı değil — uygulamayı tamamen kapatıp yeniden başlat (npm run dev).
        </div>
      )}
      <div className="browser-view__page" ref={hostRef} />
    </div>
  );
}
