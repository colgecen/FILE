import { useEffect, useMemo, useRef, useState } from 'react';
import { useExplorerState, explorerModel } from '../core/explorer';
import { focusManager } from '../core/focus';
import { gitModel, useGitPanelState } from '../core/gitModel';
import { useCore } from '../layout/AppShell';
import { ChevronDownIcon, ChevronRightIcon, FileLogo, FolderIcon } from './icons';
import { fileContentCache } from '../core/fileCache';
import { uiText } from '../core/uiLanguage';

function badgeClass(status: string): string {
  if (status === 'M') return 'explorer-row__badge explorer-row__badge--modified';
  if (status === 'A') return 'explorer-row__badge explorer-row__badge--added';
  if (status === 'U' || status === '!') return 'explorer-row__badge explorer-row__badge--conflict';
  return 'explorer-row__badge';
}

const ROW_HEIGHT = 27;
const OVERSCAN = 10;
const FALLBACK_VIEWPORT_HEIGHT = 640;

export function ExplorerView(): React.JSX.Element | null {
  const state = useExplorerState();
  const git = useGitPanelState();
  const { registry } = useCore();
  const bodyRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(FALLBACK_VIEWPORT_HEIGHT);

  useEffect(() => {
    if (state.rootPath === null) return;
    const api = window.api as unknown as Record<string, unknown>;
    if (typeof api.gitStatus !== 'function') return;
    void gitModel.loadStatus(window.api, state.rootPath);
  }, [state.rootPath]);

  const badges = useMemo(() => {
    const map = new Map<string, string>();
    if (state.rootPath === null) return map;
    const root = state.rootPath.replace(/\/+$/, '');
    for (const file of git.files) {
      map.set(`${root}/${file.path}`, file.status);
    }
    return map;
  }, [state.rootPath, git.files]);

  const rows = useMemo(() => explorerModel.rows(), [state.files, state.expanded]);

  useEffect(() => {
    const body = bodyRef.current;
    if (body === null) return;
    const measure = (): void => setViewportHeight(body.clientHeight || FALLBACK_VIEWPORT_HEIGHT);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(body);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const body = bodyRef.current;
    if (body === null || body.clientHeight === 0) return;
    const index = rows.findIndex((row) => row.path === state.selectedPath);
    if (index < 0) return;
    const top = index * ROW_HEIGHT;
    const bottom = top + ROW_HEIGHT;
    if (top < body.scrollTop) body.scrollTop = top;
    else if (bottom > body.scrollTop + body.clientHeight) body.scrollTop = bottom - body.clientHeight;
  }, [rows, state.selectedPath]);

  if (!state.isOpen) return null;

  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const end = Math.min(rows.length, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN);
  const visibleRows = rows.slice(start, end);

  return (
    <aside className="explorer-view" role="region" aria-label="Dosya gezgini">
      <div className="explorer-view__head">
        <span className="explorer-view__title">{uiText('Dosyalar', 'Files')}</span>
      </div>
      <div
        ref={bodyRef}
        className="explorer-view__body"
        role="listbox"
        aria-label="Dosya listesi"
        onScroll={(event) => {
          const next = event.currentTarget.scrollTop;
          setScrollTop((current) => (Math.abs(current - next) < 1 ? current : next));
        }}
      >
        {state.loading && (
          <div className="explorer-view__loading" role="status">
            {uiText('YÜKLENİYOR…', 'LOADING…')}
          </div>
        )}
        <div className="explorer-view__rows" style={{ height: rows.length * ROW_HEIGHT }}>
          {visibleRows.map((row, index) => {
            const active = row.path === state.selectedPath;
            const className = ['explorer-row', `explorer-row--depth-${row.depth}`]
              .concat(active ? ['explorer-row--active'] : [])
              .join(' ');
            return (
              <div
                key={row.path}
                role="option"
                aria-selected={active}
                className={className}
                style={{
                  position: 'absolute',
                  top: (start + index) * ROW_HEIGHT,
                  left: 0,
                  right: 0,
                  height: ROW_HEIGHT,
                  boxSizing: 'border-box',
                }}
                onMouseEnter={() => {
                  if (row.kind === 'file') fileContentCache.prefetch(window.api, row.path);
                }}
                onClick={() => {
                  explorerModel.select(row.path);
                  focusManager.set('explorer');
                  void registry.run('explorer.activate');
                }}
              >
                <span className="explorer-row__state" aria-hidden="true">
                  {row.kind === 'directory' ? (
                    row.expanded ? (
                      <ChevronDownIcon />
                    ) : (
                      <ChevronRightIcon />
                    )
                  ) : null}
                </span>
                {row.kind === 'directory' ? (
                  <span className="explorer-row__icon explorer-row__icon--dir" aria-hidden="true">
                    <FolderIcon open={row.expanded} />
                  </span>
                ) : (
                  <span className="explorer-row__icon explorer-row__logo" aria-hidden="true">
                    <FileLogo name={row.name} />
                  </span>
                )}
                <span className="explorer-row__name">{row.name}</span>
                {badges.get(row.path) !== undefined && (
                  <span className={badgeClass(badges.get(row.path) as string)} aria-label={`Git durumu ${badges.get(row.path)}`}>
                    {badges.get(row.path)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {state.error !== null && (
          <div className="explorer-view__error" role="alert">
            {state.error}
          </div>
        )}
      </div>
    </aside>
  );
}