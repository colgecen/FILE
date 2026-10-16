import { afterEach, describe, expect, it, vi } from 'vitest';
import { CommandRegistry } from './commands';
import { environmentsModel } from './environments';
import { explorerModel } from './explorer';
import { focusManager } from './focus';
import { registerGitCommands } from './gitCommands';
import { gitModel } from './gitModel';
import { registerNavCommands } from './navCommands';
import { openGitPanelForActiveEnv } from './gitPanel';

const REPO = { name: 'main', dirty: false };

function drainFocus(): void {
  while (focusManager.get() !== 'editor') focusManager.returnToPrevious();
}

afterEach(() => {
  gitModel.close();
  environmentsModel.reset();
  explorerModel.settle([], null);
  vi.mocked(window.api.gitBranch).mockResolvedValue(null);
  vi.mocked(window.api.openFolder).mockClear();
  drainFocus();
});

describe('git paneli · ortam bağlantısı', () => {
  it('açık proje ortamı yoksa git paneli açılmaz', async () => {
    vi.mocked(window.api.gitBranch).mockResolvedValue(REPO);
    const result = await openGitPanelForActiveEnv(window.api, { focus: true });
    expect(result.ok).toBe(false);
    expect(gitModel.getState().isOpen).toBe(false);
  });

  it('seçili ortam git deposu ise panel açılır ve odak git e geçer', async () => {
    vi.mocked(window.api.gitBranch).mockResolvedValue(REPO);
    environmentsModel.add('/repo/x', 'x');
    const result = await openGitPanelForActiveEnv(window.api, { focus: true });
    expect(result.ok).toBe(true);
    expect(gitModel.getState().isOpen).toBe(true);
    expect(gitModel.getState().rootPath).toBe('/repo/x');
    expect(focusManager.get()).toBe('git');
  });

  it('ortam git deposu değilse panel açılmaz', async () => {
    vi.mocked(window.api.gitBranch).mockResolvedValue(null);
    environmentsModel.add('/repo/y', 'y');
    const result = await openGitPanelForActiveEnv(window.api, { focus: true });
    expect(result.ok).toBe(false);
    expect(gitModel.getState().isOpen).toBe(false);
  });

  it('view.git.panel komutu git deposu olan ortamda paneli açar', async () => {
    vi.mocked(window.api.gitBranch).mockResolvedValue(REPO);
    environmentsModel.add('/repo/z', 'z');
    const registry = new CommandRegistry();
    registerGitCommands(registry.register.bind(registry));
    const result = await registry.run('view.git.panel');
    expect(result.ok).toBe(true);
    expect(gitModel.getState().isOpen).toBe(true);
  });

  it('tree komutu aktif ortam kökünü klasör sormadan açar', async () => {
    environmentsModel.add('/repo/t', 't');
    explorerModel.close();
    const registry = new CommandRegistry();
    registerNavCommands(registry);
    await registry.run('explorer.tree');
    expect(window.api.openFolder).not.toHaveBeenCalled();
    expect(explorerModel.getState().rootPath).toBe('/repo/t');
    expect(explorerModel.getState().isOpen).toBe(true);
  });

  it('.git olan ortamda tree komutu git panelini de getirir, odak gezginde kalır', async () => {
    vi.mocked(window.api.gitBranch).mockResolvedValue(REPO);
    environmentsModel.add('/repo/g', 'g');
    const registry = new CommandRegistry();
    registerNavCommands(registry);
    await registry.run('explorer.tree');
    expect(explorerModel.getState().isOpen).toBe(true);
    expect(gitModel.getState().isOpen).toBe(true);
    expect(gitModel.getState().rootPath).toBe('/repo/g');
    expect(focusManager.get()).toBe('explorer');
  });
});
