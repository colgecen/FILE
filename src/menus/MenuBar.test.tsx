import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from '../layout/AppShell';

vi.mock('../editor/EditorCore', () => ({
  EditorCore: () => <div data-testid="editor-core-mock" />,
}));
import { menuModel } from './menuModel';
import { paletteModel } from '../core/palette';
import { recentFiles } from '../core/recentFiles';
import { focusManager } from '../core/focus';

describe('MenuBar', () => {
  afterEach(() => {
    act(() => {
      menuModel.openAt(0);
      menuModel.close();
      paletteModel.reset([]);
      recentFiles.reset();
      while (focusManager.get() !== 'editor') focusManager.returnToPrevious();
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
    // Dosya menüsü artık gerçek komutlarla dolu — Yakında içermemeli (B1 tamamlandı)
    expect(screen.queryAllByText('Yakında').length).toBe(0);
    act(() => {
      menuModel.openAt(5);
    });
    // Çalıştır menüsü artık gerçek komutlarla dolu — Yakında içermemeli (B4 tamamlandı)
    expect(screen.queryAllByText('Yakında').length).toBe(0);
    act(() => {
      menuModel.openAt(7);
    });
    // Yardım menüsü hâlâ Yakında içerir (B5 öncesi)
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

describe('menü klavye akışı', () => {
  afterEach(() => {
    act(() => {
      menuModel.openAt(0);
      menuModel.close();
      paletteModel.reset([]);
      while (focusManager.get() !== 'editor') focusManager.returnToPrevious();
    });
  });

  it('F1 menüyü açar, ilk üst buton seçilir', () => {
    render(<AppShell />);
    fireEvent.keyDown(window, { key: 'F1' });
    expect(focusManager.get()).toBe('menubar');
    expect(menuModel.getState().activeTop).toBe(0);
    expect(menuModel.getState().openTop).toBe(0);
  });

  it('sağ/sol yön üst butonlarda gezdirir', () => {
    render(<AppShell />);
    fireEvent.keyDown(window, { key: 'F1' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(menuModel.getState().activeTop).toBe(1);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(menuModel.getState().activeTop).toBe(1);
  });

  it('aşağı/yukarı ve Tab alt menü öğelerinde gezdirir', () => {
    render(<AppShell />);
    fireEvent.keyDown(window, { key: 'F1' });
    const first = menuModel.getState().activeItem ?? 0;
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(menuModel.getState().activeItem).not.toBe(first);
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(menuModel.getState().activeItem).toBe(first);
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(menuModel.getState().activeItem).not.toBe(first);
  });

  it('sağ/sol yön açık menüyü üst butonlarla taşır, odak menüde kalır', () => {
    render(<AppShell />);
    fireEvent.keyDown(window, { key: 'F1' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(menuModel.getState().openTop).toBe(1);
    expect(menuModel.getState().activeTop).toBe(1);
    expect(focusManager.get()).toBe('menubar');
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(menuModel.getState().openTop).toBe(0);
  });

  it('Esc açık menüyü kapatır ve odağı editöre bırakır', () => {
    render(<AppShell />);
    fireEvent.keyDown(window, { key: 'F1' });
    expect(focusManager.get()).toBe('menubar');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(focusManager.get()).toBe('editor');
    expect(menuModel.getState().openTop).toBeNull();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('Esc derin alt menüyü adım adım kapatır', () => {
    render(<AppShell />);
    fireEvent.keyDown(window, { key: 'F1' });
    act(() => {
      menuModel.setActiveItem(5);
    });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(menuModel.getState().path).toHaveLength(1);
    expect(screen.getAllByRole('menu')).toHaveLength(2);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(menuModel.getState().path).toHaveLength(0);
    expect(focusManager.get()).toBe('menubar');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(focusManager.get()).toBe('editor');
  });
});