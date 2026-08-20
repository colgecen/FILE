import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from '../layout/AppShell';

vi.mock('../editor/EditorCore', () => ({
  EditorCore: () => <div data-testid="editor-core-mock" />,
}));

import { createCore } from '../core/instances';
import { explorerModel } from '../core/explorer';
import { focusManager } from '../core/focus';
import { openFilesModel } from '../core/openFiles';
import { paletteModel } from '../core/palette';
import { tabsModel } from '../core/tabs';
import type { OpenFile } from '../core/types';

describe('komut paleti uçtan uca akışlar', () => {
  afterEach(() => {
    act(() => {
      paletteModel.reset([]);
      explorerModel.close();
      openFilesModel.set([]);
      tabsModel.reset();
      while (focusManager.get() !== 'editor') focusManager.returnToPrevious();
    });
  });

  it('Ctrl+I, tree akışıyla gezgini açar ve odaklar', async () => {
    render(<AppShell />);
    fireEvent.keyDown(window, { key: 'i', ctrlKey: true });
    expect(focusManager.get()).toBe('palette');
    fireEvent.change(screen.getByPlaceholderText('Komut yaz…'), { target: { value: 'tree' } });
    await act(async () => {
      fireEvent.keyDown(window, { key: 'Enter' });
    });
    expect(explorerModel.getState().isOpen).toBe(true);
    expect(screen.getByRole('region', { name: 'Dosya gezgini' })).toBeInTheDocument();
    expect(focusManager.get()).toBe('explorer');
  });

  it('gezgindeyken açılan palet Esc ile gezgine döner, panel açık kalır', async () => {
    render(<AppShell />);
    fireEvent.keyDown(window, { key: 'i', ctrlKey: true });
    fireEvent.change(screen.getByPlaceholderText('Komut yaz…'), { target: { value: 'tree' } });
    await act(async () => {
      fireEvent.keyDown(window, { key: 'Enter' });
    });
    expect(focusManager.get()).toBe('explorer');
    fireEvent.keyDown(window, { key: 'i', ctrlKey: true });
    expect(focusManager.get()).toBe('palette');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(focusManager.get()).toBe('explorer');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(explorerModel.getState().isOpen).toBe(true);
    expect(screen.getByRole('region', { name: 'Dosya gezgini' })).toBeInTheDocument();
  });

  it('açık dosya adı aranınca Enter o sekmeye geçirir', () => {
    const a: OpenFile = { path: '/p/a.txt', name: 'a.txt', content: '', language: 'text' };
    const b: OpenFile = { path: '/p/b.txt', name: 'b.txt', content: '', language: 'text' };
    render(<AppShell />);
    act(() => {
      tabsModel.open(b);
      tabsModel.open(a);
      openFilesModel.set([
        { name: 'a.txt', path: '/p/a.txt' },
        { name: 'b.txt', path: '/p/b.txt' },
      ]);
    });
    fireEvent.keyDown(window, { key: 'i', ctrlKey: true });
    fireEvent.change(screen.getByPlaceholderText('Komut yaz…'), { target: { value: 'a.tx' } });
    act(() => {
      fireEvent.keyDown(window, { key: 'Enter' });
    });
    expect(tabsModel.getState().activeId).toBe('/p/a.txt');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('yön tuşları seçimi taşır, Enter seçilen ikinci komutu çalıştırır', () => {
    const core = createCore();
    let executed: string | null = null;
    core.registry.register({
      id: 'test.first',
      title: 'Bayrak 1',
      category: 'file',
      run: () => {
        executed = 'first';
        return { ok: true };
      },
    });
    core.registry.register({
      id: 'test.second',
      title: 'Bayrak 2',
      category: 'file',
      run: () => {
        executed = 'second';
        return { ok: true };
      },
    });
    render(<AppShell />);
    fireEvent.keyDown(window, { key: 'i', ctrlKey: true });
    act(() => {
      paletteModel.setQuery('bayrak', core.registry.list());
    });
    expect(paletteModel.getState().activeIndex).toBe(0);
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(paletteModel.getState().activeIndex).toBe(1);
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(paletteModel.getState().activeIndex).toBe(0);
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    act(() => {
      fireEvent.keyDown(window, { key: 'Enter' });
    });
    expect(executed).toBe('second');
    expect(focusManager.get()).toBe('editor');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});