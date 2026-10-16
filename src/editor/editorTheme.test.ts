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
    expect(colors['editor.background']).toBe('#121317');
    expect(colors['editor.foreground']).toBe('#F5F5F7');
    expect(colors['editorCursor.foreground']).toBe('#0A84FF');
    expect(colors['editorWidget.background']).toBe('#26262C');
  });

  it('anahtar kelime, string ve yorum renklerini tanımlar', () => {
    defineEditorTheme();
    const { rules } = themeOfLastCall();
    const colorOf = (token: string): string | undefined =>
      rules.find((rule) => rule.token === token)?.foreground;
    expect(colorOf('keyword')).toBe('#cba6f7');
    expect(colorOf('keyword.control')).toBe('#f5c2e7');
    expect(colorOf('string')).toBe('#a6e3a1');
    expect(colorOf('type')).toBe('#94e2d5');
    expect(colorOf('comment')).toBe('#6c7086');
  });

  it('teşhis işaretlerini hata renginde tanımlar', () => {
    defineEditorTheme();
    const { colors } = themeOfLastCall();
    expect(colors['editorError.foreground']).toBe('#FF453A');
  });
});