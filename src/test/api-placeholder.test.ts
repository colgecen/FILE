import { describe, expect, it } from 'vitest';
import { API_PLACEHOLDER } from '../../electron/shared/api-types';

describe('API_PLACEHOLDER', () => {
  it('sürüm bilgisini taşır', () => {
    expect(API_PLACEHOLDER.version).toBe('0.1.0');
  });
});