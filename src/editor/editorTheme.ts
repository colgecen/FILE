import { monaco } from './monacoSetup';

export const EDITOR_THEME_NAME = 'file-dark';

export function defineEditorTheme(): void {
  monaco.editor.defineTheme(EDITOR_THEME_NAME, {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#03050A',
      'editor.foreground': '#FFFFFF',
      'editorLineNumber.foreground': '#4A6B8C',
      'editorCursor.foreground': '#00D2FF',
      'editor.selectionBackground': 'rgba(0,85,255,0.4)',
      'editor.lineHighlightBackground': 'rgba(0,210,255,0.05)',
      'editor.lineHighlightBorder': '#00000000',
    },
  });
}