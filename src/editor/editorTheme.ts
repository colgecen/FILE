import { monaco } from './monacoSetup';

export const EDITOR_THEME_NAME = 'file-dark';

export function defineEditorTheme(): void {
  monaco.editor.defineTheme(EDITOR_THEME_NAME, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '#00d2ff' },
      { token: 'keyword.control', foreground: '#00d2ff' },
      { token: 'keyword.operator', foreground: '#82aaff' },
      { token: 'string', foreground: '#82aaff' },
      { token: 'string.escape', foreground: '#00d2ff' },
      { token: 'number', foreground: '#82aaff' },
      { token: 'comment', foreground: '#4a6b8c', fontStyle: 'italic' },
      { token: 'comment.doc', foreground: '#4a6b8c' },
    ],
    colors: {
      'editor.background': '#03050A',
      'editor.foreground': '#FFFFFF',
      'editorLineNumber.foreground': '#4A6B8C',
      'editorCursor.foreground': '#00D2FF',
      'editor.selectionBackground': 'rgba(0,85,255,0.4)',
      'editor.lineHighlightBackground': 'rgba(0,210,255,0.05)',
      'editor.lineHighlightBorder': '#00000000',
      'editorError.foreground': '#FF5252',
      'editorError.border': '#FF5252',
    },
  });
}