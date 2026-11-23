import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
import { reportError } from '../core/appErrors';
import { chatContextModel } from '../core/chatContext';
import { aiChatModel } from '../core/chatModel';
import { explorerClipboard, useExplorerClipboard } from '../core/explorerClipboard';
import { adoptFile } from '../core/fileCommands';
import { fileContentCache } from '../core/fileCache';
import { fileWarmup } from '../core/fileWarmup';
import { mediaKindForPath, mediaUrlForPath } from '../core/media';
import { paletteModel } from '../core/palette';
import { tabsModel } from '../core/tabs';
import { activeTerminalContext, terminalModel } from '../core/terminalModel';
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

type ContextMenuState = {
  readonly path: string;
  readonly name: string;
  readonly depth: number;
  readonly x: number;
  readonly y: number;
};

type RenameState = {
  readonly path: string;
  readonly depth: number;
};

type GalleryImage = {
  readonly name: string;
  readonly path: string;
};

type GalleryState = {
  readonly name: string;
  readonly images: readonly GalleryImage[];
};

const SEARCH_SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'out', 'build', 'target', '.cache']);

function relativeTo(root: string, path: string): string {
  const normalizedRoot = root.replace(/[\\/]+$/, '');
  if (path === normalizedRoot) return '.';
  const prefix = `${normalizedRoot}/`;
  if (path.startsWith(prefix)) return path.slice(prefix.length);
  const winPrefix = `${normalizedRoot}\\`;
  if (path.startsWith(winPrefix)) return path.slice(winPrefix.length);
  return path;
}

function closeTabsUnder(path: string): void {
  const prefix = path.endsWith('/') || path.endsWith('\\') ? path : `${path}/`;
  const winPrefix = path.endsWith('\\') ? path : `${path}\\`;
  for (const tab of tabsModel.getState().tabs) {
    if (tab.file.path === path || tab.file.path.startsWith(prefix) || tab.file.path.startsWith(winPrefix)) {
      tabsModel.close(tab.id);
    }
  }
}


