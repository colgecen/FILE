import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OpenFile } from '../core/types';
import { EditorCore } from './EditorCore';

const api = vi.hoisted(() => ({
  install: vi.fn(),
  create: vi.fn(),
  getModel: vi.fn(),
  createModel: vi.fn(),
  setModel: vi.fn(),
  dispose: vi.fn(),
}));

vi.mock('./monacoSetup', () => ({
  installMonacoEnvironment: api.install,
  monaco: {
    Uri: {
      from: (parts: { scheme: string; path: string }) => ({ scheme: parts.scheme, path: parts.path }),
    },
    editor: {
      create: api.create,
      getModel: api.getModel,
      createModel: api.createModel,
    },
  },
}));

const editorInstance = { dispose: api.dispose, setModel: api.setModel };

const file: OpenFile = {
  path: '/belge/dosya.ts',
  name: 'dosya.ts',
  content: 'const a = 1;',
  language: 'typescript',
};

beforeEach(() => {
  api.install.mockReset();
  api.create.mockReset();
  api.create.mockReturnValue(editorInstance);
  api.getModel.mockReset();
  api.createModel.mockReset();
  api.setModel.mockReset();
  api.dispose.mockReset();
});

describe('EditorCore', () => {
  it('mountta monaco örneği oluşturur', () => {
    const { container } = render(<EditorCore file={file} />);
    expect(api.install).toHaveBeenCalledTimes(1);
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(container.querySelector('.editor-core__host')).not.toBeNull();
  });

  it('font ve ligatür ayarlarını uygular', () => {
    render(<EditorCore file={null} />);
    const options = api.create.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(options.fontLigatures).toBe(true);
    expect(options.fontFamily).toContain('JetBrains Mono');
  });

  it('dosya yokken yer tutucu gösterir ve modeli boşaltır', () => {
    render(<EditorCore file={null} />);
    expect(screen.getByText('Dosya seçin')).not.toBeNull();
    expect(api.setModel).toHaveBeenCalledWith(null);
  });

  it('mevcut modeli yeniden kullanır', () => {
    const model = { id: 'm1' };
    api.getModel.mockReturnValue(model);
    render(<EditorCore file={file} />);
    expect(api.createModel).not.toHaveBeenCalled();
    expect(api.setModel).toHaveBeenCalledWith(model);
  });

  it('dosya değişince yeni modeli çözer ve uygular', () => {
    api.getModel.mockReturnValue(null);
    const model = { id: 'm2' };
    api.createModel.mockReturnValue(model);
    const { rerender } = render(<EditorCore file={file} />);
    const other: OpenFile = { ...file, path: '/belge/ikinci.ts', name: 'ikinci.ts' };
    rerender(<EditorCore file={other} />);
    expect(api.getModel).toHaveBeenCalledWith({ scheme: 'file', path: '/belge/ikinci.ts' });
    expect(api.createModel).toHaveBeenCalledWith(other.content, 'typescript', {
      scheme: 'file',
      path: '/belge/ikinci.ts',
    });
    expect(api.setModel).toHaveBeenCalledWith(model);
  });

  it('unmountta editörü yok eder', () => {
    const { unmount } = render(<EditorCore file={file} />);
    unmount();
    expect(api.dispose).toHaveBeenCalledTimes(1);
  });
});