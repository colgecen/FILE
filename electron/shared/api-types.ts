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

export type AiApiMessage = {
  readonly role: 'system' | 'user' | 'assistant';
  readonly content: string;
};

export type AiChatStartArgs = {
  readonly requestId: string;
  readonly provider: string;
  readonly baseUrl: string;
  /** Açık override (özel endpoint girişi); boşsa kasa + env denenir. */
  readonly apiKey: string | null;
  readonly keyEnv: string | null;
  readonly keyRequired: boolean;
  readonly model: string;
  readonly messages: readonly AiApiMessage[];
  readonly temperature?: number;
  readonly maxTokens?: number;
};

export type AiChatStartResult = {
  readonly started: boolean;
  readonly error?: string;
};

export type AiChatAbortArgs = {
  readonly requestId: string;
};

export type AiChatTokenEvent = {
  readonly requestId: string;
  readonly text: string;
};

export type AiChatDoneEvent = {
  readonly requestId: string;
  readonly text: string;
};

export type AiChatErrorEvent = {
  readonly requestId: string;
  readonly message: string;
};

export type AiOpencodeChatArgs = {
  readonly requestId: string;
  readonly model: string;
  readonly prompt: string;
  readonly sessionId: string | null;
};

export type AiCliSessionEvent = {
  readonly requestId: string;
  readonly sessionId: string;
};

export type AiPingResult = {
  readonly ok: boolean;
  readonly status?: number;
  readonly error?: string;
};

export type AiModelsResult = {
  readonly ok: boolean;
  readonly models: readonly string[];
  readonly error?: string;
};

export type AiModelsArgs = {
  readonly baseUrl: string;
  readonly provider: string;
  readonly keyEnv: string | null;
  /** Açık override (özel giriş); boşsa kasa + env denenir. */
  readonly apiKey: string | null;
};

export type AiOllamaTagsResult = {
  readonly ok: boolean;
  readonly models: readonly string[];
  readonly error?: string;
};

export type AiKeySetArgs = {
  readonly provider: string;
  readonly key: string;
};

export type AiKeyDeleteArgs = {
  readonly provider: string;
};

export type AiKeyHasResult = {
  readonly present: boolean;
};

export type AiEnvCandidate = {
  readonly provider: string;
  readonly envVar: string | null;
};

export type AiEnvEntry = {
  readonly provider: string;
  readonly envVar: string;
  readonly present: boolean;
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
  readonly platform: string;
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
  onWindowFullscreen(listener: (fullscreen: boolean) => void): () => void;
  winMinimize(): Promise<boolean>;
  winToggleMaximize(): Promise<boolean>;
  appExit(): Promise<void>;
  newWindow(): Promise<void>;
  openInBrowser(url: string, browser?: string): Promise<'zen' | 'google-chrome' | 'chromium' | 'firefox' | 'default' | 'none' | 'invalid'>;
  ptySpawn(options: PtySpawnOptions): Promise<{ id: string } | null>;
  ptyWrite(id: string, data: string): Promise<boolean>;
  ptyResize(id: string, cols: number, rows: number): Promise<boolean>;
  ptyKill(id: string): Promise<boolean>;
  onPtyData(listener: (id: string, data: string) => void): () => void;
  onPtyExit(listener: (id: string, exitCode: number) => void): () => void;
  aiPing(baseUrl: string): Promise<AiPingResult>;
  aiModels(args: AiModelsArgs): Promise<AiModelsResult>;
  /** Yerel opencode kataloğundan model listesi (anahtar gerekmez). */
  aiLocalModels(provider: string): Promise<AiModelsResult>;
  aiOllamaTags(origin: string): Promise<AiOllamaTagsResult>;
  aiChatStart(args: AiChatStartArgs): Promise<AiChatStartResult>;
  aiChatAbort(requestId: string): Promise<void>;
  onAiChatToken(listener: (event: AiChatTokenEvent) => void): () => void;
  onAiChatDone(listener: (event: AiChatDoneEvent) => void): () => void;
  onAiChatError(listener: (event: AiChatErrorEvent) => void): () => void;
  /** Yerel opencode CLI'sinden auth-farkında model listesi (anahtar gerekmez). */
  aiOpencodeModels(): Promise<AiModelsResult>;
  aiOpencodeChat(args: AiOpencodeChatArgs): Promise<AiChatStartResult>;
  onAiCliSession(listener: (event: AiCliSessionEvent) => void): () => void;
  aiKeyHas(provider: string): Promise<AiKeyHasResult>;
  aiKeySet(args: AiKeySetArgs): Promise<{ ok: boolean; error?: string }>;
  aiKeyDelete(args: AiKeyDeleteArgs): Promise<{ ok: boolean }>;
  aiEnvScan(candidates: readonly AiEnvCandidate[]): Promise<readonly AiEnvEntry[]>;
};