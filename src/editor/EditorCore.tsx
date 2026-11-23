import { useEffect, useRef } from 'react';
import { bookmarkModel } from '../core/bookmarks';
import { clipboardHistory } from '../core/clipboardHistory';
import { cursorModel } from '../core/cursor';
import { dirtyTracker } from '../core/dirty';
import { fileWarmup } from '../core/fileWarmup';
import { historyModel } from '../core/history';
import { session } from '../core/session';
import { tabsModel } from '../core/tabs';
import type { OpenFile } from '../core/types';
import { viewModeModel } from '../core/viewMode';
import { setActiveEditor } from './activeEditor';
import { defineEditorTheme, EDITOR_THEME_NAME } from './editorTheme';
import {
  hasModel,
  installTabWarmup,
  queueCachedModelWarmup,
  resolveModel,
  touchModel,
} from './editorModel';
import { installMonacoEnvironment, monaco, primeLanguages } from './monacoSetup';

const LARGE_FILE_CHARS = 1_000_000;
// Büyük dosyalarda ilk boyama maliyetini sınırla: minimap ve kelime sarma kapalı.
const WRAP_MAX_CHARS = 200_000;
const MINIMAP_MAX_CHARS = 200_000;

const BASE_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions = {
  automaticLayout: true,
  minimap: { enabled: true, scale: 1, renderCharacters: false, maxColumn: 120 },
  scrollBeyondLastLine: false,
  largeFileOptimizations: true,
  maxTokenizationLineLength: 20_000,
  fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
  fontLigatures: true,
  fontSize: 13,
  lineHeight: 20,
  cursorStyle: 'line',
  cursorBlinking: 'smooth',
  cursorSmoothCaretAnimation: 'off',
  glyphMargin: true,
  lineNumbersMinChars: 2,
  lineDecorationsWidth: 5,
  wordWrap: 'on',
};

export function EditorCore({ file }: { readonly file: OpenFile | null }): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const loadedPathRef = useRef<string | null>(null);
  const syncingRef = useRef(false);
  const lastModelValueRef = useRef<string | null>(null);
  const largeFileRef = useRef(false);

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;
    installMonacoEnvironment();
    defineEditorTheme();
    monaco.editor.setTheme(EDITOR_THEME_NAME);
    installTabWarmup();
    primeLanguages();
    const detachWarmup = fileWarmup.subscribe(queueCachedModelWarmup);
    const editor = monaco.editor.create(host, BASE_OPTIONS);
    editorRef.current = editor;
    setActiveEditor(editor);
    const cursorDisposable = editor.onDidChangeCursorPosition((event) => {
      const model = editor.getModel();
      if (model === null) return;
      cursorModel.update(model.uri.path, event.position.lineNumber, event.position.column);
    });
    const contentDisposable = editor.onDidChangeModelContent(() => {
      if (syncingRef.current) return;
      const model = editor.getModel();
      if (model === null) return;
      const path = model.uri.path;
      const value = model.getValue();
      lastModelValueRef.current = value;
      touchModel(path);
      tabsModel.updateContent(path, value, { notify: false });
      historyModel.capture(path, value);
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
      editor.updateOptions({
        wordWrap: largeFileRef.current ? 'off' : viewModeModel.getState().wordWrap,
      });
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
      detachWarmup();
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
    const path = file === null ? null : file.path;
    // Restored sessions and AI edits update the tab content after the model
    // was created. Reflect external changes unless the buffer is dirty.
    const syncModelContent = (): void => {
      const model = editor.getModel();
      if (file === null || model == null) return;
      if (lastModelValueRef.current === file.content) return;
      if (dirtyTracker.isDirty(file.path)) {
        // Do not overwrite unsaved edits; remember the tab value so the next
        // render does not read the whole model again.
        lastModelValueRef.current = file.content;
        return;
      }
      if (typeof model.getValue !== 'function' || typeof model.setValue !== 'function') return;
      if (model.getValue() === file.content) {
        lastModelValueRef.current = file.content;
        return;
      }
      syncingRef.current = true;
      model.setValue(file.content);
      syncingRef.current = false;
      lastModelValueRef.current = file.content;
      dirtyTracker.clearDirty(file.path);
    };
    if (loadedPathRef.current === path && editor.getModel()?.uri.path === path) {
      syncModelContent();
      return;
    }
    const previous = loadedPathRef.current;
    if (previous !== null && typeof editor.getScrollTop === 'function') {
      session.updateMemory(previous, { viewportTop: editor.getScrollTop() });
    }
    loadedPathRef.current = path;
    const contentLength = file?.content.length ?? 0;
    const large = contentLength > LARGE_FILE_CHARS;
    largeFileRef.current = large;
    const wrap =
      viewModeModel.getState().wordWrap === 'on' && contentLength <= WRAP_MAX_CHARS
        ? 'on'
        : 'off';
    editor.updateOptions({
      minimap: { enabled: !large && contentLength <= MINIMAP_MAX_CHARS },
      wordWrap: wrap,
      maxTokenizationLineLength: large ? 5_000 : 20_000,
    });
    const reusedModel = file !== null && hasModel(file.path);
    editor.setModel(file === null ? null : resolveModel(file));
    lastModelValueRef.current = null;
    // Yeni kurulan model zaten dosya içeriğiyle birebir aynı; koca dosyada
    // tam içerik karşılaştırmasını yalnızca önceden ısıtılmış modelde yap.
    if (reusedModel) syncModelContent();
    if (path !== null) {
      const memory = session.fileMemory(path);
      if (memory !== null) {
        window.setTimeout(() => {
          if (typeof editor.revealLineInCenterIfOutsideViewport === 'function') {
            editor.revealLineInCenterIfOutsideViewport(memory.line);
          }
          editor.setPosition({ lineNumber: memory.line, column: memory.column });
          if (typeof editor.setScrollTop === 'function') editor.setScrollTop(memory.viewportTop);
        }, 40);
      }
    }
  }, [file]);

  return (
    <div className="editor-core">
      {file === null && <div className="editor-core__placeholder">Dosya seçin</div>}
      <div ref={hostRef} className="editor-core__host" />
    </div>
  );
}