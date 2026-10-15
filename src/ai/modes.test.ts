import { describe, expect, it } from 'vitest';
import { DEFAULT_EFFORT, DEFAULT_MODE, EFFORT_PRESETS, effortLabel, modeLabel, modeRules } from './modes';

describe('mod ve efor', () => {
  it('varsayılanlar güvenlidir', () => {
    expect(DEFAULT_MODE).toBe('plan');
    expect(DEFAULT_EFFORT).toBe('medium');
  });

  it('efor presetleri artan bütçe verir', () => {
    expect(EFFORT_PRESETS.low.maxTokens).toBeLessThan(EFFORT_PRESETS.medium.maxTokens);
    expect(EFFORT_PRESETS.medium.maxTokens).toBeLessThan(EFFORT_PRESETS.ultra.maxTokens);
    expect(EFFORT_PRESETS.medium.maxTokens).toBe(256);
  });

  it('etiketler Türkçedir', () => {
    expect(modeLabel('plan')).toBe('Plan');
    expect(modeLabel('build')).toBe('Yapım');
    expect(effortLabel('ultra')).toBe('Ultra');
  });

  it('plan kuralları yazmayı yasaklar, yapım kuralları kökle sınırlar', () => {
    expect(modeRules('plan')).toContain('dokunma');
    expect(modeRules('plan')).toContain('onay');
    expect(modeRules('build')).toContain('proje kökü');
  });
});
