import { afterEach, describe, expect, it } from 'vitest';
import { environmentsModel } from './environments';

afterEach(() => {
  environmentsModel.reset();
});

describe('EnvironmentsModel', () => {
  it('ortam ekler ve aktif yapar', () => {
    const id = environmentsModel.add('/proj/a', 'a');
    const state = environmentsModel.getState();
    expect(state.environments).toHaveLength(1);
    expect(state.activeId).toBe(id);
    expect(state.environments[0]).toMatchObject({ rootPath: '/proj/a', name: 'a' });
  });

  it('aynı kök ikinci kez eklenmez, aktif yapılır', () => {
    const first = environmentsModel.add('/proj/a', 'a');
    environmentsModel.add('/proj/b', 'b');
    const again = environmentsModel.add('/proj/a', 'a');
    expect(again).toBe(first);
    expect(environmentsModel.getState().environments).toHaveLength(2);
    expect(environmentsModel.getState().activeId).toBe(first);
  });

  it('sekmeleri ortam kaydına yazar', () => {
    const id = environmentsModel.add('/proj/a', 'a');
    environmentsModel.storeTabs(id, {
      files: [{ path: '/proj/a/f.ts', name: 'f.ts', content: '', language: 'typescript' }],
      activeId: '/proj/a/f.ts',
    });
    expect(environmentsModel.active()?.tabs.files).toHaveLength(1);
  });

  it('son ortam kapanınca aktif boşalır', () => {
    const id = environmentsModel.add('/proj/a', 'a');
    environmentsModel.remove(id);
    expect(environmentsModel.getState().environments).toHaveLength(0);
    expect(environmentsModel.getState().activeId).toBeNull();
  });

  it('aktif kapanınca komşuya geçer', () => {
    environmentsModel.add('/proj/a', 'a');
    const b = environmentsModel.add('/proj/b', 'b');
    environmentsModel.remove(b);
    expect(environmentsModel.getState().activeId).toBe('/proj/a');
  });
});
