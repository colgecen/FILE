import { aiEngine } from './engine';
import { aiChatModel } from '../core/chatModel';
import { focusManager } from '../core/focus';
import { getActiveEditor } from '../editor/activeEditor';
import { paletteModel } from '../core/palette';
import { buildPrompt } from './prompt';
import { statusLabel } from './format';
import { MODEL_LIST, modelName } from './models';
import { isModelId, loadActiveModel, loadActiveRef, refFromModel, saveActiveModel, saveActiveRef } from './modelStore';
import { displayName } from './providers';
import type { ModelRef } from './providers';
import { modelCatalog } from './catalog';
import { scanLocalModels } from './localScan';
import { sessionStore } from './sessions';
import { DEFAULT_EFFORT, DEFAULT_MODE, EFFORT_PRESETS, effortLabel, modeLabel, type EffortLevel, type EffortPreset, type PlanMode } from './modes';
import type { ActiveRef } from './modelStore';
import { resolveEndpoint } from './endpoints';
import { getRemoteClient } from './remoteClient';
import { collectLiveProjectContext, renderContextBlock } from './context';
import { applyEdits, clearPending, parseEditBlocks, stagePending, takePending } from './apply';
import type { ApplyReport } from './apply';
import type { CommandDef } from '../core/types';
import type { ModelId } from './types';

function engineBusy(): boolean {
  const status = aiEngine.getState().status;
  return status === 'loading' || status === 'computing';
}

function syncSession(sessionId: string): void {
  sessionStore.saveMessages(sessionId, aiEngine.getState().chat.messages);
}

export function newSession(): string | null {
  if (engineBusy()) return null;
  const current = sessionStore.active();
  if (current !== null) syncSession(current.id);
  const id = sessionStore.create();
  aiEngine.resetChat();
  return id;
}

export function switchSession(id: string): boolean {
  const current = sessionStore.active();
  if (current !== null && current.id !== id) {
    syncSession(current.id);
  }
  const target = sessionStore.getSnapshot().sessions.find((session) => session.id === id);
  if (target === undefined) return false;
  if (!sessionStore.switch(id, engineBusy())) return false;
  aiEngine.loadMessages(target.messages);
  return true;
}

export function closeSession(id: string): boolean {
  const current = sessionStore.active();
  if (current !== null) {
    syncSession(current.id);
  }
  if (!sessionStore.close(id, engineBusy())) return false;
  const active = sessionStore.active();
  if (active === null) aiEngine.resetChat();
  else aiEngine.loadMessages(active.messages);
  return true;
}

function activeSessionOrCreate(): string | null {
  return sessionStore.active()?.id ?? sessionStore.ensure(engineBusy());
}

function setSessionMode(mode: PlanMode): { ok: boolean; error?: string } {
  const id = activeSessionOrCreate();
  if (id === null) return { ok: false, error: 'Aktif sohbet yok' };
  sessionStore.setMode(id, mode);
  aiEngine.appendSystemMessage(`Kip: ${modeLabel(mode)}`);
  syncSession(id);
  return { ok: true };
}

function setSessionEffort(effort: EffortLevel): { ok: boolean; error?: string } {
  const id = activeSessionOrCreate();
  if (id === null) return { ok: false, error: 'Aktif sohbet yok' };
  sessionStore.setEffort(id, effort);
  aiEngine.appendSystemMessage(`Efor: ${effortLabel(effort)}`);
  syncSession(id);
  return { ok: true };
}

const MAX_CONTEXT_MESSAGES = 6;

function editorSourceText(): string | null {
  const editor = getActiveEditor();
  if (editor === null) return null;
  const model = editor.getModel();
  if (model === null) return null;
  const selection = editor.getSelection();
  if (selection !== null && !selection.isEmpty()) {
    return model.getValueInRange(selection);
  }
  return model.getValue();
}

