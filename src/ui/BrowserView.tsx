import { useEffect, useRef, useState } from 'react';
import { useEnvironmentsState } from '../core/environments';
import '../styles/browser.css';

type WebviewLike = {
  src: string;
  loadURL(url: string): void;
  goBack(): void;
  goForward(): void;
  reload(): void;
  stop(): void;
  getURL(): string;
};

type NavState = {
  url: string;
  title: string;
};

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
  const poolRef = useRef<HTMLDivElement>(null);
  const webviews = useRef(new Map<string, HTMLElement>());
  const [nav, setNav] = useState<Record<string, NavState>>({});
  const [editing, setEditing] = useState<Record<string, string>>({});
  const activeEnv = environments.find((env) => env.id === activeId) ?? null;
  const browserEnvs = environments.filter((env) => env.id.startsWith('browser:'));

  useEffect(() => {
    const pool = poolRef.current;
    if (pool === null) return;
    const disposers = new Map(webviews.current);
    const alive = new Set(browserEnvs.map((env) => env.id));
    for (const [id, el] of webviews.current) {
      if (!alive.has(id)) {
        el.remove();
        webviews.current.delete(id);
      }
    }
    for (const env of browserEnvs) {
      if (disposers.has(env.id)) continue;
      const wv = document.createElement('webview') as HTMLElement;
      const api = wv as unknown as WebviewLike;
      wv.setAttribute('partition', `persist:${env.id}`);
      wv.setAttribute('allowpopups', '');
      api.src = 'about:blank';
      const onTitle = (event: Event): void => {
        const title = (event as Event & { title?: string }).title ?? '';
        setNav((current) => ({ ...current, [env.id]: { url: api.getURL(), title } }));
      };
      const onUrl = (): void => {
        let url = 'about:blank';
        try {
          url = api.getURL();
        } catch {
          // webview henüz hazır değil
        }
        setNav((current) => ({ ...current, [env.id]: { url, title: current[env.id]?.title ?? '' } }));
      };
      const onNewWindow = (event: Event): void => {
        event.preventDefault();
        const target = (event as Event & { url?: string }).url;
        if (target !== undefined) api.loadURL(target);
      };
      wv.addEventListener('page-title-updated', onTitle);
      wv.addEventListener('did-navigate', onUrl);
      wv.addEventListener('did-navigate-in-page', onUrl);
      wv.addEventListener('new-window', onNewWindow);
      pool.appendChild(wv);
      webviews.current.set(env.id, wv);
    }
  }, [browserEnvs]);

  const activeBrowser = activeEnv !== null && activeEnv.id.startsWith('browser:') ? activeEnv : null;
  const activeWebview =
    activeBrowser !== null ? (webviews.current.get(activeBrowser.id) as unknown as WebviewLike | undefined) : undefined;
  const shown = activeBrowser !== null ? (editing[activeBrowser.id] ?? nav[activeBrowser.id]?.url ?? '') : '';

  const navigate = (): void => {
    if (activeBrowser === null || activeWebview === undefined) return;
    activeWebview.loadURL(normalizeInput(editing[activeBrowser.id] ?? ''));
    setEditing((current) => ({ ...current, [activeBrowser.id]: '' }));
  };

  const call = (fn: (wv: WebviewLike) => void): void => {
    if (activeWebview !== undefined) fn(activeWebview);
  };

  return (
    <div className="browser-view">
      <div className="browser-view__bar" role="toolbar" aria-label="Tarayıcı araç çubuğu">
        <button type="button" className="browser-view__nav" title="Geri" aria-label="Geri" onClick={() => call((wv) => wv.goBack())}>
          ‹
        </button>
        <button type="button" className="browser-view__nav" title="İleri" aria-label="İleri" onClick={() => call((wv) => wv.goForward())}>
          ›
        </button>
        <button type="button" className="browser-view__nav" title="Yenile" aria-label="Yenile" onClick={() => call((wv) => wv.reload())}>
          ⟳
        </button>
        <input
          className="browser-view__address"
          value={shown}
          placeholder="Adres veya arama (Enter)"
          spellCheck={false}
          onFocus={() => {
            if (activeBrowser !== null) setEditing((c) => ({ ...c, [activeBrowser.id]: nav[activeBrowser.id]?.url ?? '' }));
          }}
          onBlur={() => {
            if (activeBrowser !== null) setEditing((c) => ({ ...c, [activeBrowser.id]: '' }));
          }}
          onChange={(event) => {
            if (activeBrowser !== null) setEditing((c) => ({ ...c, [activeBrowser.id]: event.target.value }));
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === 'Enter') navigate();
            else if (event.key === 'Escape') (event.target as HTMLInputElement).blur();
          }}
        />
        <button
          type="button"
          className="browser-view__nav"
          title="Harici tarayıcıda aç"
          aria-label="Harici tarayıcıda aç"
          onClick={() => {
            const url = nav[activeBrowser?.id ?? '']?.url ?? '';
            if (url.length > 0 && !url.startsWith('about:')) void window.api.openInBrowser(url);
          }}
        >
          ↗
        </button>
      </div>
      <div className="browser-view__pages" ref={poolRef} />
    </div>
  );
}
