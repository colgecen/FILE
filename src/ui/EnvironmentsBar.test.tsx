import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { environmentsModel } from '../core/environments';
import { explorerModel } from '../core/explorer';
import { openFilesModel } from '../core/openFiles';
import { tabsModel } from '../core/tabs';
import { EnvironmentsBar } from './EnvironmentsBar';

afterEach(() => {
  cleanup();
  environmentsModel.reset();
  tabsModel.reset();
  openFilesModel.set([]);
  explorerModel.settle([], null);
  vi.mocked(window.api.openFolder).mockResolvedValue(null);
  vi.mocked(window.api.readDir).mockResolvedValue([]);
});

describe('EnvironmentsBar', () => {
  it('ortam yokken ipucu gösterir', () => {
    render(<EnvironmentsBar />);
    expect(screen.getByText('Ortam yok')).not.toBeNull();
  });

  it('çiplere tıklayınca ortam ve sekmeler değişir', async () => {
    act(() => {
      environmentsModel.add('/proj/a', 'a');
      environmentsModel.storeTabs('/proj/a', {
        files: [{ path: '/proj/a/a.ts', name: 'a.ts', content: '', language: 'typescript' }],
        activeId: '/proj/a/a.ts',
      });
      environmentsModel.add('/proj/b', 'b');
    });
    render(<EnvironmentsBar />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Ortam: a' }));
    });
    expect(environmentsModel.getState().activeId).toBe('/proj/a');
    expect(tabsModel.getState().activeId).toBe('/proj/a/a.ts');
  });

  it('komutla eklenen ortam çip olarak görünür', async () => {
    vi.mocked(window.api.openFolder).mockResolvedValue({ path: '/proj/c', name: 'c' });
    render(<EnvironmentsBar />);
    const { createCore } = await import('../core/instances');
    await act(async () => {
      await createCore().registry.run('env.add');
    });
    expect(environmentsModel.getState().activeId).toBe('/proj/c');
    expect(screen.getByRole('button', { name: 'Ortam: c' })).not.toBeNull();
  });

  it('çip üzerindeki çarpı ortamı kapatır', async () => {
    act(() => {
      environmentsModel.add('/proj/a', 'a');
      environmentsModel.add('/proj/b', 'b');
    });
    render(<EnvironmentsBar />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Ortamı kapat: b' }));
    });
    expect(environmentsModel.getState().environments).toHaveLength(1);
    expect(environmentsModel.getState().activeId).toBe('/proj/a');
  });
});
