import { afterEach, describe, expect, it } from 'vitest';
import { initUiLanguage, uiLanguage, uiMenuLabel, uiText } from './uiLanguage';

afterEach(() => {
  localStorage.removeItem('file:ui-language');
  initUiLanguage();
});

describe('uiLanguage', () => {
  it('varsayılan olarak Türkçe metin döndürür', () => {
    initUiLanguage();
    expect(uiLanguage()).toBe('tr');
    expect(uiText('Dosyalar', 'Files')).toBe('Dosyalar');
    expect(uiMenuLabel('menu-file', 'Dosya')).toBe('Dosya');
  });

  it('İngilizce seçildiğinde görünen etiketleri çevirir', () => {
    localStorage.setItem('file:ui-language', 'en');
    initUiLanguage();
    expect(uiLanguage()).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(uiText('Dosyalar', 'Files')).toBe('Files');
    expect(uiMenuLabel('menu-file', 'Dosya')).toBe('File');
    expect(uiMenuLabel('menu-go', 'Git')).toBe('Git');
  });
});
