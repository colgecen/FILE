import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { panesModel } from '../core/panes';
import { PaneManager } from './PaneManager';

vi.mock('../editor/EditorCore', () => ({
  EditorCore: ({ file }: { readonly file: { readonly path: string } | null }) => (
    <div data-testid="editor-core">{file === null ? 'bos' : file.path}</div>
  ),
}));

describe('PaneManager', () => {
  beforeEach(() => {
    panesModel.reset();
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
});