import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from '../layout/AppShell';

vi.mock('../editor/EditorCore', () => ({
  EditorCore: () => <div data-testid="editor-core-mock" />,
}));
import { createCore } from '../core/instances';
import { explorerModel } from '../core/explorer';
import { focusManager } from '../core/focus';
import { paletteModel } from '../core/palette';

describe('CommandHUD', () => {
  afterEach(() => {
    act(() => {
      paletteModel.reset([]);
      while (focusManager.get() !== 'editor') focusManager.returnToPrevious();
    });
  });

  const renderShell = (): void => {
    render(<AppShell />);
  };

  it('palet bölgesi kapalıyken görünmez', () => {
    renderShell();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('palet bölgesi açıkken panel ve giriş kutusu görünür', () => {
    renderShell();
    act(() => {
      focusManager.set('palette');
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Komut yaz…')).toBeInTheDocument();
  });

  it('yazılan sorgu listeyi filtreler', () => {
    renderShell();
    act(() => {
      focusManager.set('palette');
      paletteModel.reset([
        { id: 'a.open', title: 'Dosya Aç', category: 'file', run: () => ({ ok: true }) },
        { id: 'b.save', title: 'Kaydet', category: 'file', run: () => ({ ok: true }) },
      ]);
    });
    const input = screen.getByPlaceholderText('Komut yaz…');
    fireEvent.change(input, { target: { value: 'aç' } });
    expect(screen.getByText('Dosya Aç')).toBeInTheDocument();
    expect(screen.queryByText('Kaydet')).toBeNull();
  });

  it('aktif öğe vurgulanır ve hareket eder', () => {
    renderShell();
    act(() => {
      focusManager.set('palette');
      paletteModel.reset([
        { id: 'a.open', title: 'Dosya Aç', category: 'file', run: () => ({ ok: true }) },
        { id: 'b.save', title: 'Kaydet', category: 'file', run: () => ({ ok: true }) },
      ]);
    });
    expect(screen.getByText('Dosya Aç').closest('.command-hud__item')?.className).toContain(
      'command-hud__item--active',
    );
    act(() => {
      paletteModel.move(1);
    });
    expect(screen.getByText('Kaydet').closest('.command-hud__item')?.className).toContain(
      'command-hud__item--active',
    );
    expect(screen.getByText('Dosya Aç').closest('.command-hud__item')?.className).not.toContain(
      'command-hud__item--active',
    );
  });
});

describe('palet klavye akışı', () => {
  afterEach(() => {
    act(() => {
      paletteModel.reset([]);
      while (focusManager.get() !== 'editor') focusManager.returnToPrevious();
    });
  });

  async function waitForClose(): Promise<void> {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 320));
    });
  }

  it('Ctrl+I paleti açar, yön tuşu seçimi kaydırır', () => {
    render(<AppShell />);
    fireEvent.keyDown(window, { key: 'i', ctrlKey: true });
    expect(focusManager.get()).toBe('palette');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    act(() => {
      paletteModel.setQuery('kaydet', createCore().registry.list());
    });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(paletteModel.getState().activeIndex).toBe(1);
  });

  it('Enter seçili komutu çalıştırır ve paleti kapatır', async () => {
    const core = createCore();
    let executed = false;
    core.registry.register({
      id: 'test.flag',
      title: 'Bayrak Komutu',
      category: 'file',
      run: () => {
        executed = true;
        return { ok: true };
      },
    });
    render(<AppShell />);
    fireEvent.keyDown(window, { key: 'i', ctrlKey: true });
    act(() => {
      paletteModel.setQuery('bayrak', core.registry.list());
    });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(executed).toBe(true);
    expect(focusManager.get()).toBe('editor');
    expect(document.querySelector('.command-hud--closing')).not.toBeNull();
    await waitForClose();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(paletteModel.getState().query).toBe('');
  });

  it('tıklama öğeyi çalıştırır ve paleti kapatır', async () => {
    const core = createCore();
    let executed = false;
    core.registry.register({
      id: 'test.flag',
      title: 'Bayrak Komutu',
      category: 'file',
      run: () => {
        executed = true;
        return { ok: true };
      },
    });
    render(<AppShell />);
    fireEvent.keyDown(window, { key: 'i', ctrlKey: true });
    act(() => {
      paletteModel.setQuery('bayrak', core.registry.list());
    });
    await act(async () => {
      fireEvent.click(screen.getByText('Bayrak Komutu'));
    });
    expect(executed).toBe(true);
    expect(focusManager.get()).toBe('editor');
    expect(document.querySelector('.command-hud--closing')).not.toBeNull();
    await waitForClose();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Esc paleti kapatır ve sorguyu temizler', async () => {
    render(<AppShell />);
    fireEvent.keyDown(window, { key: 'i', ctrlKey: true });
    const input = screen.getByPlaceholderText('Komut yaz…');
    fireEvent.change(input, { target: { value: 'kaydet' } });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(focusManager.get()).toBe('editor');
    await waitForClose();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(paletteModel.getState().query).toBe('');
  });

  it('açıldığında giriş kutusu DOM odağını alır', () => {
    render(<AppShell />);
    fireEvent.keyDown(window, { key: 'i', ctrlKey: true });
    expect(screen.getByPlaceholderText('Komut yaz…')).toHaveFocus();
  });

  it('menü çubuğundayken de Ctrl+I paleti açar', () => {
    render(<AppShell />);
    fireEvent.keyDown(window, { key: 'F1' });
    expect(focusManager.get()).toBe('menubar');
    fireEvent.keyDown(window, { key: 'i', ctrlKey: true });
    expect(focusManager.get()).toBe('palette');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('Esc ile önceki odak bölgesine dönülür', async () => {
    render(<AppShell />);
    fireEvent.keyDown(window, { key: 'F1' });
    fireEvent.keyDown(window, { key: 'i', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(focusManager.get()).toBe('menubar');
    await waitForClose();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('giriş kutusundaki Tab odağı kilitlemek için engellenir', () => {
    render(<AppShell />);
    fireEvent.keyDown(window, { key: 'i', ctrlKey: true });
    const input = screen.getByPlaceholderText('Komut yaz…');
    const withTab = fireEvent.keyDown(input, { key: 'Tab' });
    expect(withTab).toBe(false);
    expect(focusManager.get()).toBe('palette');
    expect(input).toHaveFocus();
  });

  it('paletten tree komutu gezgini açar ve odaklanır', async () => {
    render(<AppShell />);
    fireEvent.keyDown(window, { key: 'i', ctrlKey: true });
    act(() => {
      paletteModel.setQuery('tree', createCore().registry.list());
    });
    await act(async () => {
      fireEvent.keyDown(window, { key: 'Enter' });
    });
    expect(explorerModel.getState().isOpen).toBe(true);
    expect(screen.getByRole('region', { name: 'Dosya gezgini' })).toBeInTheDocument();
    expect(focusManager.get()).toBe('explorer');
  });

  it('gezgin açıkken Esc odağı editöre döndürür, paneli açık bırakır', async () => {
    render(<AppShell />);
    fireEvent.keyDown(window, { key: 'i', ctrlKey: true });
    act(() => {
      paletteModel.setQuery('tree', createCore().registry.list());
    });
    await act(async () => {
      fireEvent.keyDown(window, { key: 'Enter' });
    });
    expect(focusManager.get()).toBe('explorer');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(focusManager.get()).toBe('editor');
    expect(explorerModel.getState().isOpen).toBe(true);
    expect(screen.getByRole('region', { name: 'Dosya gezgini' })).toBeInTheDocument();
  });

  it('ctrl+p paleti açar ve ilk sonuç seçilidir', () => {
    render(<AppShell />);
    fireEvent.keyDown(window, { key: 'p', ctrlKey: true });
    expect(focusManager.get()).toBe('palette');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    const items = document.querySelectorAll('.command-hud__item');
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]!.className).toContain('command-hud__item--active');
  });

  it('zemine tıklama paleti kapatır', async () => {
    render(<AppShell />);
    fireEvent.keyDown(window, { key: 'p', ctrlKey: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    const backdrop = document.querySelector('.command-hud')!;
    fireEvent.mouseDown(backdrop);
    await waitForClose();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(focusManager.get()).toBe('editor');
  });
});