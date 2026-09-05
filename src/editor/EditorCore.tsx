import { useEffect, useRef } from 'react';
import { bookmarkModel } from '../core/bookmarks';
import { clipboardHistory } from '../core/clipboardHistory';
import { cursorModel } from '../core/cursor';
import { dirtyTracker } from '../core/dirty';
import { historyModel } from '../core/history';
import { tabsModel } from '../core/tabs';
import type { OpenFile } from '../core/types';
import { viewModeModel } from '../core/viewMode';
import { setActiveEditor } from './activeEditor';
import { defineEditorTheme, EDITOR_THEME_NAME } from './editorTheme';
import { resolveModel, touchModel } from './editorModel';
import { installMonacoEnvironment, monaco } from './monacoSetup';

type TrailBox = { readonly left: number; readonly top: number; readonly height: number };

const TRAIL_MS = 350;

function spawnTrail(host: HTMLDivElement, box: TrailBox): void {
  const mark = document.createElement('div');
  mark.className = 'editor-trail__mark';
  mark.style.setProperty('--trail-x', `${box.left}px`);
  mark.style.setProperty('--trail-y', `${box.top}px`);
  mark.style.setProperty('--trail-h', `${box.height}px`);
  host.appendChild(mark);
  requestAnimationFrame(() => mark.classList.add('editor-trail__mark--fade'));
  window.setTimeout(() => mark.remove(), TRAIL_MS);
}

const BASE_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions = {
  automaticLayout: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
  fontLigatures: true,
  fontSize: 13,
  lineHeight: 20,
  cursorStyle: 'block-outline',
  cursorSmoothCaretAnimation: 'on',
  glyphMargin: true,
};

export function EditorCore({ file }: { readonly file: OpenFile | null }): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);
  const trailHostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;
    installMonacoEnvironment();
    defineEditorTheme();
    monaco.editor.setTheme(EDITOR_THEME_NAME);
    const editor = monaco.editor.create(host, BASE_OPTIONS);
    editorRef.current = editor;
    setActiveEditor(editor);
    const trailHost = trailHostRef.current;
    const cursorDisposable = editor.onDidChangeCursorPosition((event) => {
      const model = editor.getModel();
      if (model === null) return;
      cursorModel.update(model.uri.path, event.position.lineNumber, event.position.column);
      if (trailHost !== null) {
        const box = editor.getScrolledVisiblePosition(event.position);
        if (box !== null) {
          spawnTrail(trailHost, box);
        }
      }
    });
    const contentDisposable = editor.onDidChangeModelContent(() => {
      const model = editor.getModel();
      if (model === null) return;
      const path = model.uri.path;
      touchModel(path);
      tabsModel.updateContent(path, model.getValue());
      historyModel.capture(path, model.getValue());
      if (!dirtyTracker.isDirty(path)) {
        dirtyTracker.markDirty(path);
      }
    });
    const renderBookmarks = (): void => {
      const model = editor.getModel();
      if (model === null) return;
      const decorations = bookmarkModel
        .list()
        .filter((bookmark) => bookmark.path === model.uri.path)
        .map((bookmark) => ({
          range: new monaco.Range(bookmark.line, 1, bookmark.line, 1),
          options: { glyphMarginClassName: 'editor-bookmark-glyph' },
        }));
      editor.deltaDecorations([], decorations);
    };
    const bookmarkDisposable = bookmarkModel.subscribe(renderBookmarks);
    const modelDisposable = editor.onDidChangeModel(renderBookmarks);
    const applyWordWrap = (): void => {
      editor.updateOptions({ wordWrap: viewModeModel.getState().wordWrap });
    };
    applyWordWrap();
    const viewModeDisposable = viewModeModel.subscribe(applyWordWrap);
    const copyListener = (event: ClipboardEvent): void => {
      const selection = editor.getSelection();
      const model = editor.getModel();
      if (selection === null || model === null || selection.isEmpty()) return;
      const text = model.getValueInRange(selection);
      if (text.length > 0) clipboardHistory.push(text);
      void event;
    };
    host.addEventListener('copy', copyListener);
    host.addEventListener('cut', copyListener);
    return () => {
      cursorDisposable.dispose();
      contentDisposable.dispose();
      bookmarkDisposable();
      modelDisposable.dispose();
      viewModeDisposable();
      host.removeEventListener('copy', copyListener);
      host.removeEventListener('cut', copyListener);
      editor.dispose();
      if (editorRef.current === editor) {
        editorRef.current = null;
      }
      setActiveEditor(null);
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor === null) return;
    editor.setModel(file === null ? null : resolveModel(file));
  }, [file]);

  return (
    <div className="editor-core">
      {file === null && <div className="editor-core__placeholder">Dosya seçin</div>}
      <div ref={hostRef} className="editor-core__host" />
      <div ref={trailHostRef} className="editor-core__trail" aria-hidden="true" />
    </div>
  );
}