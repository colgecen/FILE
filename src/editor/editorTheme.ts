import { monaco } from './monacoSetup';

export const EDITOR_THEME_NAME = 'file-dark';

export function defineEditorTheme(): void {
  monaco.editor.defineTheme(EDITOR_THEME_NAME, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '#cba6f7' },
      { token: 'keyword.control', foreground: '#f5c2e7' },
      { token: 'keyword.operator', foreground: '#89b4fa' },
      { token: 'string', foreground: '#a6e3a1' },
      { token: 'string.escape', foreground: '#fab387' },
      { token: 'number', foreground: '#fab387' },
      { token: 'type', foreground: '#94e2d5' },
      { token: 'comment', foreground: '#6c7086', fontStyle: 'italic' },
      { token: 'comment.doc', foreground: '#6c7086' },
    ],
    colors: {
      'editor.background': '#121317',
      'editor.foreground': '#F5F5F7',
      'editorLineNumber.foreground': '#5c5c68',
      'editorCursor.foreground': '#0A84FF',
      'editor.selectionBackground': '#0A84FF59',
      'editor.lineHighlightBackground': '#89B4FA1A',
      'editor.lineHighlightBorder': '#00000000',
      'editorWidget.background': '#26262C',
      'editorWidget.border': '#FFFFFF24',
      'editorGutter.background': '#121317',
      'minimap.background': '#121317',
      'minimapSlider.background': '#FFFFFF24',
      'minimapSlider.hoverBackground': '#FFFFFF38',
      'editorError.foreground': '#FF453A',
      'editorError.border': '#00000000',
      'editorWarning.foreground': '#E0C978',
      'editorHoverWidget.background': '#1c1d23',
      'editorHoverWidget.border': '#89B4FA59',
      'editorHoverWidget.foreground': '#E8E8EC',
      'editorOverviewRuler.errorForeground': '#FF453AB3',
    },
  });
}