async function runAssistant(instruction: string): Promise<void> {
  const ref = loadActiveRef();
  const sessionId = sessionStore.ensure(engineBusy());
  if (sessionId === null) return;
  aiEngine.appendUserMessage(instruction);
  aiChatModel.open();
  sessionStore.retitleFrom(sessionId, instruction);
  const session = sessionStore.getSnapshot().sessions.find((entry) => entry.id === sessionId);
  const preset = EFFORT_PRESETS[session?.effort ?? DEFAULT_EFFORT];
  if (ref.provider !== 'builtin' || !isModelId(ref.id)) {
    await runRemote(sessionId, ref, preset);
    return;
  }
  const modelId: ModelId = ref.id;
  try {
    await aiEngine.ensureModel(modelId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    aiEngine.setError(message);
    syncSession(sessionId);
    return;
  }
  if (sessionStore.active()?.id !== sessionId) return;
  const recent = aiEngine.getState().chat.messages.slice(-MAX_CONTEXT_MESSAGES);
  try {
    await aiEngine.generate({
      prompt: buildPrompt(recent),
      maxNewTokens: preset.maxTokens,
      temperature: preset.temperature,
    });
  } catch {
    // generate hata durumunu zaten engine'e işler
  }
  syncSession(sessionId);
}

let remoteAbort: (() => void) | null = null;

async function runRemote(sessionId: string, ref: ActiveRef, preset: EffortPreset): Promise<void> {
  if (engineBusy()) {
    aiEngine.appendSystemMessage('Yanıt bekleniyor, bitince tekrar gönderin.');
    syncSession(sessionId);
    return;
  }
  const endpoint = resolveEndpoint(ref.provider);
  if ('error' in endpoint) {
    aiEngine.appendSystemMessage(endpoint.error);
    syncSession(sessionId);
    return;
  }
  const recent = aiEngine.getState().chat.messages.slice(-MAX_CONTEXT_MESSAGES);
  aiEngine.beginRemote();
  const client = getRemoteClient();
  const session = sessionStore.getSnapshot().sessions.find((entry) => entry.id === sessionId);
  const contextBlock = renderContextBlock(
    collectLiveProjectContext(),
    session?.mode ?? DEFAULT_MODE,
  );
  const history = recent
    .filter((message) => message.role !== 'system')
    .slice(-MAX_CONTEXT_MESSAGES)
    .map((message) => ({ role: message.role, content: message.content }));
  await new Promise<void>((resolve) => {
    const handle = client.send(
      {
        provider: ref.provider,
        baseUrl: endpoint.baseUrl,
        apiKey: null,
        keyEnv: endpoint.keyEnv,
        keyRequired: endpoint.keyRequired,
        model: ref.id,
        messages: [{ role: 'system' as const, content: contextBlock }, ...history],
        temperature: preset.temperature,
        maxTokens: preset.maxTokens,
      },
      {
        onToken: (text) => aiEngine.appendRemoteToken(text),
        onDone: (text) => {
          remoteAbort = null;
          aiEngine.finishRemote(text);
          syncSession(sessionId);
          resolve();
        },
        onError: (message) => {
          remoteAbort = null;
          aiEngine.setError(message);
          syncSession(sessionId);
          resolve();
        },
      },
    );
    remoteAbort = handle.abort;
  });
}

export async function setActiveModel(modelId: ModelId): Promise<boolean> {
  try {
    await aiEngine.ensureModel(modelId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    aiEngine.setError(message);
    return false;
  }
  saveActiveModel(modelId);
  saveActiveRef({ id: modelId, provider: 'builtin' });
  aiEngine.appendSystemMessage(`Model: ${modelName(modelId)} (${statusLabel('idle')})`);
  return true;
}

export function selectModel(ref: ModelRef): void {
  if (ref.provider === 'builtin' && isModelId(ref.id)) {
    void setActiveModel(ref.id);
    return;
  }
  saveActiveRef(refFromModel(ref));
  aiEngine.appendSystemMessage(`Model: ${displayName(ref)} — hazır.`);
}

function reportText(report: ApplyReport): string {
  const lines = [`Uygulandı (${report.applied.length}): ${report.applied.join(', ') || '—'}`];
  for (const entry of report.rejected) {
    lines.push(`Reddedildi: ${entry.path} (${entry.reason})`);
  }
  return lines.join('\n');
}

export function registerAICommands(register: (command: CommandDef) => void): void {
  register({
    id: 'ai.models.download',
    category: 'ai',
    title: 'Model İndir',
    run: () => {
      const modelId = aiEngine.getState().modelId ?? loadActiveModel();
      aiChatModel.open();
      void setActiveModel(modelId);
      return { ok: true };
    },
  });

  register({
    id: 'ai.models.cancel',
    category: 'ai',
    title: 'İndirmeyi İptal Et',
    run: () => {
      if (remoteAbort !== null) {
        remoteAbort();
        remoteAbort = null;
        aiEngine.cancel();
        aiEngine.appendSystemMessage('Yanıt iptal edildi.');
        return { ok: true };
      }
      const status = aiEngine.getState().status;
      if (status !== 'loading' && status !== 'computing') {
        return { ok: false, error: 'Aktif işlem yok' };
      }
      aiEngine.cancel();
      aiEngine.appendSystemMessage('İndirme iptal edildi.');
      return { ok: true };
    },
  });

  register({
    id: 'ai.model.select',
    category: 'ai',
    title: 'Model Seç',
    run: () => {
      paletteModel.showModels(modelCatalog.all());
      focusManager.set('palette');
      return { ok: true };
    },
  });

  register({
    id: 'ai.models.refresh',
    category: 'ai',
    title: 'Modelleri Yenile',
    run: async () => {
      const result = await scanLocalModels(window.api);
      modelCatalog.setScanned(result.models);
      const failed = result.probed.filter((probe) => !probe.ok);
      aiEngine.appendSystemMessage(
        failed.length === 0
          ? `${result.models.length} yerel model bulundu.`
          : `${result.models.length} model bulundu; ${failed.length} kaynak yanıt vermiyor.`,
      );
      aiChatModel.open();
      return { ok: true };
    },
  });

  register({
    id: 'ai.model.status',
    category: 'ai',
    title: 'Model Durumu',
    run: () => {
      const ref = loadActiveRef();
      const state = aiEngine.getState();
      const found = modelCatalog.find(ref.provider, ref.id);
      aiEngine.appendSystemMessage(
        found === undefined
          ? `Model: ${ref.id} — katalogda yok, listeyi yenileyin.`
          : `Model: ${displayName(found)} — ${statusLabel(state.status)}`,
      );
      aiChatModel.open();
      return { ok: true };
    },
  });

  register({
    id: 'ai.chat',
    category: 'ai',
    title: 'Yapay Zekâ ile Sohbet',
    run: () => {
      const wasOpen = aiChatModel.isOpen();
      aiChatModel.toggle();
      if (!wasOpen) {
        focusManager.set('ai');
      } else {
        focusManager.returnToPrevious();
      }
      return { ok: true };
    },
  });

  register({
    id: 'ai.chat.close',
    category: 'ai',
    title: 'Yapay zekâ sohbetini kapat',
    run: () => {
      aiChatModel.close();
      focusManager.returnToPrevious();
      return { ok: true };
    },
  });

  register({
    id: 'ai.chat.send',
    category: 'ai',
    title: 'Mesajı gönder',
    run: () => {
      const draft = aiChatModel.getDraft().trim();
      if (draft.length === 0) return { ok: false, error: 'Mesaj boş' };
      aiChatModel.setDraft('');
      void runAssistant(draft);
      return { ok: true };
    },
  });

  register({
    id: 'ai.session.new',
    category: 'ai',
    title: 'Yeni Sohbet',
    run: () => {
      const id = newSession();
      if (id === null) return { ok: false, error: 'Akış sürerken yeni sohbet açılamaz' };
      aiChatModel.open();
      focusManager.set('ai');
      return { ok: true };
    },
  });

  register({
    id: 'ai.session.close',
    category: 'ai',
    title: 'Sekmeyi Kapat',
    run: () => {
      const active = sessionStore.active();
      if (active === null) return { ok: false, error: 'Açık sohbet yok' };
      if (!closeSession(active.id)) return { ok: false, error: 'Akış sürerken kapatılamaz' };
      return { ok: true };
    },
  });

  register({
    id: 'ai.mode.plan',
    category: 'ai',
    title: 'Plan Modu',
    run: () => setSessionMode('plan'),
  });

  register({
    id: 'ai.mode.build',
    category: 'ai',
    title: 'Yapım Modu',
    run: () => setSessionMode('build'),
  });

  register({
    id: 'ai.effort.low',
    category: 'ai',
    title: 'Efor: Düşük',
    run: () => setSessionEffort('low'),
  });

  register({
    id: 'ai.effort.medium',
    category: 'ai',
    title: 'Efor: Orta',
    run: () => setSessionEffort('medium'),
  });

  register({
    id: 'ai.effort.ultra',
    category: 'ai',
    title: 'Efor: Ultra',
    run: () => setSessionEffort('ultra'),
  });

  register({
    id: 'ai.inline.complete',
    category: 'ai',
    title: 'Satır İçi Tamamlama',
    run: () => {
      const source = editorSourceText();
      if (source === null) return { ok: false, error: 'Açık kod yok' };
      void runAssistant(
        `İmleçteki koda satır içi tamamlama öner. Yalnızca önerilen kod parçasını yaz:\n\n${source}`,
      );
      return { ok: true };
    },
  });

  register({
    id: 'ai.explain',
    category: 'ai',
    title: 'Kodu Açıkla',
    run: () => {
      const source = editorSourceText();
      if (source === null) return { ok: false, error: 'Açık kod yok' };
      void runAssistant(`Aşağıdaki kodu satır satır Türkçe açıkla:\n\n${source}`);
      return { ok: true };
    },
  });

  register({
    id: 'ai.apply',
    category: 'ai',
    title: 'Öneriyi Uygula',
    run: async () => {
      const ctx = collectLiveProjectContext();
      if (ctx.rootPath === null) return { ok: false, error: 'Proje kökü yok' };
      const messages = aiEngine.getState().chat.messages;
      const lastAssistant = [...messages].reverse().find((message) => message.role === 'assistant');
      if (lastAssistant === undefined) return { ok: false, error: 'Uygulanacak öneri yok' };
      const edits = parseEditBlocks(lastAssistant.content);
      if (edits.length === 0) return { ok: false, error: 'Kod bloğu bulunamadı' };
      const mode = sessionStore.active()?.mode ?? DEFAULT_MODE;
      if (mode === 'build') {
        const report = await applyEdits(window.api, ctx.rootPath, edits);
        aiEngine.appendSystemMessage(reportText(report));
        aiChatModel.open();
        return report.rejected.length === 0
          ? { ok: true }
          : { ok: false, error: 'Bazı dosyalar yazılamadı' };
      }
      stagePending(edits);
      aiEngine.appendSystemMessage(
        `Onay bekliyor (${edits.length} dosya): ${edits.map((edit) => edit.path).join(', ')} — ai.apply.confirm ile uygula.`,
      );
      aiChatModel.open();
      return { ok: true };
    },
  });

  register({
    id: 'ai.apply.confirm',
    category: 'ai',
    title: 'Öneriyi Onayla',
    run: async () => {
      const staged = takePending();
      if (staged === null || staged.length === 0) return { ok: false, error: 'Onay bekleyen yok' };
      const ctx = collectLiveProjectContext();
      if (ctx.rootPath === null) {
        stagePending(staged);
        return { ok: false, error: 'Proje kökü yok' };
      }
      const report = await applyEdits(window.api, ctx.rootPath, staged);
      aiEngine.appendSystemMessage(reportText(report));
      aiChatModel.open();
      return report.rejected.length === 0
        ? { ok: true }
        : { ok: false, error: 'Bazı dosyalar yazılamadı' };
    },
  });

  register({
    id: 'ai.apply.cancel',
    category: 'ai',
    title: 'Öneriyi Vazgeç',
    run: () => {
      clearPending();
      aiEngine.appendSystemMessage('Bekleyen öneri iptal edildi.');
      return { ok: true };
    },
  });

  register({
    id: 'ai.prefs',
    category: 'ai',
    title: 'Yapay Zekâ Tercihleri',
    run: () => {
      paletteModel.showModels(MODEL_LIST);
      aiChatModel.open();
      focusManager.set('palette');
      return { ok: true };
    },
  });
}