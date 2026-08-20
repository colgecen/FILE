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
});