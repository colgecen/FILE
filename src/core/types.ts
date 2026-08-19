export type FileNode = {
  readonly name: string;
  readonly path: string;
  readonly kind: 'file' | 'directory';
  readonly isOpen: boolean;
  readonly children: readonly FileNode[];
};

export type DirEntry = {
  readonly name: string;
  readonly path: string;
  readonly kind: 'file' | 'directory';
};

export type OpenFile = {
  readonly path: string;
  readonly name: string;
  readonly content: string;
  readonly language: string;
};

export type CursorPos = {
  readonly line: number;
  readonly column: number;
};

export type SplitDirection = 'vertical' | 'horizontal';

export type PaneLayout = {
  readonly id: string;
  readonly direction: SplitDirection;
  readonly root: boolean;
  readonly children?: readonly PaneLayout[];
  readonly activeTabId?: string;
};

export type OpenTab = {
  readonly id: string;
  readonly file: OpenFile;
  readonly dirty: boolean;
};