import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from '../layout/AppShell';
import { explorerModel } from '../core/explorer';
import { createCore } from '../core/instances';
import { paletteModel } from '../core/palette';
import { focusManager } from '../core/focus';
import type { FileNode } from '../core/types';

const folder = (path: string, name: string, children: readonly FileNode[]): FileNode => ({
  path,
  name,
  kind: 'directory',
  isOpen: false,
  children,
});

const file = (path: string, name: string): FileNode => ({
  path,
  name,
  kind: 'file',
  isOpen: false,
  children: [],
});

const TREE: readonly FileNode[] = [
  folder('/proje', 'proje', [
    folder('/proje/src', 'src', [file('/proje/src/main.ts', 'main.ts')]),
    file('/proje/readme.md', 'readme.md'),
  ]),
];

describe('ExplorerView', () => {
  afterEach(() => {
    act(() => {
      explorerModel.close();
      explorerModel.settle([], null);
      while (focusManager.get() !== 'editor') focusManager.returnToPrevious();
    });
  });

  it('kapalıyken gezgin görünmez', () => {
    render(<AppShell />);
    expect(screen.queryByRole('region', { name: 'Dosya gezgini' })).toBeNull();
  });

  it('açıkken sol panel başlığıyla görünür', () => {
    render(<AppShell />);
    act(() => {
      explorerModel.open();
    });
    const pane = screen.getByRole('region', { name: 'Dosya gezgini' });
    expect(pane).toBeInTheDocument();
    expect(pane).toHaveClass('explorer-view');
    expect(screen.getByText('GEZGİN')).toBeInTheDocument();
  });

  it('ağaç satırları girinti sınıflarıyla çizilir', () => {
    render(<AppShell />);
    act(() => {
      explorerModel.open();
      explorerModel.settle(TREE, '/proje');
    });
    const row = screen.getByText('main.ts').closest('.explorer-row');
    expect(row).toHaveClass('explorer-row--depth-2');
    const root = screen.getByText('proje').closest('.explorer-row');
    expect(root).toHaveClass('explorer-row--depth-0');
  });

  it('ilk satır seçili gelir ve vurgulanır', () => {
    render(<AppShell />);
    act(() => {
      explorerModel.open();
      explorerModel.settle(TREE, '/proje');
    });
    expect(screen.getByText('proje').closest('.explorer-row')).toHaveClass('explorer-row--active');
  });

  it('klasör ve dosya tipleri farklı ikonla gösterilir', () => {
    render(<AppShell />);
    act(() => {
      explorerModel.open();
      explorerModel.settle(TREE, '/proje');
    });
    const dirIcon = screen.getByText('proje').closest('.explorer-row')!.querySelector(
      '.explorer-row__icon',
    );
    const fileIcon = screen.getByText('main.ts').closest('.explorer-row')!.querySelector(
      '.explorer-row__icon',
    );
    expect(dirIcon).toHaveClass('explorer-row__icon--dir');
    expect(fileIcon).toHaveClass('explorer-row__icon--file');
    expect(dirIcon?.textContent).toBe('▣');
    expect(fileIcon?.textContent).toBe('◦');
  });

  it('genişletilmiş klasör aşağı, daraltılmış sağa oku gösterir', () => {
    render(<AppShell />);
    act(() => {
      explorerModel.open();
      explorerModel.settle(TREE, '/proje');
    });
    const rootState = screen.getByText('proje').closest('.explorer-row')!.querySelector(
      '.explorer-row__state',
    );
    expect(rootState?.textContent).toBe('▾');
    act(() => {
      explorerModel.toggleExpanded('/proje');
    });
    const collapsedState = screen.getByText('proje').closest('.explorer-row')!.querySelector(
      '.explorer-row__state',
    );
    expect(collapsedState?.textContent).toBe('▸');
  });

  it('dosya satırında durum göstergesi boştur', () => {
    render(<AppShell />);
    act(() => {
      explorerModel.open();
      explorerModel.settle(TREE, '/proje');
    });
    const fileState = screen.getByText('main.ts').closest('.explorer-row')!.querySelector(
      '.explorer-row__state',
    );
    expect(fileState?.textContent).toBe('');
  });

  it('yükleme sırasında bekleniyor göstergesi görünür', () => {
    render(<AppShell />);
    act(() => {
      explorerModel.open();
      explorerModel.setLoading(true);
    });
    expect(screen.getByRole('status')).toHaveTextContent('YÜKLENİYOR…');
  });

  it('hata kırmızı göstergeyle yansıtılır', () => {
    render(<AppShell />);
    act(() => {
      explorerModel.open();
      explorerModel.setError('Erişim reddedildi');
    });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('explorer-view__error');
    expect(alert).toHaveTextContent('Erişim reddedildi');
  });

  it('ok tuşları seçim klasördeyken klasörler arasında gezer', () => {
    render(<AppShell />);
    act(() => {
      explorerModel.open();
      explorerModel.settle(TREE, '/proje');
      focusManager.set('explorer');
    });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(explorerModel.getState().selectedPath).toBe('/proje/src');
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(explorerModel.getState().selectedPath).toBe('/proje');
  });

  it('Tab dosyalar arasında gezer, Shift+Tab geri döner', () => {
    render(<AppShell />);
    act(() => {
      explorerModel.open();
      explorerModel.settle(TREE, '/proje');
      focusManager.set('explorer');
    });
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(explorerModel.getState().selectedPath).toBe('/proje/readme.md');
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(explorerModel.getState().selectedPath).toBe('/proje/src/main.ts');
  });

  it('seçim dosyadayken ok tuşları dosyalar arasında gezer', () => {
    render(<AppShell />);
    act(() => {
      explorerModel.open();
      explorerModel.settle(TREE, '/proje');
      explorerModel.select('/proje/src/main.ts');
      focusManager.set('explorer');
    });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(explorerModel.getState().selectedPath).toBe('/proje/readme.md');
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(explorerModel.getState().selectedPath).toBe('/proje/src/main.ts');
  });
});

describe('ExplorerView kök yükleme', () => {
  afterEach(() => {
    act(() => {
      explorerModel.close();
      explorerModel.settle([], null);
    });
    vi.mocked(window.api.openFolder).mockResolvedValue(null);
  });

  it('tree komutu kök klasörü seçtirip yükler', async () => {
    vi.mocked(window.api.openFolder).mockResolvedValue({ path: '/proje', name: 'proje' });
    vi.mocked(window.api.readDir).mockResolvedValue([
      { name: 'main.ts', path: '/proje/main.ts', kind: 'file' },
      { name: 'docs', path: '/proje/docs', kind: 'directory' },
    ]);
    render(<AppShell />);
    fireEvent.keyDown(window, { key: 'i', ctrlKey: true });
    act(() => {
      paletteModel.setQuery('tree', createCore().registry.list());
    });
    await act(async () => {
      fireEvent.keyDown(window, { key: 'Enter' });
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(explorerModel.getState().rootPath).toBe('/proje');
    expect(screen.getByText('main.ts')).toBeInTheDocument();
    expect(focusManager.get()).toBe('explorer');
  });
});