import type { ReactNode } from 'react';

export function AppShell({ children }: { children?: ReactNode }): React.JSX.Element {
  return <div className="app-shell">{children}</div>;
}