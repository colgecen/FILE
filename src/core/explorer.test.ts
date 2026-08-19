import { describe, expect, it } from 'vitest';
import { ExplorerModel } from './explorer';

describe('ExplorerModel', () => {
  it('varsayılan durumda kapalıdır', () => {
    const model = new ExplorerModel();
    expect(model.getState().isOpen).toBe(false);
  });

  it('open/close/toggle durumu değiştirir', () => {
    const model = new ExplorerModel();
    model.open();
    expect(model.getState().isOpen).toBe(true);
    model.open();
    expect(model.getState().isOpen).toBe(true);
    model.close();
    expect(model.getState().isOpen).toBe(false);
    model.toggle();
    expect(model.getState().isOpen).toBe(true);
    model.toggle();
    expect(model.getState().isOpen).toBe(false);
  });

  it('abonelere durum değişimini bildirir', () => {
    const model = new ExplorerModel();
    let notified = 0;
    model.subscribe(() => {
      notified += 1;
    });
    model.open();
    model.close();
    expect(notified).toBe(2);
  });
});