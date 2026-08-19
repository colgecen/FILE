import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { AppShell } from '../layout/AppShell';
import { focusManager } from '../core/focus';
import { paletteModel } from '../core/palette';

describe('CommandHUD', () => {
  afterEach(() => {
    act(() => {
      paletteModel.reset([]);
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
        { commandId: 'a.open', title: 'Dosya Aç', category: 'file' },
        { commandId: 'b.save', title: 'Kaydet', category: 'file' },
      ]);
    });
    const input = screen.getByPlaceholderText('Komut yaz…');
    fireEvent.change(input, { target: { value: 'aç' } });
    expect(screen.getByText('Dosya Aç')).toBeInTheDocument();
    expect(screen.queryByText('Kaydet')).toBeNull();
  });
});