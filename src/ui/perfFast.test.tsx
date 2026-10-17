import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from '../layout/AppShell';

vi.mock('../editor/EditorCore', () => ({
  EditorCore: () => <div data-testid="editor-core-mock" />,
}));
import { focusManager } from '../core/focus';
import { createCore } from '../core/instances';
import { perfModel, perfPanelModel } from '../core/perfModel';

describe('Hızlı Mod', () => {
  afterEach(() => {
    act(() => {
      perfModel.set({
        telemetry: true,
        modelLimit: 20,
        aiLazy: true,
        reducedMotion: false,
      });
      perfPanelModel.closePanel();
      while (focusManager.get() !== 'editor') focusManager.returnToPrevious();
    });
  });

  it('perf.fast.toggle reducedMotion açıp kapatır', async () => {
    const core = createCore();
    expect(perfModel.getState().reducedMotion).toBe(false);
    await act(async () => {
      await core.registry.run('perf.fast.toggle');
    });
    expect(perfModel.getState().reducedMotion).toBe(true);
    await act(async () => {
      await core.registry.run('perf.fast.toggle');
    });
    expect(perfModel.getState().reducedMotion).toBe(false);
  });

  it('Hızlı Mod açıkken kök perf-reduced taşır', () => {
    render(<AppShell />);
    expect(document.querySelector('.app-shell.perf-reduced')).toBeNull();
    act(() => {
      perfModel.set({ reducedMotion: true });
    });
    expect(document.querySelector('.app-shell.perf-reduced')).not.toBeNull();
  });

  it('durum çubuğundaki HIZLI butonu tek tıkla açar', () => {
    render(<AppShell />);
    const button = screen.getByTestId('status-perf');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(button);
    expect(perfModel.getState().reducedMotion).toBe(true);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('.app-shell.perf-reduced')).not.toBeNull();
  });

  it('perf.settings paneli açıp kapatır', () => {
    render(<AppShell />);
    expect(screen.queryByRole('dialog', { name: 'Performans ayarları' })).toBeNull();
    act(() => {
      perfPanelModel.openPanel();
    });
    expect(screen.getByRole('dialog', { name: 'Performans ayarları' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Performans ayarları' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Kapat' }));
    expect(screen.queryByRole('dialog', { name: 'Performans ayarları' })).toBeNull();
  });

  it('paletteden Performans Ayarları komutu paneli açar', async () => {
    const core = createCore();
    render(<AppShell />);
    await act(async () => {
      await core.registry.run('perf.settings');
    });
    expect(perfPanelModel.isOpen()).toBe(true);
    expect(screen.getByRole('dialog', { name: 'Performans ayarları' })).toBeInTheDocument();
  });
});
