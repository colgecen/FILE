import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AppShell } from '../layout/AppShell';
import { MenuBar } from './MenuBar';
import { menuModel } from './menuModel';

describe('MenuBar', () => {
  afterEach(() => {
    act(() => {
      menuModel.close();
    });
  });

  it('dokuz üst başlığı çizer', () => {
    render(
      <AppShell>
        <MenuBar />
      </AppShell>,
    );
    expect(screen.getAllByRole('button')).toHaveLength(9);
    expect(screen.getByText('Dosya')).toBeInTheDocument();
    expect(screen.getByText('Yapay Zekâ')).toBeInTheDocument();
  });

  it('açılan alt menü öğelerini panoda gösterir', () => {
    render(
      <AppShell>
        <MenuBar />
      </AppShell>,
    );
    act(() => {
      menuModel.openAt(0);
    });
    expect(screen.getByText('Yeni Dosya')).toBeInTheDocument();
    expect(screen.getByText('Çıkış')).toBeInTheDocument();
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('aktif öğeyi işaretler', () => {
    render(
      <AppShell>
        <MenuBar />
      </AppShell>,
    );
    act(() => {
      menuModel.openAt(0);
      menuModel.moveItem(2);
    });
    const items = screen.getAllByRole('menuitem');
    const active = items.find((item) => item.getAttribute('data-active') === 'true');
    expect(active).toBeDefined();
  });
});