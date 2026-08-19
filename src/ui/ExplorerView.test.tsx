import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { AppShell } from '../layout/AppShell';
import { explorerModel } from '../core/explorer';
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
      explorerModel.settle([], '/');
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
});