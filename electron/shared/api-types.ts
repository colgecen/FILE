export const APP_VERSION = '0.1.0';

export type DirEntry = {
  readonly name: string;
  readonly path: string;
  readonly kind: 'file' | 'directory';
};

export type OpenFileResult = {
  readonly path: string;
  readonly name: string;
  readonly content: string;
  readonly language: string;
};

export type GitBranchInfo = {
  readonly name: string;
  readonly dirty: boolean;
};

export type TelemetrySnapshot = {
  readonly cpuPercent: number;
  readonly memUsedMb: number;
  readonly memTotalMb: number;
  readonly platform: string;
};

export type FolderResult = {
  readonly path: string;
  readonly name: string;
};

export type WriteFileResult = {
  readonly ok: boolean;
  readonly error?: string;
  readonly path: string;
};

export type Api = {
  readonly version: string;
  readonly glass: boolean;
  openFile(): Promise<OpenFileResult | null>;
  openFolder(): Promise<FolderResult | null>;
  saveFileAs(defaultPath: string): Promise<string | null>;
  readFile(path: string): Promise<OpenFileResult | null>;
  writeFile(path: string, content: string): Promise<WriteFileResult>;
  readDir(path: string): Promise<DirEntry[]>;
  gitBranch(path: string): Promise<GitBranchInfo | null>;
  sysStart(): Promise<void>;
  sysStop(): Promise<void>;
  onMetrics(listener: (snapshot: TelemetrySnapshot) => void): () => void;
  appExit(): Promise<void>;
};