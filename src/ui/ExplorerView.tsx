import { useEffect, useMemo, useRef, useState } from 'react';
import { useExplorerState, explorerModel, type ExplorerRow } from '../core/explorer';
import { focusManager } from '../core/focus';
import { gitModel, useGitPanelState } from '../core/gitModel';
import { useCore } from '../layout/AppShell';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CollapseAllIcon,
  FileLogo,
  FolderIcon,
  NewFileIcon,
  NewFolderIcon,
  RefreshIcon,
} from './icons';
import { fileContentCache } from '../core/fileCache';
import { fileWarmup } from '../core/fileWarmup';
import { mediaKindForPath } from '../core/media';
import { uiText } from '../core/uiLanguage';

/** Dosyayı oku ve hazır olduğunda editör modelini boşta kur. */
function prefetchFile(path: string): void {
  if (mediaKindForPath(path) !== null) return;
  void fileContentCache
    .read(window.api, path)
    .then((file) => {
      if (file !== null && (file.kind ?? 'text') === 'text') fileWarmup.request(path);
    })
    .catch(() => null);
}

function parentPathOf(path: string): string | null {
  const slash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  if (slash <= 0) return null;
  return path.slice(0, slash);
}

function badgeClass(status: string): string {
  if (status === 'M') return 'explorer-row__badge explorer-row__badge--modified';
  if (status === 'A') return 'explorer-row__badge explorer-row__badge--added';
  if (status === 'U' || status === '!') return 'explorer-row__badge explorer-row__badge--conflict';
  return 'explorer-row__badge';
}

const DRAFT_PATH = '\u0000explorer-draft';
const ROW_HEIGHT = 27;
const OVERSCAN = 10;
const FALLBACK_VIEWPORT_HEIGHT = 640;

type Draft = {
  readonly parentPath: string;
  readonly kind: 'file' | 'directory';
  readonly depth: number;
};

