import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from '../layout/AppShell';

vi.mock('../editor/EditorCore', () => ({
  EditorCore: () => <div data-testid="editor-core-mock" />,
}));

import { dirtyTracker } from '../core/dirty';
import { createCore } from '../core/instances';
import { openFilesModel } from '../core/openFiles';
import { recentFiles } from '../core/recentFiles';
import { tabsModel } from '../core/tabs';
import type { OpenFile } from '../core/types';

describe('dosya aç/kaydet uçtan uca akışlar', () => {
  afterEach(() => {
    act(() => {
      tabsModel.reset();
      recentFiles.reset();
      openFilesModel.set([]);
      dirtyTracker.snapshot().forEach((path) => dirtyTracker.clearDirty(path));
    });
    vi.clearAllMocks();
  });

  it('Dosya Aç komutu dialogu açar, seçilen doyayı sekmeye yükler', async () => {
    vi.mocked(window.api.openFile).mockResolvedValue({
      path: '/proje/main.ts',
      name: 'main.ts',
      content: 'const a = 1;',
      language: 'typescript',
    });
    render(<AppShell />);
    await act(async () => {
      await createCore().registry.run('file.open.file');
    });
    const state = tabsModel.getState();
    expect(state.tabs).toHaveLength(1);
    expect(state.activeId).toBe('/proje/main.ts');
    expect(state.tabs[0]!.file.content).toBe('const a = 1;');
    expect(screen.getByTestId('status-file')).toHaveTextContent('main.ts');
    expect(recentFiles.list().map((entry) => entry.path)).toContain('/proje/main.ts');
  });

  it('dialog iptal edilirse sekme açılmaz', async () => {
    vi.mocked(window.api.openFile).mockResolvedValue(null);
    render(<AppShell />);
    await act(async () => {
      await createCore().registry.run('file.open.file');
    });
    expect(tabsModel.getState().tabs).toHaveLength(0);
  });

  it('Kaydet komutu kirli sekmeyi diske yazar ve rozeti temizler', async () => {
    vi.mocked(window.api.writeFile).mockResolvedValue({ ok: true, path: '/proje/main.ts' });
    const file: OpenFile = { path: '/proje/main.ts', name: 'main.ts', content: 'degisti', language: 'ts' };
    render(<AppShell />);
    act(() => {
      tabsModel.open(file);
      dirtyTracker.markDirty(file.path);
    });
    expect(screen.getByText('●')).toBeInTheDocument();
    await act(async () => {
      await createCore().registry.run('file.save');
    });
    expect(window.api.writeFile).toHaveBeenCalledWith('/proje/main.ts', 'degisti');
    expect(dirtyTracker.isDirty(file.path)).toBe(false);
    expect(screen.queryByText('●')).not.toBeInTheDocument();
  });

  it('Tümünü Kaydet yalnız kirli sekmeleri yazar', async () => {
    vi.mocked(window.api.writeFile).mockResolvedValue({ ok: true, path: '' });
    const a: OpenFile = { path: '/x/a.ts', name: 'a.ts', content: 'aaa', language: 'ts' };
    const b: OpenFile = { path: '/x/b.ts', name: 'b.ts', content: 'bbb', language: 'ts' };
    render(<AppShell />);
    act(() => {
      tabsModel.open(a);
      tabsModel.open(b);
      dirtyTracker.markDirty(a.path);
    });
    await act(async () => {
      await createCore().registry.run('file.save.all');
    });
    expect(window.api.writeFile).toHaveBeenCalledTimes(1);
    expect(window.api.writeFile).toHaveBeenCalledWith('/x/a.ts', 'aaa');
    expect(dirtyTracker.isDirty(b.path)).toBe(false);
  });
});