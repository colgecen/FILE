import { useEffect, useState } from 'react';
import type { Api, GitBranchInfo } from '../../electron/shared/api-types';

export function dirOf(path: string): string {
  const index = path.lastIndexOf('/');
  if (index <= 0) return '/';
  return path.slice(0, index);
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
    void api.gitBranch(dirPath).then((result) => {
      if (!cancelled) setInfo(result);
    });
    return () => {
      cancelled = true;
    };
  }, [api, dirPath]);

  return info;
}