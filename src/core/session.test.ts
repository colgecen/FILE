import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environmentsModel } from './environments';
import { session } from './session';
import { tabsModel } from './tabs';

const largeContent = 'x'.repeat(200_000);

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  environmentsModel.reset();
  tabsModel.reset();
});

afterEach(() => {
  vi.useRealTimers();
  environmentsModel.reset();
  tabsModel.reset();
});

describe('session', () => {
  it('oturum kaydında dosya içeriğini saklamaz', () => {
    const path = '/proje/buyuk.ts';
    environmentsModel.add('/proje', 'proje');
    tabsModel.open({ path, name: 'buyuk.ts', content: largeContent, language: 'typescript' });
    session.remember();
    vi.advanceTimersByTime(350);

    const raw = localStorage.getItem('file:session:v1');
    expect(raw).not.toBeNull();
    expect(raw).not.toContain(largeContent);
    const parsed = JSON.parse(raw ?? '{}') as {
      environments?: { tabs?: { files?: { path: string; content: string }[] } }[];
    };
    const stored = parsed.environments?.[0]?.tabs?.files?.[0];
    expect(stored?.path).toBe(path);
    expect(stored?.content).toBe('');
  });
});
