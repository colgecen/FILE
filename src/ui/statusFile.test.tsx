import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cursorModel } from '../core/cursor';
import { tabsModel } from '../core/tabs';
import type { OpenFile } from '../core/types';
import { AppShell } from '../layout/AppShell';
import { StatusBar } from './StatusBar';

vi.mock('../editor/EditorCore', () => ({
  EditorCore: () => <div data-testid="editor-core-mock" />,
}));

describe('StatusBar dosya bilgisi', () => {
  const file: OpenFile = { path: '/proje/main.ts', name: 'main.ts', content: 'x', language: 'ts' };
  const otherFile: OpenFile = { path: '/depo/a.txt', name: 'a.txt', content: 'x', language: 'text' };

  afterEach(() => {
    act(() => {
      tabsModel.reset();
      cursorModel.reset();
    });
  });

  it('aktif dosya adını gösterir', () => {
    render(<AppShell />);
    act(() => {
      tabsModel.open(file);
    });
    expect(screen.getByTestId('status-file')).toHaveTextContent('main.ts');
  });

  it('dosya yokken Dosya Yok yazar', () => {
    render(<StatusBar />);
    expect(screen.getByTestId('status-file')).toHaveTextContent('Dosya Yok');
  });

  it('imleç konumunu satır:sütun olarak gösterir', () => {
    render(<AppShell />);
    act(() => {
      tabsModel.open(file);
      cursorModel.update(file.path, 12, 4);
    });
    expect(screen.getByTestId('status-position')).toHaveTextContent('12:4');
  });

  it('imleç hareket etmemişse 1:1 gösterir', () => {
    render(<AppShell />);
    expect(screen.getByTestId('status-position')).toHaveTextContent('1:1');
  });

  it('git branch varsa gösterir ve kirliyse işaretler', async () => {
    vi.mocked(window.api.gitBranch).mockResolvedValue({ name: 'main', dirty: true });
    render(<AppShell />);
    await act(async () => {
      tabsModel.open(file);
    });
    expect(await screen.findByTestId('status-branch')).toHaveTextContent('* main');
    vi.mocked(window.api.gitBranch).mockResolvedValue(null);
  });

  it('git branch yoksa gösterge gizlenir', async () => {
    vi.mocked(window.api.gitBranch).mockResolvedValue(null);
    render(<AppShell />);
    await act(async () => {
      tabsModel.open(otherFile);
    });
    expect(screen.queryByTestId('status-branch')).not.toBeInTheDocument();
  });
});