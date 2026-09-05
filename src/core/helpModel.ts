import { useEffect, useState } from 'react';

export type HelpScreen =
  | 'welcome'
  | 'shortcuts'
  | 'about'
  | 'getting-started'
  | 'documentation'
  | 'version'
  | 'system'
  | 'update';

export class HelpModel {
  private screen: HelpScreen | null = null;
  private readonly listeners = new Set<() => void>();

  getScreen(): HelpScreen | null {
    return this.screen;
  }

  open(screen: HelpScreen): void {
    this.screen = screen;
    this.emit();
  }

  close(): void {
    this.screen = null;
    this.emit();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const helpModel = new HelpModel();

export function useHelpScreen(): HelpScreen | null {
  const [screen, setScreen] = useState<HelpScreen | null>(() => helpModel.getScreen());
  useEffect(() => helpModel.subscribe(() => setScreen(helpModel.getScreen())), []);
  return screen;
}