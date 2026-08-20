import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tabsModel } from '../core/tabs';
import type { OpenFile } from '../core/types';
import { MAX_MODELS, pruneModels, resetModelCache, resolveModel, touchModel } from './editorModel';

const api = vi.hoisted(() => ({
  getModel: vi.fn(),
  createModel: vi.fn(),
  dispose: vi.fn(),
}));

vi.mock('./monacoSetup', () => ({
  monaco: {
    Uri: {
      from: (parts: { scheme: string; path: string }) => ({ scheme: parts.scheme, path: parts.path }),
    },
    editor: {
      getModel: api.getModel,
      createModel: api.createModel,
    },
  },
}));

const file = (path: string, content = 'içerik'): OpenFile => ({
  path,
  name: path.split('/').pop() ?? path,
  content,
  language: 'typescript',
});

function modelOf(path: string): { uri: { path: string }; dispose: typeof api.dispose; getValue: () => string } {
  return {
    uri: { path },
    dispose: api.dispose,
    getValue: () => `${path} İÇERİĞİ`,
  };
}

let created: Map<string, { uri: { path: string }; dispose: typeof api.dispose; getValue: () => string }>;

beforeEach(() => {
  resetModelCache();
  tabsModel.reset();
  api.getModel.mockReset();
  api.createModel.mockReset();
  api.dispose.mockReset();
  created = new Map();
  api.createModel.mockImplementation(
    (_content: string, _language: string, uri: { path: string }) => {
      const model = modelOf(uri.path);
      created.set(uri.path, model);
      return model;
    },
  );
  api.getModel.mockImplementation((uri: { path: string }) => created.get(uri.path) ?? null);
});

afterEach(() => {
  resetModelCache();
  tabsModel.reset();
});

describe('editorModel', () => {
  it('mevcut modeli yeniden kullanır, yoksa oluşturur', () => {
    const first = resolveModel(file('/a.ts'));
    expect(first.uri.path).toBe('/a.ts');
    expect(api.createModel).toHaveBeenCalledTimes(1);
    const again = resolveModel(file('/a.ts'));
    expect(again.uri.path).toBe('/a.ts');
    expect(api.createModel).toHaveBeenCalledTimes(1);
  });

  it('limit aşıldığında en az kullanılan kapalı modeli kapatır', () => {
    tabsModel.open(file('/acik.ts'));
    resolveModel(file('/acik.ts'));
    for (let i = 0; i < MAX_MODELS; i += 1) {
      resolveModel(file(`/kapali-${i}.ts`));
    }
    resolveModel(file('/yeni.ts'));
    expect(api.dispose).toHaveBeenCalledTimes(2);
  });

  it('açık sekmelerin modelleri kapanmaz', () => {
    for (let i = 0; i < MAX_MODELS + 1; i += 1) {
      const path = `/acik-${i}.ts`;
      tabsModel.open(file(path));
      resolveModel(file(path));
    }
    pruneModels();
    expect(api.dispose).not.toHaveBeenCalled();
  });

  it('pruneModels açık sekmeyle sınır içinde kalırsa hiçbir şey kapatmaz', () => {
    for (let i = 0; i < 3; i += 1) {
      resolveModel(file(`/d-${i}.ts`));
    }
    pruneModels();
    expect(api.dispose).not.toHaveBeenCalled();
  });

  it('touchModel kullanım sırasını günceller', () => {
    resolveModel(file('/a.ts'));
    touchModel('/yeni-aktif.ts');
    pruneModels();
    expect(api.dispose).not.toHaveBeenCalled();
  });
});