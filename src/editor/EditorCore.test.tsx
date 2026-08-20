import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bookmarkModel } from '../core/bookmarks';
import { cursorModel } from '../core/cursor';
import { dirtyTracker } from '../core/dirty';
import { tabsModel } from '../core/tabs';
import type { OpenFile } from '../core/types';
import { viewModeModel } from '../core/viewMode';
import { EditorCore } from './EditorCore';

const api = vi.hoisted(() => ({
  install: vi.fn(),
  create: vi.fn(),
  getModel: vi.fn(),
  createModel: vi.fn(),
  setModel: vi.fn(),
  dispose: vi.fn(),
  defineTheme: vi.fn(),
  setTheme: vi.fn(),
  onDidChangeCursorPosition: vi.fn(),
  getScrolledVisiblePosition: vi.fn(),
  onDidChangeModelContent: vi.fn(),
  editorGetModel: vi.fn(),
  onDidChangeModel: vi.fn(),
  deltaDecorations: vi.fn(),
  updateOptions: vi.fn(),
  Range: vi.fn((startLine, startCol, endLine, endCol) => ({ startLine, startCol, endLine, endCol })),
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
      defineTheme: api.defineTheme,
      setTheme: api.setTheme,
      Range: api.Range,
    },
  },
}));

const editorInstance = {
  dispose: api.dispose,
  setModel: api.setModel,
  onDidChangeCursorPosition: api.onDidChangeCursorPosition,
  getScrolledVisiblePosition: api.getScrolledVisiblePosition,
  getModel: api.editorGetModel,
  onDidChangeModelContent: api.onDidChangeModelContent,
  onDidChangeModel: api.onDidChangeModel,
  deltaDecorations: api.deltaDecorations,
  updateOptions: api.updateOptions,
};

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
  api.defineTheme.mockReset();
  api.setTheme.mockReset();
  api.onDidChangeCursorPosition.mockReset();
  api.onDidChangeCursorPosition.mockImplementation(() => ({ dispose: () => undefined }));
  api.getScrolledVisiblePosition.mockReset();
  api.onDidChangeModelContent.mockReset();
  api.onDidChangeModelContent.mockImplementation(() => ({ dispose: () => undefined }));
  api.editorGetModel.mockReset();
  api.onDidChangeModel.mockReset();
  api.onDidChangeModel.mockImplementation(() => ({ dispose: () => undefined }));
  api.deltaDecorations.mockReset();
  api.deltaDecorations.mockReturnValue([]);
  api.Range.mockReset();
  api.updateOptions.mockReset();
  api.updateOptions.mockImplementation(() => undefined);
  viewModeModel.reset();
  bookmarkModel.reset();
  dirtyTracker.clearDirty(file.path);
  cursorModel.reset();
});

describe('EditorCore', () => {
  it('mountta monaco örneği oluşturur', () => {
    const { container } = render(<EditorCore file={file} />);
    expect(api.install).toHaveBeenCalledTimes(1);
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(container.querySelector('.editor-core__host')).not.toBeNull();
  });

  it('mountta özel temayı tanımlar ve uygular', () => {
    render(<EditorCore file={null} />);
    expect(api.defineTheme).toHaveBeenCalled();
    expect(api.setTheme).toHaveBeenCalled();
  });

  it('font ve ligatür ayarlarını uygular', () => {
    render(<EditorCore file={null} />);
    const options = api.create.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(options.fontLigatures).toBe(true);
    expect(options.fontFamily).toContain('JetBrains Mono');
  });

  it('içi boş blok imleç ve yumuşak hareket ayarlarını uygular', () => {
    render(<EditorCore file={null} />);
    const options = api.create.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(options.cursorStyle).toBe('block-outline');
    expect(options.cursorSmoothCaretAnimation).toBe('on');
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

  it('imleç konumu değişince sönümlenen iz işareti çizer', () => {
    const cursor = {
      current: null as ((event: unknown) => void) | null,
    };
    api.onDidChangeCursorPosition.mockImplementation((fn: (event: unknown) => void) => {
      cursor.current = fn;
      return { dispose: () => undefined };
    });
    api.getScrolledVisiblePosition.mockReturnValue({ left: 40, top: 12, height: 20 });
    api.editorGetModel.mockReturnValue({ uri: { path: file.path } });
    const { container } = render(<EditorCore file={file} />);
    cursor.current?.({ position: {} });
    expect(container.querySelectorAll('.editor-trail__mark')).toHaveLength(1);
  });

  it('görünür konum yoksa iz işareti çizmez', () => {
    const cursor = {
      current: null as ((event: unknown) => void) | null,
    };
    api.onDidChangeCursorPosition.mockImplementation((fn: (event: unknown) => void) => {
      cursor.current = fn;
      return { dispose: () => undefined };
    });
    api.getScrolledVisiblePosition.mockReturnValue(null);
    api.editorGetModel.mockReturnValue({ uri: { path: file.path } });
    const { container } = render(<EditorCore file={file} />);
    cursor.current?.({ position: {} });
    expect(container.querySelectorAll('.editor-trail__mark')).toHaveLength(0);
  });

  it('imleç konumu değişince konum modelini günceller', () => {
    const cursor = {
      current: null as ((event: { position: { lineNumber: number; column: number } }) => void) | null,
    };
    api.onDidChangeCursorPosition.mockImplementation(
      (fn: (event: { position: { lineNumber: number; column: number } }) => void) => {
        cursor.current = fn;
        return { dispose: () => undefined };
      },
    );
    api.editorGetModel.mockReturnValue({ uri: { path: file.path } });
    api.getScrolledVisiblePosition.mockReturnValue(null);
    render(<EditorCore file={file} />);
    cursor.current?.({ position: { lineNumber: 5, column: 3 } });
    expect(cursorModel.getState()).toEqual({ path: file.path, line: 5, column: 3 });
  });

  it('içerik değişince dosyayı kirli işaretler ve içeriği günceller', () => {
    const content = {
      current: null as (() => void) | null,
    };
    api.onDidChangeModelContent.mockImplementation((fn: () => void) => {
      content.current = fn;
      return { dispose: () => undefined };
    });
    api.editorGetModel.mockReturnValue({ uri: { path: file.path }, getValue: () => 'yeni içerik' });
    tabsModel.open(file);
    render(<EditorCore file={file} />);
    content.current?.();
    expect(dirtyTracker.isDirty(file.path)).toBe(true);
    expect(tabsModel.getState().tabs[0]!.file.content).toBe('yeni içerik');
    tabsModel.reset();
  });
});