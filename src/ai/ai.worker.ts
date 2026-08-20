import { AutoTokenizer, TextStreamer, env, pipeline } from '@huggingface/transformers';
import type { ProgressInfo } from '@huggingface/transformers';
import ortWasmMjs from 'onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.mjs?url';
import ortWasm from 'onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.wasm?url';
import { extractAssistantText } from './prompt';
import type { AIProgress, AIWorkerEvent, AIWorkerMessage, ModelId } from './types';

env.allowLocalModels = false;
env.useBrowserCache = true;
if (env.backends.onnx.wasm !== undefined) {
  env.backends.onnx.wasm.numThreads = 1;
  env.backends.onnx.wasm.wasmPaths = { mjs: ortWasmMjs, wasm: ortWasm };
}

let pipe: Awaited<ReturnType<typeof pipeline<'text-generation'>>> | null = null;
let currentModel: ModelId | null = null;
let currentTokenizer: Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>> | null = null;

function post(event: AIWorkerEvent): void {
  (self as unknown as Worker).postMessage(event);
}

function toProgress(raw: ProgressInfo, modelId: ModelId | null): AIProgress {
  const total = 'total' in raw && typeof raw.total === 'number' ? raw.total : 0;
  const loaded = 'loaded' in raw && typeof raw.loaded === 'number' ? raw.loaded : 0;
  const percent = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
  return {
    phase: raw.status === 'progress' || raw.status === 'done' ? 'downloading' : 'loading-model',
    loaded,
    total,
    percent,
    modelId,
  };
}

function progressCallback(modelId: ModelId): (raw: ProgressInfo) => void {
  return (raw: ProgressInfo): void => {
    if (raw.status === 'progress') {
      post({ kind: 'download', progress: toProgress(raw, modelId) });
    }
  };
}

async function ensureModel(modelId: ModelId): Promise<void> {
  if (pipe !== null && currentModel === modelId) return;
  post({ kind: 'computing' });
  currentTokenizer = await AutoTokenizer.from_pretrained(modelId, {
    progress_callback: progressCallback(modelId),
  });
  pipe = await pipeline('text-generation', modelId, {
    dtype: 'q4',
    device: 'wasm',
    progress_callback: progressCallback(modelId),
  });
  currentModel = modelId;
  post({ kind: 'ready', modelId });
}

self.onmessage = async (event: MessageEvent<AIWorkerMessage>): Promise<void> => {
  const message = event.data;
  try {
    if (message.type === 'init') {
      await ensureModel(message.modelId);
      return;
    }
    await ensureModel(message.modelId);
    if (pipe === null || currentModel === null) {
      post({ kind: 'error', message: 'Model yüklenmedi' });
      return;
    }
    post({ kind: 'computing' });
    let streamed = '';
    if (currentTokenizer === null) {
      post({ kind: 'error', message: 'Model yüklenmedi' });
      return;
    }
    const streamer = new TextStreamer(currentTokenizer, {
      skip_prompt: true,
      callback_function: (text: string): void => {
        streamed += text;
        post({ kind: 'token', text: streamed });
      },
    });
    const output = await pipe(message.request.prompt, {
      max_new_tokens: message.request.maxNewTokens,
      temperature: message.request.temperature ?? 0.7,
      do_sample: true,
      streamer,
    });
    const generated = (output[0] as { generated_text: string }).generated_text;
    const assistant = extractAssistantText(generated, message.request.prompt);
    post({ kind: 'done', text: assistant, tokensPerSecond: 0 });
  } catch (error) {
    post({
      kind: 'error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
};