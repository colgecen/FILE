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

export type TelemetrySnapshot = {
  readonly cpuPercent: number;
  readonly memUsedMb: number;
  readonly memTotalMb: number;
  readonly platform: string;
};

export type AIStatus = 'idle' | 'computing' | 'error';

export type CommandCategory =
  | 'file'
  | 'edit'
  | 'selection'
  | 'view'
  | 'go'
  | 'run'
  | 'terminal'
  | 'help'
  | 'ai';

export type CommandResult = {
  readonly ok: boolean;
  readonly error?: string;
};

export type CommandDef = {
  readonly id: string;
  readonly title: string;
  readonly category: CommandCategory;
  readonly run: () => CommandResult | Promise<CommandResult>;
  readonly placeholder?: boolean;
  readonly aliases?: readonly string[];
};

export type KeyBinding = {
  readonly id: string;
  readonly commandId: string;
  readonly keys: string[];
  readonly label: string;
};

export type FocusZone = 'editor' | 'menubar' | 'palette' | 'explorer' | 'help';