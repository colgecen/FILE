import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { reportError } from '../core/appErrors';
import { onFocusZoneChange } from '../core/focus';
import { errorStore } from '../core/errorStore';
import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('F1 ile menü bölgesine geçiş yapar', () => {
    const zones: string[] = [];
    const unsubscribe = onFocusZoneChange((zone) => zones.push(zone));
    render(<AppShell />);
    fireEvent.keyDown(window, { key: 'F1' });
    expect(zones).toContain('menubar');
    unsubscribe();
  });

  it('hata raporu gelince kırmızı hata göstergesini yansıtır', () => {
    errorStore.clear();
    const { container } = render(<AppShell />);
    expect(container.querySelector('.error-indicator')).toBeNull();
    act(() => {
      reportError('Test hatası');
    });
    expect(container.querySelector('.error-indicator')).not.toBeNull();
    errorStore.clear();
  });

  it('eşleşmeyen tuşta komut uyarısı üretmez', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<AppShell />);
    fireEvent.keyDown(window, { key: 'q' });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});