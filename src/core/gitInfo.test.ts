import { describe, expect, it, vi } from 'vitest';
import type { GitBranchInfo } from '../../electron/shared/api-types';
import { resolveGitBranch } from './gitInfo';

describe('resolveGitBranch', () => {
  it('aynı klasör için eşzamanlı istekleri tek çağrıda birleştirir', async () => {
    const pending: { resolve?: (value: GitBranchInfo | null) => void } = {};
    const api = {
      gitBranch: vi.fn(
        () =>
          new Promise<GitBranchInfo | null>((resolve) => {
            pending.resolve = resolve;
          }),
      ),
    };
    const first = resolveGitBranch(api, '/proje');
    const second = resolveGitBranch(api, '/proje');
    pending.resolve?.({ name: 'main', dirty: false });
    await expect(first).resolves.toEqual({ name: 'main', dirty: false });
    await expect(second).resolves.toEqual({ name: 'main', dirty: false });
    expect(api.gitBranch).toHaveBeenCalledTimes(1);
  });

  it('hata durumunda null döner', async () => {
    const api = { gitBranch: vi.fn().mockRejectedValue(new Error('git yok')) };
    await expect(resolveGitBranch(api, '/depo')).resolves.toBeNull();
  });
});
