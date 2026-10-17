import { aiEngine } from './engine';
import { aiChatModel } from '../core/chatModel';
import { environmentsModel } from '../core/environments';
import { focusManager } from '../core/focus';
import { getActiveEditor } from '../editor/activeEditor';
import { paletteModel } from '../core/palette';
import { buildPrompt } from './prompt';
import { statusLabel } from './format';
import { MODEL_LIST, modelName } from './models';
import { isModelId, loadActiveModel, loadActiveRef, refFromModel, saveActiveModel, saveActiveRef } from './modelStore';
import { displayName } from './providers';
import type { ModelRef } from './providers';
import { modelCatalog, refreshCatalog } from './catalog';
import { sessionStore } from './sessions';
import { DEFAULT_EFFORT, DEFAULT_MODE, EFFORT_PRESETS, modeRules, type EffortLevel, type EffortPreset, type PlanMode } from './modes';
import type { ActiveRef } from './modelStore';
import { resolveEndpoint } from './endpoints';
import { getRemoteClient } from './remoteClient';
import { collectLiveProjectContext, renderContextBlock } from './context';
import { applyEdits, clearPending, parseEditBlocks, stagePending, takePending } from './apply';
import type { ApplyReport } from './apply';
import { agentModel } from './agentModel';
import { executeToolCall, parseToolCalls, requestToolApproval, toolLabel, toolNeedsApproval } from './tools';
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
  const engineStarted = current !== null && aiEngine.getState().chat.messages.length > 0;
  const empty = sessionStore
    .getSnapshot()
    .sessions.find((session) => session.messages.length === 0 && (session.id !== current?.id || !engineStarted));
  if (empty !== undefined) {
    if (empty.id === current?.id) return empty.id;
    return switchSession(empty.id) ? empty.id : null;
  }
  if (current !== null) syncSession(current.id);
  const id = sessionStore.create(environmentsModel.active()?.id ?? null);
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
  if (active === null) {
    aiEngine.resetChat();
    aiChatModel.close(); // son sekme de kapandıysa sohbet paneli kapanır
  } else {
    aiEngine.loadMessages(active.messages);
  }
  return true;
}

function activeSessionOrCreate(): string | null {
  return sessionStore.active()?.id ?? sessionStore.ensure(engineBusy());
}

function setSessionMode(mode: PlanMode): { ok: boolean; error?: string } {
  const id = activeSessionOrCreate();
  if (id === null) return { ok: false, error: 'Aktif sohbet yok' };
  sessionStore.setMode(id, mode);
  syncSession(id);
  return { ok: true };
}

function setSessionEffort(effort: EffortLevel): { ok: boolean; error?: string } {
  const id = activeSessionOrCreate();
  if (id === null) return { ok: false, error: 'Aktif sohbet yok' };
  sessionStore.setEffort(id, effort);
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
  if (sessionStore.active()?.title === 'Yeni sohbet') titlePending.add(sessionId);
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
  const styledRecent = [{ role: 'system' as const, content: modeRules(session?.mode ?? DEFAULT_MODE) }, ...recent];
  try {
    await aiEngine.generate({
      prompt: buildPrompt(styledRecent),
      maxNewTokens: preset.maxTokens,
      temperature: preset.temperature,
    });
  } catch {
    // generate hata durumunu zaten engine'e işler
  }
  syncSession(sessionId);
}

let remoteAbort: (() => void) | null = null;

// opencode CLI oturum eşlemesi: FILE sohbeti -> opencode sessionID (süreç boyunca bellekte).
const opencodeSessions = new Map<string, string>();

// İlk isteği gönderilen sohbetler: yanıt bitince AI'dan kısa ad istenir.
const titlePending = new Set<string>();

const TITLE_INSTRUCTION =
  'Sohbet adlandırıcısın. Kullanıcının ilk isteğini 2-4 kelimelik Türkçe bir başlıkla özetle. Yalnızca başlığı yaz.';

async function generateSessionTitle(sessionId: string, ref: ActiveRef): Promise<void> {
  if (!titlePending.has(sessionId)) return;
  titlePending.delete(sessionId);
  const exists = sessionStore.getSnapshot().sessions.some((session) => session.id === sessionId);
  if (!exists) return;
  const firstUser = aiEngine.getState().chat.messages.find((message) => message.role === 'user');
  if (firstUser === undefined) return;
  const request = firstUser.content.slice(0, 600);
  const apply = (text: string): void => {
    sessionStore.setTitle(sessionId, text);
  };
  const client = getRemoteClient();
  if (ref.provider === 'opencode') {
    client.sendCli(
      { model: ref.id, prompt: `${TITLE_INSTRUCTION}\n\nİstek: ${request}`, sessionId: null },
      { onToken: () => undefined, onDone: apply, onError: () => undefined },
    );
    return;
  }
  const endpoint = resolveEndpoint(ref.provider);
  if ('error' in endpoint) return;
  client.send(
    {
      provider: ref.provider,
      baseUrl: endpoint.baseUrl,
      apiKey: null,
      keyEnv: endpoint.keyEnv,
      keyRequired: endpoint.keyRequired,
      model: ref.id,
      messages: [
        { role: 'system' as const, content: TITLE_INSTRUCTION },
        { role: 'user' as const, content: request },
      ],
      temperature: 0.3,
      maxTokens: 48,
    },
    { onToken: () => undefined, onDone: apply, onError: () => undefined },
  );
}

