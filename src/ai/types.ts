export type AIStatus = 'idle' | 'loading' | 'computing' | 'error';
export type AIPhase = 'idle' | 'downloading' | 'loading-model' | 'generating';
export type ChatRole = 'system' | 'user' | 'assistant';
export type ChatMessage = {
  readonly role: ChatRole;
  readonly content: string;
};
export type ModelId = 'Qwen/Qwen2.5-0.5B-Instruct' | 'Qwen/Qwen2.5-1.5B-Instruct';
export type ModelInfo = {
  readonly id: ModelId;
  readonly name: string;
  readonly sizeMb: number;
  readonly quantized: string;
};
export type ChatState = {
  readonly messages: readonly ChatMessage[];
  readonly error: string | null;
};
export type CompletionRequest = {
  readonly prompt: string;
  readonly maxNewTokens: number;
  readonly temperature?: number;
};
export type AIProgress = {
  readonly phase: AIPhase;
  readonly loaded: number;
  readonly total: number;
  readonly percent: number;
  readonly modelId: ModelId | null;
};
export type AIWorkerInit = {
  readonly type: 'init';
  readonly modelId: ModelId;
};
export type AIWorkerGenerate = {
  readonly type: 'generate';
  readonly modelId: ModelId;
  readonly request: CompletionRequest;
};
export type AIWorkerMessage = AIWorkerInit | AIWorkerGenerate;
export type AIWorkerEvent =
  | { readonly kind: 'ready'; readonly modelId: ModelId }
  | { readonly kind: 'download'; readonly progress: AIProgress }
  | { readonly kind: 'computing' }
  | { readonly kind: 'token'; readonly text: string }
  | { readonly kind: 'done'; readonly text: string; readonly tokensPerSecond: number }
  | { readonly kind: 'error'; readonly message: string };