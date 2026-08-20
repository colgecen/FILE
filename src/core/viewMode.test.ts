import { beforeEach, describe, expect, it } from 'vitest';
import { ViewModeModel } from './viewMode';

describe('ViewModeModel', () => {
  let model: ViewModeModel;

  beforeEach(() => {
    model = new ViewModeModel();
  });

  it('başlangıçta tüm modlar kapalıdır', () => {
    expect(model.getState()).toEqual({ fullscreen: false, zen: false, wordWrap: 'off' });
  });

  it('tam ekran durumunu ayarlar', () => {
    model.setFullscreen(true);
    expect(model.getState().fullscreen).toBe(true);
    model.setFullscreen(false);
    expect(model.getState().fullscreen).toBe(false);
  });

  it('aynı durumu iki kez set etmez', () => {
    model.setFullscreen(true);
    let count = 0;
    model.subscribe(() => {
      count += 1;
    });
    model.setFullscreen(true);
    expect(count).toBe(0);
  });

  it('zen modunu değiştirir', () => {
    model.toggleZen();
    expect(model.getState().zen).toBe(true);
    model.toggleZen();
    expect(model.getState().zen).toBe(false);
  });

  it('kelime sarmalamayı değiştirir', () => {
    model.toggleWordWrap();
    expect(model.getState().wordWrap).toBe('on');
    model.toggleWordWrap();
    expect(model.getState().wordWrap).toBe('off');
  });
});