let agentStopped = false;

export function stopAgent(): void {
  agentStopped = true;
  agentModel.clear();
}

function effortRounds(effort: EffortLevel | undefined): number {
  if (effort === 'low') return 2;
  if (effort === 'ultra') return 8;
  return 4;
}

function remoteOnce(
  ref: ActiveRef,
  endpoint: { baseUrl: string; keyEnv: string | null; keyRequired: boolean },
  preset: EffortPreset,
  contextBlock: string,
  history: readonly { role: 'user' | 'assistant'; content: string }[],
): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    const client = getRemoteClient();
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
        onToken: (text: string) => aiEngine.appendRemoteToken(text),
        onDone: (text: string) => {
          remoteAbort = null;
          aiEngine.finishRemote(text);
          resolve(text);
        },
        onError: (message: string) => {
          remoteAbort = null;
          aiEngine.setError(message);
          resolve(null);
        },
      },
    );
    remoteAbort = handle.abort;
  });
}

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
  agentStopped = false;
  const project = collectLiveProjectContext();
  const session = sessionStore.getSnapshot().sessions.find((entry) => entry.id === sessionId);
  const mode = session?.mode ?? DEFAULT_MODE;
  const useTools = ref.provider !== 'opencode';
  const contextBlock = renderContextBlock(project, mode, useTools);
  aiEngine.beginRemote();
  const buildHistory = (): { role: 'user' | 'assistant'; content: string }[] =>
    aiEngine
      .getState()
      .chat.messages.filter((message) => message.role !== 'system')
      .slice(-MAX_CONTEXT_MESSAGES)
      .map((message) => ({ role: message.role as 'user' | 'assistant', content: message.content }));

  if (ref.provider === 'opencode') {
    // Yerel opencode CLI: auth ona ait, anahtar gerekmez; bağlam opencode oturumunda sürer.
    const history = buildHistory();
    const client = getRemoteClient();
    const known = opencodeSessions.get(sessionId) ?? null;
    const prompt =
      known === null
        ? [
            contextBlock,
            ...history.map(
              (message) =>
                `${message.role === 'user' ? 'Kullanıcı' : 'Asistan'}: ${message.content}`,
            ),
          ].join('\n\n')
        : (history[history.length - 1]?.content ?? '');
    await new Promise<void>((resolve) => {
      const handle = client.sendCli(
        { model: ref.id, prompt, sessionId: known },
        {
          onToken: (text: string) => aiEngine.appendRemoteToken(text),
          onDone: (text: string) => {
            remoteAbort = null;
            aiEngine.finishRemote(text);
            syncSession(sessionId);
            void generateSessionTitle(sessionId, ref);
            resolve();
          },
          onError: (message: string) => {
            remoteAbort = null;
            aiEngine.setError(message);
            syncSession(sessionId);
            resolve();
          },
          onSession: (id) => opencodeSessions.set(sessionId, id),
        },
      );
      remoteAbort = handle.abort;
    });
    return;
  }

  let finalText = await remoteOnce(ref, endpoint, preset, contextBlock, buildHistory());
  syncSession(sessionId);
  const maxRounds = effortRounds(session?.effort);
  let round = 0;
  while (finalText !== null && !agentStopped && round < maxRounds) {
    const calls = parseToolCalls(finalText);
    if (calls.length === 0) break;
    round += 1;
    const results: string[] = [];
    for (const call of calls) {
      if (agentStopped) break;
      if (toolNeedsApproval(call)) {
        const decision = await requestToolApproval(call);
        if (decision !== 'allow') {
          results.push(`${toolLabel(call)}: REDDEDİLDİ — kullanıcı onaylamadı, tekrar deneme.`);
          aiEngine.appendSystemMessage(`Onay reddedildi: ${toolLabel(call)}`);
          continue;
        }
      }
      const outcome = await executeToolCall(call, project.rootPath);
      aiEngine.appendSystemMessage(`${outcome.ok ? '→' : '✗'} ${outcome.label}`);
      results.push(`${outcome.label} (${outcome.ok ? 'ok' : 'fail'}):\n${outcome.result}`);
    }
    if (agentStopped) break;
    aiEngine.appendUserMessage(`TOOL_RESULT (tur ${round}):\n${results.join('\n\n')}`);
    syncSession(sessionId);
    aiEngine.beginRemote();
    finalText = await remoteOnce(ref, endpoint, preset, contextBlock, buildHistory());
    syncSession(sessionId);
  }
  if (!agentStopped && finalText !== null) {
    void generateSessionTitle(sessionId, ref);
  }
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
}

function reportText(report: ApplyReport): string {
  const lines = [`Uygulandı (${report.applied.length}): ${report.applied.join(', ') || '—'}`];
  for (const entry of report.changes) {
    lines.push(`--- ${entry.path}`);
    lines.push(entry.preview);
  }
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
      stopAgent();
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
      const counts = await refreshCatalog(window.api);
      const total = counts.local + counts.cloud;
      aiEngine.appendSystemMessage(
        total === 0
          ? 'Model bulunamadı — yerel sunucu ya da anahtar ekleyin.'
          : `${total} model listelendi (yerel ${counts.local}, bulut ${counts.cloud}).`,
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