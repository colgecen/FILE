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