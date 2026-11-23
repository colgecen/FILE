import { beforeEach, describe, expect, it } from 'vitest';
import { environmentsModel } from './environments';
import {
  newActiveTerminal,
  openActiveTerminal,
  splitActiveTerminal,
  terminalModel,
} from './terminalModel';

describe('TerminalModel', () => {
  beforeEach(() => {
    terminalModel.reset();
    environmentsModel.reset();
  });

  it('aktif ortam için ayrı terminal çalışma alanı açar', () => {
    environmentsModel.add('/proje/a', 'a');
    openActiveTerminal();
    const workspace = terminalModel.workspace('/proje/a');
    expect(workspace?.open).toBe(true);
    expect(workspace?.tabs).toHaveLength(1);
    expect(workspace?.tabs[0]?.cwd).toBe('/proje/a');
  });

  it('ortam başına sekmeleri ayrı tutar', () => {
    environmentsModel.add('/proje/a', 'a');
    openActiveTerminal();
    newActiveTerminal();
    expect(terminalModel.workspace('/proje/a')?.tabs).toHaveLength(2);

    environmentsModel.add('/proje/b', 'b');
    openActiveTerminal();
    expect(terminalModel.workspace('/proje/b')?.tabs).toHaveLength(1);
    expect(terminalModel.workspace('/proje/a')?.tabs).toHaveLength(2);
  });

  it('bölme işlemi ikinci terminali oluşturur ve iki panele ayırır', () => {
    environmentsModel.add('/proje/a', 'a');
    openActiveTerminal();
    splitActiveTerminal();
    const workspace = terminalModel.workspace('/proje/a');
    expect(workspace?.split).toBe(true);
    expect(workspace?.tabs).toHaveLength(2);
    expect(workspace?.splitId).not.toBeNull();
    expect(workspace?.splitId).not.toBe(workspace?.activeId);
  });

  it('son sekme kapanınca panel kapanır', () => {
    environmentsModel.add('/proje/a', 'a');
    openActiveTerminal();
    const tab = terminalModel.workspace('/proje/a')!.tabs[0]!;
    terminalModel.closeTab('/proje/a', tab.id);
    const workspace = terminalModel.workspace('/proje/a');
    expect(workspace?.open).toBe(false);
    expect(workspace?.tabs).toHaveLength(0);
  });

  it('tam ekran durumunu ve geri dönüş bilgisini saklar', () => {
    environmentsModel.add('/proje/a', 'a');
    openActiveTerminal();
    terminalModel.setFullscreen('/proje/a', true, false);
    expect(terminalModel.workspace('/proje/a')?.fullscreen).toBe(true);
    expect(terminalModel.workspace('/proje/a')?.appFullscreenBefore).toBe(false);
    terminalModel.setFullscreen('/proje/a', false, false);
    expect(terminalModel.workspace('/proje/a')?.fullscreen).toBe(false);
  });
});
