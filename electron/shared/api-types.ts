export const APP_VERSION = '0.3.1';

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

export type GitFile = {
  readonly path: string;
  readonly status: 'M' | 'A' | 'D' | '?' | '!' | 'U';
};

export type GitLogEntry = {
  readonly hash: string;
  readonly message: string;
  readonly author: string;
  readonly date: string;
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

export type PtySpawnOptions = {
  readonly cols: number;
  readonly rows: number;
  readonly cwd?: string;
};

export type PtyEvent = {
  readonly id: string;
  readonly data?: string;
  readonly exitCode?: number;
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
  gitStatus(path: string): Promise<GitFile[] | null>;
  gitDiff(path: string, file: string): Promise<string | null>;
  gitLog(path: string, limit?: number): Promise<GitLogEntry[] | null>;
  gitCommit(path: string, message: string): Promise<{ ok: boolean; error?: string }>;
  gitPush(path: string): Promise<{ ok: boolean; error?: string }>;
  gitPull(path: string): Promise<{ ok: boolean; error?: string }>;
  gitCheckout(path: string, branch: string): Promise<{ ok: boolean; error?: string }>;
  gitAdd(path: string, files: string[]): Promise<{ ok: boolean; error?: string }>;
  gitRestore(path: string, files: string[]): Promise<{ ok: boolean; error?: string }>;
  sysStart(): Promise<void>;
  sysStop(): Promise<void>;
  onMetrics(listener: (snapshot: TelemetrySnapshot) => void): () => void;
  setFullscreen(enabled: boolean): Promise<boolean>;
  appExit(): Promise<void>;
  newWindow(): Promise<void>;
  ptySpawn(options: PtySpawnOptions): Promise<{ id: string } | null>;
  ptyWrite(id: string, data: string): Promise<boolean>;
  ptyResize(id: string, cols: number, rows: number): Promise<boolean>;
  ptyKill(id: string): Promise<boolean>;
  onPtyData(listener: (id: string, data: string) => void): () => void;
  onPtyExit(listener: (id: string, exitCode: number) => void): () => void;
};