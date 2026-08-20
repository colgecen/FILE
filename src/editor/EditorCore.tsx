import { useEffect, useRef } from 'react';
import { dirtyTracker } from '../core/dirty';
import { tabsModel } from '../core/tabs';
import type { OpenFile } from '../core/types';
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
    const trailHost = trailHostRef.current;
    const cursorDisposable =
      trailHost === null
        ? null
        : editor.onDidChangeCursorPosition((event) => {
            const box = editor.getScrolledVisiblePosition(event.position);
            if (box !== null) {
              spawnTrail(trailHost, box);
            }
          });
    const contentDisposable = editor.onDidChangeModelContent(() => {
      const model = editor.getModel();
      if (model === null) return;
      const path = model.uri.path;
      touchModel(path);
      tabsModel.updateContent(path, model.getValue());
      if (!dirtyTracker.isDirty(path)) {
        dirtyTracker.markDirty(path);
      }
    });
    return () => {
      cursorDisposable?.dispose();
      contentDisposable.dispose();
      editor.dispose();
      editorRef.current = null;
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