import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { dirtyTracker } from '../core/dirty';
import { tabsModel } from '../core/tabs';
import { panesModel } from '../core/panes';
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

  it('tooltip tam yol içerir ve kirliyse Kaydedilmedi ekler', () => {
    tabsModel.open(file('/derin/yol/dosya.ts', 'dosya.ts'));
    dirtyTracker.markDirty('/derin/yol/dosya.ts');
    render(<TabBar />);
    const tab = screen.getByRole('tab', { name: /dosya\.ts/ });
    expect(tab.getAttribute('title')).toBe('/derin/yol/dosya.ts • Kaydedilmedi');
  });

  it('orta tık sekmeyi kapatır', () => {
    tabsModel.open(file('/orta.ts', 'orta.ts'));
    render(<TabBar />);
    const tab = screen.getByRole('tab', { name: /orta\.ts/ });
    fireEvent.mouseDown(tab, { button: 1 });
    expect(tabsModel.getState().tabs).toHaveLength(0);
  });

  it('çift tık sekmeyi kapatır', () => {
    tabsModel.open(file('/cift.ts', 'cift.ts'));
    render(<TabBar />);
    const tab = screen.getByRole('tab', { name: /cift\.ts/ });
    fireEvent.doubleClick(tab);
    expect(tabsModel.getState().tabs).toHaveLength(0);
  });

  it('uzantıya göre dil logosu gösterir', () => {
    tabsModel.open(file('/app.ts', 'app.ts'));
    tabsModel.open(file('/style.css', 'style.css'));
    render(<TabBar />);
    expect(document.querySelector('[data-logo="ts"]')).not.toBeNull();
    expect(document.querySelector('[data-logo="css"]')).not.toBeNull();
  });

  it('sekme yokken karşılama sekmesi göstermez', () => {
    render(<TabBar />);
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.getByText('Açık sekme yok')).not.toBeNull();
  });

  it('sağ kutuda panel işlemleri vardır ve dikey böler', () => {
    panesModel.reset();
    render(<TabBar />);
    const toolbar = screen.getByRole('toolbar', { name: 'Panel işlemleri' });
    expect(toolbar).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Dikey Böl' }));
    expect(panesModel.getState().layout.direction).toBe('vertical');
    panesModel.reset();
  });
});