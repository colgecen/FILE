import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { reportError } from '../core/appErrors';
import { onFocusZoneChange } from '../core/focus';
import { errorStore } from '../core/errorStore';
import { environmentsModel } from '../core/environments';
import { explorerModel } from '../core/explorer';
import { tabsModel } from '../core/tabs';
import type { OpenFile } from '../core/types';
import { AppShell } from './AppShell';

vi.mock('../editor/EditorCore', () => ({
  EditorCore: () => <div data-testid="editor-core-mock" />,
}));

describe('AppShell', () => {
  it('F1 ile menü bölgesine geçiş yapar', () => {
    const zones: string[] = [];
    const unsubscribe = onFocusZoneChange((zone) => zones.push(zone));
    render(<AppShell />);
    fireEvent.keyDown(window, { key: 'F1' });
    expect(zones).toContain('menubar');
    unsubscribe();
  });

  it('hata raporu gelince kırmızı hata göstergesini yansıtır', () => {
    errorStore.clear();
    const { container } = render(<AppShell />);
    expect(container.querySelector('.error-indicator')).toBeNull();
    act(() => {
      reportError('Test hatası');
    });
    expect(container.querySelector('.error-indicator')).not.toBeNull();
    errorStore.clear();
  });

  it('eşleşmeyen tuşta komut uyarısı üretmez', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<AppShell />);
    fireEvent.keyDown(window, { key: 'q' });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('proje sekmelerini üst şeritte, dosya sekmelerini editör üstünde çizer', () => {
    const file: OpenFile = { path: '/p/a.ts', name: 'a.ts', content: '', language: 'typescript' };
    act(() => {
      environmentsModel.add('/p', 'p');
      tabsModel.open(file);
      explorerModel.close();
    });
    const { container } = render(<AppShell />);
    const envbar = container.querySelector('.app-shell__envbar')!;
    expect(envbar.querySelector('.env-bar__chip')).not.toBeNull();
    const editor = container.querySelector('.app-shell__editor')!;
    expect(editor.querySelector('.tab-bar')).not.toBeNull();
    expect(editor.querySelector('.breadcrumb')).not.toBeNull();
    expect(container.querySelector('.explorer-view')).toBeNull();
    act(() => {
      tabsModel.reset();
      environmentsModel.reset();
    });
  });
});