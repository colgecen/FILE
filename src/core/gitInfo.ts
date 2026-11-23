import { useEffect, useState } from 'react';
import type { Api, GitBranchInfo } from '../../electron/shared/api-types';

const branchInFlight = new Map<string, Promise<GitBranchInfo | null>>();

export function dirOf(path: string): string {
  const index = path.lastIndexOf('/');
  if (index <= 0) return '/';
  return path.slice(0, index);
}

/**
 * Aynı klasör için eşzamanlı `git branch` isteklerini tek alt sürece indirir.
 * Durum çubuğu her dosya tıklamasında yeni süreç başlatmasın; dal bilgisi
 * aktif ortamın köküne bağlandığı için klasör değişimi de çağrı üretmez.
 */
export function resolveGitBranch(
  api: Pick<Api, 'gitBranch'>,
  dirPath: string,
): Promise<GitBranchInfo | null> {
  const pending = branchInFlight.get(dirPath);
  if (pending !== undefined) return pending;
  const request = api
    .gitBranch(dirPath)
    .catch(() => null)
    .finally(() => {
      branchInFlight.delete(dirPath);
    });
  branchInFlight.set(dirPath, request);
  return request;
}

export function useGitBranch(
  api: Pick<Api, 'gitBranch'> | undefined,
  dirPath: string | null,
): GitBranchInfo | null {
  const [info, setInfo] = useState<GitBranchInfo | null>(null);

  useEffect(() => {
    if (api === undefined || dirPath === null) {
      setInfo(null);
      return;
    }
    let cancelled = false;
    void resolveGitBranch(api, dirPath).then((result) => {
      if (!cancelled) setInfo(result);
    });
    return () => {
      cancelled = true;
    };
  }, [api, dirPath]);

  return info;
}