export function ExplorerView(): React.JSX.Element | null {
  const state = useExplorerState();
  const git = useGitPanelState();
  const { registry } = useCore();
  const bodyRef = useRef<HTMLDivElement>(null);
  const draftInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const scrollDragRef = useRef<{ y: number; top: number } | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollHeight, setScrollHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(FALLBACK_VIEWPORT_HEIGHT);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftError, setDraftError] = useState<string | null>(null);
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [rename, setRename] = useState<RenameState | null>(null);
  const [renameName, setRenameName] = useState('');
  const [gallery, setGallery] = useState<GalleryState | null>(null);
  const clipboard = useExplorerClipboard();

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

  const selectedRow = useMemo(
    () => rows.find((row) => row.path === state.selectedPath) ?? null,
    [rows, state.selectedPath],
  );

  const folderTarget = useMemo(() => {
    if (selectedRow === null) return state.rootPath;
    return selectedRow.kind === 'directory' ? selectedRow.path : parentPathOf(selectedRow.path);
  }, [selectedRow, state.rootPath]);

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

  const closeMenu = (): void => setMenu(null);

  const openInTab = async (path: string): Promise<void> => {
    const file = await fileContentCache.read(window.api, path);
    if (file === null) {
      reportError(uiText('Dosya okunamadı', 'Could not read file'));
      return;
    }
    adoptFile({
      path: file.path,
      name: file.name,
      content: file.content,
      language: file.language,
      ...(file.kind === undefined ? {} : { kind: file.kind }),
    });
  };

  const refreshParentOf = async (path: string): Promise<void> => {
    const parent = parentPathOf(path);
    if (parent === null) return;
    explorerModel.invalidateCache(parent);
    await explorerModel.refreshDirectory(parent, window.api.readDir);
  };

  const beginRename = (row: ExplorerRow): void => {
    closeMenu();
    setRename({ path: row.path, depth: row.depth });
    setRenameName(row.name);
  };

  const commitRename = async (): Promise<void> => {
    if (rename === null) return;
    const name = renameName.trim();
    if (name.length === 0) return;
    const result = await window.api.renameEntry(rename.path, name);
    if (!result.ok) {
      reportError(result.error ?? uiText('Yeniden adlandırılamadı', 'Could not rename'));
      return;
    }
    const created = result.path ?? rename.path;
    closeTabsUnder(rename.path);
    fileContentCache.clear();
    setRename(null);
    setRenameName('');
    await refreshParentOf(rename.path);
    explorerModel.select(created);
  };

  const deleteFolder = async (path: string, name: string): Promise<void> => {
    closeMenu();
    if (path === state.rootPath) {
      reportError(uiText('Kök klasör silinemez', 'The workspace root cannot be deleted'));
      return;
    }
    if (!window.confirm(uiText(`"${name}" silinsin mi?`, `Delete "${name}"?`))) return;
    const result = await window.api.deleteEntry(path);
    if (!result.ok) {
      reportError(result.error ?? uiText('Silinemedi', 'Could not delete'));
      return;
    }
    closeTabsUnder(path);
    fileContentCache.clear();
    const parent = parentPathOf(path) ?? state.rootPath;
    await refreshParentOf(path);
    if (parent !== null) explorerModel.select(parent);
  };

  const setFolderClipboard = (path: string, name: string, cut: boolean): void => {
    explorerClipboard.set({ path, name, cut });
  };

  const pasteInto = async (folder: string): Promise<void> => {
    closeMenu();
    const entry = explorerClipboard.get();
    if (entry === null) {
      reportError(uiText('Panoda klasör yok', 'Clipboard is empty'));
      return;
    }
    if (entry.path === folder) return;
    const result = entry.cut
      ? await window.api.moveEntry(entry.path, folder)
      : await window.api.copyEntry(entry.path, folder);
    if (!result.ok) {
      reportError(result.error ?? uiText('Yapıştırılamadı', 'Could not paste'));
      return;
    }
    if (entry.cut) {
      closeTabsUnder(entry.path);
      explorerClipboard.set(null);
      await refreshParentOf(entry.path);
    }
    fileContentCache.clear();
    explorerModel.invalidateCache(folder);
    await explorerModel.expandDirectory(folder, window.api.readDir);
    if (result.path !== undefined) explorerModel.select(result.path);
  };

  const copyFolderPath = async (path: string, relative: boolean): Promise<void> => {
    closeMenu();
    const text =
      relative && state.rootPath !== null ? relativeTo(state.rootPath, path) : path;
    await window.api.writeClipboard(text);
  };

  const findInFolder = async (folder: string): Promise<void> => {
    closeMenu();
    const files: { name: string; path: string }[] = [];
    const queue = [folder];
    const visited = new Set<string>();
    while (queue.length > 0 && files.length < 400) {
      const current = queue.shift() as string;
      if (visited.has(current)) continue;
      visited.add(current);
      const entries = await window.api.readDir(current).catch(() => null);
      if (entries === null) continue;
      for (const entry of entries as readonly { name: string; path: string; kind: 'file' | 'directory' }[]) {
        if (entry.kind === 'directory') {
          if (!SEARCH_SKIP_DIRS.has(entry.name)) queue.push(entry.path);
        } else {
          files.push({ name: relativeTo(folder, entry.path), path: entry.path });
          if (files.length >= 400) break;
        }
      }
    }
    if (files.length === 0) {
      reportError(uiText('Klasörde dosya bulunamadı', 'No files found in folder'));
      return;
    }
    files.sort((a, b) => a.name.localeCompare(b.name));
    paletteModel.showFiles(files);
    focusManager.set('palette');
  };

  const addFolderToChat = (folder: string): void => {
    closeMenu();
    chatContextModel.addFolder(folder);
    aiChatModel.open();
    focusManager.set('ai');
  };

  const openVisualPreview = async (folder: string, name: string): Promise<void> => {
    closeMenu();
    const entries = await window.api.readDir(folder).catch(() => null);
    if (entries === null) {
      reportError(uiText('Klasör okunamadı', 'Could not read folder'));
      return;
    }
    const images = (entries as readonly { name: string; path: string; kind: 'file' | 'directory' }[])
      .filter((entry) => entry.kind === 'file' && mediaKindForPath(entry.path) === 'image')
      .map((entry) => ({ name: entry.name, path: entry.path }));
    if (images.length === 0) {
      reportError(uiText('Bu klasörde görsel yok', 'No images in this folder'));
      return;
    }
    setGallery({ name, images });
  };

  const openTerminalAt = (folder: string): void => {
    closeMenu();
    const { envId } = activeTerminalContext();
    terminalModel.addTab(envId, folder);
  };

  const openContextMenu = (
    event: React.MouseEvent<HTMLDivElement>,
    row: ExplorerRow,
  ): void => {
    event.preventDefault();
    event.stopPropagation();
    explorerModel.select(row.path);
    focusManager.set('explorer');
    cancelDraft();
    setRename(null);
    const rect = event.currentTarget.getBoundingClientRect();
    const width = 330;
    const estimatedHeight = 560;
    const x = Math.max(8, Math.min(rect.left + 8, window.innerWidth - width - 8));
    const below = rect.bottom + 2;
    const y =
      below + estimatedHeight > window.innerHeight - 8
        ? Math.max(8, window.innerHeight - estimatedHeight - 8)
        : below;
    setMenu({ path: row.path, name: row.name, depth: row.depth, x, y });
  };

  useEffect(() => {
    const body = bodyRef.current;
    if (body === null) return;
    const measure = (): void => {
      setViewportHeight(body.clientHeight || FALLBACK_VIEWPORT_HEIGHT);
      setScrollHeight(body.scrollHeight);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(body);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const body = bodyRef.current;
    if (body !== null) setScrollHeight(body.scrollHeight);
  }, [displayRows, draftError, viewportHeight, state.loading]);

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
      setMenu(null);
      setRename(null);
      setGallery(null);
    }
  }, [state.rootPath]);

  useEffect(() => {
    if (rename === null) return;
    renameInputRef.current?.focus();
    renameInputRef.current?.select();
  }, [rename]);

  useEffect(() => {
    if (menu === null) return;
    const close = (): void => setMenu(null);
    const onDown = (event: MouseEvent): void => {
      const target = event.target;
      if (target instanceof Element && target.closest('.explorer-context-menu') !== null) return;
      close();
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('scroll', close, true);
    window.addEventListener('blur', close);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('scroll', close, true);
      window.removeEventListener('blur', close);
      window.removeEventListener('resize', close);
    };
  }, [menu]);

  useEffect(() => {
    if (gallery === null) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setGallery(null);
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [gallery]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      const menuOpen = menu !== null;
      if (!menuOpen && focusManager.get() !== 'explorer') return;
      const folder =
        menu?.path ?? (selectedRow?.kind === 'directory' ? selectedRow.path : null);
      if (folder === null) return;
      const ctrl = event.ctrlKey || event.metaKey;
      const handled = (): void => {
        event.preventDefault();
        event.stopPropagation();
        closeMenu();
      };
      if (ctrl && event.altKey && !event.shiftKey && event.code === 'KeyR') {
        handled();
        void window.api.showItemInFolder(folder);
        return;
      }
      if (event.shiftKey && event.altKey && !ctrl && event.code === 'KeyF') {
        handled();
        void findInFolder(folder);
        return;
      }
      if (ctrl && !event.altKey && !event.shiftKey && event.code === 'KeyX') {
        handled();
        const row = rows.find((entry) => entry.path === folder);
        setFolderClipboard(folder, row?.name ?? folder, true);
        return;
      }
      if (ctrl && !event.altKey && !event.shiftKey && event.code === 'KeyC') {
        handled();
        const row = rows.find((entry) => entry.path === folder);
        setFolderClipboard(folder, row?.name ?? folder, false);
        return;
      }
      if (ctrl && !event.altKey && !event.shiftKey && event.code === 'KeyV') {
        handled();
        void pasteInto(folder);
        return;
      }
      if (ctrl && event.altKey && !event.shiftKey && event.code === 'KeyC') {
        handled();
        void copyFolderPath(folder, false);
        return;
      }
      if (ctrl && event.altKey && event.shiftKey && event.code === 'KeyC') {
        handled();
        void copyFolderPath(folder, true);
        return;
      }
      if (!ctrl && !event.altKey && !event.shiftKey && event.key === 'F2') {
        const row = rows.find((entry) => entry.path === folder);
        if (row !== undefined) {
          handled();
          beginRename(row);
        }
        return;
      }
      if (!ctrl && !event.altKey && !event.shiftKey && event.key === 'Delete') {
        const row = rows.find((entry) => entry.path === folder);
        if (row !== undefined) {
          handled();
          void deleteFolder(folder, row.name);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [menu, selectedRow, rows, state.rootPath, clipboard, rename]);

  if (!state.isOpen) return null;

  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const end = Math.min(
    displayRows.length,
    Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN,
  );
  const visibleRows = displayRows.slice(start, end);
  const scrollRange = Math.max(0, scrollHeight - viewportHeight);
  const showScrollbar = scrollRange > 1;
  const trackHeight = Math.max(0, viewportHeight - 4);
  const thumbHeight = showScrollbar
    ? Math.min(trackHeight, Math.max(28, Math.round((viewportHeight / scrollHeight) * trackHeight)))
    : 0;
  const thumbTop = showScrollbar
    ? Math.round((scrollTop / scrollRange) * Math.max(0, trackHeight - thumbHeight))
    : 0;

  const onThumbPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!showScrollbar) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    scrollDragRef.current = { y: event.clientY, top: scrollTop };
  };

  const onThumbPointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    const drag = scrollDragRef.current;
    const body = bodyRef.current;
    if (drag === null || body === null) return;
    const range = Math.max(1, trackHeight - thumbHeight);
    const next = drag.top + ((event.clientY - drag.y) / range) * scrollRange;
    body.scrollTop = Math.max(0, Math.min(scrollRange, next));
    setScrollTop(body.scrollTop);
  };

  const onThumbPointerUp = (event: React.PointerEvent<HTMLDivElement>): void => {
    scrollDragRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // pointer capture zaten bırakılmış olabilir
    }
  };

  return (
    <>
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
      <div className="explorer-view__bodywrap">
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
            const cut = clipboard?.cut === true && clipboard.path === row.path;
            const className = ['explorer-row', `explorer-row--depth-${row.depth}`]
              .concat(active ? ['explorer-row--active'] : [])
              .concat(cut ? ['explorer-row--cut'] : [])
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
                onContextMenu={(event) => {
                  if (row.kind === 'directory') openContextMenu(event, row);
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
                {rename?.path === row.path ? (
                  <input
                    ref={renameInputRef}
                    className="explorer-row__name explorer-row__input"
                    value={renameName}
                    aria-label="Yeni klasör adı"
                    spellCheck={false}
                    onChange={(event) => setRenameName(event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void commitRename();
                      } else if (event.key === 'Escape') {
                        event.preventDefault();
                        setRename(null);
                        setRenameName('');
                      }
                    }}
                  />
                ) : (
                  <span className="explorer-row__name">{row.name}</span>
                )}
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
        {showScrollbar && (
          <div
            className="explorer-view__scrollbar"
            aria-hidden="true"
            onWheel={(event) => {
              const body = bodyRef.current;
              if (body === null) return;
              body.scrollTop += event.deltaY;
              setScrollTop(body.scrollTop);
            }}
          >
            <div
              className="explorer-view__scrollbar-thumb"
              style={{ height: thumbHeight, top: thumbTop }}
              onPointerDown={onThumbPointerDown}
              onPointerMove={onThumbPointerMove}
              onPointerUp={onThumbPointerUp}
              onPointerCancel={onThumbPointerUp}
            />
          </div>
        )}
      </div>
      </aside>
      {menu !== null &&
        createPortal(
          <div
            className="explorer-context-menu"
            role="menu"
            aria-label={`${menu.name} klasör işlemleri`}
            style={{ left: menu.x, top: menu.y }}
            onMouseDown={(event) => event.stopPropagation()}
            onContextMenu={(event) => event.preventDefault()}
          >
            <ContextMenuButton
              label="Yeni Dosya..."
              onSelect={() => {
                closeMenu();
                beginCreate('file', menu.path);
              }}
            />
            <ContextMenuButton
              label="Yeni Klasör..."
              onSelect={() => {
                closeMenu();
                beginCreate('directory', menu.path);
              }}
            />
            <ContextMenuButton
              label="İçeren Klasörü Aç"
              shortcut="Ctrl+Alt+R"
              onSelect={() => {
                closeMenu();
                void window.api.showItemInFolder(menu.path);
              }}
            />
            <ContextMenuButton
              label="Görsel Önizlemede Aç"
              onSelect={() => void openVisualPreview(menu.path, menu.name)}
            />
            <ContextMenuButton
              label="Tümleşik Terminalde Aç"
              onSelect={() => openTerminalAt(menu.path)}
            />
            <ContextMenuSeparator />
            <ContextMenuButton
              label="Klasörde Bul..."
              shortcut="Shift+Alt+F"
              onSelect={() => void findInFolder(menu.path)}
            />
            <ContextMenuSeparator />
            <ContextMenuButton
              label="Klasörü Sohbete Ekle"
              onSelect={() => addFolderToChat(menu.path)}
            />
            <ContextMenuSeparator />
            <ContextMenuButton
              label="Kes"
              shortcut="Ctrl+X"
              onSelect={() => {
                closeMenu();
                setFolderClipboard(menu.path, menu.name, true);
              }}
            />
            <ContextMenuButton
              label="Kopyala"
              shortcut="Ctrl+C"
              onSelect={() => {
                closeMenu();
                setFolderClipboard(menu.path, menu.name, false);
              }}
            />
            <ContextMenuButton
              label="Yapıştır"
              shortcut="Ctrl+V"
              disabled={clipboard === null}
              onSelect={() => void pasteInto(menu.path)}
            />
            <ContextMenuSeparator />
            <ContextMenuButton
              label="Yolu Kopyala"
              shortcut="Ctrl+Alt+C"
              onSelect={() => void copyFolderPath(menu.path, false)}
            />
            <ContextMenuButton
              label="Göreli Yolu Kopyala"
              shortcut="Ctrl+Shift+Alt+C"
              onSelect={() => void copyFolderPath(menu.path, true)}
            />
            <ContextMenuSeparator />
            <ContextMenuButton
              label="Yeniden Adlandır..."
              shortcut="F2"
              onSelect={() => {
                const row = rows.find((entry) => entry.path === menu.path);
                if (row !== undefined) beginRename(row);
              }}
            />
            <ContextMenuButton
              label="Sil"
              shortcut="Del"
              onSelect={() => void deleteFolder(menu.path, menu.name)}
            />
          </div>,
          document.body,
        )}
      {gallery !== null &&
        createPortal(
          <div
            className="explorer-gallery"
            role="dialog"
            aria-modal="true"
            aria-label={`${gallery.name} görsel önizlemesi`}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setGallery(null);
            }}
          >
            <div className="explorer-gallery__panel">
              <div className="explorer-gallery__head">
                <span className="explorer-gallery__title">{gallery.name}</span>
                <button
                  type="button"
                  className="explorer-gallery__close"
                  aria-label="Önizlemeyi kapat"
                  onClick={() => setGallery(null)}
                >
                  ×
                </button>
              </div>
              <div className="explorer-gallery__grid">
                {gallery.images.map((image) => (
                  <button
                    key={image.path}
                    type="button"
                    className="explorer-gallery__item"
                    title={image.name}
                    onClick={() => {
                      setGallery(null);
                      void openInTab(image.path);
                    }}
                  >
                    <img
                      className="explorer-gallery__thumb"
                      src={mediaUrlForPath(image.path)}
                      alt={image.name}
                      loading="lazy"
                      draggable={false}
                    />
                    <span className="explorer-gallery__name">{image.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function ContextMenuButton({
  label,
  shortcut,
  disabled = false,
  onSelect,
}: {
  readonly label: string;
  readonly shortcut?: string;
  readonly disabled?: boolean;
  readonly onSelect: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="menuitem"
      className="explorer-context-menu__item"
      disabled={disabled}
      onClick={onSelect}
    >
      <span className="explorer-context-menu__label">{label}</span>
      {shortcut !== undefined && (
        <span className="explorer-context-menu__shortcut">{shortcut}</span>
      )}
    </button>
  );
}

function ContextMenuSeparator(): React.JSX.Element {
  return <div className="explorer-context-menu__separator" role="separator" />;
}