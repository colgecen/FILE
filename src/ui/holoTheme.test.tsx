import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from '../layout/AppShell';

vi.mock('../editor/EditorCore', () => ({
  EditorCore: () => <div data-testid="editor-core-mock" />,
}));
import { aiChatModel } from '../core/chatModel';
import { focusManager } from '../core/focus';
import { gitModel } from '../core/gitModel';
import { helpModel } from '../core/helpModel';
import { perfModel, perfPanelModel } from '../core/perfModel';

describe('holo tema birliği (Ctrl+P paleti hariç)', () => {
  afterEach(() => {
    act(() => {
      gitModel.close();
      helpModel.close();
      aiChatModel.reset();
      perfPanelModel.closePanel();
      perfModel.set({
        telemetry: true,
        modelLimit: 20,
        aiLazy: true,
        reducedMotion: false,
      });
      while (focusManager.get() !== 'editor') focusManager.returnToPrevious();
    });
  });

  it('git paneli holo kit sınıflarını taşır', () => {
    render(<AppShell />);
    act(() => {
      gitModel.open();
    });
    expect(document.querySelector('.git-panel.holo-panel')).not.toBeNull();
    expect(document.querySelector('.git-panel__header.holo-panel__header')).not.toBeNull();
    expect(document.querySelector('.git-panel__title.holo-label')).not.toBeNull();
    expect(document.querySelectorAll('.git-panel .holo-btn').length).toBeGreaterThan(0);
  });

  it('yardım paneli holo kit sınıflarını taşır', () => {
    render(<AppShell />);
    act(() => {
      helpModel.open('shortcuts');
      focusManager.set('help');
    });
    expect(document.querySelector('.help-overlay__panel.holo-panel')).not.toBeNull();
    expect(document.querySelector('.help-overlay__title.holo-panel__title')).not.toBeNull();
    expect(document.querySelector('.help-overlay__close.holo-btn--primary')).not.toBeNull();
  });

  it('performans paneli holo kit sınıflarını taşır', () => {
    render(<AppShell />);
    act(() => {
      perfPanelModel.openPanel();
    });
    expect(document.querySelector('.perf-panel.holo-panel')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Kapat' }).className).toContain('holo-btn');
  });

  it('asistan paneli araç şeridi ve model şeridiyle temaya uyar', () => {
    render(<AppShell />);
    act(() => {
      aiChatModel.open();
    });
    expect(document.querySelector('.ai-chat')).not.toBeNull();
    expect(document.querySelector('.ai-chat__meta')).not.toBeNull();
    expect(document.querySelector('.ai-chat__modelname')?.textContent?.length).toBeGreaterThan(0);
  });
});
