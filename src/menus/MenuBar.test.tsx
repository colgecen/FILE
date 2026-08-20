import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from '../layout/AppShell';

vi.mock('../editor/EditorCore', () => ({
  EditorCore: () => <div data-testid="editor-core-mock" />,
}));
import { menuModel } from './menuModel';
import { paletteModel } from '../core/palette';
import { recentFiles } from '../core/recentFiles';

describe('MenuBar', () => {
  afterEach(() => {
    act(() => {
      menuModel.openAt(0);
      menuModel.close();
      paletteModel.reset([]);
      recentFiles.reset();
    });
  });

  const renderShell = (): ReturnType<typeof render> => render(<AppShell />);

  it('dokuz üst başlığı çizer', () => {
    renderShell();
    expect(screen.getAllByRole('button')).toHaveLength(9);
    expect(screen.getByText('Dosya')).toBeInTheDocument();
    expect(screen.getByText('Yapay Zekâ')).toBeInTheDocument();
  });

  it('açılan alt menü öğelerini panoda gösterir', () => {
    renderShell();
    act(() => {
      menuModel.openAt(0);
    });
    expect(screen.getByText('Yeni Dosya')).toBeInTheDocument();
    expect(screen.getByText('Çıkış')).toBeInTheDocument();
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('aktif öğeyi işaretler', () => {
    renderShell();
    act(() => {
      menuModel.openAt(0);
      menuModel.moveItem(2);
    });
    const items = screen.getAllByRole('menuitem');
    const active = items.find((item) => item.getAttribute('data-active') === 'true');
    expect(active).toBeDefined();
  });

  it('alt menü öğesi çocuk panelini açık gösterir', () => {
    renderShell();
    act(() => {
      menuModel.openAt(0);
      menuModel.setActiveItem(5);
      menuModel.activate();
    });
    expect(screen.getByText('Kayıt Yok')).toBeInTheDocument();
    expect(screen.getAllByRole('menu')).toHaveLength(2);
  });

  it('yer tutucu komutlar Yakında rozeti taşır', () => {
    renderShell();
    act(() => {
      menuModel.openAt(0);
    });
    expect(screen.getAllByText('Yakında').length).toBeGreaterThan(0);
  });

  it('son kullanılanlar varsa dinamik olarak alt menüde listelenir', () => {
    renderShell();
    act(() => {
      recentFiles.add('/proje/main.ts');
      recentFiles.add('/proje/util.ts');
      menuModel.openAt(0);
      menuModel.setActiveItem(5);
      menuModel.activate();
    });
    expect(screen.getByText('main.ts')).toBeInTheDocument();
    expect(screen.getByText('util.ts')).toBeInTheDocument();
    expect(screen.queryByText('Kayıt Yok')).not.toBeInTheDocument();
  });
});