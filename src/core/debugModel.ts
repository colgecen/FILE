export type Breakpoint = {
  readonly path: string;
  readonly line: number;
};

class BreakpointModel {
  private items: Breakpoint[] = [];

  toggle(path: string, line: number): void {
    const index = this.items.findIndex((item) => item.path === path && item.line === line);
    if (index >= 0) {
      this.items.splice(index, 1);
    } else {
      this.items.push({ path, line });
    }
  }

  list(): readonly Breakpoint[] {
    return this.items;
  }

  clear(): void {
    this.items = [];
  }
}

export const breakpointModel = new BreakpointModel();
