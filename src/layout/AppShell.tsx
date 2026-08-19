import type { ReactNode } from 'react';

export function AppShell({ children, glass }: { children?: ReactNode; glass?: boolean }): React.JSX.Element {
  const className = glass ? 'app-shell glass' : 'app-shell';
  return <div className={className}>{children}</div>;
}