export function ExplorerView(): React.JSX.Element | null {
  const state = useExplorerState();
  const git = useGitPanelState();
  const { registry } = useCore();
  const bodyRef = useRef<HTMLDivElement>(null);
  const draftInputRef = useRef<HTMLInputElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(FALLBACK_VIEWPORT_HEIGHT);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftError, setDraftError] = useState<string | null>(null);

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

  const draftRow = useMemo<ExplorerRow | null>(
    () =>
      draft === null
        ? null
        : {
            path: DRAFT_PATH,
            name: '',
            kind: draft.kind === 'directory' ? 'directory' : 'file',
            depth: draft.depth,
            expanded: false,
          },
    [draft],
  );

  const displayRows = useMemo(() => {
    if (draftRow === null || draft === null) return rows;
    const index = rows.findIndex((row) => row.path === draft.parentPath);
    if (index < 0) return rows;
    return [...rows.slice(0, index + 1), draftRow, ...rows.slice(index + 1)];
  }, [rows, draft, draftRow]);

  const folderTarget = useMemo(() => {
    const selected = rows.find((row) => row.path === state.selectedPath);
    if (selected === undefined) return state.rootPath;
    return selected.kind === 'directory' ? selected.path : parentPathOf(selected.path);
  }, [rows, state.selectedPath, state.rootPath]);

  const beginCreate = (kind: 'file' | 'directory', parentPath: string | null): void => {
    if (parentPath === null) return;
    const parentRow = rows.find((row) => row.path === parentPath);
    if (parentRow === undefined) return;
    const depth = parentRow.depth + 1;
    const open = async (): Promise<void> => {
      if (parentRow.kind === 'directory' && !parentRow.expanded) {
        await explorerModel.expandDirectory(parentPath, window.api.readDir);
      }
      setDraftError(null);
      setDraftName('');
      setDraft({ parentPath, kind, depth });
    };
    void open();
  };

  const cancelDraft = (): void => {
    setDraft(null);
    setDraftName('');
    setDraftError(null);
  };

  const commitDraft = async (): Promise<void> => {
    if (draft === null) return;
    const name = draftName.trim();
    if (name.length === 0) {
      setDraftError(uiText('Bir ad yaz', 'Type a name'));
      draftInputRef.current?.focus();
      return;
    }
    const result = await window.api.createEntry(draft.parentPath, name, draft.kind);
    if (!result.ok) {
      setDraftError(result.error ?? uiText('Oluşturulamadı', 'Could not create'));
      return;
    }
    const created = result.path ?? `${draft.parentPath}/${name}`;
    const kind = draft.kind;
    setDraft(null);
    setDraftName('');
    setDraftError(null);
    explorerModel.invalidateCache(draft.parentPath);
    await explorerModel.expandDirectory(draft.parentPath, window.api.readDir);
    explorerModel.select(created);
    focusManager.set('explorer');
    if (kind === 'file') {
      void registry.run('explorer.activate');
    }
  };

  const refreshFolder = async (path: string | null): Promise<void> => {
    if (path === null) return;
    explorerModel.invalidateCache(path);
    await explorerModel.refreshDirectory(path, window.api.readDir);
  };

  const collapseAll = (): void => {
    explorerModel.collapseAll();
    cancelDraft();
  };

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
    const index = displayRows.findIndex((row) => row.path === state.selectedPath);
    if (index < 0) return;
    const top = index * ROW_HEIGHT;
    const bottom = top + ROW_HEIGHT;
    if (top < body.scrollTop) body.scrollTop = top;
    else if (bottom > body.scrollTop + body.clientHeight) body.scrollTop = bottom - body.clientHeight;
  }, [displayRows, state.selectedPath]);

  useEffect(() => {
    // Klavyeyle seçim gezerken dosyayı önceden oku; Enter'a basıldığında
    // içerik ve Monaco modeli hazır olur.
    if (state.selectedPath === null) return;
    const selected = rows.find((row) => row.path === state.selectedPath);
    if (selected?.kind !== 'file') return;
    prefetchFile(selected.path);
  }, [rows, state.selectedPath]);

  useEffect(() => {
    if (draft !== null) draftInputRef.current?.focus();
  }, [draft]);

  useEffect(() => {
    if (state.rootPath === null) {
      setDraft(null);
      setDraftError(null);
    }
  }, [state.rootPath]);

  if (!state.isOpen) return null;

  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const end = Math.min(
    displayRows.length,
    Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN,
  );
  const visibleRows = displayRows.slice(start, end);

  return (
    <aside className="explorer-view" role="region" aria-label="Dosya gezgini">
      <div className="explorer-view__head">
        <span className="explorer-view__title">{uiText('Dosyalar', 'Files')}</span>
        <div className="explorer-view__actions" role="toolbar" aria-label="Gezgin işlemleri">
          <button
            type="button"
            className="explorer-view__action"
            title={uiText('Yeni dosya', 'New file')}
            aria-label={uiText('Yeni dosya', 'New file')}
            disabled={state.rootPath === null}
            onClick={() => beginCreate('file', folderTarget)}
          >
            <NewFileIcon />
          </button>
          <button
            type="button"
            className="explorer-view__action"
            title={uiText('Yeni klasör', 'New folder')}
            aria-label={uiText('Yeni klasör', 'New folder')}
            disabled={state.rootPath === null}
            onClick={() => beginCreate('directory', folderTarget)}
          >
            <NewFolderIcon />
          </button>
          <button
            type="button"
            className="explorer-view__action"
            title={uiText('Yenile', 'Refresh')}
            aria-label={uiText('Yenile', 'Refresh')}
            disabled={state.rootPath === null}
            onClick={() => void refreshFolder(folderTarget)}
          >
            <RefreshIcon />
          </button>
          <button
            type="button"
            className="explorer-view__action"
            title={uiText('Tüm klasörleri kapat', 'Collapse all')}
            aria-label={uiText('Tüm klasörleri kapat', 'Collapse all')}
            disabled={state.rootPath === null}
            onClick={collapseAll}
          >
            <CollapseAllIcon />
          </button>
        </div>
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
        {draftError !== null && (
          <div className="explorer-view__draft-error" role="alert">
            {draftError}
          </div>
        )}
        <div className="explorer-view__rows" style={{ height: displayRows.length * ROW_HEIGHT }}>
          {visibleRows.map((row, index) => {
            const active = row.path === state.selectedPath;
            const className = ['explorer-row', `explorer-row--depth-${row.depth}`]
              .concat(active ? ['explorer-row--active'] : [])
              .join(' ');
            const style = {
              position: 'absolute' as const,
              top: (start + index) * ROW_HEIGHT,
              left: 0,
              right: 0,
              height: ROW_HEIGHT,
              boxSizing: 'border-box' as const,
            };
            if (row.path === DRAFT_PATH && draft !== null) {
              const draftFolder = draft.kind === 'directory';
              return (
                <div
                  key={DRAFT_PATH}
                  role="option"
                  aria-selected={false}
                  className={`explorer-row explorer-row--depth-${row.depth} explorer-row--draft`}
                  style={style}
                >
                  <span className="explorer-row__state" aria-hidden="true" />
                  <span
                    className={
                      draftFolder
                        ? 'explorer-row__icon explorer-row__icon--dir'
                        : 'explorer-row__icon explorer-row__logo'
                    }
                    aria-hidden="true"
                  >
                    {draftFolder ? <FolderIcon open={false} /> : <FileLogo name={draftName} />}
                  </span>
                  <input
                    ref={draftInputRef}
                    className="explorer-row__name explorer-row__input"
                    value={draftName}
                    placeholder={
                      draftFolder
                        ? uiText('yeni-klasör', 'new-folder')
                        : uiText('yeni-dosya.ts', 'new-file.ts')
                    }
                    spellCheck={false}
                    aria-label={draftFolder ? 'Yeni klasör adı' : 'Yeni dosya adı'}
                    onChange={(event) => setDraftName(event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void commitDraft();
                      } else if (event.key === 'Escape') {
                        event.preventDefault();
                        cancelDraft();
                      }
                    }}
                  />
                </div>
              );
            }
            return (
              <div
                key={row.path}
                role="option"
                aria-selected={active}
                className={className}
                style={style}
                onMouseEnter={() => {
                  if (row.kind === 'file') prefetchFile(row.path);
                }}
                onPointerDown={() => {
                  if (row.kind === 'file') prefetchFile(row.path);
                }}
                onClick={() => {
                  if (draft !== null) cancelDraft();
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
                {row.kind === 'directory' && (
                  <span className="explorer-row__actions" onClick={(event) => event.stopPropagation()}>
                    <button
                      type="button"
                      className="explorer-row__action"
                      title={uiText('Yeni dosya', 'New file')}
                      aria-label={uiText('Yeni dosya', 'New file')}
                      onClick={() => beginCreate('file', row.path)}
                    >
                      <NewFileIcon />
                    </button>
                    <button
                      type="button"
                      className="explorer-row__action"
                      title={uiText('Yeni klasör', 'New folder')}
                      aria-label={uiText('Yeni klasör', 'New folder')}
                      onClick={() => beginCreate('directory', row.path)}
                    >
                      <NewFolderIcon />
                    </button>
                    <button
                      type="button"
                      className="explorer-row__action"
                      title={uiText('Yenile', 'Refresh')}
                      aria-label={uiText('Yenile', 'Refresh')}
                      onClick={() => void refreshFolder(row.path)}
                    >
                      <RefreshIcon />
                    </button>
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