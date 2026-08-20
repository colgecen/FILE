import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCore } from '../core/instances';
import { panesModel } from '../core/panes';
import { menuModel, selectableIndexOfItems } from '../menus/menuModel';
import { AppShell } from '../layout/AppShell';
import { PaneManager } from './PaneManager';

vi.mock('../editor/EditorCore', () => ({
  EditorCore: ({ file }: { readonly file: { readonly path: string } | null }) => (
    <div data-testid="editor-core">{file === null ? 'bos' : file.path}</div>
  ),
}));

describe('PaneManager', () => {
  beforeEach(() => {
    panesModel.reset();
    menuModel.close();
  });

  it('tek pane için bir düzenleyici çizer', () => {
    render(<PaneManager file={null} />);
    expect(screen.getAllByTestId('editor-core')).toHaveLength(1);
  });

  it('dikey bölme sonrası iki düzenleyici çizer', () => {
    render(<PaneManager file={null} />);
    act(() => {
      panesModel.split('vertical');
    });
    expect(screen.getAllByTestId('editor-core')).toHaveLength(2);
  });

  it('dosya seçiliyken tüm paneler aynı içeriği gösterir', () => {
    const file = { path: '/a.ts', name: 'a.ts', content: 'x', language: 'ts' };
    render(<PaneManager file={file} />);
    act(() => {
      panesModel.split('horizontal');
    });
    expect(screen.getAllByTestId('editor-core')).toHaveLength(2);
    expect(screen.getAllByText('/a.ts')).toHaveLength(2);
  });

  it('yaprak kapanınca yeniden tek düzenleyiciye döner', () => {
    render(<PaneManager file={null} />);
    act(() => {
      panesModel.split('vertical');
      panesModel.close(panesModel.getState().activePaneId);
    });
    expect(screen.getAllByTestId('editor-core')).toHaveLength(1);
  });

  it('Görünüm menüsünden Dikey Böl seçilince iki panel çizer', async () => {
    render(<AppShell />);
    act(() => {
      menuModel.openAt(3);
    });
    const items = menuModel.itemsAt([]);
    const realIndex = items.findIndex((item) => item.commandId === 'view.split.vertical');
    act(() => {
      menuModel.setActiveItem(selectableIndexOfItems(items, realIndex));
    });
    await act(async () => {
      await createCore().registry.run('menubar.activate');
    });
    expect(screen.getAllByTestId('editor-core')).toHaveLength(2);
    expect(panesModel.getState().layout.direction).toBe('vertical');
  });

  it('Görünüm menüsünden Yatay Böl seçilince iki panel çizer', async () => {
    render(<AppShell />);
    act(() => {
      menuModel.openAt(3);
    });
    const items = menuModel.itemsAt([]);
    const realIndex = items.findIndex((item) => item.commandId === 'view.split.horizontal');
    act(() => {
      menuModel.setActiveItem(selectableIndexOfItems(items, realIndex));
    });
    await act(async () => {
      await createCore().registry.run('menubar.activate');
    });
    expect(screen.getAllByTestId('editor-core')).toHaveLength(2);
    expect(panesModel.getState().layout.direction).toBe('horizontal');
  });
});