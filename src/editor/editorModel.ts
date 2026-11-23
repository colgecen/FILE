import { fileContentCache } from '../core/fileCache';
import { perfModel } from '../core/perfModel';
import type { OpenFile } from '../core/types';
import { tabsModel } from '../core/tabs';
import { monaco } from './monacoSetup';

export const MAX_MODELS = 10;

/** Boşta model kurmaya değer en büyük dosya; üstü tıklama anına bırakılır. */
const WARM_MAX_CHARS = 1_500_000;

function getLimit(): number {
  return perfModel.getState().modelLimit;
}

const touchOrder = new Map<string, number>();
let clock = 0;

type IdleHandle = { readonly kind: 'idle'; readonly id: number } | { readonly kind: 'timeout'; readonly id: ReturnType<typeof setTimeout> };

const warmQueue: OpenFile[] = [];
const warmQueued = new Set<string>();
let warmHandle: IdleHandle | null = null;

export function resetModelCache(): void {
  touchOrder.clear();
  clock = 0;
  warmQueue.length = 0;
  warmQueued.clear();
  if (warmHandle !== null) {
    if (warmHandle.kind === 'idle') window.cancelIdleCallback(warmHandle.id);
    else clearTimeout(warmHandle.id);
    warmHandle = null;
  }
}

export function touchModel(path: string): void {
  clock += 1;
  touchOrder.set(path, clock);
}

function modelUri(path: string): monaco.Uri {
  return monaco.Uri.from({ scheme: 'file', path });
}

export function hasModel(path: string): boolean {
  return monaco.editor.getModel(modelUri(path)) != null;
}

export function pruneModels(): void {
  const limit = getLimit();
  if (touchOrder.size <= limit) return;
  const openPaths = new Set(tabsModel.getState().tabs.map((tab) => tab.file.path));
  const candidates = [...touchOrder.entries()]
    .filter(([path]) => !openPaths.has(path))
    .sort((a, b) => a[1] - b[1]);
  let excess = touchOrder.size - limit;
  for (const [path] of candidates) {
    if (excess <= 0) break;
    const model = monaco.editor.getModel(modelUri(path));
    if (model !== null) {
      model.dispose();
    }
    touchOrder.delete(path);
    excess -= 1;
  }
}

export function resolveModel(file: OpenFile): monaco.editor.ITextModel {
  touchModel(file.path);
  const existing = monaco.editor.getModel(modelUri(file.path));
  if (existing !== null) {
    return existing;
  }
  const content = file.content.length > 10_000_000 ? file.content.slice(0, 10_000_000) : file.content;
  const model = monaco.editor.createModel(
    content,
    file.language === '' ? 'plaintext' : file.language,
    modelUri(file.path),
  );
  pruneModels();
  return model;
}

function scheduleWarmDrain(): void {
  if (warmHandle !== null || warmQueue.length === 0) return;
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(() => {
      warmHandle = null;
      drainWarmQueue();
    }, { timeout: 750 });
    warmHandle = { kind: 'idle', id };
    return;
  }
  const id = setTimeout(() => {
    warmHandle = null;
    drainWarmQueue();
  }, 60);
  warmHandle = { kind: 'timeout', id };
}

function drainWarmQueue(): void {
  while (warmQueue.length > 0) {
    const file = warmQueue.shift() as OpenFile;
    warmQueued.delete(file.path);
    if (monaco.editor.getModel(modelUri(file.path)) !== null) continue;
    // Model bütçesi dolduysa boşta ayrıştırmaya devam etme; sıradakileri de
    // tıklama anına bırak. Açık sekmeler zaten `pruneModels` tarafından korunur.
    if (touchOrder.size >= getLimit() + 4) return;
    const model = resolveModel(file);
    // Dil gramerini de ısıt: ilk tıklamada regex derleme/tokenizer kurulumu
    // uzun bir görev oluşturup ilk boyamayı geciktiriyordu.
    if (file.language !== '' && file.language !== 'plaintext') {
      try {
        const firstLine = model.getLineCount() > 0 ? model.getLineContent(1) : '';
        monaco.editor.tokenize(firstLine.length > 0 ? firstLine : ' ', file.language);
      } catch {
        // dil kayıtlı değil — model yine de kullanılabilir
      }
    }
  }
}

/** İçeriği hazır bir dosyanın Monaco modelini boşta kurar. */
export function queueModelWarmup(file: OpenFile): void {
  if ((file.kind ?? 'text') !== 'text') return;
  if (file.content.length === 0 || file.content.length > WARM_MAX_CHARS) return;
  if (warmQueued.has(file.path)) return;
  if (monaco.editor.getModel(modelUri(file.path)) !== null) return;
  if (warmQueue.length >= 32) return;
  warmQueued.add(file.path);
  warmQueue.push(file);
  scheduleWarmDrain();
}

/** Gezginin ön okuma önbelleğindeki dosyayı boşta modele dönüştürür. */
export function queueCachedModelWarmup(path: string): void {
  const file = fileContentCache.get(path);
  if (file !== null) queueModelWarmup(file);
}

let tabWarmupInstalled = false;
let tabWarmupKey = '';
let tabWarmupTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Açık sekmeler için boşta model ön ısıtma. Sekme içeriği her tuş vuruşunda
 * değiştiği için yalnızca sekme kümesi değiştiğinde çalışır.
 */
export function installTabWarmup(): void {
  if (tabWarmupInstalled) return;
  tabWarmupInstalled = true;
  const sync = (): void => {
    const tabs = tabsModel.getState().tabs;
    const key = tabs.map((tab) => `${tab.file.path}\u0000${tab.file.kind ?? 'text'}`).join('\n');
    if (key === tabWarmupKey) return;
    tabWarmupKey = key;
    if (tabWarmupTimer !== undefined) clearTimeout(tabWarmupTimer);
    tabWarmupTimer = setTimeout(() => {
      tabWarmupTimer = undefined;
      const open = tabsModel.getState().tabs;
      for (const tab of open.slice(0, 16)) queueModelWarmup(tab.file);
    }, 120);
  };
  tabsModel.subscribe(sync);
  sync();
}
