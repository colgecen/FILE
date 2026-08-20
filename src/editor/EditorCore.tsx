import { useEffect, useRef } from 'react';
import type { OpenFile } from '../core/types';
import { resolveModel } from './editorModel';
import { installMonacoEnvironment, monaco } from './monacoSetup';

const BASE_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions = {
  automaticLayout: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
};

export function EditorCore({ file }: { readonly file: OpenFile | null }): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;
    installMonacoEnvironment();
    const editor = monaco.editor.create(host, BASE_OPTIONS);
    editorRef.current = editor;
    return () => {
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
    </div>
  );
}