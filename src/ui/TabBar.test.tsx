import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { dirtyTracker } from '../core/dirty';
import { tabsModel } from '../core/tabs';
import type { OpenFile } from '../core/types';
import { TabBar } from './TabBar';

import { cleanup } from '@testing-library/react';

afterEach(cleanup);

const file = (path: string, name: string): OpenFile => ({
  path,
  name,
  content: 'içerik',
  language: 'typescript',
});

beforeEach(() => {
  tabsModel.reset();
  dirtyTracker.clearDirty('/kirli.ts');
});

describe('TabBar', () => {
  it('açık sekmeleri sırayla gösterir', () => {
    tabsModel.open(file('/a.ts', 'a.ts'));
    tabsModel.open(file('/b.ts', 'b.ts'));
    render(<TabBar />);
    expect(screen.getByRole('tab', { name: /a\.ts/ })).not.toBeNull();
    expect(screen.getByRole('tab', { name: /b\.ts/ })).not.toBeNull();
  });

  it('aktif sekmeyi vurgular', () => {
    tabsModel.open(file('/a.ts', 'a.ts'));
    tabsModel.open(file('/b.ts', 'b.ts'));
    tabsModel.activate('/a.ts');
    render(<TabBar />);
    const active = document.querySelector('.tab-bar__item--active');
    expect(active).not.toBeNull();
  });

  it('kirli dosyada nokta gösterir', () => {
    tabsModel.open(file('/kirli.ts', 'kirli.ts'));
    dirtyTracker.markDirty('/kirli.ts');
    render(<TabBar />);
    expect(document.querySelector('.tab-bar__dirty')).not.toBeNull();
  });

  it('kapat düğmesi sekmeyi kapatır ve kirli işaretini temizler', () => {
    tabsModel.open(file('/kirli.ts', 'kirli.ts'));
    dirtyTracker.markDirty('/kirli.ts');
    render(<TabBar />);
    fireEvent.click(screen.getByRole('button', { name: 'Sekmeyi kapat: kirli.ts' }));
    expect(tabsModel.getState().tabs).toHaveLength(0);
    expect(dirtyTracker.isDirty('/kirli.ts')).toBe(false);
  });
});