import { monaco } from './monacoSetup';

export const EDITOR_THEME_NAME = 'file-dark';

export function defineEditorTheme(): void {
  monaco.editor.defineTheme(EDITOR_THEME_NAME, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '#00d2ff' },
      { token: 'keyword.control', foreground: '#c586c0' },
      { token: 'keyword.operator', foreground: '#82aaff' },
      { token: 'string', foreground: '#ce9178' },
      { token: 'string.escape', foreground: '#00d2ff' },
      { token: 'number', foreground: '#82aaff' },
      { token: 'type', foreground: '#7c4dff' },
      { token: 'comment', foreground: '#4a6b8c', fontStyle: 'italic' },
      { token: 'comment.doc', foreground: '#4a6b8c' },
    ],
    colors: {
      'editor.background': '#0A141F',
      'editor.foreground': '#FFFFFF',
      'editorLineNumber.foreground': '#4A6B8C',
      'editorCursor.foreground': '#00E5FF',
      'editor.selectionBackground': 'rgba(0,229,255,0.22)',
      'editor.lineHighlightBackground': 'rgba(0,229,255,0.07)',
      'editor.lineHighlightBorder': '#00000000',
      'editorWidget.background': '#0D1B2A',
      'editorWidget.border': '#00D2FF',
      'editorGutter.background': '#0A141F',
      'minimap.background': '#0A141F',
      'minimapSlider.background': 'rgba(0,210,255,0.15)',
      'minimapSlider.hoverBackground': 'rgba(0,210,255,0.25)',
      'editorError.foreground': '#FF5252',
      'editorError.border': '#FF5252',
    },
  });
}