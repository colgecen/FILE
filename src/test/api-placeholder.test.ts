import { describe, expect, it } from 'vitest';
import { APP_VERSION } from '../../electron/shared/api-types';

describe('APP_VERSION', () => {
  it('sürüm bilgisini taşır', () => {
    expect(APP_VERSION).toBe('0.3.1');
  });
});