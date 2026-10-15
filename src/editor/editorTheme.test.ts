import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineEditorTheme, EDITOR_THEME_NAME } from './editorTheme';

const defineTheme = vi.hoisted(() => vi.fn());

vi.mock('./monacoSetup', () => ({
  monaco: {
    editor: {
      defineTheme,
    },
  },
}));

type ThemeData = {
  readonly rules: readonly { readonly token: string; readonly foreground?: string }[];
  readonly colors: Record<string, string>;
};

const themeOfLastCall = (): ThemeData => defineTheme.mock.calls[0]?.[1] as ThemeData;

beforeEach(() => {
  defineTheme.mockReset();
});

describe('defineEditorTheme', () => {
  it('özel tema adıyla kaydeder', () => {
    defineEditorTheme();
    expect(defineTheme).toHaveBeenCalledWith(EDITOR_THEME_NAME, expect.anything());
  });

  it('zemin, metin ve imleç tokenlarını uygular', () => {
    defineEditorTheme();
    const { colors } = themeOfLastCall();
    expect(colors['editor.background']).toBe('#0A141F');
    expect(colors['editor.foreground']).toBe('#FFFFFF');
    expect(colors['editorCursor.foreground']).toBe('#00E5FF');
    expect(colors['editorWidget.background']).toBe('#0D1B2A');
  });

  it('anahtar kelime, string ve yorum renklerini tanımlar', () => {
    defineEditorTheme();
    const { rules } = themeOfLastCall();
    const colorOf = (token: string): string | undefined =>
      rules.find((rule) => rule.token === token)?.foreground;
    expect(colorOf('keyword')).toBe('#00d2ff');
    expect(colorOf('keyword.control')).toBe('#c586c0');
    expect(colorOf('string')).toBe('#ce9178');
    expect(colorOf('type')).toBe('#7c4dff');
    expect(colorOf('comment')).toBe('#4a6b8c');
  });

  it('teşhis işaretlerini mavi tanımlar', () => {
    defineEditorTheme();
    const { colors } = themeOfLastCall();
    expect(colors['editorError.foreground']).toBe('#00E5FF');
  });
});